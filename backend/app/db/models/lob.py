
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from sqlalchemy import Uuid, JSON, Boolean, Column, String
from app.db.base_class import Base

class Lob(Base):
    __tablename__ = "lobs"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    code = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
