from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict
import re

from app.db.session import get_db

router = APIRouter(prefix="/integrations/outlook", tags=["Outlook Integration"])

@router.post("/webhooks/messages")
async def handle_outlook_messages(
    request: Request,
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook for Microsoft Graph API (/subscriptions).
    Receives notifications when new emails arrive in the shared notification mailbox.
    """
    # Handle Microsoft Graph Webhook validation
    validation_token = request.query_params.get("validationToken")
    if validation_token:
        # Must return the validation token as plain text
        return validation_token
        
    value = payload.get("value", [])
    if not value:
        return {"status": "ignored"}
        
    for notification in value:
        resource_data = notification.get("resourceData", {})
        # In a real app, this would involve fetching the full message via Graph API
        # msg = await graph_client.get(resource_data["@odata.id"])
        
        # Mocking the parsed reply text
        reply_text = resource_data.get("bodyPreview", "")
        
        # Parse the reply body for recognized keywords
        reply_text = reply_text.strip().upper()
        if reply_text.startswith("ACCEPT"):
            # await accept_error_logic(...)
            pass
        elif reply_text.startswith("DISPUTE:"):
            reason = reply_text.replace("DISPUTE:", "", 1).strip()
            if len(reason) < 20:
                # Log invalid format, maybe reply to user
                pass
            else:
                # await rebut_error_logic(...)
                pass
                
    return {"status": "processed"}
