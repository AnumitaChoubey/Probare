
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.admin._audit import log_config_change, serialize_model
from app.db.models.sla_rule import SLARule
from app.db.session import get_db


from app.auth.dependencies import get_current_user  
from app.rbac.dependencies import require_role       

router = APIRouter(prefix="/admin/sla-rules", tags=["admin-sla-rules"])


#Pydantic schemas
class SLARuleOut(BaseModel):
    id: uuid.UUID
    lob_id: uuid.UUID
    category_id: Optional[uuid.UUID]
    severity: str
    rebuttal_window_hours: int
    decision_window_hours: int
    effective_from: datetime
    effective_to: Optional[datetime]

    class Config:
        from_attributes = True


class SLARuleCreate(BaseModel):
    lob_id: uuid.UUID
    category_id: Optional[uuid.UUID] = None
    severity: str
    rebuttal_window_hours: int = Field(gt=0)
    decision_window_hours: int = Field(gt=0)


#endpoints
@router.get("", response_model=List[SLARuleOut])
def list_sla_rules(
    lob_id: Optional[uuid.UUID] = Query(default=None),
    category_id: Optional[uuid.UUID] = Query(default=None),
    severity: Optional[str] = Query(default=None),
    active_only: bool = Query(default=True, description="Only rows with effective_to IS NULL"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = []
    if lob_id is not None:
        filters.append(SLARule.lob_id == lob_id)
    if category_id is not None:
        filters.append(SLARule.category_id == category_id)
    if severity is not None:
        filters.append(SLARule.severity == severity)
    if active_only:
        filters.append(SLARule.effective_to.is_(None))

    query = db.query(SLARule)
    if filters:
        query = query.filter(and_(*filters))
    return query.order_by(SLARule.effective_from.desc()).all()


@router.post("", response_model=SLARuleOut, status_code=201)
def create_sla_rule(
    payload: SLARuleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    now = datetime.utcnow()

    previous = (
        db.query(SLARule)
        .filter(
            SLARule.lob_id == payload.lob_id,
            SLARule.category_id == payload.category_id,
            SLARule.severity == payload.severity,
            SLARule.effective_to.is_(None),
        )
        .first()
    )
    old_value = None
    if previous is not None:
        old_value = serialize_model(previous)
        previous.effective_to = now

    new_rule = SLARule(
        id=uuid.uuid4(),
        lob_id=payload.lob_id,
        category_id=payload.category_id,
        severity=payload.severity,
        rebuttal_window_hours=payload.rebuttal_window_hours,
        decision_window_hours=payload.decision_window_hours,
        effective_from=now,
        effective_to=None,
    )
    db.add(new_rule)
    db.flush()  

    log_config_change(
        db,
        config_entity="SLA_RULE",
        entity_id=new_rule.id,
        old_value=old_value,
        new_value=serialize_model(new_rule),
        changed_by_user_id=current_user.id,
    )

    db.commit()
    db.refresh(new_rule)
    return new_rule