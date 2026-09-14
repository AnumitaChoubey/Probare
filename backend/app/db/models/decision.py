
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from sqlalchemy import Uuid, JSON, Column, Integer, Text, ForeignKey, TIMESTAMP, CheckConstraint
from sqlalchemy.sql import func
from app.db.base_class import Base

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    error_id = Column(Uuid, ForeignKey("errors.id"), nullable=False)
    cycle_number = Column(Integer, nullable=False)
    decision = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    partial_breakdown = Column(Text, nullable=True)
    decided_by_user_id = Column(Uuid, nullable=False)
    decided_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Sync Columns
    local_id = Column(Uuid, nullable=True, unique=True, index=True)
    sync_status = Column(String(20), default="SYNCED", nullable=False)
    updated_by_device_id = Column(Uuid, nullable=True)
    version = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "decision IN ('UPHELD','OVERTURNED','PARTIALLY_UPHELD')", name="decision_enum"
        ),
        CheckConstraint("length(rationale) >= 20", name="rationale_min_length"),
    )