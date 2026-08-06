import uuid
from sqlalchemy import Column, Integer, Text, ForeignKey, TIMESTAMP, ARRAY, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.db.base_class import Base

class Rebuttal(Base):
    __tablename__ = "rebuttals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    error_id = Column(UUID(as_uuid=True), ForeignKey("errors.id"), nullable=False)
    cycle_number = Column(Integer, nullable=False)
    justification = Column(Text, nullable=False)
    evidence_file_ids = Column(ARRAY(UUID(as_uuid=True)), default=list)
    submitted_by_user_id = Column(UUID(as_uuid=True), nullable=False)
    submitted_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("length(justification) >= 20", name="justification_min_length"),
    )