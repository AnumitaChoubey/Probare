from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel
import json

from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.core.database import get_db

# Temporary direct imports to simulate the services we'll build
from app.services.quality_event_service import QualityEventService
from app.repositories.quality_event_repository import QualityEventRepository
from app.models.integration import SyncHistoryLog

router = APIRouter()

class SyncPushRequestItem(BaseModel):
    entity_type: str
    entity_local_id: str
    operation: str
    payload_json: str
    idempotency_key: str

class SyncPushRequest(BaseModel):
    items: List[SyncPushRequestItem]

class SyncPushResponseItem(BaseModel):
    idempotency_key: str
    success: bool
    server_id: Optional[str] = None
    server_version: Optional[int] = None
    error: Optional[str] = None
    conflict: Optional[bool] = False

class SyncPushResponse(BaseModel):
    results: List[SyncPushResponseItem]

class SyncChangesResponse(BaseModel):
    server_time: datetime
    changes: Dict[str, Dict[str, List[Any]]]
    has_more: bool
    next_cursor: Optional[str] = None

@router.get("/changes", response_model=SyncChangesResponse)
async def get_sync_changes(
    since: Optional[datetime] = None,
    entity_types: str = Query("quality_error,rebuttal,evidence"),
    limit: int = 100,
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_current_user)
):
    """
    Delta sync endpoint (Section 4.3).
    Returns server-side changes since the last sync, scoped to the caller's Data Scope.
    """
    server_time = datetime.now(timezone.utc)
    requested_types = entity_types.split(",")
    
    changes = {et: {"upserts": [], "deletes": []} for et in requested_types}
    
    # Implement actual fetching logic for 'quality_error' (Tier 2 scope)
    if "quality_error" in requested_types:
        repo = QualityEventRepository(db)
        svc = QualityEventService(repo)
        
        # We need a proper way to query by updated_at > since using data scopes.
        # For now, we will fetch all accessible events and filter in-memory if since is not natively supported.
        # Ideally, we add a proper `updated_after` filter to get_quality_events.
        # (This will be improved as part of Data Scope integration)
        
        # Basic placeholder fetch
        events, total = await svc.get_quality_events(auth_context=auth_context, limit=limit)
        
        for event in events:
            # Add to upserts if updated after 'since'
            if not since or event.updated_at > since.replace(tzinfo=None):
                changes["quality_error"]["upserts"].append(event)

    return SyncChangesResponse(
        server_time=server_time,
        changes=changes,
        has_more=False, # Pagination to be fully implemented
        next_cursor=None
    )

@router.post("/push", response_model=SyncPushResponse)
async def push_sync_changes(
    request: SyncPushRequest,
    db: AsyncSession = Depends(get_db),
    auth_context: AuthContext = Depends(get_current_user)
):
    """
    Batched outbox push endpoint.
    Processes a list of offline mutations in order.
    Implements conflict resolution rules (Section 4.4).
    """
    results = []
    
    for item in request.items:
        try:
            conflict = False
            # Idempotency check should be done here
            # For brevity in this skeleton, we handle the operation logic directly
            
            payload = json.loads(item.payload_json)
            
            if item.entity_type == "quality_error":
                repo = QualityEventRepository(db)
                svc = QualityEventService(repo)
                
                if item.operation == "create":
                    # Call create event service method
                    # (Placeholder for service call)
                    server_id = item.entity_local_id
                    server_version = 1
                    
                elif item.operation == "update":
                    # Check for conflicts
                    server_version = payload.get("_server_version") or 0
                    
                    # Fetch current from DB to check version
                    current_event = await svc.get_quality_event(item.entity_local_id, auth_context)
                    
                    if current_event.version > server_version:
                        # Conflict occurred!
                        # Section 4.4 Rule: Server wins for workflow-critical fields (status, decision, sla, assignment).
                        # Local wins for content fields (description, title) ONLY IF server didn't also change them.
                        
                        workflow_critical_fields = ["status", "severity", "owner_id", "employee_id", "sla_due_at", "sla_status", "closed_at"]
                        content_fields = ["title", "description", "customer_impact", "financial_impact", "compliance_impact"]
                        
                        resolved_payload = {}
                        for field in workflow_critical_fields:
                            resolved_payload[field] = getattr(current_event, field)
                            
                        # (In a real implementation, we'd check if server changed content fields too. 
                        #  For now, we merge local content fields)
                        for field in content_fields:
                            if field in payload:
                                resolved_payload[field] = payload[field]
                        
                        # Log the superseded version
                        log = SyncHistoryLog(
                            project_id=current_event.project_id,
                            entity_type="quality_error",
                            entity_id=current_event.id,
                            superseded_local_version=payload,
                            server_winning_version={k: getattr(current_event, k) for k in current_event.__dict__.keys() if not k.startswith('_')},
                            conflict_reason="Concurrent modification detected on update",
                            resolved_by_user_id=auth_context.qems_user_id
                        )
                        db.add(log)
                        await db.commit()
                        
                        # Flag conflict
                        conflict = True
                        server_id = current_event.id
                        server_version = current_event.version
                    else:
                        # No conflict
                        # svc.update_event(item.entity_local_id, payload)
                        server_id = item.entity_local_id
                        server_version = current_event.version + 1
                    
            results.append(SyncPushResponseItem(
                idempotency_key=item.idempotency_key,
                success=True,
                server_id=server_id,
                server_version=server_version,
                conflict=conflict
            ))
            
        except Exception as e:
            results.append(SyncPushResponseItem(
                idempotency_key=item.idempotency_key,
                success=False,
                error=str(e)
            ))
            
    return SyncPushResponse(results=results)
