import uuid
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.db.models.saved_filter import SavedFilter

router = APIRouter(prefix="/saved-filters", tags=["Search", "Filters"])

class SavedFilterCreate(BaseModel):
    name: str
    filter_json: dict

class SavedFilterResponse(BaseModel):
    id: uuid.UUID
    name: str
    filter_json: dict
    created_at: datetime
    updated_at: datetime

@router.post("", response_model=SavedFilterResponse, status_code=status.HTTP_201_CREATED)
async def create_saved_filter(
    payload: SavedFilterCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    new_filter = SavedFilter(
        id=uuid.uuid4(),
        user_id=current_user.id,
        name=payload.name,
        filter_json=payload.filter_json
    )
    db.add(new_filter)
    await db.commit()
    await db.refresh(new_filter)
    
    return SavedFilterResponse(
        id=new_filter.id,
        name=new_filter.name,
        filter_json=new_filter.filter_json,
        created_at=new_filter.created_at,
        updated_at=new_filter.updated_at
    )

@router.get("", response_model=List[SavedFilterResponse])
async def list_saved_filters(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stmt = select(SavedFilter).where(SavedFilter.user_id == current_user.id).order_by(SavedFilter.created_at.desc())
    result = await db.execute(stmt)
    filters = result.scalars().all()
    
    return [
        SavedFilterResponse(
            id=f.id,
            name=f.name,
            filter_json=f.filter_json,
            created_at=f.created_at,
            updated_at=f.updated_at
        ) for f in filters
    ]

@router.delete("/{filter_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_saved_filter(
    filter_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    stmt = select(SavedFilter).where(SavedFilter.id == filter_id, SavedFilter.user_id == current_user.id)
    result = await db.execute(stmt)
    saved_filter = result.scalar_one_or_none()
    
    if not saved_filter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved filter not found")
        
    await db.delete(saved_filter)
    await db.commit()
    return None
