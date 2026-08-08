import uuid
from datetime import datetime
from sqlalchemy import Column, String, BigInteger, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class EvidenceFile(Base):
    __tablename__ = "evidence_files"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    error_id = Column(String(36), nullable=True, index=True)
    uploaded_by_user_id = Column(String(36), nullable=False)
    stage = Column(String(50), nullable=False)  # ORIGINAL_LOGGING, REBUTTAL, DECISION
    file_name = Column(String(255), nullable=False)
    file_type = Column(String(100), nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    storage_uri = Column(String(500), nullable=False)
    checksum_sha256 = Column(String(64), nullable=False)
    malware_scan_status = Column(String(20), nullable=False, default="PENDING")  # PENDING, CLEAN, INFECTED, FAILED
    is_current_version = Column(Boolean, nullable=False, default=True)
    supersedes_evidence_id = Column(String(36), ForeignKey("evidence_files.id"), nullable=True)
    uploaded_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("stage IN ('ORIGINAL_LOGGING', 'REBUTTAL', 'DECISION')", name="chk_evidence_stage"),
        CheckConstraint("malware_scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'FAILED')", name="chk_malware_status"),
    )

    access_logs = relationship("EvidenceAccessLog", back_populates="evidence_file", cascade="all, delete-orphan")
