from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime

from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.models.integration import AuditEvent

router = APIRouter(prefix="/projects/{project_id}/audit-trail", tags=["Audit"])

@router.get("")
async def get_audit_trail(
    project_id: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_id: Optional[str] = None,
    action: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieves the audit trail for a given project, optionally filtered by entity or actor."""
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")

    stmt = select(AuditEvent).filter_by(tenant_id=auth.qems_tenant_id, project_id=project_id)

    if entity_type:
        stmt = stmt.filter_by(entity_type=entity_type)
    if entity_id:
        stmt = stmt.filter_by(entity_id=entity_id)
    if actor_id:
        stmt = stmt.filter_by(actor_id=actor_id)
    if action:
        stmt = stmt.filter_by(action=action)
        
    stmt = stmt.order_by(AuditEvent.timestamp.desc()).limit(limit).offset(offset)
    
    events = (await db.execute(stmt)).scalars().all()
    
    return [
        {
            "id": event.id,
            "entity_type": event.entity_type,
            "entity_id": event.entity_id,
            "action": event.action,
            "actor_id": event.actor_id,
            "old_value": event.old_value,
            "new_value": event.new_value,
            "reason": event.reason,
            "timestamp": event.timestamp.isoformat() if event.timestamp else None
        }
        for event in events
    ]
