import uuid
from datetime import datetime, date
from sqlalchemy import (
    Column, String, ForeignKey, Integer, Boolean, Text, Date, DateTime, BigInteger, CheckConstraint, Index
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Error(Base):
    __tablename__ = "errors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    qa_error_id = Column(String, unique=True, nullable=False, index=True)
    
    lob_id = Column(UUID(as_uuid=True), ForeignKey("lobs.id"), nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    sub_category_id = Column(UUID(as_uuid=True), ForeignKey("sub_categories.id"), nullable=True)
    
    severity = Column(String, nullable=False)
    status = Column(String, nullable=False)
    transaction_reference = Column(String, nullable=False)
    
    logged_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    date_of_occurrence = Column(Date, nullable=False)
    date_of_detection = Column(Date, nullable=False)
    
    description = Column(Text, nullable=False)
    initial_root_cause = Column(String, nullable=True)
    internal_notes = Column(Text, nullable=True)
    client_impact_flag = Column(Boolean, default=False, nullable=False)
    
    sla_rebuttal_window_hours_snapshot = Column(Integer, nullable=False)
    sla_decision_window_hours_snapshot = Column(Integer, nullable=False)
    sla_clock_started_at = Column(DateTime(timezone=True), nullable=True)
    current_escalation_level = Column(Integer, default=0, nullable=False)
    
    idempotency_key = Column(String, unique=True, nullable=True)
    is_draft = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    decisions = relationship(
        "Decision",
        primaryjoin="Error.id == Decision.error_id",
        order_by="desc(Decision.cycle_number)",
        viewonly=True
    )

    __table_args__ = (
        CheckConstraint("severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')", name="chk_severity"),
        CheckConstraint("date_of_occurrence <= CURRENT_DATE", name="chk_date_occurrence"),
        CheckConstraint("char_length(description) >= 20", name="chk_description_length"),
        Index("idx_errors_status", "status"),
        Index("idx_errors_lob_category", "lob_id", "category_id"),
        Index("idx_errors_owner_user_id", "owner_user_id"),
        Index("idx_errors_created_at", "created_at"),
    )

    @property
    def sla_state(self) -> dict:
        if self.is_draft or not self.sla_clock_started_at:
            return {"elapsed_pct": 0.0, "state": "green"}
            
        if self.status.startswith("CLOSED_"):
            # If closed, we could calculate final pct based on closed_at,
            # but usually it's considered frozen.
            return {"elapsed_pct": 0.0, "state": "green"}
            
        # Determine applicable window
        if self.status == "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW":
            window_hours = self.sla_decision_window_hours_snapshot
        else:
            window_hours = self.sla_rebuttal_window_hours_snapshot
            
        if window_hours <= 0:
            return {"elapsed_pct": 0.0, "state": "green"}
            
        # Calculate elapsed hours
        from datetime import timezone
        now = datetime.now(timezone.utc)
        
        # Ensure sla_clock_started_at is timezone aware for subtraction
        start_time = self.sla_clock_started_at
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)
            
        elapsed_hours = (now - start_time).total_seconds() / 3600.0
        elapsed_pct = (elapsed_hours / window_hours) * 100.0
        
        state = "green"
        if elapsed_pct >= 100.0:
            state = "red"
        elif elapsed_pct >= 70.0:
            state = "amber"
            
        return {
            "elapsed_pct": min(round(elapsed_pct, 1), 100.0),
            "state": state
        }

    @property
    def latest_decision(self) -> str | None:
        if self.decisions:
            return self.decisions[0].decision
        return None
