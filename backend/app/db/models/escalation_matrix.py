
from sqlalchemy import Column, String, Integer, Uuid, Boolean, Float, Text, Date, DateTime, BigInteger, ForeignKey, CheckConstraint, Index
import uuid
from sqlalchemy import Uuid, JSON, Boolean, Column, Integer
from app.db.base_class import Base

class EscalationMatrix(Base):
    """
    Per-LOB escalation ladder: at threshold_hours_after_breach hours past an
    SLA breach, escalate to recipient_role_id OR recipient_user_id.

    escalation_level is unique per lob_id *while active* — your spec doesn't
    list explicit effective_from/effective_to columns for this table (unlike
    SLARule / OwnershipMapping), so this uses a simple is_active flag instead.
    ADMIN-ESC-1's uniqueness check should filter on is_active=True.

    Exactly one of recipient_role_id / recipient_user_id should be set —
    enforced at the API layer (see admin/escalation_matrix.py), not a DB
    CHECK constraint, since "exactly one of two nullable columns" isn't
    portable across DBs as a simple CHECK.
    """
    __tablename__ = "escalation_matrix"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    lob_id = Column(Uuid, nullable=False, index=True)
    escalation_level = Column(Integer, nullable=False)
    threshold_hours_after_breach = Column(Integer, nullable=False)
    recipient_role_id = Column(Uuid, nullable=True)
    recipient_user_id = Column(Uuid, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)