from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class SyncItem(BaseModel):
    entity_type: str
    local_id: UUID
    operation: str # 'CREATE' or 'UPDATE'
    base_version: Optional[int] = None
    payload: Dict[str, Any]

class SyncPushRequest(BaseModel):
    device_id: UUID
    items: List[SyncItem]

class SyncResult(BaseModel):
    local_id: UUID
    status: str # 'APPLIED' or 'CONFLICT'
    canonical_id: Optional[UUID] = None
    canonical_payload: Optional[Dict[str, Any]] = None
    version: Optional[int] = None
    current_payload: Optional[Dict[str, Any]] = None
    current_version: Optional[int] = None

class SyncPushResponse(BaseModel):
    results: List[SyncResult]

class DeviceRegisterRequest(BaseModel):
    device_name: str
    app_version: str

class DeviceRegisterResponse(BaseModel):
    device_id: UUID

class SyncPullResponse(BaseModel):
    has_more: bool
    server_timestamp: datetime
    data: Dict[str, List[Dict[str, Any]]] # e.g. {"errors": [...], "rebuttals": [...]}
