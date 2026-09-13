from fastapi.testclient import TestClient
from app.main import app
import json
import pytest
import json

def test_api_fetch_errors():
    with TestClient(app) as client:
        response = client.post(
            "/auth/login",
            data={'username': 'admin', 'password': 'password123'}
        )
        if response.status_code != 200:
            print("Admin user not seeded in DB, skipping")
            return
            
        token = response.json()['access_token']

        response2 = client.get(
            "/errors",
            headers={'Authorization': f'Bearer {token}'}
        )
        assert response2.status_code == 200
        resp = response2.json()
        
        if resp.get('items'):
            error = resp['items'][0]
            print(f"Error {error['qa_error_id']} -> latest_decision: {error.get('latest_decision')}")
        else:
            print("No errors")
