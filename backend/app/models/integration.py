from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Integer, Float, UniqueConstraint, ForeignKeyConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from .base import Base, UUIDMixin, TimestampMixin, TenantMixin, ProjectMixin

class AuditEvent(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "audit_events"
    project_id = Column(String(36), nullable=True, index=True)
    entity_type = Column(String(100), nullable=False, index=True)
    entity_id = Column(String(36), nullable=False, index=True)
    action = Column(String(100), nullable=False)
    old_value = Column(JSONB, nullable=True)
    new_value = Column(JSONB, nullable=True)
    actor_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False, index=True)
    reason = Column(String, nullable=True)

class TimelineEvent(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "timeline_events"
    quality_event_id = Column(String(36), nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    description = Column(String, nullable=False)
    actor_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=True)
    metadata_payload = Column(JSONB, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'quality_event_id'],
            ['quality_events.project_id', 'quality_events.id'],
            ondelete='CASCADE'
        ),
    )

class AIModelConfiguration(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "ai_model_configurations"
    provider = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=False)
    api_key_secret_ref = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)

class AIAnalysisRun(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "ai_analysis_runs"
    quality_event_id = Column(String(36), nullable=True, index=True)
    event_version = Column(Integer, nullable=True)
    analysis_type = Column(String(100), nullable=False)
    
    provider = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    
    status = Column(String(50), nullable=False, index=True) # QUEUED, RUNNING, COMPLETED, FAILED
    
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    error_info = Column(String, nullable=True)
    request_id = Column(String(255), nullable=True)
    idempotency_key = Column(String(255), nullable=True, unique=True, index=True)
    
    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_ai_analysis_runs_project_id'),
    )

class AIInsight(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "ai_insights"
    analysis_run_id = Column(String(36), nullable=False, index=True)
    quality_event_id = Column(String(36), nullable=True, index=True)
    
    insight_type = Column(String(100), nullable=False)
    model_provider = Column(String(100), nullable=False)
    model_name = Column(String(100), nullable=False)
    prompt_identifier = Column(String(100), nullable=True)
    
    result = Column(JSONB, nullable=False)
    confidence = Column(String(50), nullable=True)
    rationale = Column(String, nullable=True)
    
    created_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=True)
    status = Column(String(50), nullable=False, default="Draft")
    
    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_ai_insights_project_id'),
        ForeignKeyConstraint(
            ['project_id', 'analysis_run_id'],
            ['ai_analysis_runs.project_id', 'ai_analysis_runs.id'],
            ondelete='CASCADE'
        ),
    )

class AIInsightFeedback(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "ai_insight_feedback"
    insight_id = Column(String(36), nullable=False, index=True)
    reviewed_by_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    is_helpful = Column(Boolean, nullable=False)
    comments = Column(String, nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'insight_id'],
            ['ai_insights.project_id', 'ai_insights.id'],
            ondelete='CASCADE'
        ),
    )

class AIUsageRecord(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "ai_usage_records"
    project_id = Column(String(36), nullable=True, index=True)
    analysis_run_id = Column(String(36), ForeignKey('ai_analysis_runs.id', ondelete='CASCADE'), nullable=True, index=True)
    
    provider = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    
    input_tokens = Column(Integer, nullable=False, default=0)
    output_tokens = Column(Integer, nullable=False, default=0)
    estimated_cost = Column(String(50), nullable=True)
    duration_ms = Column(Integer, nullable=True)

class Conversation(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "conversations"
    quality_event_id = Column(String(36), nullable=True, index=True)
    
    participants = relationship("ConversationParticipant", back_populates="conversation")

    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_conversations_project_id'),
    )

class ConversationParticipant(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "conversation_participants"
    conversation_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    
    conversation = relationship("Conversation", back_populates="participants")

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'conversation_id'],
            ['conversations.project_id', 'conversations.id'],
            ondelete='CASCADE'
        ),
    )

class Message(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "messages"
    conversation_id = Column(String(36), nullable=False, index=True)
    sender_id = Column(String(36), ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    body = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint('project_id', 'id', name='uq_messages_project_id'),
        ForeignKeyConstraint(
            ['project_id', 'conversation_id'],
            ['conversations.project_id', 'conversations.id'],
            ondelete='CASCADE'
        ),
    )

class MessageAttachment(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "message_attachments"
    message_id = Column(String(36), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    storage_path = Column(String(1024), nullable=False)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'message_id'],
            ['messages.project_id', 'messages.id'],
            ondelete='CASCADE'
        ),
    )

class MessageReadState(Base, UUIDMixin, TimestampMixin, ProjectMixin):
    __tablename__ = "message_read_states"
    message_id = Column(String(36), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        ForeignKeyConstraint(
            ['project_id', 'message_id'],
            ['messages.project_id', 'messages.id'],
            ondelete='CASCADE'
        ),
    )

class MicrosoftConnection(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "microsoft_connections"
    entra_tenant_id = Column(String(255), nullable=False)
    access_token = Column(String, nullable=True)
    refresh_token = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)

class MicrosoftSubscription(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "microsoft_subscriptions"
    resource = Column(String(255), nullable=False)
    subscription_id = Column(String(255), nullable=False, unique=True)
    expiration_date = Column(DateTime(timezone=True), nullable=False)

class MicrosoftResourceMapping(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "microsoft_resource_mappings"
    internal_entity_type = Column(String(100), nullable=False)
    internal_entity_id = Column(String(36), nullable=False, index=True)
    microsoft_resource_id = Column(String(255), nullable=False, index=True)
    microsoft_resource_type = Column(String(100), nullable=False)

class Notification(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "notifications"
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body = Column(String, nullable=False)
    is_read = Column(Boolean, nullable=False, default=False)
    link = Column(String(255), nullable=True)

class NotificationPreference(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "notification_preferences"
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True, unique=True)
    email_enabled = Column(Boolean, nullable=False, default=True)
    teams_enabled = Column(Boolean, nullable=False, default=True)
    in_app_enabled = Column(Boolean, nullable=False, default=True)

class OutboxEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "outbox_events"
    event_type = Column(String(255), nullable=False)
    aggregate_type = Column(String(100), nullable=False)
    aggregate_id = Column(String(36), nullable=False, index=True)
    tenant_id = Column(String(36), nullable=True, index=True)
    project_id = Column(String(36), nullable=True, index=True)
    payload = Column(JSONB, nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")
    retry_count = Column(Integer, nullable=False, default=0)
    available_at = Column(DateTime(timezone=True), nullable=True)
    next_attempt_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    error = Column(String, nullable=True)
    idempotency_key = Column(String(255), nullable=True, unique=True, index=True)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String(255), nullable=True)

class IntegrationEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "integration_events"
    source = Column(String(100), nullable=False)
    payload = Column(JSONB, nullable=False)
    status = Column(String(50), nullable=False, default="PENDING")
    idempotency_key = Column(String(255), nullable=True, unique=True, index=True)
    tenant_id = Column(String(36), nullable=True, index=True)
    project_id = Column(String(36), nullable=True, index=True)
    subscription_id = Column(String(255), nullable=True, index=True)
    external_event_id = Column(String(255), nullable=True, index=True)
    retry_count = Column(Integer, nullable=False, default=0)
    next_attempt_at = Column(DateTime(timezone=True), nullable=True)
    error_info = Column(String, nullable=True)

class ExternalResourceMapping(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "external_resource_mappings"
    internal_entity_type = Column(String(100), nullable=False)
    internal_entity_id = Column(String(36), nullable=False, index=True)
    external_system = Column(String(100), nullable=False)
    external_id = Column(String(255), nullable=False, index=True)

class IdempotencyRecord(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "idempotency_records"
    idempotency_key = Column(String(255), nullable=False, unique=True, index=True)
    request_hash = Column(String(255), nullable=False)
    response_status = Column(Integer, nullable=False)
    response_body = Column(JSONB, nullable=False)
