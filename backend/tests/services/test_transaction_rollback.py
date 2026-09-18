import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.core import Tenant, Project, User, Team
from app.models.quality import QualityEvent
from app.models.integration import AuditEvent, TimelineEvent, OutboxEvent
from app.services.quality_event_service import QualityEventService
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from app.services.outbox_service import OutboxService
from app.services.workflow_service import WorkflowService

class FaultyTimelineService(TimelineService):
    async def record_event(self, *args, **kwargs):
        raise ValueError("Intentional Timeline Failure")

class FaultyAuditService(AuditService):
    async def record_action(self, *args, **kwargs):
        raise ValueError("Intentional Audit Failure")

class FaultyOutboxService(OutboxService):
    async def dispatch(self, *args, **kwargs):
        raise ValueError("Intentional Outbox Failure")

class FaultyEventService(QualityEventService):
    def update_event(self, *args, **kwargs):
        raise ValueError("Intentional Event Mutation Failure")

@pytest.fixture
async def base_entities(db_session: AsyncSession):
    tenant = Tenant(name="Test Tenant Rollback")
    db_session.add(tenant)
    await db_session.flush()

    project = Project(tenant_id=tenant.id, name="Test Project Rollback")
    user = User(tenant_id=tenant.id, name="Creator User Rollback", email=f"creator_{uuid.uuid4()}@test.com")
    team = Team(tenant_id=tenant.id, name="Test Team Rollback")
    db_session.add_all([project, user, team])
    await db_session.flush()

    return {"tenant": tenant, "project": project, "user": user, "team": team}

@pytest.fixture
async def sample_event(db_session: AsyncSession, base_entities):
    event_service = QualityEventService()
    event = event_service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Test Rollback",
        description="Desc",
        employee_id=base_entities["user"].id,
        team_id=base_entities["team"].id,
        process_id=base_entities["user"].id,
        sub_process_id=base_entities["user"].id,
        error_type_id=base_entities["user"].id,
        sop_id=base_entities["user"].id,
        severity="Medium",
        owner_id=base_entities["user"].id,
        created_by_id=base_entities["user"].id,
        customer_impact="None"
    )
    await db_session.flush()
    await db_session.commit()
    return event

@pytest.mark.parametrize("faulty_service_class", [
    FaultyTimelineService,
    FaultyAuditService,
    FaultyOutboxService,
    FaultyEventService
])
@pytest.mark.asyncio
async def test_transaction_rollback_stages(db_session: AsyncSession, base_entities, sample_event, faulty_service_class):
    event_service = QualityEventService()
    if faulty_service_class == FaultyEventService:
        event_service = FaultyEventService()
        
    audit_service = AuditService()
    if faulty_service_class == FaultyAuditService:
        audit_service = FaultyAuditService()
        
    timeline_service = TimelineService()
    if faulty_service_class == FaultyTimelineService:
        timeline_service = FaultyTimelineService()
        
    outbox_service = OutboxService()
    if faulty_service_class == FaultyOutboxService:
        outbox_service = FaultyOutboxService()

    faulty_workflow_service = WorkflowService(
        event_service=event_service,
        audit_service=audit_service,
        timeline_service=timeline_service,
        outbox_service=outbox_service
    )

    event_id = sample_event.id

    try:
        await faulty_workflow_service.transition_event(
            session=db_session,
            event=sample_event,
            target_state="Logged",
            actor_id=base_entities["user"].id,
            expected_version=1
        )
        await db_session.flush()
    except ValueError:
        await db_session.rollback()
        
    # Verify no partial state was saved
    refetched_event = await db_session.execute(select(QualityEvent).filter_by(id=event_id))
    refetched_event = refetched_event.scalar_one()
    assert refetched_event.status == "Draft"
    assert refetched_event.version == 1

    audit_count = await db_session.execute(select(AuditEvent).filter_by(entity_id=event_id))
    assert len(audit_count.scalars().all()) == 0
    
    outbox_count = await db_session.execute(select(OutboxEvent).filter_by(aggregate_id=event_id))
    assert len(outbox_count.scalars().all()) == 0
    
    timeline_count = await db_session.execute(select(TimelineEvent).filter_by(quality_event_id=event_id))
    assert len(timeline_count.scalars().all()) == 0
