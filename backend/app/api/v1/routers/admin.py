import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import get_db
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.models.core import User, ProjectMember, Project

router = APIRouter()

class UserResponse(BaseModel):
    id: str
    name: str
    email: str

class AssignRoleRequest(BaseModel):
    user_id: str
    project_id: str
    role: str

class AssignRoleResponse(BaseModel):
    message: str

@router.get("/users", response_model=List[UserResponse])
async def list_all_users(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """List all users in the tenant."""
    if "System Administrator" not in auth_context.roles and "Platform Admin" not in auth_context.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    result = await session.execute(
        select(User).filter(User.tenant_id == auth_context.qems_tenant_id)
    )
    users = result.scalars().all()
    
    return [
        UserResponse(id=u.id, name=u.name, email=u.email)
        for u in users
    ]

@router.post("/users/roles", response_model=AssignRoleResponse)
async def assign_user_role(
    req: AssignRoleRequest,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Assign a role to a user in a specific project."""
    if "System Administrator" not in auth_context.roles and "Platform Admin" not in auth_context.roles:
        raise HTTPException(status_code=403, detail="Admin access required")
        
    # Verify project exists and belongs to tenant
    proj_res = await session.execute(select(Project).filter_by(id=req.project_id, tenant_id=auth_context.qems_tenant_id))
    project = proj_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
        
    # Check if they are already in the project, update or insert
    pm_res = await session.execute(
        select(ProjectMember).filter_by(user_id=req.user_id, project_id=req.project_id)
    )
    pm = pm_res.scalars().first()
    
    if pm:
        pm.role = req.role
    else:
        pm = ProjectMember(
            id=str(uuid.uuid4()),
            project_id=req.project_id,
            user_id=req.user_id,
            role=req.role
        )
        session.add(pm)
        
    await session.commit()
    
    return AssignRoleResponse(message=f"User assigned to role {req.role} in project {project.name}")
