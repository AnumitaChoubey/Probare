import urllib.request
import urllib.parse
import json

data = urllib.parse.urlencode({'username': 'charlie_ops', 'password': 'password123'}).encode()
req = urllib.request.Request('http://localhost:8000/auth/login', data=data)
token = json.loads(urllib.request.urlopen(req).read())['access_token']

req2 = urllib.request.Request('http://localhost:8000/errors', headers={'Authorization': f'Bearer {token}'})
resp = json.loads(urllib.request.urlopen(req2).read())

if resp.get('items'):
    error = resp['items'][0]
    print(f"Error {error['qa_error_id']} -> latest_decision: {error.get('latest_decision')}")
else:
    print("No errors")
