from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.base import BaseRepository
from app.models.integration import TimelineEvent
from typing import Any

class TimelineRepository(BaseRepository[TimelineEvent, Any, Any]):
    def __init__(self):
        super().__init__(TimelineEvent)

