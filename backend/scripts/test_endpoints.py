import asyncio
import os
import httpx
from datetime import date

async def run_endpoints():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        # First login to get a token
        login_data = {"username": "admin", "password": "password123"}
        response = await client.post("/auth/login", data=login_data)
        if response.status_code != 200:
            print("Login failed:", response.json())
            return
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Test GET /lobs to get a valid LOB ID
        lobs_resp = await client.get("/errors/lobs", headers=headers)
        if lobs_resp.status_code != 200 or len(lobs_resp.json()) == 0:
            print("Need to seed LOBs in DB first to test submission.")
            # For now, let's just test GET /errors
            errs_resp = await client.get("/errors", headers=headers)
            print("GET /errors Status:", errs_resp.status_code)
            print("GET /errors Response:", errs_resp.json())
            return
            
        lob_id = lobs_resp.json()[0]["id"]
        
        cats_resp = await client.get("/errors/categories", headers=headers)
        cat_id = cats_resp.json()[0]["id"] if len(cats_resp.json()) > 0 else None
        
        print(f"Using LOB: {lob_id}, CAT: {cat_id}")
        
        # We can't easily create an error because we need valid LOB and CATEGORY UUIDs.
        # Let's just verify GET /errors works
        errs_resp = await client.get("/errors", headers=headers)
        print("GET /errors Status:", errs_resp.status_code)
        
if __name__ == "__main__":
    asyncio.run(run_endpoints())
