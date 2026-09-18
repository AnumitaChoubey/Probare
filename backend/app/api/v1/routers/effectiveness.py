from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.api.deps.idempotency import get_idempotency_key
from app.schemas.workflows import EffectivenessReviewCreate, IdempotencyResponse
from app.services.workflow_service import WorkflowService
from app.services.quality_event_service import QualityEventService
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from app.services.outbox_service import OutboxService

router = APIRouter(prefix="/projects/{project_id}/quality-events/{event_id}/effectiveness-review", tags=["Effectiveness"])

def get_workflow_service():
    return WorkflowService(QualityEventService(), AuditService(), TimelineService(), OutboxService())

@router.post("", response_model=IdempotencyResponse, status_code=status.HTTP_201_CREATED)
async def submit_effectiveness(
    project_id: str,
    event_id: str,
    payload: EffectivenessReviewCreate,
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

    result = await workflow_service.submit_effectiveness(
        session=db,
        event=event,
        eff_data=payload.model_dump(by_alias=True),
        actor_id=auth.qems_user_id,
        idempotency_key=idempotency_key
    )
    
    await db.commit()
    return IdempotencyResponse(data=result)
