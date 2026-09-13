
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from sqlalchemy import Uuid, JSON, Boolean, Column, String, ForeignKey, UniqueConstraint
from app.db.base_class import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    lob_id = Column(Uuid, ForeignKey("lobs.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    requires_evidence_at_severity = Column(
        JSON, 
        nullable=False, 
        default=["CRITICAL", "HIGH"]
    )

    __table_args__ = (
        UniqueConstraint("lob_id", "name", name="uix_category_lob_name"),
    )
