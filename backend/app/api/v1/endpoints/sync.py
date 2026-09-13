from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert
from datetime import datetime, timezone
import uuid
from typing import Any, Dict

from app.db.session import get_db
from app.db.models.sync import Device, SyncCursor
from app.schemas.sync import (
    SyncPushRequest, SyncPushResponse, SyncResult,
    DeviceRegisterRequest, DeviceRegisterResponse, SyncPullResponse
)
from app.core.security import get_current_user
from app.db.models.user import User
from app.db.models.error import Error
from app.db.models.rebuttal import Rebuttal
from app.db.models.decision import Decision
from app.db.models.evidence_file import EvidenceFile
from app.db.models.in_app_notification import InAppNotification

router = APIRouter()

ENTITY_MODEL_MAP = {
    "error": Error,
    "rebuttal": Rebuttal,
    "decision": Decision,
    "evidence_file": EvidenceFile,
    "in_app_notification": InAppNotification
}

@router.post("/devices/register", response_model=DeviceRegisterResponse)
async def register_device(
    req: DeviceRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    new_device = Device(
        user_id=current_user.id,
        device_name=req.device_name,
        app_version=req.app_version,
        registered_at=datetime.now(timezone.utc),
        last_seen_at=datetime.now(timezone.utc)
    )
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)
    return DeviceRegisterResponse(device_id=new_device.id)

@router.post("/push", response_model=SyncPushResponse)
async def sync_push(
    req: SyncPushRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    results = []
    # Verify device belongs to user
    stmt = select(Device).where(Device.id == req.device_id, Device.user_id == current_user.id)
    device = (await db.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=403, detail="Device not found or not owned by user")
        
    device.last_seen_at = datetime.now(timezone.utc)

    for item in req.items:
        model = ENTITY_MODEL_MAP.get(item.entity_type)
        if not model:
            continue
            
        # 1. Idempotency Check
        stmt = select(model).where(model.local_id == item.local_id)
        existing_record = (await db.execute(stmt)).scalar_one_or_none()
        
        if item.operation == "CREATE":
            if existing_record:
                # Already created, just return canonical
                results.append(SyncResult(
                    local_id=item.local_id,
                    status="APPLIED",
                    canonical_id=existing_record.id,
                    canonical_payload={"id": str(existing_record.id)}, # Minimal payload for now
                    version=getattr(existing_record, "version", 1)
                ))
            else:
                # Handle CREATE logic here (in real app, use the actual endpoint logic)
                # For Phase 1 we insert it directly
                new_record = model(**item.payload)
                new_record.local_id = item.local_id
                new_record.updated_by_device_id = req.device_id
                if hasattr(model, "version"):
                    new_record.version = 1
                db.add(new_record)
                await db.flush()
                results.append(SyncResult(
                    local_id=item.local_id,
                    status="APPLIED",
                    canonical_id=new_record.id,
                    canonical_payload={"id": str(new_record.id)},
                    version=1
                ))
                
        elif item.operation == "UPDATE":
            if not existing_record:
                continue # Edge case: updating something that doesn't exist centrally
                
            if not hasattr(model, "version"):
                continue # Cannot conflict resolution on append-only
                
            # Optimistic Locking check
            if existing_record.version != item.base_version:
                # Conflict!
                results.append(SyncResult(
                    local_id=item.local_id,
                    status="CONFLICT",
                    current_payload={"id": str(existing_record.id)}, # minimal
                    current_version=existing_record.version
                ))
            else:
                # Apply update
                for k, v in item.payload.items():
                    if hasattr(existing_record, k) and k not in ['id', 'local_id', 'version', 'sync_status']:
                        setattr(existing_record, k, v)
                existing_record.version += 1
                existing_record.updated_by_device_id = req.device_id
                await db.flush()
                results.append(SyncResult(
                    local_id=item.local_id,
                    status="APPLIED",
                    canonical_id=existing_record.id,
                    canonical_payload={"id": str(existing_record.id)},
                    version=existing_record.version
                ))

    await db.commit()
    return SyncPushResponse(results=results)

@router.get("/pull", response_model=SyncPullResponse)
async def sync_pull(
    device_id: uuid.UUID,
    since: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify device
    stmt = select(Device).where(Device.id == device_id, Device.user_id == current_user.id)
    device = (await db.execute(stmt)).scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=403, detail="Device not found")
        
    device.last_seen_at = datetime.now(timezone.utc)
    server_time = datetime.now(timezone.utc)
    
    # In a full implementation, this would return actual deltas
    # For Phase 1, we return empty structure to validate the API contract
    data: Dict[str, Any] = {
        "errors": [],
        "rebuttals": [],
        "decisions": [],
        "evidence_files": [],
        "in_app_notifications": []
    }
    
    # Update cursor
    cursor_stmt = select(SyncCursor).where(SyncCursor.device_id == device_id)
    cursor = (await db.execute(cursor_stmt)).scalar_one_or_none()
    if cursor:
        cursor.last_pulled_at = server_time
    else:
        new_cursor = SyncCursor(device_id=device_id, last_pulled_at=server_time)
        db.add(new_cursor)
        
    await db.commit()
    
    return SyncPullResponse(
        has_more=False,
        server_timestamp=server_time,
        data=data
    )
