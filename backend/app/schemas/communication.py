from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from datetime import datetime

class ParticipantSchema(BaseModel):
    user_id: str
    role_hint: Optional[str] = None # Informational only
    
    model_config = ConfigDict(from_attributes=True)

class MessageAttachmentSchema(BaseModel):
    id: str
    file_name: str
    storage_path: str
    
    model_config = ConfigDict(from_attributes=True)

class MessageReadStateSchema(BaseModel):
    user_id: str
    read_at: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)

class MessageSchema(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    body: str
    created_at: datetime
    attachments: List[MessageAttachmentSchema] = []
    read_states: List[MessageReadStateSchema] = []
    
    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    body: str
    attachment_ids: List[str] = Field(default_factory=list)

class ConversationSchema(BaseModel):
    id: str
    quality_event_id: str
    participants: List[ParticipantSchema] = []
    messages: List[MessageSchema] = []
    
    model_config = ConfigDict(from_attributes=True)

class PaginatedMessages(BaseModel):
    items: List[MessageSchema]
    next_cursor: Optional[str] = None
    total_count: int
