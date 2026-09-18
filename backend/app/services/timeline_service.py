from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, Optional
from app.repositories.timeline_repository import TimelineRepository

class TimelineService:
    def __init__(self):
        self.repository = TimelineRepository()

    async def record_event(
        self,
        session: AsyncSession,
        quality_event_id: str,
        event_type: str,
        description: str,
        actor_id: Optional[str] = None,
        tenant_id: Optional[str] = None,
        project_id: Optional[str] = None,
        metadata_payload: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Record a timeline event synchronously in the current transaction.
        """
        timeline_event = self.repository.create_obj(
            tenant_id=tenant_id,
            project_id=project_id,
            quality_event_id=quality_event_id,
            event_type=event_type,
            description=description,
            actor_id=actor_id,
            metadata_payload=metadata_payload
        )
        session.add(timeline_event)
