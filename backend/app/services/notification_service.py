from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, Any, Dict
from app.models.integration import Notification, NotificationPreference
from app.services.outbox_service import OutboxService
import uuid
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, outbox_service: OutboxService):
        self.outbox_service = outbox_service

    async def create_notification(
        self,
        session: AsyncSession,
        user_id: str,
        tenant_id: str,
        title: str,
        body: str,
        notification_type: str,
        event_id: Optional[str] = None,
        link: Optional[str] = None
    ) -> Notification:
        # Create in-app notification
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            tenant_id=tenant_id,
            title=title,
            body=body,
            link=link
        )
        session.add(notification)

        # Fetch preferences
        stmt = select(NotificationPreference).filter_by(user_id=user_id)
        result = await session.execute(stmt)
        preference = result.scalars().first()

        # Defaults if no preference record found
        email_enabled = True
        teams_enabled = True
        if preference:
            email_enabled = preference.email_enabled
            teams_enabled = preference.teams_enabled

        payload = {
            "user_id": user_id,
            "title": title,
            "body": body,
            "notification_type": notification_type,
            "link": link
        }

        # Queue external deliveries via outbox
        if email_enabled:
            await self.outbox_service.dispatch(
                session=session,
                event_type="SEND_EMAIL",
                aggregate_type="Notification",
                aggregate_id=notification.id,
                payload=payload,
                tenant_id=tenant_id
            )

        if teams_enabled:
            await self.outbox_service.dispatch(
                session=session,
                event_type="SEND_TEAMS_MESSAGE",
                aggregate_type="Notification",
                aggregate_id=notification.id,
                payload=payload,
                tenant_id=tenant_id
            )

        return notification
