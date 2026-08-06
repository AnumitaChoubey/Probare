import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime
from sqlalchemy.dialects.postgresql import UUID
from app.db.base_class import Base

class OwnershipMapping(Base):
    """
    Versioned "who owns errors logged against this LOB + category" mapping.

    Same insert-only versioning rule as SLARule: never overwrite a row,
    always insert a new one and close out the old one's effective_to.

    Exactly one of default_owner_user_id / default_owner_team_ref is
    expected to be meaningfully set in practice (enforced at the API layer,
    not a DB constraint, since "team_ref" isn't a real FK'd table yet).

    default_owner_manager_user_id is who gets notified on escalation tier 0
    / who can act "on behalf of" the owner (see Person 2's acknowledge/accept
    RBAC note: "caller must be the resolved owner, or their manager acting
    on their behalf").
    """
    __tablename__ = "ownership_mapping"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    lob_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    category_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    default_owner_user_id = Column(UUID(as_uuid=True), nullable=True)
    default_owner_team_ref = Column(UUID(as_uuid=True), nullable=True)
    default_owner_manager_user_id = Column(UUID(as_uuid=True), nullable=True)
    effective_from = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    effective_to = Column(DateTime(timezone=True), nullable=True, index=True)