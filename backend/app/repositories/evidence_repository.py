from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Any
from app.models.quality import Evidence
from .base import BaseRepository

class EvidenceRepository(BaseRepository[Evidence, Any, Any]):
    def __init__(self):
        super().__init__(Evidence)

    async def get_by_event_and_project(self, db: AsyncSession, evidence_id: str, event_id: str, project_id: str) -> Optional[Evidence]:
        stmt = select(Evidence).where(
            Evidence.id == evidence_id,
            Evidence.quality_event_id == event_id,
            Evidence.project_id == project_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all_by_event_and_project(self, db: AsyncSession, event_id: str, project_id: str) -> List[Evidence]:
        stmt = select(Evidence).where(
            Evidence.quality_event_id == event_id,
            Evidence.project_id == project_id
        ).order_by(Evidence.created_at.desc())
        
        result = await db.execute(stmt)
        return list(result.scalars().all())
