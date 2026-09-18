from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.api.deps.idempotency import get_idempotency_key
from app.schemas.workflows import RebuttalCreate, DecisionCreate, IdempotencyResponse
from app.services.workflow_service import WorkflowService
from app.services.quality_event_service import QualityEventService
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from app.services.outbox_service import OutboxService

router = APIRouter(prefix="/projects/{project_id}/quality-events/{event_id}/rebuttal", tags=["Rebuttals"])

def get_workflow_service():
    # Helper to instantiate WorkflowService
    event_service = QualityEventService()
    audit_service = AuditService()
    timeline_service = TimelineService()
    outbox_service = OutboxService()
    return WorkflowService(event_service, audit_service, timeline_service, outbox_service)

@router.post("", response_model=IdempotencyResponse, status_code=status.HTTP_201_CREATED)
async def submit_rebuttal(
    project_id: str,
    event_id: str,
    payload: RebuttalCreate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str = Depends(get_idempotency_key),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
        
    from app.repositories.quality_event_repository import QualityEventRepository
    event_repo = QualityEventRepository()
    event = await event_repo.get(db, event_id, project_id=project_id)
    if not event:
        raise HTTPException(status_code=404, detail="Quality Event not found")

    result = await workflow_service.submit_rebuttal(
        session=db,
        event=event,
        category=payload.category,
        explanation=payload.explanation,
        evidence_files=payload.evidence_files,
        actor_id=auth.qems_user_id,
        idempotency_key=idempotency_key
    )
    
    await db.commit()
    return IdempotencyResponse(data=result)

@router.post("/decision", response_model=IdempotencyResponse, status_code=status.HTTP_201_CREATED)
async def submit_decision(
    project_id: str,
    event_id: str,
    payload: DecisionCreate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    idempotency_key: str = Depends(get_idempotency_key),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")

    from app.repositories.quality_event_repository import QualityEventRepository
    event_repo = QualityEventRepository()
    event = await event_repo.get(db, event_id, project_id=project_id)
    if not event:
        raise HTTPException(status_code=404, detail="Quality Event not found")

    result = await workflow_service.submit_decision(
        session=db,
        event=event,
        decision=payload.decision,
        rationale=payload.rationale,
        actor_id=auth.qems_user_id,
        expected_version=payload.expected_version,
        idempotency_key=idempotency_key
    )
    
    await db.commit()
    return IdempotencyResponse(data=result)
