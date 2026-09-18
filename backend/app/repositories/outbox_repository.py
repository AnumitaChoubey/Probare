from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.integration import OutboxEvent
from typing import Any

class OutboxRepository(BaseRepository[OutboxEvent, Any, Any]):
    def __init__(self):
        super().__init__(OutboxEvent)
