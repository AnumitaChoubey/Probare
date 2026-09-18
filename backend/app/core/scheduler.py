import logging
import time
import socket
import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.workers.sla_worker import SLAWorker
from app.workers.outbox_worker import OutboxWorker
from app.workers.inbox_worker import InboxWorker
from app.services.notification_service import NotificationService
from app.services.workflow_service import WorkflowService
from app.services.outbox_service import OutboxService
import redis.asyncio as redis_async

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
inbox_worker = InboxWorker()

scheduler = AsyncIOScheduler()

async def get_redis_client():
    return redis_async.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)

# Lua script for atomic lock release
RELEASE_SCRIPT = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""

async def run_with_lock(lock_key: str, job_func, ttl_seconds: int = 55):
    redis = None
    worker_id = socket.gethostname()
    try:
        redis = await get_redis_client()
        
        # Try to acquire lock
        acquired = await redis.set(lock_key, worker_id, nx=True, ex=ttl_seconds)
        if not acquired:
            logger.debug(f"Could not acquire lock for {lock_key}. Another replica is processing.")
            return

        logger.debug(f"Acquired lock for {lock_key}.")
        
        # Lease renewal task
        async def lease_renewer():
            try:
                while True:
                    await asyncio.sleep(ttl_seconds / 2)
                    # Only renew if we still own it (Lua check)
                    RENEW_SCRIPT = """
                    if redis.call("get", KEYS[1]) == ARGV[1] then
                        return redis.call("expire", KEYS[1], ARGV[2])
                    else
                        return 0
                    end
                    """
                    renewed = await redis.eval(RENEW_SCRIPT, 1, lock_key, worker_id, ttl_seconds)
                    if renewed == 1:
                        logger.debug(f"Renewed lease for {lock_key}.")
                    else:
                        logger.warning(f"Failed to renew lease for {lock_key}. Lock lost.")
                        break
            except asyncio.CancelledError:
                pass
            except Exception as e:
                logger.error(f"Lease renewer error for {lock_key}: {e}")

        renewer_task = asyncio.create_task(lease_renewer())
        
        try:
            await job_func()
        finally:
            renewer_task.cancel()
            try:
                await renewer_task
            except asyncio.CancelledError:
                pass
                
            # Atomic ownership-safe release via Lua script
            result = await redis.eval(RELEASE_SCRIPT, 1, lock_key, worker_id)
            if result == 1:
                logger.debug(f"Successfully released lock for {lock_key}.")
            else:
                logger.debug(f"Lock {lock_key} was already expired or owned by another worker.")
            
    except Exception as e:
        logger.error(f"Error in lock wrapper for {lock_key}: {e}")
    finally:
        if redis:
            await redis.aclose()


async def run_sla_job():
    async def _sla_inner():
        async with AsyncSessionLocal() as session:
            try:
                await sla_worker.run_sla_monitoring_cycle(session)
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"SLA Job failed: {e}")
                
    await run_with_lock("qems:scheduler:sla", _sla_inner, ttl_seconds=settings.SLA_CHECK_INTERVAL_SECONDS - 5)

async def run_outbox_job():
    async def _outbox_inner():
        async with AsyncSessionLocal() as session:
            try:
                await outbox_worker.process_outbox_queue(session, worker_id=socket.gethostname())
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Outbox Job failed: {e}")
                
    await run_with_lock("qems:scheduler:outbox", _outbox_inner, ttl_seconds=settings.SLA_CHECK_INTERVAL_SECONDS - 5)

async def run_inbox_job():
    async def _inbox_inner():
        async with AsyncSessionLocal() as session:
            try:
                await inbox_worker.process_inbox_queue(session, worker_id=socket.gethostname())
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Inbox Job failed: {e}")
                
    await run_with_lock("qems:scheduler:inbox", _inbox_inner, ttl_seconds=settings.SLA_CHECK_INTERVAL_SECONDS - 5)

def setup_scheduler():
    """Configure and start the background scheduler."""
    interval = settings.SLA_CHECK_INTERVAL_SECONDS
    
    scheduler.add_job(run_sla_job, 'interval', seconds=interval, id='sla_monitoring_job', replace_existing=True)
    scheduler.add_job(run_outbox_job, 'interval', seconds=interval, id='outbox_dispatcher_job', replace_existing=True)
    scheduler.add_job(run_inbox_job, 'interval', seconds=interval, id='inbox_dispatcher_job', replace_existing=True)
    
    scheduler.start()
    logger.info(f"Scheduler started with {interval}s interval.")

def shutdown_scheduler():
    scheduler.shutdown()
    logger.info("Scheduler shutdown.")
