import uuid
from sqlalchemy import Column, Integer, Text, ForeignKey, TIMESTAMP, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    error_id = Column(UUID(as_uuid=True), ForeignKey("errors.id"), nullable=False)
    cycle_number = Column(Integer, nullable=False)
    decision = Column(Text, nullable=False)
    rationale = Column(Text, nullable=False)
    partial_breakdown = Column(Text, nullable=True)
    decided_by_user_id = Column(UUID(as_uuid=True), nullable=False)
    decided_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "decision IN ('UPHELD','OVERTURNED','PARTIALLY_UPHELD')", name="decision_enum"
        ),
        CheckConstraint("length(rationale) >= 20", name="rationale_min_length"),
    )