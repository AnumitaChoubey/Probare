import uuid

from sqlalchemy import ARRAY, Column, String, Time
from sqlalchemy.dialects.postgresql import UUID

from app.db.base_class import Base


class WorkingHoursCalendar(Base):

    __tablename__ = "working_hours_calendar"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    region_code = Column(String, nullable=False, unique=True, index=True)
    business_start_time = Column(Time, nullable=False)
    business_end_time = Column(Time, nullable=False)
    business_days_of_week = Column(ARRAY(String), nullable=False, default=list)