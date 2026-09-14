from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Any, Dict, Optional
import uuid

from app.db.session import get_db
from app.db.models.user import User

router = APIRouter(prefix="/integrations/teams", tags=["Teams Integration"])

class TeamsActionData(BaseModel):
    error_id: uuid.UUID
    justification: Optional[str] = None

class TeamsAction(BaseModel):
    type: str
    verb: str
    data: TeamsActionData

class TeamsValue(BaseModel):
    action: TeamsAction

class TeamsFrom(BaseModel):
    aadObjectId: str

class TeamsInvokeRequest(BaseModel):
    type: str
    name: str
    value: TeamsValue
    from_field: TeamsFrom = None

    class Config:
        fields = {'from_field': 'from'}

@router.post("/messages")
async def handle_teams_messages(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Webhook for Microsoft Teams Bot Framework.
    Accepts adaptive card submissions (Action.Execute) and routes them to internal accept/rebut logic.
    """
    if payload.get("type") == "invoke" and payload.get("name") == "adaptiveCard/action":
        action = payload.get("value", {}).get("action", {})
        verb = action.get("verb")
        data = action.get("data", {})
        error_id = data.get("error_id")
        
        aad_object_id_str = payload.get("from", {}).get("aadObjectId")
        if not aad_object_id_str:
            raise HTTPException(status_code=401, detail="Missing AAD Object ID in request")
            
        try:
            aad_object_id = uuid.UUID(aad_object_id_str)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid AAD Object ID format")

        # Map AAD user to internal user
        stmt = select(User).where(User.aad_object_id == aad_object_id)
        result = await db.execute(stmt)
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found for AAD Object ID")
            
        if verb == "accept_error":
            # In a real scenario, this would call the internal accept logic:
            # await accept_error_logic(db, error_id, current_user=user)
            return {
                "statusCode": 200,
                "type": "application/vnd.microsoft.card.adaptive",
                "value": {
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {"type": "TextBlock", "text": "✅ Error Accepted Successfully", "weight": "Bolder"}
                    ]
                }
            }
            
        elif verb == "rebut_error":
            justification = data.get("justification")
            if not justification or len(justification) < 20:
                raise HTTPException(status_code=400, detail="Justification must be at least 20 characters")
                
            # In a real scenario, this would call the internal rebut logic:
            # await rebut_error_logic(db, error_id, justification, current_user=user)
            return {
                "statusCode": 200,
                "type": "application/vnd.microsoft.card.adaptive",
                "value": {
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {"type": "TextBlock", "text": "✅ Error Disputed Successfully", "weight": "Bolder"}
                    ]
                }
            }
            
    return {"status": "ignored"}
