import urllib.request
import urllib.parse
import json
import uuid

# 1. Login to get token
data = urllib.parse.urlencode({'username': 'sysadmin_user', 'password': 'password123'}).encode()
req = urllib.request.Request('http://localhost:8000/auth/login', data=data)
token = json.loads(urllib.request.urlopen(req).read())['access_token']

headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# 2. Patch evidence rules to max 100 bytes
patch_data = {
    "max_file_size_bytes": 100,
    "max_file_count_per_error": 5,
    "allowed_file_types": ["text/plain"]
}
req = urllib.request.Request('http://localhost:8000/admin/evidence-rules', data=json.dumps(patch_data).encode(), headers=headers, method='PATCH')
try:
    resp = json.loads(urllib.request.urlopen(req).read())
    print("PATCH Evidence Rules:", resp)
except Exception as e:
    print("Failed to PATCH evidence rules:", e)

# 3. Try to upload a file > 100 bytes
import httpx

# We'll use httpx to do multipart/form-data easily
url = "http://localhost:8000/errors/evidence/upload-draft"
files = {'file': ('test.txt', b'a'*200, 'text/plain')}
data = {'stage': 'ORIGINAL_LOGGING', 'uploaded_by_user_id': str(uuid.uuid4())}

r = httpx.post(url, files=files, data=data)
print("Upload status:", r.status_code)
print("Upload response:", r.text)

# Restore it back to 25MB
patch_data["max_file_size_bytes"] = 25 * 1024 * 1024
req = urllib.request.Request('http://localhost:8000/admin/evidence-rules', data=json.dumps(patch_data).encode(), headers=headers, method='PATCH')
urllib.request.urlopen(req)
print("Restored rule to 25MB")
