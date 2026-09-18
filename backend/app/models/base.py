from sqlalchemy.orm import declarative_base, declared_attr
from sqlalchemy import Column, DateTime, String
from sqlalchemy.sql import func
import uuid

class CustomBase:
    @declared_attr
    def __tablename__(cls):
        # Default table name generation: pluralized lowercase class name
        # A more sophisticated pluralization could be used, but this works for basic names.
        return cls.__name__.lower() + "s"

Base = declarative_base(cls=CustomBase)

class UUIDMixin:
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))

class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

class TenantMixin:
    @declared_attr
    def tenant_id(cls):
        from sqlalchemy import ForeignKey
        return Column(String(36), ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, index=True)

class ProjectMixin(TenantMixin):
    @declared_attr
    def project_id(cls):
        from sqlalchemy import ForeignKey
        return Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
