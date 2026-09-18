from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.integration import AuditEvent
from typing import Any

class AuditRepository(BaseRepository[AuditEvent, Any, Any]):
    def __init__(self):
        super().__init__(AuditEvent)

    # Specific audit methods (e.g., query by entity, by actor) can be added here
