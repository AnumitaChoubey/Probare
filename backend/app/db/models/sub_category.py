
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from sqlalchemy import Uuid, JSON, Boolean, Column, String, ForeignKey, UniqueConstraint
from app.db.base_class import Base

class SubCategory(Base):
    __tablename__ = "sub_categories"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    category_id = Column(Uuid, ForeignKey("categories.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("category_id", "name", name="uix_subcategory_category_name"),
    )
