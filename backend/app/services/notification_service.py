from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, Any, Dict, List
import uuid
import logging
from datetime import datetime, timezone

from app.models.integration import NotificationEvent, NotificationDelivery, NotificationRule, NotificationTemplate
from app.models.core import User, ProjectMember

logger = logging.getLogger(__name__)

class NotificationService:
    """
    V2 Notification Engine: Handles fan-out of NotificationEvents to NotificationDeliveries across 5 channels.
    Channels: 'in_app', 'email', 'teams', 'desktop'
    """
    
    @classmethod
    async def create_event(
        cls,
        session: AsyncSession,
        tenant_id: str,
        event_type: str,
        entity_type: str,
        entity_id: str,
        payload: Dict[str, Any]
    ) -> NotificationEvent:
        event = NotificationEvent(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload
        )
        session.add(event)
        await session.flush()
        
        # Fan out
        await cls._fan_out(session, event)
        return event
        
    @classmethod
    async def _fan_out(cls, session: AsyncSession, event: NotificationEvent):
        # Find applicable rules for this tenant and event_type
        stmt = select(NotificationRule).filter_by(
            tenant_id=event.tenant_id,
            event_type=event.event_type,
            active=True
        )
        rules = (await session.execute(stmt)).scalars().all()
        
        for rule in rules:
            target_user_ids = set()
            
            # If rule targets a specific user
            if rule.user_id:
                target_user_ids.add(rule.user_id)
            
            # If rule targets a role
            if rule.role_id:
                # Find users with this role in the tenant
                # Simple implementation assumes ProjectMember Maps user -> role in the tenant
                role_stmt = select(ProjectMember.user_id).filter_by(role=rule.role_id)
                users_with_role = (await session.execute(role_stmt)).scalars().all()
                target_user_ids.update(users_with_role)
                
            for user_id in target_user_ids:
                for channel in rule.channels:
                    delivery = NotificationDelivery(
                        id=str(uuid.uuid4()),
                        tenant_id=event.tenant_id,
                        notification_event_id=event.id,
                        recipient_user_id=user_id,
                        channel=channel,
                        status="pending"
                    )
                    session.add(delivery)

    @classmethod
    async def process_deliveries(cls, session: AsyncSession):
        """
        Background worker entrypoint to process pending deliveries.
        """
        stmt = select(NotificationDelivery).filter_by(status="pending")
        deliveries = (await session.execute(stmt)).scalars().all()
        
        now = datetime.now(timezone.utc)
        
        for delivery in deliveries:
            try:
                if delivery.channel == "in_app":
                    # In-app is instantaneous, just mark sent
                    delivery.status = "sent"
                elif delivery.channel == "email":
                    # Send via Email provider (e.g. SendGrid)
                    # For now just mark sent
                    delivery.status = "sent"
                elif delivery.channel == "teams":
                    # Call Teams Webhook
                    delivery.status = "sent"
                elif delivery.channel == "desktop":
                    # Desktop OS notification via polling or sync engine
                    delivery.status = "sent"
                    
                delivery.sent_at = now
            except Exception as e:
                logger.error(f"Failed to deliver notification {delivery.id}: {e}")
                delivery.attempt_count += 1
                if delivery.attempt_count >= 3:
                    delivery.status = "failed"

