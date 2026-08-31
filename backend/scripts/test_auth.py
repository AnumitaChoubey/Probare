import asyncio
from fastapi.testclient import TestClient
from app.main import app

def run_login_and_me():
    client = TestClient(app)
    
    # Test Login
    print("Testing /auth/login...")
    response = client.post("/auth/login", data={"username": "admin", "password": "password123"})
    if response.status_code != 200:
        print(f"FAILED LOGIN: {response.text}")
        return
        
    data = response.json()
    token = data.get("access_token")
    print(f"Login successful. Token: {token[:20]}...")
    
    # Test /auth/me
    print("Testing /auth/me...")
    response = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    if response.status_code != 200:
        print(f"FAILED ME: {response.text}")
        return
        
    me_data = response.json()
    print(f"Me successful: {me_data}")
    print("ALL TESTS PASSED!")

if __name__ == "__main__":
    run_login_and_me()
