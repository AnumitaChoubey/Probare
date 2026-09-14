
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid

from sqlalchemy import Uuid, JSON, ARRAY, Column, String, Time

from app.db.base_class import Base


class WorkingHoursCalendar(Base):

    __tablename__ = "working_hours_calendar"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)

    region_code = Column(String, nullable=False, unique=True, index=True)
    business_start_time = Column(Time, nullable=False)
    business_end_time = Column(Time, nullable=False)
    business_days_of_week = Column(JSON, nullable=False, default=list)