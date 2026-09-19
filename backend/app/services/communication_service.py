from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from fastapi import HTTPException

from app.models.integration import Conversation, ConversationParticipant, Message, MessageReadState
from app.models.quality import QualityEvent
from app.schemas.communication import MessageCreate
from app.services.quality_event_service import QualityEventService
from app.schemas.auth import AuthContext

class CommunicationService:
    def __init__(self):
        self.event_service = QualityEventService()

    async def _get_or_create_conversation(self, session: AsyncSession, tenant_id: str, project_id: str, event_id: str) -> Conversation:
        stmt = select(Conversation).where(
            Conversation.project_id == project_id,
            Conversation.quality_event_id == event_id
        ).options(selectinload(Conversation.participants))
        
        result = await session.execute(stmt)
        conversation = result.scalars().first()
        
        if not conversation:
            conversation = Conversation(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                project_id=project_id,
                quality_event_id=event_id,
                participants=[]
            )
            session.add(conversation)
            await session.flush()
        
        return conversation

    async def _ensure_participant(self, session: AsyncSession, conversation: Conversation, user_id: str, tenant_id: str, project_id: str):
        if any(p.user_id == user_id for p in conversation.participants):
            return
        
        participant = ConversationParticipant(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            project_id=project_id,
            conversation_id=conversation.id,
            user_id=user_id
        )
        session.add(participant)
        conversation.participants.append(participant)

    async def get_conversation(self, session: AsyncSession, tenant_id: str, project_id: str, event_id: str, auth_context: AuthContext) -> Conversation:
        # Verify event access via QualityEventService (which internally verifies if auth_context is provided)
        event = await self.event_service.get_event(
            session=session,
            event_id=event_id,
            tenant_id=tenant_id,
            project_id=project_id,
            auth_context=auth_context
        )
        if not event:
            raise HTTPException(status_code=404, detail="Quality Event not found")
            
        conversation = await self._get_or_create_conversation(session, tenant_id, project_id, event_id)
        await self._ensure_participant(session, conversation, auth_context.qems_user_id, tenant_id, project_id)
        
        return conversation

    async def get_messages(self, session: AsyncSession, tenant_id: str, project_id: str, event_id: str, auth_context: AuthContext, skip: int = 0, limit: int = 50) -> List[Message]:
        conversation = await self.get_conversation(session, tenant_id, project_id, event_id, auth_context)
        
        stmt = select(Message).where(
            Message.conversation_id == conversation.id
        ).order_by(Message.created_at.desc()).offset(skip).limit(limit)
        
        result = await session.execute(stmt)
        # Reverse to return chronological order
        return list(reversed(result.scalars().all()))

    async def create_message(self, session: AsyncSession, tenant_id: str, project_id: str, event_id: str, auth_context: AuthContext, message_in: MessageCreate) -> Message:
        conversation = await self.get_conversation(session, tenant_id, project_id, event_id, auth_context)
        
        message = Message(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            project_id=project_id,
            conversation_id=conversation.id,
            sender_id=auth_context.qems_user_id,
            body=message_in.body
        )
        session.add(message)
        
        # Read state for sender
        read_state = MessageReadState(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            project_id=project_id,
            message_id=message.id,
            user_id=auth_context.qems_user_id,
            read_at=datetime.now(timezone.utc)
        )
        session.add(read_state)
        
        return message

    async def mark_message_read(self, session: AsyncSession, tenant_id: str, project_id: str, event_id: str, message_id: str, auth_context: AuthContext) -> MessageReadState:
        conversation = await self.get_conversation(session, tenant_id, project_id, event_id, auth_context)
        
        stmt = select(MessageReadState).where(
            MessageReadState.message_id == message_id,
            MessageReadState.user_id == auth_context.qems_user_id
        )
        result = await session.execute(stmt)
        read_state = result.scalars().first()
        
        if not read_state:
            read_state = MessageReadState(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                project_id=project_id,
                message_id=message_id,
                user_id=auth_context.qems_user_id,
                read_at=datetime.now(timezone.utc)
            )
            session.add(read_state)
        else:
            read_state.read_at = datetime.now(timezone.utc)
            
        return read_state
