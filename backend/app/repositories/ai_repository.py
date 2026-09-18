from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Any
from app.models.integration import AIAnalysisRun, AIInsight, AIUsageRecord
from .base import BaseRepository

class AIAnalysisRunRepository(BaseRepository[AIAnalysisRun, Any, Any]):
    def __init__(self):
        super().__init__(AIAnalysisRun)

    async def get_by_idempotency_key(self, db: AsyncSession, idempotency_key: str) -> Optional[AIAnalysisRun]:
        stmt = select(AIAnalysisRun).where(AIAnalysisRun.idempotency_key == idempotency_key)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

class AIInsightRepository(BaseRepository[AIInsight, Any, Any]):
    def __init__(self):
        super().__init__(AIInsight)

    async def get_all_by_event_and_project(self, db: AsyncSession, event_id: str, project_id: str) -> List[AIInsight]:
        stmt = select(AIInsight).where(
            AIInsight.quality_event_id == event_id,
            AIInsight.project_id == project_id
        ).order_by(AIInsight.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

class AIUsageRecordRepository(BaseRepository[AIUsageRecord, Any, Any]):
    def __init__(self):
        super().__init__(AIUsageRecord)
