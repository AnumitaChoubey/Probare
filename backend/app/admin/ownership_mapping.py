import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin._audit import log_config_change, serialize_model
from app.db.models.ownership_mapping import OwnershipMapping
from app.db.session import get_db

from app.auth.deps import get_current_user
from app.rbac.deps import require_role

router = APIRouter(prefix="/admin/ownership-mapping", tags=["admin-ownership-mapping"])

class OwnershipMappingOut(BaseModel):
    id: uuid.UUID
    lob_id: uuid.UUID
    category_id: uuid.UUID
    default_owner_user_id: Optional[uuid.UUID]
    default_owner_team_ref: Optional[uuid.UUID]
    default_owner_manager_user_id: Optional[uuid.UUID]
    effective_from: datetime
    effective_to: Optional[datetime]

    class Config:
        from_attributes = True

class OwnershipMappingCreate(BaseModel):
    lob_id: uuid.UUID
    category_id: uuid.UUID
    default_owner_user_id: Optional[uuid.UUID] = None
    default_owner_team_ref: Optional[uuid.UUID] = None
    default_owner_manager_user_id: Optional[uuid.UUID] = None

@router.get("", response_model=List[OwnershipMappingOut])
async def list_ownership_mapping(
    lob_id: Optional[uuid.UUID] = Query(default=None),
    category_id: Optional[uuid.UUID] = Query(default=None),
    active_only: bool = Query(default=True),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = []
    if lob_id is not None:
        filters.append(OwnershipMapping.lob_id == lob_id)
    if category_id is not None:
        filters.append(OwnershipMapping.category_id == category_id)
    if active_only:
        filters.append(OwnershipMapping.effective_to.is_(None))

    query = select(OwnershipMapping)
    if filters:
        query = query.filter(and_(*filters))
    query = query.order_by(OwnershipMapping.effective_from.desc())
    
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=OwnershipMappingOut, status_code=201)
async def create_ownership_mapping(
    payload: OwnershipMappingCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role("ADMIN")),
):
    now = datetime.utcnow()

    result = await db.execute(
        select(OwnershipMapping)
        .filter(
            OwnershipMapping.lob_id == payload.lob_id,
            OwnershipMapping.category_id == payload.category_id,
            OwnershipMapping.effective_to.is_(None),
        )
    )
    previous = result.scalars().first()
    
    old_value = None
    if previous is not None:
        old_value = serialize_model(previous)
        previous.effective_to = now

    new_mapping = OwnershipMapping(
        id=uuid.uuid4(),
        lob_id=payload.lob_id,
        category_id=payload.category_id,
        default_owner_user_id=payload.default_owner_user_id,
        default_owner_team_ref=payload.default_owner_team_ref,
        default_owner_manager_user_id=payload.default_owner_manager_user_id,
        effective_from=now,
        effective_to=None,
    )
    db.add(new_mapping)
    await db.flush()

    log_config_change(
        db,
        config_entity="OWNERSHIP_MAPPING",
        entity_id=new_mapping.id,
        old_value=old_value,
        new_value=serialize_model(new_mapping),
        changed_by_user_id=current_user.id,
    )

    await db.commit()
    await db.refresh(new_mapping)
    return new_mapping
