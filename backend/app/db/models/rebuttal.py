
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from sqlalchemy import Uuid, JSON, Column, Integer, Text, ForeignKey, TIMESTAMP, ARRAY, CheckConstraint
from sqlalchemy.sql import func
from app.db.base_class import Base

class Rebuttal(Base):
    __tablename__ = "rebuttals"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    error_id = Column(Uuid, ForeignKey("errors.id"), nullable=False)
    cycle_number = Column(Integer, nullable=False)
    justification = Column(Text, nullable=False)
    evidence_file_ids = Column(JSON, default=list)
    submitted_by_user_id = Column(Uuid, nullable=False)
    submitted_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Sync Columns
    local_id = Column(Uuid, nullable=True, unique=True, index=True)
    sync_status = Column(String(20), default="SYNCED", nullable=False)
    updated_by_device_id = Column(Uuid, nullable=True)
    version = Column(Integer, default=1, nullable=False)

    __table_args__ = (
        CheckConstraint("length(justification) >= 20", name="justification_min_length"),
    )

    