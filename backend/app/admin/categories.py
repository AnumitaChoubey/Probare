from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.db.models.category import Category
from app.db.models.lob import Lob

router = APIRouter()

@router.get("/lobs")
async def get_lobs(db: AsyncSession = Depends(get_db)):
    """Fetch all Lines of Business."""
    result = await db.execute(select(Lob).where(Lob.is_active == True))
    lobs = result.scalars().all()
    return [{"id": str(lob.id), "name": lob.name} for lob in lobs]

@router.get("")
async def get_categories(
    lob_id: Optional[uuid.UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Fetch all Categories, optionally filtered by LOB."""
    stmt = select(Category).where(Category.is_active == True)
    if lob_id:
        stmt = stmt.where(Category.lob_id == lob_id)
        
    result = await db.execute(stmt)
    categories = result.scalars().all()
    
    return [
        {
            "id": str(c.id), 
            "lob_id": str(c.lob_id),
            "name": c.name,
            "requires_evidence_at_severity": c.requires_evidence_at_severity
        } 
        for c in categories
    ]
