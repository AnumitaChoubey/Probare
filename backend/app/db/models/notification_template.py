from sqlalchemy import Column, String, Integer, Boolean, Text
from backend.app.db.base import Base

class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    code = Column(String(50), primary_key=True)  # NT-01..NT-08
    subject_template = Column(String(255), nullable=False)
    body_template = Column(Text, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    is_active = Column(Boolean, nullable=False, default=True)
