import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.api.deps.auth import get_current_user, require_permissions
from app.schemas.auth import AuthContext
from app.models.core import Project, Tenant, ProjectMember, User, UserRole, Role
from pydantic import BaseModel

router = APIRouter()

class TaxonomyConfig(BaseModel):
    processes: Dict[str, Any]
    teams: List[str]
    root_causes: List[str]
    sla_policies: List[Dict[str, Any]]

class ProjectResponse(BaseModel):
    id: str
    name: str
    tenant_id: str
    taxonomy_config: Optional[Dict[str, Any]]

class ProjectCreate(BaseModel):
    name: str
    tenant_id: Optional[str] = None

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """List all projects the current user has access to."""
    if not auth_context.accessible_projects:
        return []
        
    result = await session.execute(
        select(Project).where(Project.id.in_(auth_context.accessible_projects))
    )
    projects = result.scalars().all()
    
    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            tenant_id=p.tenant_id,
            taxonomy_config=p.taxonomy_config
        ) for p in projects
    ]

@router.post("", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Create a new project. Requires admin roles or similar permissions, but we'll check tenant_id matching."""
    # Ensure they specify a tenant or fallback to their current tenant
    tenant_id = project_in.tenant_id or auth_context.qems_tenant_id
    
    # We could restrict this to 'System Administrator' or specific roles
    if "System Administrator" not in auth_context.roles and "Platform Admin" not in auth_context.roles:
        raise HTTPException(status_code=403, detail="Not authorized to create projects")
        
    # Default taxonomy config
    default_taxonomy = {
        "teams": [
            "Claims Operations",
            "Card Services",
            "Fraud & Risk",
            "Customer Care"
        ],
        "processes": {
            "Payment Verification": {
                "subCategories": ["Account Validation", "Threshold Exceedance", "Refund Processing", "Two-Factor Match"],
                "errorTypes": ["Missing Secondary Auth", "Skipped Payout Limit Check", "Incorrect Routing Number", "Failure to Read Disclaimer"],
                "defaultSop": {"id": "SOP-PAY-014", "title": "Payment Verification & Wire Thresholds v3.4"}
            },
            "Identity Authentication": {
                "subCategories": ["Voice Biometrics", "ID Document Check", "Out-of-Band Auth", "Security Questions"],
                "errorTypes": ["Unverified Caller Override", "Expired ID Acceptance", "Security Answer Hinting", "Incomplete KYC Log"],
                "defaultSop": {"id": "SOP-SEC-102", "title": "Identity & Authentication Assurance Protocol v4.1"}
            }
        },
        "root_causes": [
            "Training Gap",
            "Process Gap",
            "SOP Ambiguity",
            "System Issue"
        ],
        "sla_policies": [
            {
                "id": "SLA-POL-01",
                "name": "Standard Operational Quality SLA",
                "processArea": "All Standard Operations",
                "rebuttalWindowHours": 48,
                "qaResponseHours": 24,
                "escalationWindowHours": 24,
                "warningThresholdPercent": 75
            }
        ]
    }
    
    project = Project(
        id=str(uuid.uuid4()),
        tenant_id=tenant_id,
        name=project_in.name,
        taxonomy_config=default_taxonomy
    )
    
    session.add(project)
    
    # Also add the creator as an admin of this new project
    pm = ProjectMember(
        id=str(uuid.uuid4()),
        project_id=project.id,
        user_id=auth_context.qems_user_id,
        role="System Administrator"
    )
    session.add(pm)
    
    await session.commit()
    await session.refresh(project)
    
    return ProjectResponse(
        id=project.id,
        name=project.name,
        tenant_id=project.tenant_id,
        taxonomy_config=project.taxonomy_config
    )

@router.get("/{project_id}/taxonomy", response_model=TaxonomyConfig)
async def get_taxonomy(
    project_id: str,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get the taxonomy for a project."""
    if project_id not in auth_context.accessible_projects:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
    result = await session.execute(select(Project).filter_by(id=project_id))
    project = result.scalars().first()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    config = project.taxonomy_config or {}
    
    return TaxonomyConfig(
        processes=config.get("processes", {}),
        teams=config.get("teams", []),
        root_causes=config.get("root_causes", []),
        sla_policies=config.get("sla_policies", [])
    )

@router.get("/{project_id}/users")
async def get_project_users(
    project_id: str,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """List all users who have access to this project, along with their roles."""
    if project_id not in auth_context.accessible_projects:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
        
    result = await session.execute(
        select(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .filter(ProjectMember.project_id == project_id)
    )
    
    users = []
    for pm, u in result.all():
        users.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "project_role": pm.role
        })
        
    return users

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Delete a project."""
    if "System Administrator" not in auth_context.roles and "Platform Admin" not in auth_context.roles:
        raise HTTPException(status_code=403, detail="Admin access required to delete projects")
        
    project_res = await session.execute(select(Project).filter_by(id=project_id, tenant_id=auth_context.qems_tenant_id))
    project = project_res.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await session.delete(project)
    await session.commit()
    return None
