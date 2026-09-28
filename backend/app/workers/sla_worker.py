import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone

from app.models.quality import QualityEvent, SLAClock
from app.services.sla_service import SLAService
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class SLAWorker:
    """
    Background worker that:
    1. Starts new SLA clocks when an event enters a new workflow stage.
    2. Processes active clocks: updates elapsed minutes, triggers breach / warning events.
    """
    def __init__(self, notification_service=None, workflow_service=None):
        self.notification_service = notification_service
        self.workflow_service = workflow_service

    async def run_sla_monitoring_cycle(self, session: AsyncSession, tenant_id: str) -> None:
        """
        Executes a bounded batch processing cycle for SLA monitoring.
        """
        logger.info("Starting SLA monitoring cycle...")
        
        # Delegate to SLAService.process_active_clocks — this handles elapsed-minute computation,
        # working-hours awareness, breach detection, and escalation rule evaluation.
        await SLAService.process_active_clocks(session=session, tenant_id=tenant_id)
        
        # After processing clocks, fan out SLA notifications for newly breached clocks
        breached_stmt = select(SLAClock).filter_by(status="breached")
        clocks = (await session.execute(breached_stmt)).scalars().all()
        
        for clock in clocks:
            # Fetch the event to get owner_id / tenant_id context
            event = await session.get(QualityEvent, clock.quality_event_id)
            if not event:
                continue

            # Fan out a notification event for the breach
            try:
                await NotificationService.create_event(
                    session=session,
                    tenant_id=event.tenant_id,
                    event_type="sla_breach",
                    entity_type="quality_error",
                    entity_id=event.id,
                    payload={
                        "stage": clock.stage,
                        "event_number": event.event_number,
                        "breached_at": clock.breached_at.isoformat() if clock.breached_at else None,
                        "elapsed_minutes": clock.elapsed_minutes,
                        "owner_id": event.owner_id
                    }
                )
            except Exception as e:
                logger.error(f"Failed to emit SLA breach notification for event {event.id}: {e}")

        # Commit all changes from the cycle
        # (Session is committed by the calling scheduler job wrapper)
        logger.info("SLA monitoring cycle complete.")

