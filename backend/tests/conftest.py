import pytest
import asyncio
import os

# We use the isolated test database for testing, ensuring it doesn't touch the dev database.
TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL", 
    "postgresql+asyncpg://qems_test_user:qems_test_password@test-postgres:5432/qems_test_db"
)

# Set the environment variables for the test run so the app uses the test DB
os.environ["DATABASE_URL"] = TEST_DATABASE_URL
os.environ["AUTH_PROVIDER"] = "development"
os.environ["APPLICATION_ENV"] = "testing"

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import NullPool
from app.main import app
from app.core.database import get_db



@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def setup_test_db():
    from alembic.config import Config
    from alembic import command
    
    # Run alembic upgrade head programmatically against the test DB
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", TEST_DATABASE_URL)
    
    # Run migrations in a separate thread because alembic is synchronous
    def run_upgrade():
        try:
            command.downgrade(alembic_cfg, "base")
        except Exception:
            pass
        command.upgrade(alembic_cfg, "head")
        
    await asyncio.to_thread(run_upgrade)
    
    yield
    
    # Optionally, we could drop all tables here after tests finish.
    # def run_downgrade():
    #     command.downgrade(alembic_cfg, "base")
    # await asyncio.to_thread(run_downgrade)

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False, poolclass=NullPool)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

@pytest.fixture(scope="session")
def engine(setup_test_db):
    return test_engine

@pytest.fixture(scope="session")
def TestingSessionLocal(engine):
    return TestSessionLocal

@pytest.fixture
async def db_session(setup_test_db) -> AsyncSession:
    async with TestSessionLocal() as session:
        yield session
        await session.rollback()

# Override get_db in FastAPI
async def override_get_db():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture
async def client() -> AsyncClient:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
async def setup_ai_test_data(db_session: AsyncSession):
    import uuid
    from app.models.core import Project, Tenant, User, ProjectMember, Role, UserRole, Permission, Team
    from app.models.quality import QualityEvent
    
    suffix = uuid.uuid4().hex[:8]
    tenant = Tenant(name=f"AI Test Tenant {suffix}", entra_tenant_id=f"ai_test_entra_id_{suffix}")
    db_session.add(tenant)
    await db_session.flush()

    team = Team(name=f"AI Team {suffix}", tenant_id=tenant.id)
    db_session.add(team)
    await db_session.flush()
    
    project = Project(name=f"AI Project {suffix}", tenant_id=tenant.id)
    db_session.add(project)
    
    user = User(email=f"ai_test_{suffix}@example.com", name="AI User", tenant_id=tenant.id, entra_id_sub=f"ai_test_sub_{suffix}")
    db_session.add(user)
    
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
    
    event = QualityEvent(
        event_number=f"QE-EV-AI-{suffix}",
        title="AI Test Event",
        description="Testing AI Architecture",
        employee_id=user.id,
        team_id=team.id,
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
