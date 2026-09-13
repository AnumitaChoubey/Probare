import sys
import os
import asyncio
import pytest
from fastapi.testclient import TestClient
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.main import app
import uuid
from app.db.session import async_session_maker
from sqlalchemy.future import select
from app.db.models.evidence_rule import EvidenceRule

@pytest.mark.asyncio
async def test_rules_client_logic():
    async with async_session_maker() as session:
        # 1. Manually insert/update EvidenceRule to max 100 bytes
        res = await session.execute(select(EvidenceRule).filter_by(id=1))
        rule = res.scalar_one_or_none()
        if not rule:
            rule = EvidenceRule(id=1, max_file_size_bytes=100, max_file_count_per_error=5, allowed_file_types=["text/plain"])
            session.add(rule)
        else:
            rule.max_file_size_bytes = 100
            rule.allowed_file_types = ["text/plain"]
        await session.commit()
    
    url = "/evidence/upload-draft"
    files = {'file': ('test.txt', b'a'*200, 'text/plain')}
    data = {'stage': 'ORIGINAL_LOGGING', 'uploaded_by_user_id': str(uuid.uuid4())}
    
    with TestClient(app) as client:
        resp = client.post(url, files=files, data=data)
        assert resp.status_code == 413 or resp.status_code == 400
