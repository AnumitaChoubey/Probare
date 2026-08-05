import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base


class SLARule(Base):
    """
    Versioned SLA windows per LOB (+ optional category, + severity).

    NEVER edited in place. An "update" is:
      1. Insert a new row with the new values + effective_from = now()
      2. Close out the previous active row: set its effective_to = now()

    Already-open errors keep whatever SLA window Person 1 snapshotted onto
    them at creation time — changes here only affect *new* errors going
    forward.
    category_id is nullable: NULL means "applies to the whole LOB by default".

    NOTE: lob_id / category_id are plain UUID columns with no SQLAlchemy
    ForeignKey() constraint. They point at Person 1's `lobs` / `categories`
    tables, but per team convention we don't enforce cross-owner FKs in the
    ORM layer — Person 1's migrations and yours stay independent.
    """
    __tablename__ = "sla_rules"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lob_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    severity = Column(String, nullable=False, index=True)
    rebuttal_window_hours = Column(Integer, nullable=False)
    decision_window_hours = Column(Integer, nullable=False)
    effective_from = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    effective_to = Column(DateTime(timezone=True), nullable=True, index=True)
    # effective_to IS NULL  ==  "currently active" row for this
    # (lob_id, category_id, severity) combination.
