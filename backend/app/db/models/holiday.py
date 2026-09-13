import uuid
from sqlalchemy import Column, String, Date
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    region_code = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
