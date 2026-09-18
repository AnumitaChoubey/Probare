import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.workers.sla_worker import SLAWorker
from app.workers.outbox_worker import OutboxWorker
from app.services.notification_service import NotificationService
from app.services.workflow_service import WorkflowService
from app.services.outbox_service import OutboxService

logger = logging.getLogger(__name__)

# Initialize services
outbox_service = OutboxService()
notification_service = NotificationService(outbox_service=outbox_service)
from app.services.quality_event_service import QualityEventService
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService

audit_service = AuditService()
timeline_service = TimelineService()
event_service = QualityEventService()

workflow_service = WorkflowService(
    event_service=event_service,
    audit_service=audit_service,
    timeline_service=timeline_service,
    outbox_service=outbox_service
)

sla_worker = SLAWorker(notification_service=notification_service, workflow_service=workflow_service)
outbox_worker = OutboxWorker()

scheduler = AsyncIOScheduler()

async def run_sla_job():
    async with AsyncSessionLocal() as session:
        try:
            await sla_worker.run_sla_monitoring_cycle(session)
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"SLA Job failed: {e}")

async def run_outbox_job():
    async with AsyncSessionLocal() as session:
        try:
            await outbox_worker.process_outbox_queue(session, worker_id="apscheduler-worker-1")
            await session.commit()
        except Exception as e:
            await session.rollback()
            logger.error(f"Outbox Job failed: {e}")

def setup_scheduler():
    """Configure and start the background scheduler."""
    interval = settings.SLA_CHECK_INTERVAL_SECONDS
    
    scheduler.add_job(run_sla_job, 'interval', seconds=interval, id='sla_monitoring_job', replace_existing=True)
    scheduler.add_job(run_outbox_job, 'interval', seconds=interval, id='outbox_dispatcher_job', replace_existing=True)
    
    scheduler.start()
    logger.info(f"Scheduler started with {interval}s interval.")

def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler shutdown.")
