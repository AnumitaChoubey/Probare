import uuid
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.integration import BulkOperationJob, BulkOperationItem
from app.models.quality import QualityEvent
from app.services.audit_service import AuditService
from app.services.workflow_service import WorkflowService

logger = logging.getLogger(__name__)

class BulkService:
    def __init__(self, db: AsyncSession, audit_service: AuditService, workflow_service: WorkflowService):
        self.db = db
        self.audit_service = audit_service
        self.workflow_service = workflow_service

    async def create_job(self, tenant_id: str, project_id: str, operation_type: str, submitted_by: str, filter_criteria: Dict[str, Any], operation_payload: Dict[str, Any]) -> BulkOperationJob:
        job_id = str(uuid.uuid4())
        
        # 1. Evaluate filter_criteria to get the target event IDs
        stmt = select(QualityEvent).filter_by(tenant_id=tenant_id)
        if project_id:
            stmt = stmt.filter_by(project_id=project_id)
            
        # Very simple filtering for demonstration. Real implementation would parse filter_criteria thoroughly.
        if "status" in filter_criteria:
            stmt = stmt.filter(QualityEvent.status.in_(filter_criteria["status"]))
            
        events = (await self.db.execute(stmt)).scalars().all()
        target_ids = [e.id for e in events]
        
        job = BulkOperationJob(
            id=job_id,
            tenant_id=tenant_id,
            project_id=project_id,
            operation_type=operation_type,
            submitted_by=submitted_by,
            filter_criteria=filter_criteria,
            operation_payload=operation_payload,
            total_count=len(target_ids),
            status="pending"
        )
        self.db.add(job)
        
        # Pre-create pending items
        for eid in target_ids:
            item = BulkOperationItem(
                id=str(uuid.uuid4()),
                tenant_id=tenant_id,
                job_id=job_id,
                entity_id=eid,
                success=False # default
            )
            self.db.add(item)
            
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def process_job(self, job_id: str):
        """
        Processes a bulk job. In production, this would be picked up by a Celery worker.
        For now, we run it inline or via BackgroundTasks.
        """
        # We need a new session context if run in background, but assuming caller provides self.db
        stmt = select(BulkOperationJob).filter_by(id=job_id)
        job = (await self.db.execute(stmt)).scalars().first()
        
        if not job or job.status != "pending":
            return
            
        job.status = "running"
        job.started_at = datetime.now(timezone.utc)
        await self.db.commit()
        
        items_stmt = select(BulkOperationItem).filter_by(job_id=job_id)
        items = (await self.db.execute(items_stmt)).scalars().all()
        
        for item in items:
            event = await self.db.get(QualityEvent, item.entity_id)
            if not event:
                item.error_detail = "Event not found"
                item.success = False
                job.failure_count += 1
                job.processed_count += 1
                continue
                
            old_val = {}
            new_val = {}
            try:
                if job.operation_type == "status_update":
                    target_status = job.operation_payload.get("target_status")
                    old_val = {"status": event.status}
                    
                    # Use workflow service to ensure transitions are valid and side effects fire
                    await self.workflow_service.transition_event(
                        session=self.db,
                        event=event,
                        target_status=target_status,
                        actor_id=job.submitted_by,
                        expected_version=event.version,
                        reason=f"Bulk Operation {job.id}"
                    )
                    new_val = {"status": event.status}
                    
                elif job.operation_type == "assign":
                    assignee_id = job.operation_payload.get("assignee_id")
                    old_val = {"assignee_id": event.owner_id}
                    event.owner_id = assignee_id
                    new_val = {"assignee_id": assignee_id}
                    
                elif job.operation_type == "export":
                    # Export logic (would write to S3/blob and set job.export_storage_key)
                    pass
                else:
                    raise ValueError(f"Unknown operation type: {job.operation_type}")

                item.success = True
                item.old_value = old_val
                item.new_value = new_val
                job.success_count += 1
                
                # Write individual audit record per spec Section 12
                if job.operation_type in ["status_update", "assign"]:
                    await self.audit_service.record_action(
                        session=self.db,
                        tenant_id=job.tenant_id,
                        project_id=job.project_id,
                        entity_type="QualityEvent",
                        entity_id=event.id,
                        action=f"BULK_{job.operation_type.upper()}",
                        actor_id=job.submitted_by,
                        old_value=old_val,
                        new_value=new_val
                    )
            except Exception as e:
                item.success = False
                item.error_detail = str(e)
                job.failure_count += 1
                
            job.processed_count += 1
            # Commit periodically or per item
            await self.db.commit()

        job.completed_at = datetime.now(timezone.utc)
        if job.failure_count == 0:
            job.status = "completed"
        elif job.success_count == 0:
            job.status = "failed"
        else:
            job.status = "partial"
            
        await self.db.commit()
