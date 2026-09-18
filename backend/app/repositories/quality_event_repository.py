from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.repositories.base import BaseRepository
from app.models.quality import QualityEvent
from typing import Optional, Any

class QualityEventRepository(BaseRepository[QualityEvent, Any, Any]):
    def __init__(self):
        super().__init__(QualityEvent)

    async def get_with_relations(self, db: AsyncSession, id: str, tenant_id: str = None, project_id: str = None) -> Optional[QualityEvent]:
        """Fetch a QualityEvent with relevant relationships eager loaded."""
        stmt = select(QualityEvent).filter(QualityEvent.id == id)
        
        if tenant_id:
            stmt = stmt.filter(QualityEvent.tenant_id == tenant_id)
        if project_id:
            stmt = stmt.filter(QualityEvent.project_id == project_id)
            
        # In the future, we can add selectinload for CAPAs, Root Causes, etc. if needed
        # stmt = stmt.options(selectinload(QualityEvent.corrective_actions))
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_number(self, db: AsyncSession, event_number: str, tenant_id: str = None, project_id: str = None) -> Optional[QualityEvent]:
        stmt = select(QualityEvent).filter(QualityEvent.event_number == event_number)
        
        if tenant_id:
            stmt = stmt.filter(QualityEvent.tenant_id == tenant_id)
        if project_id:
            stmt = stmt.filter(QualityEvent.project_id == project_id)
            
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
