from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, Optional
from datetime import datetime, timezone
import uuid

from app.models.quality import QualityEvent
from app.repositories.quality_event_repository import QualityEventRepository
from app.domain.exceptions import ConcurrentModificationError
from app.services.sla_service import SLAService

class QualityEventService:
    def __init__(self):
        self.repository = QualityEventRepository()

    async def get_event(self, session: AsyncSession, event_id: str, tenant_id: str = None, project_id: str = None) -> Optional[QualityEvent]:
        return await self.repository.get_with_relations(session, id=event_id, tenant_id=tenant_id, project_id=project_id)

    async def list_events(
        self,
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        filters: Dict[str, Any] = None,
        skip: int = 0,
        limit: int = 50
    ) -> list[QualityEvent]:
        # We assume the repository has a generic list/filter method, or we implement a simple select here
        from sqlalchemy.future import select
        stmt = select(QualityEvent).filter_by(tenant_id=tenant_id, project_id=project_id)
        if filters:
            for k, v in filters.items():
                stmt = stmt.filter(getattr(QualityEvent, k) == v)
        stmt = stmt.offset(skip).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    def create_event(
        self,
        session: AsyncSession,
        tenant_id: str,
        project_id: str,
        title: str,
        description: str,
        employee_id: str,
        team_id: str,
        process_id: str,
        sub_process_id: str,
        error_type_id: str,
        sop_id: str,
        severity: str,
        owner_id: str,
        created_by_id: str,
        customer_impact: str,
        status: str = "Draft"
    ) -> QualityEvent:
        """Create a new QualityEvent. No SLA calculation until Logged state."""
        event_number = f"QE-{uuid.uuid4().hex[:8].upper()}"
        
        event = self.repository.create_obj(
            tenant_id=tenant_id,
            project_id=project_id,
            event_number=event_number,
            title=title,
            description=description,
            employee_id=employee_id,
            team_id=team_id,
            process_id=process_id,
            sub_process_id=sub_process_id,
            error_type_id=error_type_id,
            sop_id=sop_id,
            severity=severity,
            owner_id=owner_id,
            created_by_id=created_by_id,
            customer_impact=customer_impact,
            status=status,
            version=1
        )
        session.add(event)
        return event

    def update_event(
        self,
        session: AsyncSession,
        event: QualityEvent,
        expected_version: int,
        updates: Dict[str, Any]
    ) -> QualityEvent:
        """
        Update QualityEvent using Optimistic Concurrency Control.
        Must provide the expected version.
        """
        if event.version != expected_version:
            raise ConcurrentModificationError(
                entity_id=event.id,
                entity_type="QualityEvent",
                expected_version=expected_version,
                actual_version=event.version
            )

        # Apply updates
        for key, value in updates.items():
            if hasattr(event, key):
                setattr(event, key, value)
        
        # Bump version
        event.version += 1
        return event
