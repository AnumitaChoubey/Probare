"""
 This is a Shared helper for writing to config_change_history.
every admin-mutation endpoint (sla_rules, ownership_mapping,
escalation_matrix, working_hours, holidays) calls log_config_change()
right after its own insert,  inside the samee transaction,so a failed audit
write rolls back the config write too, rather than silently drifting out
of sync
"""

import uuid
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.config_change_history import ConfigChangeHistory


def log_config_change(
    db: AsyncSession,
    *,
    config_entity: str,
    entity_id: uuid.UUID,
    old_value: Optional[dict],
    new_value: dict,
    changed_by_user_id: uuid.UUID,
) -> ConfigChangeHistory:
    row = ConfigChangeHistory(
        config_entity=config_entity,
        entity_id=entity_id,
        old_value=old_value,
        new_value=new_value,
        changed_by_user_id=changed_by_user_id,
        changed_at=datetime.utcnow(),
    )
    db.add(row)
    
    return row


def serialize_model(instance: Any, exclude: tuple[str, ...] = ()) -> dict:
    """
    Quick JSONB-safe dict of a SQLAlchemy model instance's columns.
    UUIDs and datetimes are stringified since JSONB needs JSON-serializable
    values going in via most drivers/ORMs.
    """
    result = {}
    for col in instance.__table__.columns:
        if col.name in exclude:
            continue
        value = getattr(instance, col.name)
        if isinstance(value, (uuid.UUID, datetime)):
            value = str(value)
        result[col.name] = value
    return result