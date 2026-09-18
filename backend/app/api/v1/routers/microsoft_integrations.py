from fastapi import APIRouter, Request, Response, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, Optional
import logging
from app.core.database import get_db
from app.core.config import settings
from app.models.integration import IntegrationEvent
import uuid
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/integrations/microsoft", tags=["microsoft-integrations"])

@router.get("/webhooks")
async def validate_webhook(validationToken: str = Query(..., description="Microsoft Graph validation token")):
    """
    Handles the Microsoft Graph Webhook subscription validation challenge.
    Graph sends a GET request with a validationToken query parameter.
    We must respond within 10s with a 200 OK and text/plain body containing exactly the validationToken.
    """
    logger.info("Received Microsoft Graph webhook validation challenge.")
    # Return exactly the token as text/plain
    return Response(content=validationToken, media_type="text/plain", status_code=200)

@router.post("/webhooks")
async def handle_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handles incoming Microsoft Graph lifecycle and change notifications.
    Stores the notification safely as an IntegrationEvent and returns 202 Accepted.
    """
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    if "value" not in payload:
        # Acknowledge gracefully if shape is unexpected but valid JSON
        return Response(status_code=202)

    events_to_process = []
    
    # Validation step (clientState verification can be added here)
    for notification in payload.get("value", []):
        client_state = notification.get("clientState")
        # Ensure it matches expected secret, this is basic MS Graph security for webhooks
        if settings.MS_GRAPH_WEBHOOK_SECRET and client_state != settings.MS_GRAPH_WEBHOOK_SECRET:
            logger.warning(f"Webhook clientState mismatch. Ignoring notification.")
            continue
            
        subscription_id = notification.get("subscriptionId")
        # Basic deduplication strategy based on MS Graph data or generate a unique tracking ID
        tracking_id = notification.get("id") or str(uuid.uuid4())
        
        integration_event = IntegrationEvent(
            source="MICROSOFT_GRAPH",
            payload=notification,
            status="PENDING",
            subscription_id=subscription_id,
            external_event_id=tracking_id,
            idempotency_key=f"msgraph_webhook_{tracking_id}"
        )
        db.add(integration_event)
        events_to_process.append(integration_event)

    try:
        await db.commit()
    except Exception as e:
        await db.rollback()
        logger.error(f"Failed to persist MS Graph webhook events: {e}")
        # Return 202 to avoid Graph retrying infinitely if it's our internal DB issue, 
        # or 500 to let Graph retry. Returning 202 is safer to prevent queue flooding if DB is completely down,
        # but 500 is technically more correct for retry. Let's use 500.
        raise HTTPException(status_code=500, detail="Internal Server Error")

    # Events are safely stored in DB with status PENDING.
    # InboxWorker will pick them up transactionally via SKIP LOCKED.

    return Response(status_code=202)
