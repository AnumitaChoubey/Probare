from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.db.models.user import User
from app.db.models.error import Error
from app.errors.router import update_status
from app.errors.schemas import ErrorStatusUpdate

router = APIRouter(prefix="/errors", tags=["rebuttal"])


@router.post("/{error_id}/acknowledge")
async def acknowledge_error(
    error_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        Error.__table__.select().where(Error.id == error_id)
    )
    error = result.fetchone()

    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    if current_user.id != error.owner_user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the resolved owner can acknowledge this error"
        )

    if error.status != "OPEN_PENDING_ACK":
        return {"message": "Error already acknowledged", "status": error.status}

    updated_error = await update_status(
        error_id=error_id,
        payload=ErrorStatusUpdate(to_status="OPEN_PENDING_RESPONSE"),
        db=db,
        current_user=current_user,
    )

    return {"message": "Error acknowledged successfully", "new_status": "OPEN_PENDING_RESPONSE"}

from pydantic import BaseModel
from typing import Optional


class AcceptRequest(BaseModel):
    acknowledgement_comment: Optional[str] = None


@router.post("/{error_id}/accept")
async def accept_error(
    error_id: UUID,
    payload: AcceptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        Error.__table__.select().where(Error.id == error_id)
    )
    error = result.fetchone()

    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    if current_user.id != error.owner_user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the resolved owner can accept this error"
        )

    allowed_statuses = ["OPEN_PENDING_ACK", "OPEN_PENDING_RESPONSE", "SLA_BREACHED_ESCALATED"]
    if error.status not in allowed_statuses:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot accept error in status '{error.status}'"
        )

    updated_error = await update_status(
        error_id=error_id,
        payload=ErrorStatusUpdate(to_status="ACCEPTED_PENDING_CLOSURE"),
        db=db,
        current_user=current_user,
    )

    return {"message": "Error accepted successfully", "new_status": "ACCEPTED_PENDING_CLOSURE"}

from app.db.models.rebuttal import Rebuttal
from sqlalchemy import func
from typing import List


class RebutRequest(BaseModel):
    justification: str
    evidence_file_ids: Optional[List[UUID]] = []


@router.post("/{error_id}/rebut")
async def rebut_error(
    error_id: UUID,
    payload: RebutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        Error.__table__.select().where(Error.id == error_id)
    )
    error = result.fetchone()

    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    if current_user.id != error.owner_user_id:
        raise HTTPException(
            status_code=403,
            detail="Only the resolved owner can rebut this error"
        )

    allowed_statuses = ["OPEN_PENDING_ACK", "OPEN_PENDING_RESPONSE", "SLA_BREACHED_ESCALATED"]
    if error.status not in allowed_statuses:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot rebut error in status '{error.status}'"
        )

    if len(payload.justification) < 20:
        raise HTTPException(
            status_code=400,
            detail="Justification must be at least 20 characters"
        )

    if payload.justification.strip() == error.description.strip():
        raise HTTPException(
            status_code=400,
            detail="Justification cannot be identical to the error description"
        )

    existing = await db.execute(
        Rebuttal.__table__.select().where(
            Rebuttal.error_id == error_id
        ).order_by(Rebuttal.cycle_number.desc())
    )
    last_rebuttal = existing.fetchone()

    current_cycle = last_rebuttal.cycle_number if last_rebuttal else 0

    if last_rebuttal and last_rebuttal.cycle_number == current_cycle:
        existing_this_cycle = await db.execute(
            Rebuttal.__table__.select().where(
                Rebuttal.error_id == error_id,
                Rebuttal.cycle_number == current_cycle
            )
        )
        if existing_this_cycle.fetchone() and current_cycle != 0:
            raise HTTPException(
                status_code=409,
                detail="A rebuttal has already been submitted for this cycle"
            )

    new_cycle_number = current_cycle + 1

    new_rebuttal = Rebuttal(
        error_id=error_id,
        cycle_number=new_cycle_number,
        justification=payload.justification,
        evidence_file_ids=payload.evidence_file_ids,
        submitted_by_user_id=current_user.id,
    )
    db.add(new_rebuttal)
    await db.commit()

    updated_error = await update_status(
        error_id=error_id,
        payload=ErrorStatusUpdate(to_status="REBUTTAL_SUBMITTED_PENDING_QA_REVIEW"),
        db=db,
        current_user=current_user,
    )

    return {"message": "Rebuttal submitted successfully", "cycle_number": new_cycle_number, "new_status": "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW"}    

from app.db.models.decision import Decision


class DecisionRequest(BaseModel):
    decision: str
    rationale: str
    partial_breakdown: Optional[str] = None


@router.post("/{error_id}/decision")
async def decide_error(
    error_id: UUID,
    payload: DecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        Error.__table__.select().where(Error.id == error_id)
    )
    error = result.fetchone()

    if not error:
        raise HTTPException(status_code=404, detail="Error not found")

    is_original_logger = current_user.id == error.logged_by_user_id
    is_qa_lead = any(role.code == "QAL" for role in current_user.roles)

    if not (is_original_logger or is_qa_lead):
        raise HTTPException(
            status_code=403,
            detail="Only the original logger or a QA Lead can record a decision"
        )

    closed_statuses = ["CLOSED_UPHELD", "CLOSED_OVERTURNED", "CLOSED_PARTIAL"]
    if error.status in closed_statuses:
        raise HTTPException(
            status_code=409,
            detail="This error is already closed"
        )

    if error.status == "ACCEPTED_PENDING_CLOSURE":
        if payload.decision != "UPHELD":
            raise HTTPException(
                status_code=422,
                detail={"code": "INVALID_DECISION_FOR_STATE", "message": "Only UPHELD is valid when the owner has accepted the finding"}
            )
    elif error.status != "REBUTTAL_SUBMITTED_PENDING_QA_REVIEW":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot record a decision while error is in status '{error.status}'"
        )

    if len(payload.rationale) < 20:
        raise HTTPException(
            status_code=400,
            detail="Rationale must be at least 20 characters"
        )

    if payload.decision == "PARTIALLY_UPHELD" and not payload.partial_breakdown:
        raise HTTPException(
            status_code=400,
            detail="Partial breakdown is required when decision is PARTIALLY_UPHELD"
        )

    existing_rebuttal = await db.execute(
        Rebuttal.__table__.select().where(
            Rebuttal.error_id == error_id
        ).order_by(Rebuttal.cycle_number.desc())
    )
    last_rebuttal = existing_rebuttal.fetchone()
    current_cycle = last_rebuttal.cycle_number if last_rebuttal else 1

    new_decision = Decision(
        error_id=error_id,
        cycle_number=current_cycle,
        decision=payload.decision,
        rationale=payload.rationale,
        partial_breakdown=payload.partial_breakdown,
        decided_by_user_id=current_user.id,
    )
    db.add(new_decision)
    await db.commit()

    status_map = {
        "UPHELD": "CLOSED_UPHELD",
        "OVERTURNED": "CLOSED_OVERTURNED",
        "PARTIALLY_UPHELD": "CLOSED_PARTIAL",
    }
    new_status = status_map[payload.decision]

    updated_error = await update_status(
        error_id=error_id,
        payload=ErrorStatusUpdate(to_status=new_status),
        db=db,
        current_user=current_user,
    )

    return {"message": "Decision recorded successfully", "decision": payload.decision, "new_status": new_status}