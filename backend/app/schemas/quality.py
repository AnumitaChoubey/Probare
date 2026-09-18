from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    project_id: str
    quality_event_id: str
    title: str
    file_name: str
    file_size: str
    mime_type: Optional[str] = None
    uploaded_by_id: str
    description: Optional[str] = None
    checksum: Optional[str] = None
    duration: Optional[str] = None
    highlight_timestamp: Optional[str] = None
    created_at: datetime
    updated_at: datetime
