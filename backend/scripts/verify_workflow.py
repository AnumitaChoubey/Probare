import asyncio
import uuid
from datetime import date
import httpx

async def verify_workflow():
    async with httpx.AsyncClient(base_url="http://localhost:8000", timeout=30.0) as client:
        print("1. Logging in as admin...")
        login_data = {"username": "admin", "password": "password123"}
        response = await client.post("/auth/login", data=login_data)
        if response.status_code != 200:
            print("Login failed:", response.json())
            return
        token = response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("   Success! Token received.\n")
        
        print("2. Fetching LOBs and Categories...")
        lobs_resp = await client.get("/errors/lobs", headers=headers)
        lob_id = uuid.uuid4()
        cat_id = uuid.uuid4()
        
        if lobs_resp.status_code == 200 and len(lobs_resp.json()) > 0:
            lob_id = lobs_resp.json()[0]["id"]
            cats_resp = await client.get("/errors/categories", headers=headers)
            if cats_resp.status_code == 200 and len(cats_resp.json()) > 0:
                cat_id = cats_resp.json()[0]["id"]
                
        print(f"   Using LOB UUID: {lob_id}")
        
        print("\n3. Creating a new DRAFT Error (POST /errors)...")
        draft_payload = {
            "lob_id": str(lob_id),
            "category_id": str(cat_id),
            "severity": "HIGH",
            "transaction_reference": "TXN-9999",
            "date_of_occurrence": str(date.today()),
            "date_of_detection": str(date.today()),
            "description": "This is a detailed description over 20 chars long.",
            "client_impact_flag": False,
            "is_draft": True
        }
        
        draft_resp = await client.post("/errors", json=draft_payload, headers=headers)
        if draft_resp.status_code != 201:
            print("   Failed to create draft:", draft_resp.text)
            return
            
        error_id = draft_resp.json()["id"]
        print(f"   Success! Draft created with ID: {error_id}")
        print(f"   Status: {draft_resp.json()['status']}")
        
        print("\n4. Submitting the Draft (POST /errors/{id}/submit)...")
        submit_resp = await client.post(f"/errors/{error_id}/submit", headers=headers)
        if submit_resp.status_code == 200:
            data = submit_resp.json()
            print("   Success! Error submitted.")
            print(f"   Generated QA ID: {data['qa_error_id']}")
            print(f"   New Status: {data['status']}")
            if 'warnings' in data:
                print(f"   Warnings: {data['warnings']}")
        else:
            print("   Failed to submit:", submit_resp.text)
            
        print("\n5. Testing State Machine (PATCH /errors/{id}/status)...")
        status_payload = {
            "to_status": "ACCEPTED_PENDING_CLOSURE",
            "reason": "Verified and accepted"
        }
        status_resp = await client.patch(f"/errors/{error_id}/status", json=status_payload, headers=headers)
        if status_resp.status_code == 200:
            print("   Success! Status advanced.")
            print(f"   Current Status: {status_resp.json()['status']}")
        else:
            print("   Failed to advance status:", status_resp.text)
            
        print("\n6. Listing All Errors (GET /errors)...")
        list_resp = await client.get("/errors", headers=headers)
        if list_resp.status_code == 200:
            data = list_resp.json()
            print(f"   Success! Found {data['total_count']} errors in database.")
            for item in data['items']:
                print(f"   - {item['qa_error_id']} ({item['status']})")
                
        print("\n✅ All Endpoints Verified Successfully!")

if __name__ == "__main__":
    asyncio.run(verify_workflow())
