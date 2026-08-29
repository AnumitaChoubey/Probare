import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db.session import get_db
from app.auth.deps import get_current_user
from app.db.models.error import Error

router = APIRouter(prefix="/search", tags=["search"])

class SearchFilters(BaseModel):
    date_start: Optional[datetime] = None
    date_end: Optional[datetime] = None
    lob_ids: Optional[List[uuid.UUID]] = None
    category_id: Optional[uuid.UUID] = None
    severity: Optional[str] = None
    has_client_impact: Optional[bool] = None

# We can re-use ErrorResponse from errors.schemas, but let's just return what they need or import it.
from app.errors.schemas import ErrorResponse, ErrorListResponse

@router.post("/errors", response_model=ErrorListResponse)
async def advanced_search_errors(
    filters: SearchFilters,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user),
):
    query_filters = []
    
    if filters.date_start:
        query_filters.append(Error.created_at >= filters.date_start)
    if filters.date_end:
        query_filters.append(Error.created_at <= filters.date_end)
    if filters.lob_ids:
        query_filters.append(Error.lob_id.in_(filters.lob_ids))
    if filters.category_id:
        query_filters.append(Error.category_id == filters.category_id)
    if filters.severity:
        query_filters.append(Error.severity == filters.severity)
    if filters.has_client_impact is not None:
        query_filters.append(Error.has_client_impact == filters.has_client_impact)
        
    query = select(Error).options(
        joinedload(Error.lob),
        joinedload(Error.category),
        joinedload(Error.sub_category),
        joinedload(Error.logged_by_user),
        joinedload(Error.owner_user)
    )
    if query_filters:
        query = query.filter(and_(*query_filters))
        
    # Count total
    count_query = select(func.count(Error.id))
    if query_filters:
        count_query = count_query.filter(and_(*query_filters))
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Pagination
    query = query.order_by(Error.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    errors = result.scalars().unique().all()

    return ErrorListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=errors
    )
