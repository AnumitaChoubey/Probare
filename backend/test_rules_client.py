import sys
import os
import asyncio
from fastapi.testclient import TestClient
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.main import app

client = TestClient(app)

# We need an admin user token to patch evidence rules.
# Wait, TestClient can just be authenticated if we override the dependency, 
# or we can just send a mock token if there's a mock auth backend for tests.
# But actually, the fastest way is to just hit the database directly for setup.
import uuid
from app.db.session import async_session_maker
from sqlalchemy.future import select
from app.db.models.evidence_rule import EvidenceRule

async def test_logic():
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
        print("Updated rule max_file_size_bytes to 100")

    # 2. Hit the /errors/draft/evidence endpoint which does NOT require auth (it uses Form("user-default-1"))
    # Wait, does it require auth? 
    # @router.post("/errors/{error_id}/evidence", ...) doesn't have a Depends(get_current_user) in its signature!
    # Ah! P3 didn't add auth to the upload endpoints.
    
    url = "/errors/evidence/upload-draft"
    files = {'file': ('test.txt', b'a'*200, 'text/plain')}
    data = {'stage': 'ORIGINAL_LOGGING', 'uploaded_by_user_id': str(uuid.uuid4())}
    
    resp = client.post(url, files=files, data=data)
    print("Upload status:", resp.status_code)
    print("Upload response:", resp.text)
    
    if resp.status_code == 400 and "exceeds maximum allowed size" in resp.text:
        print("SUCCESS! The dynamic rule blocked the 200 byte file.")
    else:
        print("FAILED! Expected 400 Bad Request with size error.")

if __name__ == "__main__":
    asyncio.run(test_logic())
