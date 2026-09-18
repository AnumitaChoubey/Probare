import logging
import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, and_
from datetime import datetime, timedelta, timezone
from app.models.integration import OutboxEvent
from app.integrations.microsoft import get_ms_graph_adapter
from app.integrations.microsoft.ms_graph_adapter import TeamsDestination, TeamsDestinationType

logger = logging.getLogger(__name__)

class OutboxWorker:
    MAX_RETRIES = 5

    def __init__(self):
        self.ms_graph_adapter = get_ms_graph_adapter()

    async def process_outbox_queue(self, session: AsyncSession, worker_id: str = "worker-1") -> None:
        """
        Process the outbox queue safely using SKIP LOCKED to support concurrency.
        """
        logger.info("Starting outbox processing cycle...")
        batch_size = 50
        current_time = datetime.now(timezone.utc)
        
        # 1. Claim records
        # SQLAlchemy with asyncpg supports with_for_update(skip_locked=True)
        stmt = (
            select(OutboxEvent)
            .filter(
                OutboxEvent.status == "PENDING",
                (OutboxEvent.next_attempt_at == None) | (OutboxEvent.next_attempt_at <= current_time)
            )
            .order_by(OutboxEvent.created_at.asc())
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )
        
        result = await session.execute(stmt)
        events = result.scalars().all()
        
        if not events:
            return
            
        logger.info(f"Claimed {len(events)} outbox events for processing.")
        
        for event in events:
            # Mark as claimed in memory before processing
            event.locked_at = current_time
            event.locked_by = worker_id
            
            payload = event.payload
            success = False
            error_message = None
            
            try:
                if event.event_type == "SEND_TEAMS_MESSAGE":
                    # Determine destination. Hardcoding for now, in a real app this comes from Notification mapping
                    # Assuming payload has tenant_id or user mapping
                    dest = TeamsDestination(
                        destination_type=TeamsDestinationType.CHAT,
                        chat_id=payload.get("user_id") # Simplify for example
                    )
                    success = await self.ms_graph_adapter.send_teams_message(
                        destination=dest,
                        title=payload.get("title", ""),
                        body=payload.get("body", ""),
                        metadata=payload
                    )
                elif event.event_type == "SEND_EMAIL":
                    # Placeholder recipient email logic
                    recipient_email = f"{payload.get('user_id')}@example.com"
                    success = await self.ms_graph_adapter.send_outlook_email(
                        recipient_email=recipient_email,
                        subject=payload.get("title", ""),
                        body=payload.get("body", "")
                    )
                else:
                    logger.warning(f"Unknown outbox event type: {event.event_type}")
                    success = True # Auto-complete unknown events or fail them
            except Exception as e:
                logger.error(f"Error processing outbox event {event.id}: {e}")
                error_message = str(e)
                success = False

            # Update event status
            if success:
                event.status = "PROCESSED"
                event.processed_at = datetime.now(timezone.utc)
            else:
                event.retry_count += 1
                event.error = error_message
                
                if event.retry_count >= self.MAX_RETRIES:
                    event.status = "DEAD_LETTER"
                else:
                    # Exponential backoff (e.g. 2^retry_count minutes)
                    backoff_minutes = 2 ** event.retry_count
                    event.next_attempt_at = datetime.now(timezone.utc) + timedelta(minutes=backoff_minutes)
                    
            # Clear lock
            event.locked_at = None
            event.locked_by = None

        # Session commit is expected to be handled by the caller wrapper
        logger.info("Outbox processing cycle complete.")
