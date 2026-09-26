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

from sqlalchemy import Boolean, DateTime, SmallInteger, Text
from sqlalchemy.dialects.postgresql import ARRAY

class EscalationMatrix(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "escalation_matrices"
    name = Column(String(255), nullable=False)

class EscalationRule(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "escalation_rules"
    escalation_matrix_id = Column(String(36), ForeignKey('escalation_matrices.id', ondelete='CASCADE'), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=True)
    threshold_pct = Column(Integer, nullable=False)
    escalation_level = Column(SmallInteger, nullable=False)
    recipient_role = Column(String(100), nullable=True)
    recipient_user_id = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    notification_channels = Column(ARRAY(String), nullable=False) # Requires postgres ARRAY or JSON fallback

class WorkingHoursCalendar(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "working_hours_calendars"
    day_of_week = Column(SmallInteger, nullable=False)
    start_time = Column(String(10), nullable=False) # e.g. "09:00"
    end_time = Column(String(10), nullable=False)

class Holiday(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "holidays"
    holiday_date = Column(DateTime, nullable=False)
    description = Column(String, nullable=True)

class SLAPolicy(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "sla_policies"
    process_id = Column(String(36), nullable=True, index=True) # Optional link to specific process
    stage = Column(String(50), nullable=False)
    severity = Column(String(50), nullable=True)
    duration_minutes = Column(Integer, nullable=False)
    use_working_hours = Column(String(50), nullable=False) # 'calendar' | 'working_hours_only'
    warning_threshold_pct = Column(Integer, nullable=False, default=80)
    pause_on = Column(JSONB, nullable=True)
    escalation_matrix_id = Column(String(36), ForeignKey('escalation_matrices.id', ondelete='SET NULL'), nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    effective_from = Column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ['tenant_id', 'process_id'],
            ['processes.tenant_id', 'processes.id'],
            ondelete='CASCADE'
        ),
    )
