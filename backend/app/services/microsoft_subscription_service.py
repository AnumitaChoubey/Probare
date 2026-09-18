import logging
import uuid
from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timedelta, timezone
from app.models.integration import MicrosoftSubscription, MicrosoftResourceMapping

logger = logging.getLogger(__name__)

class MicrosoftSubscriptionService:
    def __init__(self):
        # We could inject graph adapter if we need to call MS Graph to manage subscriptions
        pass

    async def create_subscription(
        self,
        session: AsyncSession,
        tenant_id: str,
        resource: str,
        external_subscription_id: str,
        expiration_date: datetime
    ) -> MicrosoftSubscription:
        """
        Creates or updates a Microsoft subscription record idempotently.
        """
        stmt = select(MicrosoftSubscription).filter_by(
            tenant_id=tenant_id,
            subscription_id=external_subscription_id
        )
        result = await session.execute(stmt)
        sub = result.scalars().first()

        if sub:
            sub.expiration_date = expiration_date
            sub.resource = resource
        else:
            sub = MicrosoftSubscription(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                subscription_id=external_subscription_id,
                resource=resource,
                expiration_date=expiration_date
            )
            session.add(sub)
        return sub

    async def renew_subscription(
        self,
        session: AsyncSession,
        subscription_id: str,
        new_expiration: datetime
    ) -> Optional[MicrosoftSubscription]:
        """
        Updates the expiration date after a successful renewal.
        """
        stmt = select(MicrosoftSubscription).filter_by(subscription_id=subscription_id)
        result = await session.execute(stmt)
        sub = result.scalars().first()
        
        if sub:
            sub.expiration_date = new_expiration
            return sub
        return None

    async def delete_subscription(
        self,
        session: AsyncSession,
        subscription_id: str
    ) -> bool:
        """
        Removes a subscription (e.g. after it's removed by MS Graph).
        """
        stmt = select(MicrosoftSubscription).filter_by(subscription_id=subscription_id)
        result = await session.execute(stmt)
        sub = result.scalars().first()
        if sub:
            await session.delete(sub)
            return True
        return False

    async def handle_lifecycle_notification(
        self,
        session: AsyncSession,
        lifecycle_event_type: str,
        subscription_id: str,
        tenant_id: str
    ) -> None:
        """
        Handles lifecycle events like 'subscriptionRemoved', 'missed', 'reauthorizationRequired'.
        """
        logger.info(f"Handling lifecycle event '{lifecycle_event_type}' for sub {subscription_id}")
        
        if lifecycle_event_type == "subscriptionRemoved":
            await self.delete_subscription(session, subscription_id)
        elif lifecycle_event_type in ["missed", "reauthorizationRequired"]:
            # Need to re-establish the subscription. Usually means we flag it or immediately attempt recreate.
            # We can log or set it to expired so the reconcile job picks it up.
            sub = await self.renew_subscription(session, subscription_id, datetime.now(timezone.utc) - timedelta(days=1))
            if sub:
                logger.warning(f"Subscription {subscription_id} flagged for recreation due to lifecycle event.")

    async def reconcile_subscriptions(
        self,
        session: AsyncSession
    ) -> None:
        """
        Checks for expired subscriptions and attempts to renew or recreate them.
        To be called by a background job.
        """
        # Find all subscriptions expiring in the next 24 hours
        threshold = datetime.now(timezone.utc) + timedelta(hours=24)
        stmt = select(MicrosoftSubscription).filter(MicrosoftSubscription.expiration_date <= threshold)
        result = await session.execute(stmt)
        expiring_subs = result.scalars().all()
        
        for sub in expiring_subs:
            logger.info(f"Reconciling subscription {sub.subscription_id} for resource {sub.resource}")
            # Real implementation would call Graph API to renew and then update expiration date.
            pass
