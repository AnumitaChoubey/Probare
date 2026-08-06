from datetime import datetime
from sqlalchemy import Column, String, ForeignKey, Boolean, DateTime, BigInteger
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class ErrorStatusHistory(Base):
    __tablename__ = "error_status_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    error_id = Column(UUID(as_uuid=True), ForeignKey("errors.id"), nullable=False, index=True)
    
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    
    performed_by_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    performed_by_system = Column(Boolean, default=False, nullable=False)
    reason = Column(String, nullable=True)
    
    occurred_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)
