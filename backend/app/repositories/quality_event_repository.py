from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from app.repositories.base import BaseRepository
from app.models.quality import QualityEvent
from app.models.core import DataScopeRule
from typing import Optional, Any

class QualityEventRepository(BaseRepository[QualityEvent, Any, Any]):
    def __init__(self):
        super().__init__(QualityEvent)

    async def _apply_data_scope(self, db: AsyncSession, query, user_id: str):
        # Fetch user's data scope rules
        scope_res = await db.execute(
            select(DataScopeRule).where(DataScopeRule.user_id == user_id)
        )
        scopes = scope_res.scalars().all()
        
        # If no explicit scopes, assume full access? Or deny all?
        # Typically in a zero-trust model, deny if no scopes. But for now, we'll build the clauses.
        # Let's say if they have no scopes, they can still see events they created or own.
        
        team_ids = [s.entity_id for s in scopes if s.entity_type == "team"]
        process_ids = [s.entity_id for s in scopes if s.entity_type == "process"]
        
        # Mandatory SQL-level filter (Data Scope enforcement)
        query = query.where(
            or_(
                QualityEvent.created_by_id == user_id,
                QualityEvent.owner_id == user_id,
                QualityEvent.employee_id == user_id,
                QualityEvent.team_id.in_(team_ids) if team_ids else False,
                QualityEvent.process_id.in_(process_ids) if process_ids else False
            )
        )
        return query

    async def get_with_scopes(self, db: AsyncSession, id: str, user_id: str, tenant_id: str = None, project_id: str = None) -> Optional[QualityEvent]:
        stmt = select(QualityEvent).filter(QualityEvent.id == id)
        stmt = self._apply_scoping(stmt, tenant_id, project_id)
        stmt = await self._apply_data_scope(db, stmt, user_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_multi_with_scopes(
        self, db: AsyncSession, user_id: str, skip: int = 0, limit: int = 100, tenant_id: Optional[str] = None, project_id: Optional[str] = None
    ):
        stmt = select(QualityEvent)
        stmt = self._apply_scoping(stmt, tenant_id, project_id)
        stmt = await self._apply_data_scope(db, stmt, user_id)
        stmt = stmt.offset(skip).limit(limit)
        result = await db.execute(stmt)
        events = list(result.scalars().all())
        
        # get count
        from sqlalchemy import func
        count_stmt = select(func.count(QualityEvent.id))
        count_stmt = self._apply_scoping(count_stmt, tenant_id, project_id)
        count_stmt = await self._apply_data_scope(db, count_stmt, user_id)
        total = (await db.execute(count_stmt)).scalar()
        
        return events, total
