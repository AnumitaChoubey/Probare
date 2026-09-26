from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from pydantic import BaseModel
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps.auth import get_current_user, require_permissions
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.services.bulk_service import BulkService
from app.services.audit_service import AuditService
from app.services.workflow_service import WorkflowService
from app.services.quality_event_service import QualityEventService
from app.services.timeline_service import TimelineService
from app.services.outbox_service import OutboxService
from app.models.integration import BulkOperationJob, BulkOperationItem

router = APIRouter(prefix="/projects/{project_id}/bulk", tags=["Bulk Operations"])

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class BulkOperationRequest(BaseModel):
    operation_type: str  # 'status_update', 'assign', 'export'
    filter_criteria: Dict[str, Any]
    operation_payload: Dict[str, Any]

class BulkJobResponse(BaseModel):
    id: str
    operation_type: str
    status: str
    total_count: int
    processed_count: int
    success_count: int
    failure_count: int

    class Config:
        from_attributes = True

class BulkItemResponse(BaseModel):
    entity_id: str
    success: bool
    error_detail: str | None
    old_value: Dict[str, Any] | None
    new_value: Dict[str, Any] | None

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------

def get_bulk_service(db: AsyncSession = Depends(get_db)) -> BulkService:
    workflow_service = WorkflowService(
        event_service=QualityEventService(),
        audit_service=AuditService(),
        timeline_service=TimelineService(),
        outbox_service=OutboxService()
    )
    return BulkService(db, AuditService(), workflow_service)

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/", response_model=BulkJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def submit_bulk_operation(
    project_id: str,
    req: BulkOperationRequest,
    background_tasks: BackgroundTasks,
    auth: AuthContext = Depends(get_current_user),
    service: BulkService = Depends(get_bulk_service)
):
    """
    Submits a bulk operation to be processed in the background.
    """
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    
    # Enforce RBAC
    if req.operation_type == "status_update" and "EDIT_QUALITY_EVENT" not in auth.permissions:
        raise HTTPException(status_code=403, detail="Permission denied to update events")
    if req.operation_type == "assign" and "EDIT_QUALITY_EVENT" not in auth.permissions:
         raise HTTPException(status_code=403, detail="Permission denied to reassign events")
         
    if req.operation_type not in ["status_update", "assign", "export"]:
        raise HTTPException(status_code=400, detail="Invalid operation_type")

    # Create the job
    job = await service.create_job(
        tenant_id=auth.qems_tenant_id,
        project_id=project_id,
        operation_type=req.operation_type,
        submitted_by=auth.qems_user_id,
        filter_criteria=req.filter_criteria,
        operation_payload=req.operation_payload
    )

    # Launch background processing
    background_tasks.add_task(service.process_job, job.id)

    return job

@router.get("/{job_id}", response_model=BulkJobResponse)
async def get_bulk_job_status(
    project_id: str,
    job_id: str,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")

    stmt = select(BulkOperationJob).filter_by(id=job_id, tenant_id=auth.qems_tenant_id)
    job = (await db.execute(stmt)).scalars().first()
    
    if not job:
        raise HTTPException(status_code=404, detail="Bulk job not found")

    return job

@router.get("/{job_id}/items", response_model=List[BulkItemResponse])
async def get_bulk_job_items(
    project_id: str,
    job_id: str,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")

    # Verify job exists
    job_stmt = select(BulkOperationJob).filter_by(id=job_id, tenant_id=auth.qems_tenant_id)
    if not (await db.execute(job_stmt)).scalars().first():
        raise HTTPException(status_code=404, detail="Bulk job not found")

    items_stmt = select(BulkOperationItem).filter_by(job_id=job_id)
    items = (await db.execute(items_stmt)).scalars().all()
    
    return items
