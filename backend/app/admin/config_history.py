"""
TASK ADMIN-CFG-1: GET /admin/config-history

Queries config_change_history, filterable by config_entity and date
range. Unlike your dashboard endpoints, this queries your OWN table
directly via SQLAlchemy — no HTTP call to Person 1 needed, since you
own this table outright.

RBAC: per your doc, "ADMIN full, others read-only." Since this
endpoint has no mutation action at all (it's a pure GET), "read-only"
for non-admins is automatically satisfied — there's nothing to
restrict beyond requiring authentication. If your team later wants
non-admins to see a narrower slice (e.g. only entities relevant to
their own LOB), that's a filter to add here, not a reason to block
the whole endpoint.
"""

from datetime import datetime
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.db.models.config_change_history import ConfigChangeHistory
from app.db.session import get_db

from app.auth.deps import get_current_user

router = APIRouter(prefix="/admin/config-history", tags=["admin-config-history"])


class ConfigHistoryOut(BaseModel):
    id: int
    config_entity: str
    entity_id: uuid.UUID
    old_value: Optional[dict]
    new_value: dict
    changed_by_user_id: uuid.UUID
    changed_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[ConfigHistoryOut])
def list_config_history(
    config_entity: Optional[str] = Query(default=None, description="e.g. SLA_RULE, OWNERSHIP_MAPPING, ESCALATION_MATRIX"),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    filters = []
    if config_entity:
        filters.append(ConfigChangeHistory.config_entity == config_entity)
    if date_from:
        filters.append(ConfigChangeHistory.changed_at >= date_from)
    if date_to:
        filters.append(ConfigChangeHistory.changed_at <= date_to)

    query = db.query(ConfigChangeHistory)
    if filters:
        query = query.filter(and_(*filters))

    return query.order_by(ConfigChangeHistory.changed_at.desc()).all()