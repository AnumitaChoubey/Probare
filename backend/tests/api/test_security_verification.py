import pytest
import pytest_asyncio
import uuid
import jwt
from unittest.mock import patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from sqlalchemy.future import select

from app.main import app
from app.core.config import settings
from app.models.core import User, Tenant, Project, ProjectMember, Team, Role, UserRole
from app.models.quality import QualityEvent
from app.domain.exceptions import UnauthorizedWorkflowActionError
from app.services.audit_service import AuditService

@pytest_asyncio.fixture
async def security_data(db_session):
    uid = str(uuid.uuid4())[:8]
    
    # Tenant A
    tenant_a = Tenant(name=f"tenant_A_{uid}", entra_tenant_id=f"entra_A_{uid}")
    # Tenant B
    tenant_b = Tenant(name=f"tenant_B_{uid}", entra_tenant_id=f"entra_B_{uid}")
    
    db_session.add_all([tenant_a, tenant_b])
    await db_session.flush()
    
    # Project A (Tenant A)
    project_a = Project(tenant_id=tenant_a.id, name=f"Proj_A_{uid}")
    # Project B (Tenant A)
    project_b = Project(tenant_id=tenant_a.id, name=f"Proj_B_{uid}")
    
    db_session.add_all([project_a, project_b])
    await db_session.flush()
    
    # User A (Tenant A, Access to Proj A)
    user_a = User(tenant_id=tenant_a.id, email=f"A_{uid}@test.com", name="User A", entra_id_sub=f"sub_A_{uid}")
    # User B (Tenant A, Access to Proj B)
    user_b = User(tenant_id=tenant_a.id, email=f"B_{uid}@test.com", name="User B", entra_id_sub=f"sub_B_{uid}")
    # User C (Tenant B)
    user_c = User(tenant_id=tenant_b.id, email=f"C_{uid}@test.com", name="User C", entra_id_sub=f"sub_C_{uid}")
    
    db_session.add_all([user_a, user_b, user_c])
    await db_session.flush()
    
    # Roles & Memberships
    role_admin = Role(tenant_id=tenant_a.id, name="Admin")
    role_admin_b = Role(tenant_id=tenant_b.id, name="Admin")
    db_session.add_all([role_admin, role_admin_b])
    await db_session.flush()
    
    db_session.add(UserRole(user_id=user_a.id, role_id=role_admin.id))
    db_session.add(UserRole(user_id=user_b.id, role_id=role_admin.id))
    db_session.add(UserRole(user_id=user_c.id, role_id=role_admin_b.id))
    
    db_session.add(ProjectMember(project_id=project_a.id, user_id=user_a.id, role="Admin"))
    db_session.add(ProjectMember(project_id=project_b.id, user_id=user_b.id, role="Admin"))
    
    team = Team(tenant_id=tenant_a.id, name="Sec Team")
    db_session.add(team)
    
    await db_session.commit()
    
    return {
        "tenant_a": tenant_a, "tenant_b": tenant_b,
        "project_a": project_a, "project_b": project_b,
        "user_a": user_a, "user_b": user_b, "user_c": user_c,
        "team": team
    }

@pytest.mark.asyncio
async def test_identity_spoofing(security_data):
    """
    Attempt to inject created_by_id or tenant_id into the JSON body.
    Verify the backend ignores it and uses the AuthContext (User A).
    """
    settings.AUTH_PROVIDER = "development"
    
    # User A makes the request but tries to spoof User B and Tenant B
    project_id = security_data["project_a"].id
    user_a = security_data["user_a"]
    user_b = security_data["user_b"]
    tenant_b = security_data["tenant_b"]
    
    payload = {
        "title": "Spoofed Event",
        "description": "test",
        "customer_impact": "None",
        "severity": "High",
        "employee_id": user_a.id,
        "team_id": security_data["team"].id,
        "process_id": "test-process",
        "sub_process_id": "test-subprocess",
        "error_type_id": "test-error",
        "sop_id": "test-sop",
        "owner_id": user_a.id,
        "tenant_id": tenant_b.id,           # spoofing attempt
        "created_by_id": user_b.id,         # spoofing attempt
        "actor_id": user_b.id,              # spoofing attempt
        "permissions": ["GOD_MODE"]         # spoofing attempt
    }
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            json=payload,
            headers={"Authorization": f"Bearer dev_{user_a.id}"}
        )
        
    assert response.status_code == 201
    data = response.json()
    
    # Verify the created event uses User A's real identity, not User B's
    assert data["created_by_id"] == user_a.id
    assert data["tenant_id"] == security_data["tenant_a"].id
    assert "permissions" not in data # Schema doesn't reflect spoofed permissions

@pytest.mark.asyncio
async def test_transaction_boundary_rollback(security_data, db_session):
    """
    Verify that if the AuditService fails, the QualityEvent is NOT committed to the database.
    """
    settings.AUTH_PROVIDER = "development"
    project_id = security_data["project_a"].id
    user_a = security_data["user_a"]
    
    payload = {
        "title": "Rollback Event",
        "description": "test",
        "customer_impact": "None",
        "severity": "High",
        "employee_id": user_a.id,
        "team_id": security_data["team"].id,
        "process_id": "test-process",
        "sub_process_id": "test-subprocess",
        "error_type_id": "test-error",
        "sop_id": "test-sop",
        "owner_id": user_a.id,
    }
    
    # First, create a Draft event successfully
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            json=payload,
            headers={"Authorization": f"Bearer dev_{user_a.id}"}
        )
    assert response.status_code == 201
    event_id = response.json()["id"]
    version = response.json()["version"]

    # Mock AuditService.record_action to raise an exception simulating a mid-transaction failure
    with patch.object(AuditService, 'record_action', side_effect=Exception("Database failure mid-transaction")):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            transition_response = await ac.post(
                f"/api/v1/projects/{project_id}/quality-events/{event_id}/transitions",
                json={"target_state": "Logged", "expected_version": version, "reason": "moving forward"},
                headers={"Authorization": f"Bearer dev_{user_a.id}"}
            )
            
    assert transition_response.status_code == 500
    
    # Verify rollback: The Quality Event should NOT have transitioned, status should still be Draft
    result = await db_session.execute(select(QualityEvent).filter(QualityEvent.id == event_id))
    event = result.scalars().first()
    assert event.status == "Draft"
    assert event.version == version

@pytest.mark.asyncio
async def test_idor_cross_tenant_access(security_data):
    """
    User C (Tenant B) attempts to access Project A (Tenant A)
    """
    settings.AUTH_PROVIDER = "development"
    project_a_id = security_data["project_a"].id
    user_c = security_data["user_c"]
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/v1/projects/{project_a_id}/quality-events",
            headers={"Authorization": f"Bearer dev_{user_c.id}"}
        )
        
    assert response.status_code == 403
    assert "PROJECT_ACCESS_DENIED" in response.text

@pytest.mark.asyncio
async def test_idor_cross_project_access(security_data):
    """
    User A (Tenant A, Project A) attempts to access Project B (Tenant A)
    """
    settings.AUTH_PROVIDER = "development"
    project_b_id = security_data["project_b"].id
    user_a = security_data["user_a"]
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"/api/v1/projects/{project_b_id}/quality-events",
            headers={"Authorization": f"Bearer dev_{user_a.id}"}
        )
        
    assert response.status_code == 403
    assert "PROJECT_ACCESS_DENIED" in response.text

@pytest.mark.asyncio
async def test_jwt_security():
    """
    Test PyJWT rejection of invalid tokens via EntraOIDCProvider (unit-level)
    """
    from app.api.deps.auth import EntraOIDCProvider
    from fastapi import Request
    
    provider = EntraOIDCProvider()
    
    # Test malformed
    with pytest.raises(Exception) as exc:
        await provider.authenticate(None, "invalid.token.here", None)
    assert "401" in str(exc.value)
    
    # Test forged signature
    forged_token = jwt.encode({"sub": "123", "tid": "456"}, "secret", algorithm="HS256")
    with pytest.raises(Exception) as exc:
        await provider.authenticate(None, forged_token, None)
    assert "401" in str(exc.value)
    
@pytest.mark.asyncio
async def test_error_information_leak(security_data):
    """
    Verify that 500 errors do not leak stack traces or internals.
    """
    settings.AUTH_PROVIDER = "development"
    project_id = security_data["project_a"].id
    user_a = security_data["user_a"]
    
    payload = {
        "title": "Leak Test", 
        "description": "test", 
        "customer_impact": "None",
        "severity": "High", 
        "employee_id": user_a.id,
        "team_id": security_data["team"].id,
        "process_id": "test-process",
        "sub_process_id": "test-subprocess",
        "error_type_id": "test-error",
        "sop_id": "test-sop",
        "owner_id": user_a.id,
    }
    
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            json=payload,
            headers={"Authorization": f"Bearer dev_{user_a.id}"}
        )
    assert response.status_code == 201
    event_id = response.json()["id"]
    version = response.json()["version"]

    with patch.object(AuditService, 'record_action', side_effect=ValueError("Secret internal database password: Password123")):
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            transition_response = await ac.post(
                f"/api/v1/projects/{project_id}/quality-events/{event_id}/transitions",
                json={"target_state": "Logged", "expected_version": version, "reason": "leak"},
                headers={"Authorization": f"Bearer dev_{user_a.id}"}
            )
            
    assert transition_response.status_code == 500
    data = transition_response.json()
    assert "error" in data
    assert data["error"]["code"] == "INTERNAL_SERVER_ERROR"
    assert "Password123" not in transition_response.text
    assert "Traceback" not in transition_response.text
    assert "request_id" in data["error"]
