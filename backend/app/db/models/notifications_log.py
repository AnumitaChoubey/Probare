from datetime import datetime
from sqlalchemy import Column, BigInteger, String, DateTime, ForeignKey, CheckConstraint, Text
from app.db.base import Base

class NotificationsLog(Base):
    __tablename__ = "notifications_log"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    error_id = Column(String(36), nullable=True)
    template_code = Column(String(50), ForeignKey("notification_templates.code"), nullable=False)
    channel = Column(String(50), nullable=False, default="EMAIL")
    recipient_user_id = Column(String(36), nullable=False)
    status = Column(String(20), nullable=False, default="QUEUED")  # QUEUED, SENT, DELIVERED, BOUNCED, FAILED
    failure_reason = Column(Text, nullable=True)
    dispatched_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        CheckConstraint("status IN ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED')", name="chk_notif_status"),
    )
