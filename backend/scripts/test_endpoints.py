import asyncio
import os
import httpx

async def test_endpoints():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        # First login to get a token
        login_data = {"username": "admin", "password": "password123"}
        response = await client.post("/auth/login", data=login_data)
        if response.status_code != 200:
            print("Login failed:", response.json())
            return
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test GET /categories
        cat_resp = await client.get("/errors/categories", headers=headers)
        print("GET /categories Status:", cat_resp.status_code)
        print("GET /categories Response:", cat_resp.json())
        
        # Since DB is empty, let's just make sure the endpoint didn't crash (should return [])

if __name__ == "__main__":
    asyncio.run(test_endpoints())
