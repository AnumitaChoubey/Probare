import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, Field, constr

class LobResponse(BaseModel):
    id: uuid.UUID
    code: str
    name: str
    is_active: bool

    class Config:
        from_attributes = True

class SubCategoryResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    name: str
    is_active: bool

    class Config:
        from_attributes = True

class CategoryResponse(BaseModel):
    id: uuid.UUID
    lob_id: uuid.UUID
    name: str
    is_active: bool
    requires_evidence_at_severity: List[str]

    class Config:
        from_attributes = True

class ErrorCreate(BaseModel):
    lob_id: uuid.UUID
    category_id: uuid.UUID
    sub_category_id: Optional[uuid.UUID] = None
    severity: str
    transaction_reference: str
    date_of_occurrence: date
    date_of_detection: date
    description: str = Field(..., min_length=20)
    initial_root_cause: Optional[str] = None
    internal_notes: Optional[str] = None
    client_impact_flag: bool = False
    is_draft: bool = False

class ErrorResponse(BaseModel):
    id: uuid.UUID
    qa_error_id: str
    lob_id: uuid.UUID
    category_id: uuid.UUID
    sub_category_id: Optional[uuid.UUID]
    severity: str
    status: str
    transaction_reference: str
    logged_by_user_id: uuid.UUID
    owner_user_id: Optional[uuid.UUID]
    date_of_occurrence: date
    date_of_detection: date
    description: str
    initial_root_cause: Optional[str]
    internal_notes: Optional[str]
    client_impact_flag: bool
    sla_rebuttal_window_hours_snapshot: int
    sla_decision_window_hours_snapshot: int
    sla_clock_started_at: Optional[datetime]
    current_escalation_level: int
    idempotency_key: Optional[str]
    is_draft: bool
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    closed_at: Optional[datetime]
    sla_state: dict

    class Config:
        from_attributes = True

class ErrorResponseOps(BaseModel):
    id: uuid.UUID
    qa_error_id: str
    lob_id: uuid.UUID
    category_id: uuid.UUID
    sub_category_id: Optional[uuid.UUID]
    severity: str
    status: str
    transaction_reference: str
    logged_by_user_id: uuid.UUID
    owner_user_id: Optional[uuid.UUID]
    date_of_occurrence: date
    date_of_detection: date
    description: str
    initial_root_cause: Optional[str]
    client_impact_flag: bool
    sla_rebuttal_window_hours_snapshot: int
    sla_decision_window_hours_snapshot: int
    sla_clock_started_at: Optional[datetime]
    current_escalation_level: int
    idempotency_key: Optional[str]
    is_draft: bool
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    closed_at: Optional[datetime]
    sla_state: dict

    class Config:
        from_attributes = True

class ErrorListResponse(BaseModel):
    items: List[ErrorResponse]
    page: int
    page_size: int
    total_count: int

class ErrorDraftUpdate(BaseModel):
    lob_id: Optional[uuid.UUID] = None
    category_id: Optional[uuid.UUID] = None
    sub_category_id: Optional[uuid.UUID] = None
    severity: Optional[str] = None
    transaction_reference: Optional[str] = None
    date_of_occurrence: Optional[date] = None
    date_of_detection: Optional[date] = None
    description: Optional[str] = None
    initial_root_cause: Optional[str] = None
    internal_notes: Optional[str] = None
    client_impact_flag: Optional[bool] = None

class ErrorStatusUpdate(BaseModel):
    to_status: str
    reason: str

class ErrorHistoryResponse(BaseModel):
    id: uuid.UUID
    error_id: uuid.UUID
    from_status: str
    to_status: str
    performed_by_user_id: Optional[uuid.UUID]
    performed_by_system: bool
    reason: Optional[str]
    occurred_at: datetime

    class Config:
        from_attributes = True
