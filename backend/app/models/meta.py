from sqlalchemy import Column, String, Integer, ForeignKey, UniqueConstraint, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin, TenantMixin

class QualityCategory(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "quality_categories"
    name = Column(String(255), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'id', name='uq_quality_categories_tenant_id'),
    )

class Process(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "processes"
    quality_category_id = Column(String(36), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'id', name='uq_processes_tenant_id'),
    )

class SubProcess(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sub_processes"
    process_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    process = relationship("Process")
    
    __table_args__ = (
        UniqueConstraint('tenant_id', 'id', name='uq_sub_processes_tenant_id'),
        ForeignKeyConstraint(
            ['tenant_id', 'process_id'],
            ['processes.tenant_id', 'processes.id'],
            ondelete='CASCADE'
        ),
    )

class ErrorType(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "error_types"
    sub_process_id = Column(String(36), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    sub_process = relationship("SubProcess")
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['tenant_id', 'sub_process_id'],
            ['sub_processes.tenant_id', 'sub_processes.id'],
            ondelete='CASCADE'
        ),
    )

class SOP(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sops"
    title = Column(String(255), nullable=False)
    document_url = Column(String(1024), nullable=True)

class SLAPolicy(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sla_policies"
    name = Column(String(255), nullable=False)
    process_id = Column(String(36), nullable=False, index=True)
    severity = Column(String(50), nullable=True)
    resolution_target_hours = Column(Integer, nullable=True)
    rebuttal_window_hours = Column(Integer, nullable=False, default=48)
    qa_response_hours = Column(Integer, nullable=False, default=24)
    escalation_window_hours = Column(Integer, nullable=False, default=24)
    warning_threshold_percent = Column(Integer, nullable=False, default=75)

    __table_args__ = (
        ForeignKeyConstraint(
            ['tenant_id', 'process_id'],
            ['processes.tenant_id', 'processes.id'],
            ondelete='CASCADE'
        ),
    )
