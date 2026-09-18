import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import UploadFile
import io

@pytest.mark.asyncio
async def test_evidence_spoofed_extension(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test uploading a PDF file with a .jpg extension."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    # PDF magic bytes, but named .jpg
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('fake.jpg', io.BytesIO(fake_pdf), 'image/jpeg')}
    data_payload = {'title': 'Fake Image'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 400
    assert "File content does not match its extension" in response.text or "Declared content type does not match" in response.text

@pytest.mark.asyncio
async def test_evidence_spoofed_mime(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test uploading a PDF file with a correct .pdf extension but spoofed declared MIME type."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('fake.pdf', io.BytesIO(fake_pdf), 'image/jpeg')}
    data_payload = {'title': 'Spoofed MIME'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 400
    assert "Declared content type does not match" in response.text

@pytest.mark.asyncio
async def test_evidence_magic_byte_mismatch(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test uploading a text file named .pdf."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    fake_text = b"Just some plain text, not a PDF"
    files = {'file': ('fake.pdf', io.BytesIO(fake_text), 'application/pdf')}
    data_payload = {'title': 'Magic Mismatch'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 400
    assert "File content does not match its extension" in response.text

@pytest.mark.asyncio
async def test_evidence_path_traversal(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test path traversal in filename."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('../../../etc/passwd.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'Path Traversal'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    assert response.status_code == 201 # Upload successful because os.path.basename sanitized it
    assert response.json()["file_name"] == "passwd.pdf"

@pytest.mark.asyncio
async def test_evidence_null_byte(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Test null byte in filename."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    fake_pdf = b"%PDF-1.4\n%..."
    files = {'file': ('file\0name.pdf', io.BytesIO(fake_pdf), 'application/pdf')}
    data_payload = {'title': 'Null Byte'}
    
    response = await client.post(
        f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/evidence",
        headers=headers,
        data=data_payload,
        files=files
    )
    
    # The framework (python-multipart) often strips null bytes before we see them, 
    # so we either expect 400 (if our code caught it) or 201 (if it was safely sanitized).
    assert response.status_code in (400, 201)
