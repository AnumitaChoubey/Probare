from datetime import datetime
from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class EvidenceFileResponse(BaseModel):
    id: str
    error_id: Optional[str] = None
    uploaded_by_user_id: str
    stage: str
    file_name: str
    file_type: str
    file_size_bytes: int
    malware_scan_status: str
    is_current_version: bool
    supersedes_evidence_id: Optional[str] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True

class EvidenceListGrouped(BaseModel):
    auditor_evidence: List[EvidenceFileResponse] = Field(default_factory=list)
    rebuttal_evidence: List[EvidenceFileResponse] = Field(default_factory=list)
    decision_evidence: List[EvidenceFileResponse] = Field(default_factory=list)

class MalwareScanWebhookRequest(BaseModel):
    evidence_id: str
    status: str  # CLEAN, INFECTED, FAILED
    scan_notes: Optional[str] = None
