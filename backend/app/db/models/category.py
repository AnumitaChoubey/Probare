import uuid
from sqlalchemy import Boolean, Column, String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from app.db.base_class import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lob_id = Column(UUID(as_uuid=True), ForeignKey("lobs.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    requires_evidence_at_severity = Column(
        ARRAY(String), 
        nullable=False, 
        default=["CRITICAL", "HIGH"]
    )

    __table_args__ = (
        UniqueConstraint("lob_id", "name", name="uix_category_lob_name"),
    )
