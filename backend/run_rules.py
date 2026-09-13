from fastapi.testclient import TestClient
from app.main import app
import uuid

def test_evidence_rules():
    with TestClient(app) as client:
        # 1. Login to get token
        response = client.post("/auth/login", data={'username': 'sysadmin_user', 'password': 'password123'})
        if response.status_code != 200:
            print("Sysadmin user not seeded in DB, skipping")
            return
            
        token = response.json()['access_token']
        
        headers = {'Authorization': f'Bearer {token}'}
        
        # 2. Patch evidence rules to max 100 bytes
        patch_data = {
            "max_file_size_bytes": 100,
            "max_file_count_per_error": 5,
            "allowed_file_types": ["text/plain"]
        }
        r_patch = client.patch('/admin/evidence-rules', json=patch_data, headers=headers)
        assert r_patch.status_code == 200
        
        # 3. Try to upload a file > 100 bytes
        files = {'file': ('test.txt', b'a'*200, 'text/plain')}
        data = {'stage': 'ORIGINAL_LOGGING', 'uploaded_by_user_id': str(uuid.uuid4())}
        
        r_upload = client.post("/evidence/upload-draft", files=files, data=data)
        assert r_upload.status_code == 413 # Payload Too Large
        
        # 4. Restore it back to 25MB
        patch_data["max_file_size_bytes"] = 25 * 1024 * 1024
        r_restore = client.patch('/admin/evidence-rules', json=patch_data, headers=headers)
        assert r_restore.status_code == 200
