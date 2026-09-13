import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin._audit import log_config_change, serialize_model
from app.db.models.escalation_matrix import EscalationMatrix
from app.db.session import get_db

from app.auth.deps import get_current_user  # noqa: assumed path
from app.rbac.deps import require_role       # noqa: assumed path

router = APIRouter(prefix="/admin/escalation-matrix", tags=["admin-escalation-matrix"])


class EscalationMatrixOut(BaseModel):
    id: uuid.UUID
    lob_id: uuid.UUID
    escalation_level: int
    threshold_hours_after_breach: int
    recipient_role_id: Optional[uuid.UUID]
    recipient_user_id: Optional[uuid.UUID]
    is_active: bool

    class Config:
        from_attributes = True


class EscalationMatrixCreate(BaseModel):
    lob_id: uuid.UUID
    escalation_level: int
    threshold_hours_after_breach: int
    recipient_role_id: Optional[uuid.UUID] = None
    recipient_user_id: Optional[uuid.UUID] = None

    @model_validator(mode="after")
    def exactly_one_recipient(self):
        role_set = self.recipient_role_id is not None
        user_set = self.recipient_user_id is not None
        if role_set == user_set:  # both set or both unset
            raise ValueError(
                "Exactly one of recipient_role_id or recipient_user_id must be set."
            )
        return self


@router.get("", response_model=List[EscalationMatrixOut])
async def list_escalation_matrix(
    lob_id: Optional[uuid.UUID] = Query(default=None),
    active_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(EscalationMatrix)
    if lob_id is not None:
        query = query.filter(EscalationMatrix.lob_id == lob_id)
    if active_only:
        query = query.filter(EscalationMatrix.is_active.is_(True))
    
    query = query.order_by(EscalationMatrix.lob_id, EscalationMatrix.escalation_level)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=EscalationMatrixOut, status_code=201)
async def create_escalation_level(
    payload: EscalationMatrixCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    result = await db.execute(
        select(EscalationMatrix)
        .filter(
            EscalationMatrix.lob_id == payload.lob_id,
            EscalationMatrix.escalation_level == payload.escalation_level,
            EscalationMatrix.is_active.is_(True),
        )
    )
    collision = result.scalars().first()
    
    if collision is not None:
        raise HTTPException(
            status_code=409,
            detail=f"escalation_level {payload.escalation_level} is already active for this lob_id.",
        )

    new_row = EscalationMatrix(
        id=uuid.uuid4(),
        lob_id=payload.lob_id,
        escalation_level=payload.escalation_level,
        threshold_hours_after_breach=payload.threshold_hours_after_breach,
        recipient_role_id=payload.recipient_role_id,
        recipient_user_id=payload.recipient_user_id,
        is_active=True,
    )
    db.add(new_row)
    await db.flush()

    log_config_change(
        db,
        config_entity="ESCALATION_MATRIX",
        entity_id=new_row.id,
        old_value=None,
        new_value=serialize_model(new_row),
        changed_by_user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(new_row)
    return new_row
