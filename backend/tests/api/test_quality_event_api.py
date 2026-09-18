import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.models.core import User, Tenant, Project, ProjectMember, Team, Role, UserRole

@pytest_asyncio.fixture
async def setup_api_data(db_session):
    unique_id = str(uuid.uuid4())[:8]
    # Tenant
    tenant = Tenant(name=f"api_tenant_{unique_id}")
    db_session.add(tenant)
    await db_session.flush()
    
    # Project
    project = Project(tenant_id=tenant.id, name=f"api_project_{unique_id}")
    db_session.add(project)
    await db_session.flush()
    
    # User (with dev token prefix)
    user = User(tenant_id=tenant.id, email=f"api_dev_{unique_id}@test.com", name="API User", entra_id_sub=f"api-sub-{unique_id}")
    db_session.add(user)
    await db_session.flush()
    
    # Another user (different tenant)
    other_tenant = Tenant(name=f"other_tenant_{unique_id}")
    db_session.add(other_tenant)
    await db_session.flush()
    
    other_user = User(tenant_id=other_tenant.id, email=f"other_{unique_id}@test.com", name="Other", entra_id_sub=f"other-sub-{unique_id}")
    db_session.add(other_user)
    await db_session.flush()
    
    other_role = Role(tenant_id=other_tenant.id, name="Employee")
    db_session.add(other_role)
    await db_session.flush()
    db_session.add(UserRole(user_id=other_user.id, role_id=other_role.id))
    
    # Roles and Memberships
    role = Role(tenant_id=tenant.id, name="Admin")
    db_session.add(role)
    await db_session.flush()
    
    user_role = UserRole(user_id=user.id, role_id=role.id)
    project_member = ProjectMember(project_id=project.id, user_id=user.id, role="Admin")
    team = Team(tenant_id=tenant.id, name="API Team")
    db_session.add_all([user_role, project_member, team])
    
    await db_session.commit()
    
    return {
        "tenant": tenant, 
        "project": project, 
        "user": user, 
        "team": team, 
        "other_tenant": other_tenant,
        "other_user": other_user
    }

@pytest.mark.asyncio
async def test_create_quality_event_success(setup_api_data):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    
    payload = {
        "title": "API Test Event",
        "description": "Test via API",
        "customer_impact": "None",
        "severity": "High",
        "employee_id": setup_api_data["user"].id,
        "team_id": setup_api_data["team"].id,
        "process_id": "test-process",
        "sub_process_id": "test-subprocess",
        "error_type_id": "test-error",
        "sop_id": "test-sop",
        "owner_id": setup_api_data["user"].id
    }
    
    project_id = setup_api_data["project"].id
    user_id = setup_api_data["user"].id
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            json=payload,
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "API Test Event"
    assert data["status"] == "Draft"
    assert data["tenant_id"] == setup_api_data["tenant"].id

@pytest.mark.asyncio
async def test_create_quality_event_missing_project_access(setup_api_data):
    # Use "other_user" who doesn't have project membership to "api_project"
    project_id = setup_api_data["project"].id
    user_id = setup_api_data["other_user"].id
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            json={"title": "Unauthorized", "severity": "High", "employee_id": user_id},
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        
    assert response.status_code == 403
    assert "PROJECT_ACCESS_DENIED" in response.text

@pytest.mark.asyncio
async def test_list_quality_events(setup_api_data):
    project_id = setup_api_data["project"].id
    user_id = setup_api_data["user"].id
    
    # Assuming one was created previously or list is empty initially
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/v1/projects/{project_id}/quality-events",
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        
    assert response.status_code == 200
    assert "items" in response.json()
    assert "total" in response.json()

@pytest.mark.asyncio
async def test_workflow_transition(setup_api_data):
    # First create an event
    project_id = setup_api_data["project"].id
    user_id = setup_api_data["user"].id
    
    payload = {
        "title": "Transition Test",
        "description": "Valid details",
        "customer_impact": "None",
        "severity": "Medium",
        "employee_id": user_id,
        "team_id": setup_api_data["team"].id,
        "process_id": "test-proc",
        "sub_process_id": "test-sub",
        "error_type_id": "test-err",
        "sop_id": "test-sop",
        "owner_id": user_id
    }
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        create_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            json=payload,
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
    assert create_resp.status_code == 201
    event_id = create_resp.json()["id"]
    version = create_resp.json()["version"]
    
    # Transition
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        transition_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events/{event_id}/transitions",
            json={"target_state": "Logged", "expected_version": version, "reason": "moving forward"},
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        
    assert transition_resp.status_code == 200
    assert transition_resp.json()["status"] == "Logged"

@pytest.mark.asyncio
async def test_workflow_transition_conflict(setup_api_data):
    # First create an event
    project_id = setup_api_data["project"].id
    user_id = setup_api_data["user"].id
    
    payload = {
        "title": "Conflict Test",
        "description": "Valid details",
        "customer_impact": "None",
        "severity": "Low",
        "employee_id": user_id,
        "team_id": setup_api_data["team"].id,
        "process_id": "test-proc",
        "sub_process_id": "test-sub",
        "error_type_id": "test-err",
        "sop_id": "test-sop",
        "owner_id": user_id
    }
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        create_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            json=payload,
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
    event_id = create_resp.json()["id"]
    
    # Intentional wrong version to simulate concurrency
    wrong_version = 999
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        transition_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events/{event_id}/transitions",
            json={"target_state": "Logged", "expected_version": wrong_version},
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        
    assert transition_resp.status_code == 409
    assert "CONCURRENT_MODIFICATION" in transition_resp.text
