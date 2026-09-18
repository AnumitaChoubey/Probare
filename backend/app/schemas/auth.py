from pydantic import BaseModel, ConfigDict
from typing import List, Optional

class AuthContext(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    qems_user_id: str
    qems_tenant_id: str
    external_subject: str
    external_tenant_id: str
    roles: List[str]
    permissions: List[str]
    accessible_projects: List[str]
