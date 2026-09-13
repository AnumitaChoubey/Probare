
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from sqlalchemy import Uuid, JSON, Column, String, Date
from app.db.base_class import Base

class Holiday(Base):
    __tablename__ = "holidays"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    region_code = Column(String, index=True, nullable=False)
    date = Column(Date, nullable=False)
    description = Column(String, nullable=False)
