import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
import io
from app.models.quality import Evidence
from app.services.audit_service import AuditService

@pytest.mark.asyncio
async def test_evidence_cross_tenant_project_isolation(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test accessing evidence across projects/tenants."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    # User A tries to upload to Project B (which they are not in)
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('fake.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'Isolation Test'}
    
    # Try a non-accessible project ID
    bad_project_id = "00000000-0000-0000-0000-000000000000"
    
    response = await client.post(
        f"/api/v1/projects/{bad_project_id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 403
    assert "Project access denied" in response.text

@pytest.mark.asyncio
async def test_evidence_unauthorized_download_delete(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test downloading/deleting evidence without permissions."""
    data = setup_ai_test_data
    # Set headers with NO permissions by overriding
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    # Upload one first using valid permissions
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('fake.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'To Delete'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    assert response.status_code == 201
    evidence_id = response.json()["id"]
    
    # Now simulate a user WITHOUT EDIT_QUALITY_EVENT
    from app.api.deps.auth import get_current_user
    from app.schemas.auth import AuthContext
    from app.main import app
    
    app.dependency_overrides[get_current_user] = lambda: AuthContext(
        qems_user_id=data['user'].id,
        qems_tenant_id=data['tenant'].id,
        external_subject="test-sub",
        external_tenant_id="test-tenant",
        roles=["Viewer"],
        permissions=["VIEW_QUALITY_EVENT"], # Only VIEW, not EDIT
        accessible_projects=[data['project'].id]
    )
    
    try:
        # Try to delete
        del_response = await client.delete(
            f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence/{evidence_id}",
            headers=headers
        )
        assert del_response.status_code == 403
        
        # Try download (should succeed because they have VIEW)
        dl_response = await client.get(
            f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence/{evidence_id}/download",
            headers=headers
        )
        assert dl_response.status_code == 200
        assert "X-Amz-Signature" in dl_response.json()["download_url"]
        
    finally:
        app.dependency_overrides.pop(get_current_user, None)

@pytest.mark.asyncio
async def test_evidence_audit_history_preserved(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Verify audit history is preserved after evidence is deleted."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    # Upload
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('audit.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'Audit Delete Test'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    assert response.status_code == 201
    evidence_id = response.json()["id"]
    
    # Delete
    del_response = await client.delete(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence/{evidence_id}",
        headers=headers
    )
    assert del_response.status_code == 204
    
    # Check Audit DB directly
    from app.models.integration import AuditEvent
    from sqlalchemy import select
    stmt = select(AuditEvent).where(AuditEvent.entity_id == evidence_id)
    result = await db_session.execute(stmt)
    logs = result.scalars().all()
    
    assert len(logs) == 2 # CREATE and DELETE
    assert logs[0].action == "CREATE"
    assert logs[1].action == "DELETE"
