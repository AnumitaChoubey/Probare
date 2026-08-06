import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.db.models.lob import Lob
from app.db.models.category import Category
from app.db.models.sub_category import SubCategory
from app.db.models.error import Error
from app.db.models.error_status_history import ErrorStatusHistory
from app.errors.schemas import LobResponse, CategoryResponse, SubCategoryResponse, ErrorCreate, ErrorResponse
from app.auth.deps import get_current_user

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

@router.post("/errors", response_model=ErrorResponse, status_code=201)
async def create_error(
    payload: ErrorCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Mock implementations for ID-1, OWN-1, SLA-1
    qa_error_id_stub = f"QE-MOCK-{uuid.uuid4().hex[:6].upper()}"
    owner_user_id_stub = None # Wait for P4's OWN-1
    rebuttal_window_stub = 24 # Wait for P4's SLA-1
    decision_window_stub = 48 # Wait for P4's SLA-1
    
    # Determine initial status
    initial_status = "DRAFT" if payload.is_draft else "OPEN_PENDING_ACK"
    now = datetime.utcnow()
    
    new_error = Error(
        id=uuid.uuid4(),
        qa_error_id=qa_error_id_stub,
        lob_id=payload.lob_id,
        category_id=payload.category_id,
        sub_category_id=payload.sub_category_id,
        severity=payload.severity,
        status=initial_status,
        transaction_reference=payload.transaction_reference,
        logged_by_user_id=current_user.id,
        owner_user_id=owner_user_id_stub,
        date_of_occurrence=payload.date_of_occurrence,
        date_of_detection=payload.date_of_detection,
        description=payload.description,
        initial_root_cause=payload.initial_root_cause,
        internal_notes=payload.internal_notes if current_user.roles else None, # Simplified RBAC check
        client_impact_flag=payload.client_impact_flag,
        sla_rebuttal_window_hours_snapshot=rebuttal_window_stub,
        sla_decision_window_hours_snapshot=decision_window_stub,
        sla_clock_started_at=now if not payload.is_draft else None,
        current_escalation_level=0,
        is_draft=payload.is_draft,
        created_at=now,
        updated_at=now,
        submitted_at=now if not payload.is_draft else None,
    )
    db.add(new_error)
    await db.flush() # flush to get new_error.id
    
    # Add history record
    history = ErrorStatusHistory(
        error_id=new_error.id,
        from_status=None,
        to_status=initial_status,
        performed_by_user_id=current_user.id,
        performed_by_system=False,
        reason="Initial creation",
        occurred_at=now
    )
    db.add(history)
    await db.commit()
    await db.refresh(new_error)
    
    return new_error
