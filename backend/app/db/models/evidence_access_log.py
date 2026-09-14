
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
from datetime import datetime
from sqlalchemy import Uuid, JSON, Column, BigInteger, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class EvidenceAccessLog(Base):
    __tablename__ = "evidence_access_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    evidence_id = Column(String(36), ForeignKey("evidence_files.id"), nullable=False)
    accessed_by_user_id = Column(String(36), nullable=False)
    action = Column(String(20), nullable=False)  # VIEW, DOWNLOAD
    accessed_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("action IN ('VIEW', 'DOWNLOAD')", name="chk_access_action"),
    )

    evidence_file = relationship("EvidenceFile", back_populates="access_logs")
