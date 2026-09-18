import uuid
from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base import CRUDBase
from app.models.quality import Rebuttal, Decision, RootCause, CorrectiveAction, EffectivenessReview
from app.models.integration import IdempotencyRecord

class RebuttalRepository(CRUDBase[Rebuttal, Any, Any]):
    def __init__(self):
        super().__init__(Rebuttal)
        
    async def get_by_event_and_project(self, db: AsyncSession, event_id: str, project_id: str) -> Optional[Rebuttal]:
        result = await db.execute(
            select(Rebuttal).where(Rebuttal.quality_event_id == event_id, Rebuttal.project_id == project_id)
        )
        return result.scalars().first()

class DecisionRepository(CRUDBase[Decision, Any, Any]):
    def __init__(self):
        super().__init__(Decision)
        
    async def get_by_event_and_project(self, db: AsyncSession, event_id: str, project_id: str) -> Optional[Decision]:
        result = await db.execute(
            select(Decision).where(Decision.quality_event_id == event_id, Decision.project_id == project_id)
        )
        return result.scalars().first()

class RootCauseRepository(CRUDBase[RootCause, Any, Any]):
    def __init__(self):
        super().__init__(RootCause)
        
    async def get_by_event_and_project(self, db: AsyncSession, event_id: str, project_id: str) -> Optional[RootCause]:
        result = await db.execute(
            select(RootCause).where(RootCause.quality_event_id == event_id, RootCause.project_id == project_id)
        )
        return result.scalars().first()

class CorrectiveActionRepository(CRUDBase[CorrectiveAction, Any, Any]):
    def __init__(self):
        super().__init__(CorrectiveAction)
        
    async def get_all_by_event_and_project(self, db: AsyncSession, event_id: str, project_id: str) -> List[CorrectiveAction]:
        result = await db.execute(
            select(CorrectiveAction).where(CorrectiveAction.quality_event_id == event_id, CorrectiveAction.project_id == project_id)
        )
        return list(result.scalars().all())

class EffectivenessReviewRepository(CRUDBase[EffectivenessReview, Any, Any]):
    def __init__(self):
        super().__init__(EffectivenessReview)
        
    async def get_by_event_and_project(self, db: AsyncSession, event_id: str, project_id: str) -> Optional[EffectivenessReview]:
        result = await db.execute(
            select(EffectivenessReview).where(EffectivenessReview.quality_event_id == event_id, EffectivenessReview.project_id == project_id)
        )
        return result.scalars().first()

class IdempotencyRepository(CRUDBase[IdempotencyRecord, Any, Any]):
    def __init__(self):
        super().__init__(IdempotencyRecord)
        
    async def get_by_key(self, db: AsyncSession, key: str) -> Optional[IdempotencyRecord]:
        result = await db.execute(
            select(IdempotencyRecord).where(IdempotencyRecord.idempotency_key == key)
        )
        return result.scalars().first()

    async def create_record(self, db: AsyncSession, key: str, status: int, body: dict) -> IdempotencyRecord:
        record = IdempotencyRecord(
            id=str(uuid.uuid4()),
            idempotency_key=key,
            response_status=status,
            response_body=body
        )
        db.add(record)
        return record
