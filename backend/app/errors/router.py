import uuid
from datetime import datetime, date
from typing import List, Optional, Union

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.lob import Lob
from app.db.models.category import Category
from app.db.models.sub_category import SubCategory
from app.db.models.error import Error
from app.db.models.error_status_history import ErrorStatusHistory
from app.errors.schemas import (
    LobResponse, CategoryResponse, SubCategoryResponse, 
    ErrorCreate, ErrorResponse, ErrorResponseOps, 
    ErrorListResponse, ErrorDraftUpdate, ErrorStatusUpdate,
    ErrorHistoryResponse
)
from app.auth.deps import get_current_user
from app.errors.id_generator import generate_qa_error_id
from app.errors.integration import get_ownership_mapping, get_sla_rules

router = APIRouter(tags=["errors"])

@router.get("/lobs", response_model=List[LobResponse])
async def get_lobs(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Lob).filter(Lob.is_active == True))
    return result.scalars().all()

@router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(Category).filter(Category.is_active == True))
    return result.scalars().all()

@router.get("/sub-categories", response_model=List[SubCategoryResponse])
async def get_sub_categories(db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    result = await db.execute(select(SubCategory).filter(SubCategory.is_active == True))
    return result.scalars().all()

def is_ops_user(current_user) -> bool:
    ops_roles = {"OPS_AGT", "OPS_MGR"}
    user_roles = {ur.role.code for ur in current_user.user_roles} if current_user.user_roles else set()
    return bool(user_roles & ops_roles)

@router.get("", response_model=ErrorListResponse)
async def list_errors(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    lob_id: Optional[uuid.UUID] = None,
    category_id: Optional[uuid.UUID] = None,
    owner_user_id: Optional[uuid.UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    query = select(Error).options(selectinload(Error.decisions))
    
    if status:
        query = query.filter(Error.status == status)
    if severity:
        query = query.filter(Error.severity == severity)
    if lob_id:
        query = query.filter(Error.lob_id == lob_id)
    if category_id:
        query = query.filter(Error.category_id == category_id)
    if owner_user_id:
        query = query.filter(Error.owner_user_id == owner_user_id)
        
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total_count = total_res.scalar_one()
    
    # Paginate
    query = query.order_by(Error.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    res = await db.execute(query)
    errors = res.scalars().all()
    
    # For lists, we must omit internal_notes for OPS
    ops_view = is_ops_user(current_user)
    items = []
    for e in errors:
        if ops_view:
            items.append(ErrorResponseOps.model_validate(e))
        else:
            items.append(ErrorResponse.model_validate(e))
            
    return ErrorListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total_count=total_count
    )

@router.get("/{error_id}", response_model=Union[ErrorResponse, ErrorResponseOps])
async def get_error(error_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(select(Error).options(selectinload(Error.decisions)).filter(Error.id == error_id))
    error = res.scalar_one_or_none()
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")
        
    if is_ops_user(current_user):
        return ErrorResponseOps.model_validate(error)
    return ErrorResponse.model_validate(error)

@router.post("", status_code=201)
async def create_error(
    request: Request,
    payload: ErrorCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    now = datetime.utcnow()
    initial_status = "DRAFT"
    new_error = Error(
        id=uuid.uuid4(),
        qa_error_id="DRAFT", # Temporary until submitted
        lob_id=payload.lob_id,
        category_id=payload.category_id,
        sub_category_id=payload.sub_category_id,
        severity=payload.severity,
        status=initial_status,
        transaction_reference=payload.transaction_reference,
        logged_by_user_id=current_user.id,
        owner_user_id=None,
        date_of_occurrence=payload.date_of_occurrence,
        date_of_detection=payload.date_of_detection,
        description=payload.description,
        initial_root_cause=payload.initial_root_cause,
        internal_notes=payload.internal_notes if not is_ops_user(current_user) else None,
        client_impact_flag=payload.client_impact_flag,
        sla_rebuttal_window_hours_snapshot=0,
        sla_decision_window_hours_snapshot=0,
        sla_clock_started_at=None,
        current_escalation_level=0,
        is_draft=True,
        created_at=now,
        updated_at=now,
        submitted_at=None,
    )
    db.add(new_error)
    await db.flush()
    
    if not payload.is_draft:
        # If immediate submit, call submit logic
        return await submit_error(request, new_error.id, db, current_user)
        
    await db.commit()
    await db.refresh(new_error)
    return ErrorResponse.model_validate(new_error) if not is_ops_user(current_user) else ErrorResponseOps.model_validate(new_error)

@router.patch("/{error_id}/draft")
async def update_draft(error_id: uuid.UUID, payload: ErrorDraftUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(select(Error).filter(Error.id == error_id))
    error = res.scalar_one_or_none()
    
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")
    if not error.is_draft:
        raise HTTPException(status_code=409, detail="Error is no longer a draft")
    if error.logged_by_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this draft")
        
    update_data = payload.model_dump(exclude_unset=True)
    if is_ops_user(current_user) and 'internal_notes' in update_data:
        del update_data['internal_notes']
        
    for k, v in update_data.items():
        setattr(error, k, v)
        
    error.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(error)
    
    return ErrorResponse.model_validate(error) if not is_ops_user(current_user) else ErrorResponseOps.model_validate(error)

@router.post("/{error_id}/submit")
async def submit_error(request: Request, error_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(select(Error).filter(Error.id == error_id))
    error = res.scalar_one_or_none()
    
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")
    if not error.is_draft:
        raise HTTPException(status_code=409, detail="Error is already submitted")
        
    # ID-1: Generate QA Error ID
    error.qa_error_id = await generate_qa_error_id(db, str(error.lob_id))
    
    # OWN-1: Resolve Owner
    if not error.owner_user_id:
        owner_id = await get_ownership_mapping(request, error.lob_id, error.category_id)
        error.owner_user_id = owner_id
        
    # SLA-1: SLA Snapshot
    sla = await get_sla_rules(request, error.lob_id, error.category_id, error.severity)
    error.sla_rebuttal_window_hours_snapshot = sla["rebuttal_hours"]
    error.sla_decision_window_hours_snapshot = sla["decision_hours"]
    
    # Status Transition
    now = datetime.utcnow()
    error.is_draft = False
    error.status = "OPEN_PENDING_ACK"
    error.submitted_at = now
    error.sla_clock_started_at = now
    error.updated_at = now
    
    # Add history record
    history = ErrorStatusHistory(
        error_id=error.id,
        from_status="DRAFT",
        to_status=error.status,
        performed_by_user_id=current_user.id,
        performed_by_system=False,
        reason="Submitted",
        occurred_at=now
    )
    db.add(history)
    
    await db.commit()
    await db.refresh(error)
    
    # We could return a warning header if no owner was found, but JSON is fine too
    if not error.owner_user_id:
        # According to specs, "warnings" array in 201 body.
        # But we must fit the response model. We'll return custom dict for this specific endpoint.
        resp = ErrorResponse.model_validate(error).model_dump()
        if is_ops_user(current_user):
            resp = ErrorResponseOps.model_validate(error).model_dump()
        resp["warnings"] = ["No ownership mapping found - this error is unassigned."]
        return resp
        
    return ErrorResponse.model_validate(error) if not is_ops_user(current_user) else ErrorResponseOps.model_validate(error)

@router.patch("/{error_id}/status")
async def update_status(error_id: uuid.UUID, payload: ErrorStatusUpdate, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    res = await db.execute(select(Error).filter(Error.id == error_id))
    error = res.scalar_one_or_none()
    
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")
        
    # STATUS-1: State Machine Enforcement
    valid_transitions = {
        "OPEN_PENDING_ACK": ["ACCEPTED_PENDING_CLOSURE", "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW", "SLA_BREACHED_ESCALATED"],
        "OPEN_PENDING_RESPONSE": ["ACCEPTED_PENDING_CLOSURE", "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW", "SLA_BREACHED_ESCALATED"],
        "SLA_BREACHED_ESCALATED": ["ACCEPTED_PENDING_CLOSURE", "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW"],
        "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW": ["CLOSED_UPHELD", "CLOSED_OVERTURNED", "CLOSED_PARTIAL"],
        "ACCEPTED_PENDING_CLOSURE": ["CLOSED_UPHELD"], # Wait, accepted means QA closes it as upheld
        "CLOSED_UPHELD": ["REOPENED"],
        "CLOSED_OVERTURNED": ["REOPENED"],
        "CLOSED_PARTIAL": ["REOPENED"],
        "REOPENED": ["REBUTTAL_SUBMITTED_PENDING_QA_REVIEW"],
    }
    
    allowed_next = valid_transitions.get(error.status, [])
    if payload.to_status not in allowed_next:
        raise HTTPException(status_code=409, detail=f"Invalid transition from {error.status} to {payload.to_status}")
        
    now = datetime.utcnow()
    
    # Record history
    history = ErrorStatusHistory(
        error_id=error.id,
        from_status=error.status,
        to_status=payload.to_status,
        performed_by_user_id=current_user.id,
        performed_by_system=False,
        reason=payload.reason,
        occurred_at=now
    )
    db.add(history)
    
    error.status = payload.to_status
    error.updated_at = now
    if payload.to_status.startswith("CLOSED_"):
        error.closed_at = now
        
    await db.commit()
    await db.refresh(error)
    
    return ErrorResponse.model_validate(error) if not is_ops_user(current_user) else ErrorResponseOps.model_validate(error)

@router.get("/{error_id}/history", response_model=List[ErrorHistoryResponse])
async def get_error_history(error_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user = Depends(get_current_user)):
    # Verify error exists and user has access
    res = await db.execute(select(Error).filter(Error.id == error_id))
    error = res.scalar_one_or_none()
    if not error:
        raise HTTPException(status_code=404, detail="Error not found")
        
    # Fetch history in descending order
    history_res = await db.execute(
        select(ErrorStatusHistory)
        .filter(ErrorStatusHistory.error_id == error_id)
        .order_by(ErrorStatusHistory.occurred_at.desc())
    )
    return history_res.scalars().all()
