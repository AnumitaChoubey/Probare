from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from typing import Optional, List, Any
from datetime import datetime
from typing_extensions import Annotated

# Use Annotated String constraints for descriptions
NonEmptyStr = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1)]

class QualityEventBase(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    customer_impact: Optional[str] = None
    severity: str = Field(..., max_length=50)
    process_id: Optional[str] = None
    sub_process_id: Optional[str] = None
    error_type_id: Optional[str] = None
    sop_id: Optional[str] = None
    team_id: Optional[str] = None
    owner_id: Optional[str] = None
    employee_id: Optional[str] = None

class QualityEventCreate(QualityEventBase):
    pass

class QualityEventUpdate(BaseModel):
    expected_version: int
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    customer_impact: Optional[str] = None
    severity: Optional[str] = Field(None, max_length=50)
    process_id: Optional[str] = None
    sub_process_id: Optional[str] = None
    error_type_id: Optional[str] = None
    sop_id: Optional[str] = None
    team_id: Optional[str] = None
    owner_id: Optional[str] = None
    employee_id: Optional[str] = None
    # Protected fields are NOT included in update schema

class QualityEventResponse(QualityEventBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: str
    tenant_id: str
    project_id: str
    status: str
    version: int
    created_by_id: str
    created_at: datetime
    updated_at: datetime
    sla_due_at: Optional[datetime] = None

class QualityEventList(BaseModel):
    items: List[QualityEventResponse]
    total: int
    page: int
    size: int

class QualityEventTransition(BaseModel):
    target_state: str
    expected_version: int
    reason: Optional[str] = None
