from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.services.notification_service import NotificationService
from app.services.outbox_service import OutboxService

router = APIRouter()

def get_notification_service() -> NotificationService:
    return NotificationService(outbox_service=OutboxService())

class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    timestamp: str
    read: bool
    linkId: str | None = None

@router.get("", response_model=List[NotificationResponse])
async def list_notifications(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    service: NotificationService = Depends(get_notification_service)
):
    notifs = await service.get_notifications(
        session=session, 
        user_id=auth_context.qems_user_id, 
        tenant_id=auth_context.qems_tenant_id
    )
    
    responses = []
    for n in notifs:
        # Generate friendly timestamp (in UI they expect a string like "2 hours ago" or just the date string)
        # We'll just return ISO and let UI format, or format simply
        dt_str = n.created_at.strftime("%b %d, %I:%M %p") if n.created_at else "Just now"
        
        responses.append(NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.body,
            timestamp=dt_str,
            read=n.read_at is not None,
            linkId=n.link
        ))
        
    return responses

@router.post("/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notification_id: str = Path(...),
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    service: NotificationService = Depends(get_notification_service)
):
    await service.mark_read(
        session=session, 
        notification_id=notification_id, 
        user_id=auth_context.qems_user_id, 
        tenant_id=auth_context.qems_tenant_id
    )
    await session.commit()
    return

@router.post("/read-all", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
    service: NotificationService = Depends(get_notification_service)
):
    await service.mark_all_read(
        session=session, 
        user_id=auth_context.qems_user_id, 
        tenant_id=auth_context.qems_tenant_id
    )
    await session.commit()
    return
