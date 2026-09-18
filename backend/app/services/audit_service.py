from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict, Optional
from app.repositories.audit_repository import AuditRepository

class AuditService:
    def __init__(self):
        self.repository = AuditRepository()

    async def record_action(
        self,
        session: AsyncSession,
        entity_type: str,
        entity_id: str,
        action: str,
        actor_id: str,
        tenant_id: str,
        project_id: Optional[str] = None,
        old_value: Optional[Dict[str, Any]] = None,
        new_value: Optional[Dict[str, Any]] = None,
        reason: Optional[str] = None
    ) -> None:
        """
        Record an audit event synchronously in the current transaction.
        """
        audit_event = self.repository.create_obj(
            tenant_id=tenant_id,
            project_id=project_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            old_value=old_value,
            new_value=new_value,
            reason=reason
        )
        session.add(audit_event)
        # Note: We do not call session.commit() here; the caller manages the transaction boundary.
