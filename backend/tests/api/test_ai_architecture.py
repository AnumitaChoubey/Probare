import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.core import Project, Tenant, User, ProjectMember, Role, UserRole, Permission, Team
from app.models.quality import QualityEvent
from app.models.integration import AIAnalysisRun, AIInsight, AIUsageRecord
import uuid

@pytest.fixture
async def setup_ai_test_data(db_session: AsyncSession):
    suffix = uuid.uuid4().hex[:8]
    # Create Tenant
    tenant = Tenant(name=f"AI Test Tenant {suffix}", entra_tenant_id=f"ai_test_entra_id_{suffix}")
    db_session.add(tenant)
    await db_session.flush()

    team = Team(name=f"AI Team {suffix}", tenant_id=tenant.id)
    db_session.add(team)
    await db_session.flush()
    
    # Create Project
    project = Project(name=f"AI Project {suffix}", tenant_id=tenant.id)
    db_session.add(project)
    
    # Create User
    user = User(email=f"ai_test_{suffix}@example.com", name="AI User", tenant_id=tenant.id, entra_id_sub=f"ai_test_sub_{suffix}")
    db_session.add(user)
    
    # Create Role
    role = Role(name="Admin", tenant_id=tenant.id)
    db_session.add(role)
    await db_session.commit()
    
    from sqlalchemy import select
    perm_read = (await db_session.execute(select(Permission).where(Permission.name=="events:read"))).scalar_one_or_none()
    if not perm_read:
        perm_read = Permission(name="events:read")
        db_session.add(perm_read)
        
    perm_edit = (await db_session.execute(select(Permission).where(Permission.name=="events:edit"))).scalar_one_or_none()
    if not perm_edit:
        perm_edit = Permission(name="events:edit")
        db_session.add(perm_edit)
    await db_session.commit()
    
    db_session.add(UserRole(user_id=user.id, role_id=role.id))
    db_session.add(ProjectMember(project_id=project.id, user_id=user.id, role="MEMBER"))
    
    # Create Quality Event
    event = QualityEvent(
        event_number=f"QE-EV-AI-{suffix}",
        title="AI Test Event",
        description="Testing AI Architecture",
        employee_id=user.id,
        team_id=team.id, # Mocking team_id with user.id for now since team isn't strict in this test
        process_id="process_1",
        sub_process_id="sub_1",
        error_type_id="error_1",
        sop_id="sop_1",
        severity="High",
        status="Open",
        owner_id=user.id,
        created_by_id=user.id,
        customer_impact="High",
        tenant_id=tenant.id,
        project_id=project.id
    )
    db_session.add(event)
    await db_session.commit()
    
    return {
        "tenant": tenant,
        "project": project,
        "user": user,
        "event": event
    }

@pytest.mark.asyncio
async def test_ai_analysis_execution_and_idempotency(client: AsyncClient, setup_ai_test_data, db_session: AsyncSession, monkeypatch):
    data = setup_ai_test_data
    
    # Set AI Provider to mock via settings
    monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "mock")

    # 1. Trigger Analysis
    payload = {
        "analysis_type": "classification",
        "event_version": 1,
        "structured_input": {"text": "Test input for classification"},
    }
    
    # Needs auth token. Assuming async_client is already authenticated as `data["user"]` in a real test.
    # For now, we will just simulate the auth headers. (Assuming a generic test auth token)
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/ai/analyze",
        json=payload,
        headers=headers
    )
    
    # If auth fails because we didn't mock it fully in this snippet, we assert appropriately.
    # Assuming standard test client setup handles the mock token:
    assert response.status_code == 200, response.text
    result = response.json()
    
    assert result["insight_type"] == "classification"
    assert result["model_provider"] == "mock"
    assert result["status"] == "Draft"
    assert "suggested_severity" in result["result"]
    
    insight_id = result["id"]
    
    # 2. Verify DB Records
    # Check AIAnalysisRun
    stmt = select(AIAnalysisRun).where(AIAnalysisRun.quality_event_id == data['event'].id)
    run_result = await db_session.execute(stmt)
    runs = run_result.scalars().all()
    assert len(runs) == 1
    assert runs[0].status == "COMPLETED"
    
    # Check AIInsight
    stmt = select(AIInsight).where(AIInsight.id == insight_id)
    insight_result = await db_session.execute(stmt)
    db_insight = insight_result.scalar_one()
    assert db_insight.analysis_run_id == runs[0].id
    assert db_insight.confidence == "HIGH"
    
    # Check AIUsageRecord
    stmt = select(AIUsageRecord).where(AIUsageRecord.analysis_run_id == runs[0].id)
    usage_result = await db_session.execute(stmt)
    usage = usage_result.scalar_one()
    assert usage.input_tokens == 150
    assert usage.output_tokens == 50
    
    # 3. Test Idempotency (Same Request)
    response2 = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/ai/analyze",
        json=payload,
        headers=headers
    )
    assert response2.status_code == 200
    result2 = response2.json()
    assert result2["id"] == insight_id # Should return the exact same insight ID!
    
    # Verify no new runs were created
    run_result2 = await db_session.execute(stmt) # re-execute
    runs2 = run_result2.scalars().all()
    assert len(runs2) == 1

@pytest.mark.asyncio
async def test_ai_production_mock_rejection(client: AsyncClient, setup_ai_test_data, monkeypatch):
    data = setup_ai_test_data

    from app.main import app
    from app.api.deps.auth import get_current_user
    from app.schemas.auth import AuthContext
    
    try:
        app.dependency_overrides[get_current_user] = lambda: AuthContext(
            qems_user_id=data['user'].id,
            qems_tenant_id=data['tenant'].id,
            external_subject="test-sub",
            external_tenant_id="test-tenant",
            roles=["Admin"],
            permissions=["EDIT_QUALITY_EVENT", "VIEW_QUALITY_EVENT"],
            accessible_projects=[data['project'].id]
        )
        
        # Force production and mock
        monkeypatch.setattr("app.core.config.settings.AI_PROVIDER", "mock")
        from app.core.config import Settings
        monkeypatch.setattr(Settings, "is_production", property(lambda self: True))
        
        payload = {
            "analysis_type": "classification",
            "event_version": 1,
            "structured_input": {"text": "Test input for classification"},
        }
        headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
        
        response = await client.post(
            f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/ai/analyze",
            json=payload,
            headers=headers
        )
        
        # Should fail closed
        assert response.status_code == 500
        assert "not allowed in production" in response.text
    finally:
        app.dependency_overrides = {}
