import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.core import Tenant, Project, User, Team
from app.services.quality_event_service import QualityEventService
from app.domain.exceptions import ConcurrentModificationError

@pytest.fixture
async def base_entities(db_session: AsyncSession):
    tenant = Tenant(name="Test Tenant")
    db_session.add(tenant)
    await db_session.flush()

    project = Project(tenant_id=tenant.id, name="Test Project")
    user = User(tenant_id=tenant.id, name="Test User", email=f"test_{uuid.uuid4()}@test.com")
    team = Team(tenant_id=tenant.id, name="Test Team")
    db_session.add_all([project, user, team])
    await db_session.flush()

    return {"tenant": tenant, "project": project, "user": user, "team": team}

@pytest.mark.asyncio
async def test_create_and_get_quality_event(db_session: AsyncSession, base_entities):
    service = QualityEventService()
    
    event = service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Issue in Production",
        description="Found a bug.",
        employee_id=base_entities["user"].id,
        team_id=base_entities["team"].id,
        process_id=base_entities["user"].id,
        sub_process_id=base_entities["user"].id,
        error_type_id=base_entities["user"].id,
        sop_id=base_entities["user"].id,
        severity="High",
        owner_id=base_entities["user"].id,
        created_by_id=base_entities["user"].id,
        customer_impact="Significant"
    )
    
    await db_session.flush()
    
    # Assert
    assert event.id is not None
    assert event.event_number.startswith("QE-")
    assert event.status == "Draft"
    assert event.version == 1

    fetched_event = await service.get_event(db_session, event.id)
    assert fetched_event.title == "Issue in Production"

@pytest.mark.asyncio
async def test_update_quality_event_occ(db_session: AsyncSession, base_entities):
    service = QualityEventService()
    
    event = service.create_event(
        session=db_session,
        tenant_id=base_entities["tenant"].id,
        project_id=base_entities["project"].id,
        title="Original",
        description="Desc",
        employee_id=base_entities["user"].id,
        team_id=base_entities["team"].id,
        process_id=base_entities["user"].id,
        sub_process_id=base_entities["user"].id,
        error_type_id=base_entities["user"].id,
        sop_id=base_entities["user"].id,
        severity="High",
        owner_id=base_entities["user"].id,
        created_by_id=base_entities["user"].id,
        customer_impact="None"
    )
    await db_session.flush()

    # Valid update
    updated_event = service.update_event(
        session=db_session,
        event=event,
        expected_version=1,
        updates={"title": "Updated Title"}
    )
    await db_session.flush()

    assert updated_event.title == "Updated Title"
    assert updated_event.version == 2

    # Invalid update (stale version)
    with pytest.raises(ConcurrentModificationError) as exc_info:
        service.update_event(
            session=db_session,
            event=event,
            expected_version=1,  # stale, should be 2
            updates={"title": "Should Fail"}
        )
    
    assert exc_info.value.code == "CONCURRENT_MODIFICATION"
    assert exc_info.value.details["actual_version"] == 2
