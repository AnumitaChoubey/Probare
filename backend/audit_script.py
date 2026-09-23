import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.models.core import Tenant, Project, User, Role, UserRole, ProjectMember, Team
from app.models.quality import QualityEvent
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_audit():
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    async with AsyncSessionLocal() as session:
        # Create test data
        suffix = uuid.uuid4().hex[:8]
        
        tenant = Tenant(name=f"Audit Tenant {suffix}", entra_tenant_id=f"audit_entra_{suffix}")
        session.add(tenant)
        await session.flush()
        
        project = Project(name=f"Audit Project {suffix}", tenant_id=tenant.id)
        session.add(project)
        await session.flush()
        
        team = Team(name=f"Audit Team {suffix}", tenant_id=tenant.id)
        session.add(team)
        await session.flush()

        # Users and roles
        roles = ["Frontline Employee", "QA Auditor", "Team Lead", "QA Manager"]
        users = {}
        tokens = {}
        for role_name in roles:
            role = Role(name=role_name, tenant_id=tenant.id)
            session.add(role)
            await session.flush()
            
            user = User(email=f"{role_name.lower().replace(' ', '_')}_{suffix}@test.com", name=role_name, tenant_id=tenant.id, entra_id_sub=f"sub_{role_name}_{suffix}")
            session.add(user)
            await session.flush()
            
            session.add(UserRole(user_id=user.id, role_id=role.id))
            session.add(ProjectMember(project_id=project.id, user_id=user.id, role="MEMBER"))
            
            users[role_name] = user
            tokens[role_name] = f"dev_{user.id}"

        # Another user in same project, but NO relationship to the event
        unrelated_user = User(email=f"unrelated_{suffix}@test.com", name="Unrelated Employee", tenant_id=tenant.id, entra_id_sub=f"sub_unrelated_{suffix}")
        session.add(unrelated_user)
        await session.flush()
        session.add(UserRole(user_id=unrelated_user.id, role_id=role.id)) # Employee role
        session.add(ProjectMember(project_id=project.id, user_id=unrelated_user.id, role="MEMBER"))
        tokens["Unrelated"] = f"dev_{unrelated_user.id}"

        await session.commit()
        
        # 1. Employee creates Quality Event
        logger.info("1. Creating Quality Event as Employee")
        event_id = str(uuid.uuid4())
        event = QualityEvent(
            id=event_id,
            event_number=f"QE-EV-AUDIT-{suffix}",
            title="Audit Event",
            description="Test",
            employee_id=users["Frontline Employee"].id,
            team_id=team.id,
            process_id="P1",
            sub_process_id="SP1",
            error_type_id="E1",
            sop_id="S1",
            severity="High",
            status="Draft",
            owner_id=users["QA Auditor"].id,
            created_by_id=users["Frontline Employee"].id,
            customer_impact="None",
            tenant_id=tenant.id,
            project_id=project.id
        )
        session.add(event)
        await session.commit()
        
        logger.info(f"Created Event ID: {event_id}")

        employee_token = tokens["Frontline Employee"]
        headers_emp = {"Authorization": f"Bearer {employee_token}"}
        
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:

            # 2. Employee -> Message
            resp = await client.post(
                f"/api/v1/projects/{project.id}/quality-events/{event_id}/conversation/messages",
                headers=headers_emp,
                json={"body": "Message from Employee"}
            )
            logger.info(f"Employee Message Status: {resp.status_code}")
            
            # 3. QA Auditor -> Message
            headers_qa = {"Authorization": f"Bearer {tokens['QA Auditor']}"}
            resp = await client.post(
                f"/api/v1/projects/{project.id}/quality-events/{event_id}/conversation/messages",
                headers=headers_qa,
                json={"body": "Message from QA Auditor"}
            )
            logger.info(f"QA Message Status: {resp.status_code}")
            
            # 4. Team Lead -> Message
            headers_tl = {"Authorization": f"Bearer {tokens['Team Lead']}"}
            resp = await client.post(
                f"/api/v1/projects/{project.id}/quality-events/{event_id}/conversation/messages",
                headers=headers_tl,
                json={"body": "Message from Team Lead"}
            )
            logger.info(f"Team Lead Message Status: {resp.status_code}")

            # 5. Get conversation
            resp = await client.get(
                f"/api/v1/projects/{project.id}/quality-events/{event_id}/conversation",
                headers=headers_qa
            )
            conv_id = resp.json()["id"]
            logger.info(f"Conversation ID: {conv_id}")

            # 6. Test Unrelated User Access
            headers_un = {"Authorization": f"Bearer {tokens['Unrelated']}"}
            resp_unrelated = await client.get(
                f"/api/v1/projects/{project.id}/quality-events/{event_id}/conversation",
                headers=headers_un
            )
            logger.info(f"Unrelated User Get Conversation Status: {resp_unrelated.status_code}")

if __name__ == "__main__":
    asyncio.run(run_audit())
