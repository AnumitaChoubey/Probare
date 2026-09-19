import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.models.core import User, Tenant, Project, ProjectMember, Role, UserRole, Team
from app.models.quality import QualityEvent
from app.services.auth_service import AuthService

# Common Fixtures Setup

@pytest_asyncio.fixture
async def security_data(db_session):
    uid = str(uuid.uuid4())[:8]
    
    # 1. Tenants
    t_a = Tenant(name=f"TenantA_{uid}")
    t_b = Tenant(name=f"TenantB_{uid}")
    db_session.add_all([t_a, t_b])
    await db_session.flush()

    # 2. Projects
    p_a = Project(tenant_id=t_a.id, name=f"ProjA_{uid}")
    p_b = Project(tenant_id=t_b.id, name=f"ProjB_{uid}")
    db_session.add_all([p_a, p_b])
    await db_session.flush()
    
    # 3. Roles
    r_emp = Role(tenant_id=t_a.id, name="Frontline Employee")
    r_qa = Role(tenant_id=t_a.id, name="QA Auditor")
    db_session.add_all([r_emp, r_qa])
    await db_session.flush()

    # 4. Users (Tenant A)
    u_emp1 = User(tenant_id=t_a.id, email=f"emp1_{uid}@x.com", name="E1", entra_id_sub=f"sub1_{uid}")
    u_emp2 = User(tenant_id=t_a.id, email=f"emp2_{uid}@x.com", name="E2", entra_id_sub=f"sub2_{uid}")
    u_qa = User(tenant_id=t_a.id, email=f"qa_{uid}@x.com", name="QA", entra_id_sub=f"sub3_{uid}")
    
    # User (Tenant B)
    u_other = User(tenant_id=t_b.id, email=f"other_{uid}@y.com", name="Other", entra_id_sub=f"sub4_{uid}")
    
    db_session.add_all([u_emp1, u_emp2, u_qa, u_other])
    await db_session.flush()

    # 5. Memberships & Roles
    db_session.add_all([
        ProjectMember(project_id=p_a.id, user_id=u_emp1.id, role="Employee"),
        ProjectMember(project_id=p_a.id, user_id=u_emp2.id, role="Employee"),
        ProjectMember(project_id=p_a.id, user_id=u_qa.id, role="QA"),
        ProjectMember(project_id=p_b.id, user_id=u_other.id, role="Employee"),
        UserRole(user_id=u_emp1.id, role_id=r_emp.id),
        UserRole(user_id=u_emp2.id, role_id=r_emp.id),
        UserRole(user_id=u_qa.id, role_id=r_qa.id)
    ])
    await db_session.flush()

    # 6. Quality Events
    team_a = Team(tenant_id=t_a.id, name=f"Team_{uid}")
    db_session.add(team_a)
    await db_session.flush()
    
    # Event 1: Owned by Emp 1
    e1 = QualityEvent(
        tenant_id=t_a.id, project_id=p_a.id, event_number=f"QE-{uid}-1",
        title="Event 1", description="Desc",
        employee_id=u_emp1.id, team_id=team_a.id,
        process_id=str(uuid.uuid4()), sub_process_id=str(uuid.uuid4()),
        error_type_id=str(uuid.uuid4()), sop_id=str(uuid.uuid4()),
        severity="HIGH", status="Logged",
        owner_id=u_emp1.id, created_by_id=u_emp1.id,
        customer_impact="None"
    )
    # Event 2: Owned by Emp 2
    e2 = QualityEvent(
        tenant_id=t_a.id, project_id=p_a.id, event_number=f"QE-{uid}-2",
        title="Event 2", description="Desc",
        employee_id=u_emp2.id, team_id=team_a.id,
        process_id=str(uuid.uuid4()), sub_process_id=str(uuid.uuid4()),
        error_type_id=str(uuid.uuid4()), sop_id=str(uuid.uuid4()),
        severity="HIGH", status="Logged",
        owner_id=u_emp2.id, created_by_id=u_emp2.id,
        customer_impact="None"
    )
    db_session.add_all([e1, e2])
    await db_session.commit()

    return {
        "p_a": p_a, "p_b": p_b,
        "u_emp1": u_emp1, "u_emp2": u_emp2, "u_qa": u_qa, "u_other": u_other,
        "e1": e1, "e2": e2
    }


@pytest.mark.asyncio
async def test_idor_unrelated_employee_access(security_data):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    """
    Test: Frontline Employee 2 attempts to GET Event 1 conversation.
    Expected: 403 Forbidden. (Project membership does not grant arbitrary event access).
    """
    p_a = security_data["p_a"]
    u_emp2 = security_data["u_emp2"]
    e1 = security_data["e1"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Authenticate as Employee 2
        response = await client.get(
            f"/api/v1/projects/{p_a.id}/quality-events/{e1.id}/conversation",
            headers={"Authorization": f"Bearer dev_{u_emp2.id}"}
        )
        # Verify Employee 2 cannot access Employee 1's conversation
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_idor_cross_tenant_access(security_data):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    """
    Test: Tenant B User attempts to access Tenant A Event 1 conversation.
    Expected: 403 Forbidden (Tenant/Project isolation).
    """
    p_a = security_data["p_a"]
    u_other = security_data["u_other"]
    e1 = security_data["e1"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/projects/{p_a.id}/quality-events/{e1.id}/conversation",
            headers={"Authorization": f"Bearer dev_{u_other.id}"}
        )
        assert response.status_code == 403


@pytest.mark.asyncio
async def test_authorized_communication_access(security_data):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    """
    Test: Emp 1 can access Event 1 conversation, QA Auditor can access Event 1 conversation.
    """
    p_a = security_data["p_a"]
    u_emp1 = security_data["u_emp1"]
    u_qa = security_data["u_qa"]
    e1 = security_data["e1"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Emp 1 (owner) accesses their own event
        resp_emp = await client.get(
            f"/api/v1/projects/{p_a.id}/quality-events/{e1.id}/conversation",
            headers={"Authorization": f"Bearer dev_{u_emp1.id}"}
        )
        assert resp_emp.status_code == 200

        # QA (VIEW_ALL_QUALITY_EVENTS) accesses event
        resp_qa = await client.get(
            f"/api/v1/projects/{p_a.id}/quality-events/{e1.id}/conversation",
            headers={"Authorization": f"Bearer dev_{u_qa.id}"}
        )
        assert resp_qa.status_code == 200

        # Both get the same conversation thread
        assert resp_emp.json()["id"] == resp_qa.json()["id"]


@pytest.mark.asyncio
async def test_role_filter_security_enforcement(security_data):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    """
    Test: Even if Emp 1 does not provide filters (or sends involving_me=false),
    the backend strictly restricts the returned list to only events Emp 1 is authorized for.
    """
    p_a = security_data["p_a"]
    u_emp1 = security_data["u_emp1"]
    e1 = security_data["e1"]
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Emp 1 asks for all events (no filters)
        response = await client.get(
            f"/api/v1/projects/{p_a.id}/quality-events",
            headers={"Authorization": f"Bearer dev_{u_emp1.id}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Emp 1 should only see e1, NOT e2!
        assert len(data["items"]) == 1
        assert data["items"][0]["id"] == e1.id


@pytest.mark.asyncio
async def test_role_filter_qa_visibility(security_data):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    """
    Test: QA Auditor (who has broad project review permissions) can see all events in project.
    """
    p_a = security_data["p_a"]
    u_qa = security_data["u_qa"]
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/projects/{p_a.id}/quality-events",
            headers={"Authorization": f"Bearer dev_{u_qa.id}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # QA Auditor sees both e1 and e2
        assert len(data["items"]) == 2
