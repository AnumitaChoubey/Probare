from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.base_class import Base


class ConfigChangeHistory(Base):
    """
    Audit trail row inserted by every admin-mutation endpoint you own
    (sla_rules, ownership_mapping, escalation_matrix, working_hours,
    holidays). Never inserted manually per-endpoint by hand — apply the
    shared `log_config_change(...)` helper / decorator from
    app/admin/_audit.py so this doesn't get copy-pasted six times and
    silently skipped somewhere.
    """

    __tablename__ = "config_change_history"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    config_entity = Column(String, nullable=False, index=True)
    # e.g. "SLA_RULE", "OWNERSHIP_MAPPING", "ESCALATION_MATRIX",
    # "WORKING_HOURS", "HOLIDAY"

    entity_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    old_value = Column(JSONB, nullable=True)   # null on first create
    new_value = Column(JSONB, nullable=False)

    changed_by_user_id = Column(UUID(as_uuid=True), nullable=False)
    changed_at = Column(DateTime(timezone=True), nullable=False, default=datetime.utcnow, index=True)