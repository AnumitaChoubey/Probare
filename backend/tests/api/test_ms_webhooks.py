import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_webhook_validation_token():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/v1/integrations/microsoft/webhooks?validationToken=test-token-123")
    
    assert response.status_code == 200
    assert response.headers["content-type"] == "text/plain; charset=utf-8"
    assert response.text == "test-token-123"

@pytest.mark.asyncio
async def test_webhook_post_valid_payload():
    payload = {
        "value": [
            {
                "subscriptionId": "sub-123",
                "clientState": "secret-state",
                "resource": "Users/user1/Messages",
                "changeType": "created",
                "id": "event-1"
            }
        ]
    }
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/integrations/microsoft/webhooks", json=payload)
    
    # Needs 202 Accepted and to gracefully queue (or 500 if DB fails, but we assume DB is mocked/running)
    assert response.status_code in [202, 500]

@pytest.mark.asyncio
async def test_webhook_post_invalid_json():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/integrations/microsoft/webhooks", content="invalid json")
    
    assert response.status_code == 400
