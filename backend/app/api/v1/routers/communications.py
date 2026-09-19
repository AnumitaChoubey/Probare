from fastapi import APIRouter, Depends, Path, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.api.deps.auth import get_current_user, require_project_access
from app.schemas.auth import AuthContext
from app.schemas.communication import ConversationSchema, MessageSchema, MessageCreate, PaginatedMessages
from app.services.communication_service import CommunicationService

router = APIRouter()

def get_communication_service() -> CommunicationService:
    return CommunicationService()

@router.get(
    "/{project_id}/quality-events/{event_id}/conversation",
    response_model=ConversationSchema
)
async def get_conversation(
    project_id: str = Path(...),
    event_id: str = Path(...),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    service: CommunicationService = Depends(get_communication_service)
):
    """
    Get the universal conversation thread for a Quality Event.
    """
    conversation = await service.get_conversation(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        event_id=event_id,
        auth_context=auth_context
    )
    await session.commit()
    return conversation

@router.get(
    "/{project_id}/quality-events/{event_id}/conversation/messages",
    response_model=PaginatedMessages
)
async def get_messages(
    project_id: str = Path(...),
    event_id: str = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    service: CommunicationService = Depends(get_communication_service)
):
    """
    Get paginated chronological messages for a Quality Event conversation.
    """
    messages = await service.get_messages(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        event_id=event_id,
        auth_context=auth_context,
        skip=skip,
        limit=limit
    )
    await session.commit()
    
    return PaginatedMessages(
        items=messages,
        total_count=len(messages)
    )

@router.post(
    "/{project_id}/quality-events/{event_id}/conversation/messages",
    response_model=MessageSchema,
    status_code=status.HTTP_201_CREATED
)
async def create_message(
    message_in: MessageCreate,
    project_id: str = Path(...),
    event_id: str = Path(...),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    service: CommunicationService = Depends(get_communication_service)
):
    """
    Post a new message to the Quality Event universal thread.
    """
    message = await service.create_message(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        event_id=event_id,
        auth_context=auth_context,
        message_in=message_in
    )
    await session.commit()
    await session.refresh(message)
    return message

@router.post(
    "/{project_id}/quality-events/{event_id}/conversation/messages/{message_id}/read",
    status_code=status.HTTP_204_NO_CONTENT
)
async def mark_message_read(
    project_id: str = Path(...),
    event_id: str = Path(...),
    message_id: str = Path(...),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    service: CommunicationService = Depends(get_communication_service)
):
    """
    Mark a specific message as read.
    """
    await service.mark_message_read(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        event_id=event_id,
        message_id=message_id,
        auth_context=auth_context
    )
    await session.commit()
    return
