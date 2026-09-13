
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
from datetime import datetime
from sqlalchemy import Uuid, JSON, Column, String, ForeignKey, Boolean, DateTime, BigInteger
from app.db.base_class import Base

class ErrorStatusHistory(Base):
    __tablename__ = "error_status_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    error_id = Column(Uuid, ForeignKey("errors.id"), nullable=False, index=True)
    
    from_status = Column(String, nullable=True)
    to_status = Column(String, nullable=False)
    
    performed_by_user_id = Column(Uuid, ForeignKey("users.id"), nullable=True)
    performed_by_system = Column(Boolean, default=False, nullable=False)
    reason = Column(String, nullable=True)
    
    occurred_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False, index=True)

    # Sync Columns
    local_id = Column(Uuid, nullable=True, unique=True, index=True)
