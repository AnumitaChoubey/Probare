
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, ForeignKey, DateTime, BigInteger, Text, Integer, Uuid, Boolean
from app.db.base_class import Base

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    code = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id = Column(Uuid, ForeignKey("users.id"), nullable=False)
    device_name = Column(String, nullable=False)
    registered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    last_seen_at = Column(DateTime(timezone=True), nullable=True)
    app_version = Column(String, nullable=True)

class SyncCursor(Base):
    __tablename__ = "sync_cursor"
    
    device_id = Column(Uuid, ForeignKey("devices.id"), primary_key=True)
    last_pulled_at = Column(DateTime(timezone=True), nullable=True)
    last_pushed_seq = Column(BigInteger, default=0, nullable=False)

class SyncQueue(Base):
    __tablename__ = "sync_queue"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String, nullable=False) # 'error', 'rebuttal', 'decision', 'evidence_file'
    local_id = Column(Uuid, nullable=False)
    operation = Column(String, nullable=False) # 'CREATE' or 'UPDATE'
    payload_json = Column(Text, nullable=False)
    status = Column(String, default="PENDING", nullable=False) # 'PENDING', 'SYNCING', 'SYNCED', 'FAILED'
