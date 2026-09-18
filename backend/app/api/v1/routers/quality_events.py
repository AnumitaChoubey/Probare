from fastapi import APIRouter, Depends, Query, Path, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.core.database import get_db
from app.api.deps.auth import get_current_user, require_permissions, require_project_access
from app.schemas.auth import AuthContext
from app.schemas.quality_event import (
    QualityEventCreate, 
    QualityEventUpdate, 
    QualityEventResponse, 
    QualityEventList, 
    QualityEventTransition
)
from app.services.quality_event_service import QualityEventService
from app.services.workflow_service import WorkflowService
from app.services.audit_service import AuditService
from app.services.timeline_service import TimelineService
from app.services.outbox_service import OutboxService
from app.api.deps.rate_limiter import RateLimiter

router = APIRouter()

# Dependency to construct the WorkflowService
def get_workflow_service() -> WorkflowService:
    return WorkflowService(
        event_service=QualityEventService(),
        audit_service=AuditService(),
        timeline_service=TimelineService(),
        outbox_service=OutboxService()
    )

@router.post(
    "/{project_id}/quality-events",
    response_model=QualityEventResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[
        Depends(require_permissions(["CREATE_QUALITY_EVENT"])),
        Depends(RateLimiter(times=10, seconds=60))
    ]
)
async def create_quality_event(
    event_in: QualityEventCreate,
    project_id: str = Path(...),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Create a new Quality Event in Draft state.
    """
    # Enforce created_by and tenant explicitly from context
    event = workflow_service.event_service.create_event(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        title=event_in.title,
        description=event_in.description,
        employee_id=event_in.employee_id,
        team_id=event_in.team_id,
        process_id=event_in.process_id,
        sub_process_id=event_in.sub_process_id,
        error_type_id=event_in.error_type_id,
        sop_id=event_in.sop_id,
        severity=event_in.severity,
        owner_id=event_in.owner_id,
        created_by_id=auth_context.qems_user_id,
        customer_impact=event_in.customer_impact
    )
    
    # Explicit commit for transaction boundary
    await session.commit()
    # Refresh to load SLA, etc.
    await session.refresh(event)
    return event

@router.get(
    "/{project_id}/quality-events",
    response_model=QualityEventList,
    dependencies=[Depends(require_permissions(["VIEW_QUALITY_EVENT"]))]
)
async def list_quality_events(
    project_id: str = Path(...),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = None,
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    List quality events with pagination and filtering.
    """
    filters = {}
    if status_filter:
        filters["status"] = status_filter
    if severity:
        filters["severity"] = severity
        
    events = await workflow_service.event_service.list_events(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        filters=filters,
        skip=skip,
        limit=limit
    )
    
    # We don't have a count implemented in event_service, so we return what we have.
    # In a real implementation we would count(*) with the filters.
    total = len(events) 
    
    return QualityEventList(
        items=events,
        total=total,
        page=(skip // limit) + 1,
        size=len(events)
    )

@router.get(
    "/{project_id}/quality-events/{event_id}",
    response_model=QualityEventResponse,
    dependencies=[Depends(require_permissions(["VIEW_QUALITY_EVENT"]))]
)
async def get_quality_event(
    project_id: str = Path(...),
    event_id: str = Path(...),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Get a specific Quality Event by ID.
    """
    event = await workflow_service.event_service.get_event(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        event_id=event_id
    )
    if not event:
        raise HTTPException(status_code=404, detail="Quality Event not found")
    return event

@router.patch(
    "/{project_id}/quality-events/{event_id}",
    response_model=QualityEventResponse,
    dependencies=[
        Depends(require_permissions(["EDIT_QUALITY_EVENT"])),
        Depends(RateLimiter(times=20, seconds=60))
    ]
)
async def update_quality_event(
    event_in: QualityEventUpdate,
    project_id: str = Path(...),
    event_id: str = Path(...),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Update allowed fields on a Quality Event. 
    State transitions and protected fields are NOT allowed here.
    """
    event = await workflow_service.event_service.get_event(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        event_id=event_id
    )
    if not event:
        raise HTTPException(status_code=404, detail="Quality Event not found")
        
    update_data = event_in.model_dump(exclude_unset=True)
    if not update_data:
        return event

    updated_event = await workflow_service.event_service.update_event(
        session=session,
        event=event,
        update_data=update_data,
        actor_id=auth_context.qems_user_id
    )
    
    await session.commit()
    await session.refresh(updated_event)
    return updated_event

@router.post(
    "/{project_id}/quality-events/{event_id}/transitions",
    response_model=QualityEventResponse,
    dependencies=[Depends(RateLimiter(times=10, seconds=60))]
)
async def transition_quality_event(
    transition_in: QualityEventTransition,
    project_id: str = Path(...),
    event_id: str = Path(...),
    auth_context: AuthContext = Depends(require_project_access),
    session: AsyncSession = Depends(get_db),
    workflow_service: WorkflowService = Depends(get_workflow_service)
):
    """
    Perform a state machine transition on a Quality Event.
    """
    event = await workflow_service.event_service.get_event(
        session=session,
        tenant_id=auth_context.qems_tenant_id,
        project_id=project_id,
        event_id=event_id
    )
    if not event:
        raise HTTPException(status_code=404, detail="Quality Event not found")
        
    # Roles mapped to workflow actions dynamically in real apps. 
    # The workflow_service enforces the creator/resolver rules, we pass the actor_id
    
    updated_event = await workflow_service.transition_event(
        session=session,
        event=event,
        target_state=transition_in.target_state,
        actor_id=auth_context.qems_user_id,
        expected_version=transition_in.expected_version,
        reason=transition_in.reason
    )
    
    await session.commit()
    await session.refresh(updated_event)
    return updated_event
