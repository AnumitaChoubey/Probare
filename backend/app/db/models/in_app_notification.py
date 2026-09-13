
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
from datetime import datetime
from sqlalchemy import Uuid, JSON, Column, BigInteger, String, DateTime, Boolean, Text
from app.db.base_class import Base

class InAppNotification(Base):
    __tablename__ = "in_app_notifications"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(String(36), nullable=False, index=True)
    error_id = Column(String(36), nullable=True)
    template_code = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Sync Columns
    local_id = Column(Uuid, nullable=True, unique=True, index=True)
    sync_status = Column(String(20), default="SYNCED", nullable=False)
    updated_by_device_id = Column(Uuid, nullable=True)
    version = Column(Integer, default=1, nullable=False)
