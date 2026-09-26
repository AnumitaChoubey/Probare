from sqlalchemy import Column, String, Integer, Float, ForeignKey, DateTime, UniqueConstraint, ForeignKeyConstraint, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin, ProjectMixin

class QualityEvent(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "quality_events"
    
    event_number = Column(String(50), nullable=False, unique=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String, nullable=False)
    
    employee_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey('teams.id', ondelete='RESTRICT'), nullable=False, index=True)
    
    process_id = Column(String(36), nullable=False, index=True)
    sub_process_id = Column(String(36), nullable=False)
    error_type_id = Column(String(36), nullable=False)
    sop_id = Column(String(36), nullable=False)
    
    severity = Column(String(50), nullable=False, index=True)
    status = Column(String(50), nullable=False, index=True)
    
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    created_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    
    customer_impact = Column(String, nullable=False)
    financial_impact = Column(String, nullable=True)
    compliance_impact = Column(String, nullable=True)
    expected_outcome = Column(String, nullable=True)
    actual_outcome = Column(String, nullable=True)
    
    sla_due_at = Column(DateTime(timezone=True), nullable=True, index=True)
    sla_status = Column(String(50), nullable=False, default="ON_TRACK")
    closed_at = Column(DateTime(timezone=True), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    
    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_quality_events_project_id'),
    )

class Evidence(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "evidence"
    quality_event_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False) # Changed to Integer
    mime_type = Column(String(100), nullable=False)
    storage_path = Column(String(1024), nullable=True) # Will be deprecated in favor of storage_key
    storage_key = Column(String(1024), nullable=False, server_default="") # MinIO/blob key
    uploaded_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    description = Column(String, nullable=True)
    checksum = Column(String(64), nullable=True)
    duration = Column(String(50), nullable=True)
    highlight_timestamp = Column(String(50), nullable=True)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="active") # 'active' | 'soft_deleted'
    soft_deleted_at = Column(DateTime(timezone=True), nullable=True)
    soft_deleted_by = Column(String(36), ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
        # CheckConstraint('file_size <= 26214400', name='check_file_size_limit') # 25MB
    )

class EvidenceAccessLog(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "evidence_access_logs"
    evidence_id = Column(String(36), ForeignKey('evidence.id', ondelete='CASCADE'), nullable=False, index=True)
    accessed_by = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    action = Column(String(50), nullable=False) # 'view' | 'download'

class Rebuttal(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "rebuttals"
    quality_event_id = Column(String(36), nullable=False, unique=True)
    category = Column(String(100), nullable=False)
    explanation = Column(String, nullable=False)
    submitted_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    status = Column(String(50), nullable=False, index=True)
    qa_assessed_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=True)
    qa_decision = Column(String(50), nullable=True)
    qa_rationale = Column(String, nullable=True)
    sla_deadline = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_rebuttals_project_id'),
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class DiscussionThread(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "discussion_threads"
    rebuttal_id = Column(String(36), nullable=False, index=True)
    author_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    message = Column(String, nullable=False)
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'rebuttal_id'],
            ['rebuttals.project_id', 'rebuttals.id'],
            ondelete='CASCADE'
        ),
    )

class Decision(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "decisions"
    quality_event_id = Column(String(36), nullable=False, index=True)
    decision_type = Column(String(100), nullable=False)
    outcome = Column(String(100), nullable=False) # Enum: Upheld, Partially Upheld, Overturned, Withdrawn
    rationale = Column(String, nullable=False)
    decided_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    requires_capa = Column(Integer, nullable=False, default=1) # Boolean stored as Integer 1/0 for sqlite compat but wait, boolean is mapped in SQLAlchemy as Boolean. Let's use Boolean.
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class Decision(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "decisions"
    quality_event_id = Column(String(36), nullable=False, index=True)
    decision_type = Column(String(100), nullable=False)
    outcome = Column(String(100), nullable=False) # Upheld, Partially Upheld, Overturned, Withdrawn
    rationale = Column(String, nullable=False)
    decided_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    requires_capa = Column(Boolean, nullable=False, default=False)
    requires_capa_override_reason = Column(String, nullable=True)
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class ReopenEvent(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "reopen_events"
    quality_event_id = Column(String(36), nullable=False, index=True)
    reopened_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    reason = Column(String, nullable=False)
    previous_status = Column(String(50), nullable=False)
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class Escalation(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "escalations"
    quality_event_id = Column(String(36), nullable=False, index=True)
    escalated_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    escalated_to_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    reason = Column(String, nullable=False)
    status = Column(String(50), nullable=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(String, nullable=True)
    
    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class RootCause(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "root_causes"
    quality_event_id = Column(String(36), nullable=False, unique=True)
    problem_statement = Column(String, nullable=True)
    five_whys = Column(JSONB, nullable=True)
    fishbone = Column(JSONB, nullable=True)
    primary_category = Column(String(100), nullable=False)
    contributing_factors = Column(JSONB, nullable=True) # DEPRECATED: Moved to ContributingFactor entity
    confidence = Column(String(50), nullable=True)
    completed_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)

    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_root_causes_project_id'),
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class ContributingFactor(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "contributing_factors"
    root_cause_id = Column(String(36), nullable=False, index=True)
    factor_type = Column(String(100), nullable=False)
    description = Column(String, nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'root_cause_id'],
            ['root_causes.project_id', 'root_causes.id'],
            ondelete='CASCADE'
        ),
    )

class CorrectiveAction(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "corrective_actions"
    quality_event_id = Column(String(36), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String, nullable=False)
    owner_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    priority = Column(String(50), nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), nullable=False, index=True)
    completion_notes = Column(String, nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class EffectivenessReview(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "effectiveness_reviews"
    quality_event_id = Column(String(36), nullable=False, unique=True)
    reviewed_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    error_rate_before = Column(Float, nullable=False)
    error_rate_after = Column(Float, nullable=False)
    recurrence_rate = Column(Float, nullable=False)
    comparison_period = Column(String(255), nullable=False)
    decision = Column(String(50), nullable=False)
    rationale = Column(String, nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class SLAClock(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "sla_clocks"
    quality_event_id = Column(String(36), nullable=False, index=True)
    stage = Column(String(50), nullable=False)
    sla_policy_id = Column(String(36), ForeignKey('sla_policies.id', ondelete='SET NULL'), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False)
    paused_intervals = Column(JSONB, nullable=False, default=list) # [{start, end, reason}]
    elapsed_minutes = Column(Integer, nullable=False, default=0)
    status = Column(String(50), nullable=False, default="running") # 'running' | 'paused' | 'breached' | 'completed'
    breached_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )
