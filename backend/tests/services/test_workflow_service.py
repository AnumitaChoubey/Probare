import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.core import Tenant, Project, User, Team
from app.models.integration import AuditEvent, TimelineEvent, OutboxEvent
from app.models.quality import CorrectiveAction
from app.services.quality_event_service import QualityEventService
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from app.services.outbox_service import OutboxService
from app.services.workflow_service import WorkflowService
from app.domain.exceptions import InvalidStateTransitionError, UnauthorizedWorkflowActionError, WorkflowPrerequisiteFailedError

@pytest.fixture
async def base_entities(db_session: AsyncSession):
    tenant = Tenant(name="Test Tenant Workflow")
    db_session.add(tenant)
    await db_session.flush()

    project = Project(tenant_id=tenant.id, name="Test Project Workflow")
    user = User(tenant_id=tenant.id, name="Creator User", email=f"creator_{uuid.uuid4()}@test.com")
    reviewer = User(tenant_id=tenant.id, name="Reviewer User", email=f"reviewer_{uuid.uuid4()}@test.com")
    team = Team(tenant_id=tenant.id, name="Test Team Workflow")
    db_session.add_all([project, user, reviewer, team])
    await db_session.flush()

    return {"tenant": tenant, "project": project, "user": user, "reviewer": reviewer, "team": team}

@pytest.fixture
def workflow_service():
    return WorkflowService(
        event_service=QualityEventService(),
        audit_service=AuditService(),
        timeline_service=TimelineService(),
        outbox_service=OutboxService()
    )

@pytest.mark.asyncio
async def test_valid_transition_creates_events(db_session: AsyncSession, base_entities, workflow_service):
    # Setup
    event = workflow_service.event_service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Test Workflow",
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

    assert event.status == "Draft"
    
    # Transition to Logged
    await workflow_service.transition_event(
        session=db_session,
        event=event,
        target_state="Logged",
        actor_id=base_entities["user"].id,
        expected_version=1,
        reason="Submitting event"
    )
    await db_session.flush()

    assert event.status == "Logged"
    assert event.version == 2
    assert event.sla_due_at is not None

    # Check Audit
    audit_res = await db_session.execute(select(AuditEvent).filter_by(entity_id=event.id))
    audit = audit_res.scalar_one()
    assert audit.action == "STATUS_CHANGED"
    assert audit.old_value["status"] == "Draft"
    assert audit.new_value["status"] == "Logged"

    # Check Timeline
    timeline_res = await db_session.execute(select(TimelineEvent).filter_by(quality_event_id=event.id))
    timeline = timeline_res.scalar_one()
    assert timeline.event_type == "STATUS_CHANGED"

    # Check Outbox
    outbox_res = await db_session.execute(select(OutboxEvent).filter_by(aggregate_id=event.id))
    outbox = outbox_res.scalar_one()
    assert outbox.event_type == "QualityEventStatusChanged"
    assert outbox.payload["new_status"] == "Logged"

@pytest.mark.asyncio
async def test_invalid_transition(db_session: AsyncSession, base_entities, workflow_service):
    event = workflow_service.event_service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Test Invalid",
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

    # Try invalid transition from Draft directly to Closed
    with pytest.raises(InvalidStateTransitionError):
        await workflow_service.transition_event(
            session=db_session,
            event=event,
            target_state="Closed",
            actor_id=base_entities["user"].id,
            expected_version=1
        )

@pytest.mark.asyncio
async def test_draft_to_logged_missing_fields(db_session, base_entities, workflow_service):
    event = workflow_service.event_service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Test Blank Desc",
        description="   ",  # blank
        employee_id=base_entities["user"].id,
        team_id=base_entities["team"].id,
        process_id=base_entities["user"].id,
        sub_process_id=base_entities["user"].id,
        error_type_id=base_entities["user"].id,
        sop_id=base_entities["user"].id,
        severity="Medium",
        owner_id=base_entities["user"].id,
        created_by_id=base_entities["user"].id,
        customer_impact=""
    )
    await db_session.flush()

    with pytest.raises(WorkflowPrerequisiteFailedError) as exc_info:
        await workflow_service.transition_event(
            session=db_session,
            event=event,
            target_state="Logged",
            actor_id=base_entities["user"].id,
            expected_version=1
        )
    assert "description" in exc_info.value.details["reason"]
    assert "customer_impact" in exc_info.value.details["reason"]

@pytest.mark.asyncio
async def test_effectiveness_review_requires_completed_capas(db_session, base_entities, workflow_service):
    event = workflow_service.event_service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Test CAPAs",
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
        customer_impact="None",
        status="Corrective Action"
    )
    await db_session.flush()

    # 1. Try with zero CAPAs
    with pytest.raises(WorkflowPrerequisiteFailedError) as exc_info:
        await workflow_service.transition_event(
            session=db_session,
            event=event,
            target_state="Effectiveness Review",
            actor_id=base_entities["reviewer"].id,
            expected_version=1
        )
    assert "At least one Corrective Action must exist" in exc_info.value.details["reason"]

    from datetime import datetime, timezone
    # 2. Try with incomplete CAPA
    capa = CorrectiveAction(
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        quality_event_id=event.id,
        title="Test CAPA",
        description="Desc",
        owner_id=base_entities["user"].id,
        priority="High",
        due_date=datetime.now(timezone.utc),
        status="In Progress"
    )
    db_session.add(capa)
    await db_session.flush()

    with pytest.raises(WorkflowPrerequisiteFailedError) as exc_info2:
        await workflow_service.transition_event(
            session=db_session,
            event=event,
            target_state="Effectiveness Review",
            actor_id=base_entities["reviewer"].id,
            expected_version=1
        )
    assert "All linked Corrective Actions must be Completed" in exc_info2.value.details["reason"]

    # 3. Complete the CAPA and try again
    capa.status = "Completed"
    await db_session.flush()

    await workflow_service.transition_event(
        session=db_session,
        event=event,
        target_state="Effectiveness Review",
        actor_id=base_entities["reviewer"].id,
        expected_version=1
    )
    await db_session.flush()
    assert event.status == "Effectiveness Review"

@pytest.mark.asyncio
async def test_reviewer_separation(db_session, base_entities, workflow_service):
    event = workflow_service.event_service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Test Auth",
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
        customer_impact="None",
        status="Rebuttal Pending"
    )
    await db_session.flush()

    # Try QA Review as the employee (should fail)
    with pytest.raises(UnauthorizedWorkflowActionError):
        await workflow_service.transition_event(
            session=db_session,
            event=event,
            target_state="QA Review",
            actor_id=base_entities["user"].id,
            expected_version=1
        )
        
    event.status = "Corrective Action"
    await db_session.flush()
    
    # Try Effectiveness Review as creator (should fail)
    with pytest.raises(UnauthorizedWorkflowActionError):
        await workflow_service.transition_event(
            session=db_session,
            event=event,
            target_state="Effectiveness Review",
            actor_id=base_entities["user"].id,
            expected_version=1
        )