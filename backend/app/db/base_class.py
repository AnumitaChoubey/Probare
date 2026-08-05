import uuid
from typing import Any
from datetime import datetime, timezone
from sqlalchemy.orm import declarative_base, declared_attr, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import DateTime

class CustomBase:
    # Automatically generate table name from class name
    @declared_attr.directive
    def __tablename__(cls) -> str:
        # Simple pluralization for our models (e.g. User -> users)
        name = cls.__name__.lower()
        if name.endswith('y'):
            return name[:-1] + 'ies'
        elif name.endswith('s'):
            return name
        return name + "s"

Base = declarative_base(cls=CustomBase)

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)
