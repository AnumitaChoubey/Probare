import pytest
import pytest_asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.config import settings
from app.models.core import User, Tenant

@pytest_asyncio.fixture
async def dev_auth_setup(db_session):
    unique_id = str(uuid.uuid4())[:8]
    # Ensure a tenant and user exist for dev token
    tenant = Tenant(name=f"dev_tenant_{unique_id}")
    db_session.add(tenant)
    await db_session.flush()
    
    user = User(tenant_id=tenant.id, email=f"dev_{unique_id}@test.com", name="Dev User", entra_id_sub=f"dev-sub-{unique_id}")
    db_session.add(user)
    await db_session.flush()
    await db_session.commit()
    return user

@pytest.mark.asyncio
async def test_auth_me_success_dev_provider(dev_auth_setup):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer dev_{dev_auth_setup.id}"}
        )
        
    assert response.status_code == 200
    data = response.json()
    assert data["qems_user_id"] == dev_auth_setup.id
    assert data["qems_tenant_id"] == dev_auth_setup.tenant_id

@pytest.mark.asyncio
async def test_auth_me_fails_in_production(dev_auth_setup):
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "production"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer dev_{dev_auth_setup.id}"}
        )
        
    assert response.status_code in (401, 403)

@pytest.mark.asyncio
async def test_auth_me_invalid_token():
    settings.AUTH_PROVIDER = "development"
    settings.APPLICATION_ENV = "development"
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer not_dev_format"}
        )
        
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_auth_me_missing_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/auth/me")
        
    assert response.status_code in (401, 403)
