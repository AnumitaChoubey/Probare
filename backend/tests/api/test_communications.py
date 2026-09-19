import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

pytestmark = pytest.mark.asyncio

async def test_communications_lifecycle(setup_ai_test_data):
    project_id = setup_ai_test_data["project"].id
    user_id = setup_ai_test_data["user"].id
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Create a quality event
        create_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            headers={"Authorization": f"Bearer dev_{user_id}"},
            json={
                "title": "Communications Test Event",
                "description": "Test",
                "employee_id": user_id,
                "team_id": setup_ai_test_data["event"].team_id,
                "process_id": "PROC-001",
                "sub_process_id": "SUB-001",
                "error_type_id": "ERR-001",
                "sop_id": "SOP-123",
                "severity": "High",
                "owner_id": user_id,
                "customer_impact": "None"
            }
        )
        assert create_resp.status_code == 201
        event_id = create_resp.json()["id"]

        # 2. Post a message
        msg1_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events/{event_id}/conversation/messages",
            headers={"Authorization": f"Bearer dev_{user_id}"},
            json={"body": "Hello from Employee"}
        )
        assert msg1_resp.status_code == 201
        assert msg1_resp.json()["body"] == "Hello from Employee"

        # 3. Read the conversation
        conv_resp = await ac.get(
            f"/api/v1/projects/{project_id}/quality-events/{event_id}/conversation",
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        assert conv_resp.status_code == 200

        # 4. Post a reply
        msg2_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events/{event_id}/conversation/messages",
            headers={"Authorization": f"Bearer dev_{user_id}"},
            json={"body": "Hello from QA Auditor"}
        )
        assert msg2_resp.status_code == 201

        # 5. Fetch all messages and verify order
        msgs_resp = await ac.get(
            f"/api/v1/projects/{project_id}/quality-events/{event_id}/conversation/messages",
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        assert msgs_resp.status_code == 200
        msgs = msgs_resp.json()["items"]
        assert len(msgs) == 2
        assert msgs[0]["body"] == "Hello from Employee"
        assert msgs[1]["body"] == "Hello from QA Auditor"
