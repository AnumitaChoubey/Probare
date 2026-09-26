import pytest
import uuid
import json
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.quality import QualityEvent
from app.models.integration import SyncHistoryLog

pytestmark = pytest.mark.asyncio

async def test_offline_sync_and_conflict_resolution(
    client: AsyncClient,
    db_session: AsyncSession,
    setup_ai_test_data: dict
):
    """
    Test Phase A Sync Engine requirements:
    1. A developer can go offline, create and edit a Quality Error.
    2. Go back online and push to sync engine.
    3. Conflict resolution resolves with server winning workflow-critical fields.
    4. SyncHistoryLog is written with no data loss.
    """
    user_id = setup_ai_test_data['user'].id
    project_id = setup_ai_test_data['project'].id
    headers = {"Authorization": f"Bearer dev_{user_id}"}
    
    # 1. Create a quality event online initially (simulating a baseline event)
    event_payload = {
        "title": "Initial Error",
        "description": "This is an initial error description",
        "severity": "MEDIUM",
        "process_id": "process-1",
        "sub_process_id": "sub-1",
        "error_type_id": "error-1",
        "sop_id": "sop-1",
        "employee_id": user_id,
        "team_id": setup_ai_test_data['team'].id,
        "customer_impact": "None"
    }
    
    create_resp = await client.post(
        f"/api/v1/projects/{project_id}/quality-events",
        json=event_payload,
        headers=headers
    )
    assert create_resp.status_code == 201
    server_event_id = create_resp.json()["id"]
    initial_version = create_resp.json()["version"]
    
    # 2. Simulate offline local edit by the user
    # The client edits it locally and queues it in sync_outbox
    offline_payload = {
        "title": "Offline Edited Title",
        "description": "Offline Edited Description",
        "status": "Under Review",  # A workflow critical field
        "_server_version": initial_version
    }
    
    # 3. Simulate another user editing it online while this user is offline (creating a conflict)
    # They update the status to "Closed"
    conflict_payload = {
        "title": "Online Title",
        "status": "Closed",
        "version": initial_version
    }
    
    # We bypass the transition API just for test state modification
    event = await db_session.get(QualityEvent, server_event_id)
    event.status = "Closed"
    event.title = "Online Title"
    event.version += 1
    db_session.add(event)
    await db_session.commit()
    
    # 4. User goes back online and pushes sync_outbox
    sync_push_req = {
        "items": [
            {
                "entity_type": "quality_error",
                "entity_local_id": server_event_id,
                "operation": "update",
                "payload_json": json.dumps(offline_payload),
                "idempotency_key": str(uuid.uuid4())
            }
        ]
    }
    
    push_resp = await client.post(
        "/api/v1/sync/push",
        json=sync_push_req,
        headers=headers
    )
    
    assert push_resp.status_code == 200
    push_results = push_resp.json()["results"]
    assert len(push_results) == 1
    assert push_results[0]["success"] == True
    assert push_results[0]["conflict"] == True # Conflict should be detected
    
    # 5. Verify Conflict Resolution Output
    await db_session.refresh(event)
    
    # Server wins for workflow-critical fields
    assert event.status == "Closed"
    
    # 6. Verify SyncHistoryLog is written (No Data Loss)
    stmt = select(SyncHistoryLog).where(SyncHistoryLog.entity_id == server_event_id)
    result = await db_session.execute(stmt)
    history_log = result.scalars().first()
    
    assert history_log is not None
    assert history_log.conflict_reason == "Concurrent modification detected on update"
    assert history_log.superseded_local_version["title"] == "Offline Edited Title"
    assert history_log.superseded_local_version["status"] == "Under Review"
    assert history_log.server_winning_version["status"] == "Closed"
