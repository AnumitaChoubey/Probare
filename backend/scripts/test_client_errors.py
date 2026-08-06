import asyncio
from fastapi.testclient import TestClient
from app.main import app

def test_create_error():
    client = TestClient(app)
    
    # login
    response = client.post("/auth/login", data={"username": "admin", "password": "password123"})
    token = response.json()["access_token"]
    
    # get lobs
    lobs_resp = client.get("/errors/lobs", headers={"Authorization": f"Bearer {token}"})
    lob_id = lobs_resp.json()[0]["id"]
    
    # get cats
    cats_resp = client.get("/errors/categories", headers={"Authorization": f"Bearer {token}"})
    cat_id = cats_resp.json()[0]["id"]
    
    draft_payload = {
        "lob_id": str(lob_id),
        "category_id": str(cat_id),
        "severity": "HIGH",
        "transaction_reference": "TXN-9999",
        "date_of_occurrence": "2026-08-05",
        "date_of_detection": "2026-08-05",
        "description": "This is a detailed description over 20 chars long.",
        "client_impact_flag": False,
        "is_draft": True
    }
    
    draft_resp = client.post("/errors", json=draft_payload, headers={"Authorization": f"Bearer {token}"})
    print("STATUS:", draft_resp.status_code)
    print("RESPONSE:", draft_resp.text)

if __name__ == "__main__":
    test_create_error()
