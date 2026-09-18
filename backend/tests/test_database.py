import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import text
from app.models.core import Tenant, Project, User, Role, Team
from app.models.quality import QualityEvent, Evidence
from sqlalchemy.exc import IntegrityError, DBAPIError
import uuid

@pytest.mark.asyncio
async def test_database_connection(db_session: AsyncSession):
    result = await db_session.execute(text("SELECT 1"))
    assert result.scalar() == 1

@pytest.mark.asyncio
async def test_cross_project_rejection(db_session: AsyncSession):
    # Create Tenant
    tenant = Tenant(name="Test Tenant Project Rejection")
    db_session.add(tenant)
    await db_session.flush()
    
    # Create Two Projects
    project1 = Project(tenant_id=tenant.id, name="Project 1")
    project2 = Project(tenant_id=tenant.id, name="Project 2")
    db_session.add_all([project1, project2])
    await db_session.flush()
    
    # Create minimal dependencies for QualityEvent
    user = User(tenant_id=tenant.id, name="QA Tester", email=f"qa_{uuid.uuid4()}@test.com")
    role = Role(tenant_id=tenant.id, name="QA Tester")
    team = Team(tenant_id=tenant.id, name="QA Team")
    db_session.add_all([user, role, team])
    await db_session.flush()
    
    # Create Event in Project 1
    event = QualityEvent(
        tenant_id=tenant.id,
        project_id=project1.id,
        event_number=f"QE-{uuid.uuid4().hex[:6]}",
        title="Test Event P1",
        description="Event in P1",
        employee_id=user.id,
        team_id=team.id,
        process_id=user.id, # No longer FK constrained
        sub_process_id=user.id, # No longer FK constrained
        error_type_id=user.id, # No longer FK constrained
        sop_id=user.id, # No longer FK constrained
        severity="Low",
        status="Draft",
        owner_id=user.id,
        created_by_id=user.id,
        customer_impact="None"
    )
    db_session.add(event)
    await db_session.flush()
    
    # Attempt to create Evidence in Project 2, but linking to Event in Project 1
    evidence = Evidence(
        tenant_id=tenant.id,
        project_id=project2.id, # Project 2
        quality_event_id=event.id, # Points to Project 1 event
        title="Test Evidence",
        file_name="test.txt",
        file_size="10KB",
        uploaded_by_id=user.id
    )
    db_session.add(evidence)
    
    with pytest.raises((IntegrityError, DBAPIError)):
        await db_session.flush()
        
@pytest.mark.asyncio
async def test_unique_constraints(db_session: AsyncSession):
    tenant = Tenant(name="Test Tenant Unique")
    db_session.add(tenant)
    await db_session.flush()
    
    email = f"test_{uuid.uuid4()}@example.com"
    user1 = User(email=email, name="User 1", tenant_id=tenant.id)
    db_session.add(user1)
    await db_session.flush()
    
    # Try to create another user with the same email
    user2 = User(email=email, name="User 2", tenant_id=tenant.id)
    db_session.add(user2)
    
    with pytest.raises(IntegrityError):
        await db_session.flush()
