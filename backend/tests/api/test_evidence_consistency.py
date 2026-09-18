import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.quality import Evidence
import io

@pytest.mark.asyncio
async def test_evidence_storage_upload_failure(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data, monkeypatch):
    """Test that if MinIO fails, DB record is not created."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    # Mock storage upload to fail
    from app.integrations.storage.minio_adapter import MinIOStorageAdapter
    async def mock_upload(*args, **kwargs):
        raise Exception("Mock MinIO Upload Failure")
    monkeypatch.setattr(MinIOStorageAdapter, "upload_file", mock_upload)
    
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('fake.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'Should Fail Upload'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 500
    assert "Storage upload failed" in response.text
    
    # Verify no DB record exists
    stmt = select(Evidence).where(Evidence.title == 'Should Fail Upload')
    result = await db_session.execute(stmt)
    assert result.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_evidence_db_failure_cleans_up(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data, monkeypatch):
    """Test that if DB commit fails, storage object is cleaned up."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    # Mock storage to record what was uploaded and deleted
    uploaded_keys = []
    deleted_keys = []
    from app.integrations.storage.minio_adapter import MinIOStorageAdapter
    async def mock_upload(self, file_obj, object_key, content_type, metadata=None):
        uploaded_keys.append(object_key)
    async def mock_delete(self, object_key):
        deleted_keys.append(object_key)
        
    monkeypatch.setattr(MinIOStorageAdapter, "upload_file", mock_upload)
    monkeypatch.setattr(MinIOStorageAdapter, "delete_file", mock_delete)
    
    # Mock db.commit to fail
    from sqlalchemy.ext.asyncio import AsyncSession
    async def mock_commit(self):
        raise Exception("Mock DB Commit Failure")
    monkeypatch.setattr(AsyncSession, "commit", mock_commit)
    
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('fake.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'Should Fail DB'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 500
    assert "Failed to save evidence metadata" in response.text
    
    # Verify upload was called, and delete was called on the same key
    assert len(uploaded_keys) == 1
    assert len(deleted_keys) == 1
    assert uploaded_keys[0] == deleted_keys[0]

@pytest.mark.asyncio
async def test_evidence_checksum_persistence(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test that checksum is returned and persisted in DB."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    import hashlib
    fake_pdf = b"%PDF-1.4\n% Some pdf content"
    expected_checksum = hashlib.sha256(fake_pdf).hexdigest()
    
    files = {'file': ('test_checksum.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'Checksum Test'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 201
    result = response.json()
    assert result["checksum"] == expected_checksum
    
    # Verify DB record
    stmt = select(Evidence).where(Evidence.id == result["id"])
    db_result = await db_session.execute(stmt)
    evidence = db_result.scalar_one()
    assert evidence.checksum == expected_checksum
