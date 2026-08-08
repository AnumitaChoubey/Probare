from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, Boolean, Text
from app.db.base import Base

class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=False, index=True)
    error_id = Column(String(36), nullable=True)
    template_code = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
