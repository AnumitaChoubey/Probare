import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone, timedelta
from app.models.integration import IntegrationEvent

logger = logging.getLogger(__name__)

class InboxWorker:
    MAX_RETRIES = 5

    async def process_inbox_queue(self, session: AsyncSession, worker_id: str = "inbox-worker-1") -> None:
        """
        Process the inbound integration events queue safely using SKIP LOCKED.
        """
        logger.info("Starting inbox processing cycle...")
        batch_size = 50
        current_time = datetime.now(timezone.utc)
        
        # 1. Claim records
        stmt = (
            select(IntegrationEvent)
            .filter(IntegrationEvent.status == "PENDING")
            .order_by(IntegrationEvent.created_at.asc())
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        )
        
        result = await session.execute(stmt)
        events = result.scalars().all()
        
        if not events:
            return
            
        logger.info(f"Claimed {len(events)} inbox events for processing.")
        
        for event in events:
            success = False
            error_message = None
            
            try:
                if event.source == "MICROSOFT_GRAPH":
                    # Process MS Graph Webhook payload
                    logger.info(f"Processing MS Graph webhook payload for event {event.id}")
                    # Simulate processing business logic, e.g., mapping to a Quality Event or updating subscription
                    success = True
                else:
                    logger.warning(f"Unknown inbox event source: {event.source}")
                    success = True # Auto-complete unknown events or fail them
            except Exception as e:
                logger.error(f"Error processing inbox event {event.id}: {e}")
                error_message = str(e)
                success = False

            # Update event status
            if success:
                event.status = "PROCESSED"
                # If we had a processed_at column we would set it, but we can just leave it as PROCESSED
            else:
                event.status = "FAILED"
                event.error = error_message
                # In a real app we might implement retries for Inbox just like Outbox, but PENDING->FAILED is sufficient for now.
                
        logger.info("Inbox processing cycle complete.")
