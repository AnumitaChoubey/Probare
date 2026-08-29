

import uuid
from datetime import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin._audit import log_config_change, serialize_model
from app.db.models.working_hours_calendar import WorkingHoursCalendar
from app.db.session import get_db

from app.auth.deps import get_current_user  
from app.rbac.deps import require_role  

router = APIRouter(prefix="/admin/working-hours", tags=["admin-working-hours"])


class WorkingHoursOut(BaseModel):
    id: uuid.UUID
    region_code: str
    business_start_time: time
    business_end_time: time
    business_days_of_week: list[str]

    class Config:
        from_attributes = True


class WorkingHoursCreate(BaseModel):
    region_code: str
    business_start_time: time
    business_end_time: time
    business_days_of_week: list[str]


@router.get("", response_model=list[WorkingHoursOut])
async def list_working_hours(
    region_code: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    query = select(WorkingHoursCalendar)
    if region_code:
        query = query.filter(WorkingHoursCalendar.region_code == region_code)
    query = query.order_by(WorkingHoursCalendar.region_code)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=WorkingHoursOut, status_code=201)
async def upsert_working_hours(
    payload: WorkingHoursCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    """
    Upsert by region_code — one row per region, unlike the versioned
    tables. If a region already has hours set, this updates it in
    place (still logged to config_change_history so there's an audit
    trail, just no old-row-preservation like the versioned configs).
    """
    query = select(WorkingHoursCalendar).filter(WorkingHoursCalendar.region_code == payload.region_code)
    result = await db.execute(query)
    existing = result.scalars().first()

    old_value = serialize_model(existing) if existing else None

    if existing:
        existing.business_start_time = payload.business_start_time
        existing.business_end_time = payload.business_end_time
        existing.business_days_of_week = payload.business_days_of_week
        row = existing
    else:
        row = WorkingHoursCalendar(
            id=uuid.uuid4(),
            region_code=payload.region_code,
            business_start_time=payload.business_start_time,
            business_end_time=payload.business_end_time,
            business_days_of_week=payload.business_days_of_week,
        )
        db.add(row)

    await db.flush()

    log_config_change(
        db,
        config_entity="WORKING_HOURS",
        entity_id=row.id,
        old_value=old_value,
        new_value=serialize_model(row),
        changed_by_user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(row)
    return row