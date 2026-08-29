from datetime import date
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.holiday import Holiday
from app.db.session import get_db

from app.auth.deps import get_current_user
from app.rbac.deps import require_role

router = APIRouter(prefix="/admin/holidays", tags=["admin-holidays"])

class HolidayOut(BaseModel):
    id: uuid.UUID
    region_code: str
    date: date
    description: str

    class Config:
        from_attributes = True

class HolidayCreate(BaseModel):
    region_code: str
    date: date
    description: str

@router.get("", response_model=List[HolidayOut])
async def list_holidays(
    region_code: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    query = select(Holiday)
    if region_code:
        query = query.filter(Holiday.region_code == region_code)
    query = query.order_by(Holiday.date)
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("", response_model=HolidayOut, status_code=201)
async def create_holiday(
    payload: HolidayCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_role("ADMIN")),
):
    new_holiday = Holiday(
        id=uuid.uuid4(),
        region_code=payload.region_code,
        date=payload.date,
        description=payload.description
    )
    db.add(new_holiday)
    await db.commit()
    await db.refresh(new_holiday)
    return new_holiday
