import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

pytestmark = pytest.mark.asyncio

async def test_role_workspaces_filters(setup_ai_test_data):
    project_id = setup_ai_test_data["project"].id
    user_id = setup_ai_test_data["user"].id

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Create an event
        create_resp = await ac.post(
            f"/api/v1/projects/{project_id}/quality-events",
            headers={"Authorization": f"Bearer dev_{user_id}"},
            json={
                "title": "Role Test Event",
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

        # Test involving_me filter for Frontline
        list_resp = await ac.get(
            f"/api/v1/projects/{project_id}/quality-events?involving_me=true",
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        assert list_resp.status_code == 200
        assert len(list_resp.json()["items"]) >= 1

        # Test assigned_to_me
        list_qa = await ac.get(
            f"/api/v1/projects/{project_id}/quality-events?assigned_to_me=true",
            headers={"Authorization": f"Bearer dev_{user_id}"}
        )
        assert list_qa.status_code == 200
        assert "items" in list_qa.json()
