from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, Optional
from app.repositories.outbox_repository import OutboxRepository

class OutboxService:
    def __init__(self):
        self.repository = OutboxRepository()

    async def dispatch(
        self,
        session: AsyncSession,
        event_type: str,
        aggregate_type: str,
        aggregate_id: str,
        payload: Dict[str, Any],
        tenant_id: Optional[str] = None,
        project_id: Optional[str] = None,
        idempotency_key: Optional[str] = None
    ) -> None:
        """
        Record an outbox event synchronously in the current transaction.
        """
        outbox_event = self.repository.create_obj(
            event_type=event_type,
            aggregate_type=aggregate_type,
            aggregate_id=aggregate_id,
            tenant_id=tenant_id,
            project_id=project_id,
            payload=payload,
            idempotency_key=idempotency_key,
            status="PENDING"
        )
        session.add(outbox_event)
