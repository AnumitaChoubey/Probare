from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import User, Tenant, ProjectMember, Role, UserRole
from app.schemas.auth import AuthContext
import uuid

class AuthService:
    """Service to handle user provisioning and identity mapping."""
    
    @classmethod
    async def get_or_provision_user(
        cls, 
        session: AsyncSession, 
        external_subject: str, 
        external_tenant_id: str, 
        email: str, 
        name: str
    ) -> User:
        """
        Locates an existing user by external_subject. 
        If not found, creates the user and maps them to a QEMS tenant.
        """
        result = await session.execute(
            select(User).filter(User.entra_id_sub == external_subject)
        )
        user = result.scalars().first()
        
        if user:
            return user
            
        # We lookup by entra_tenant_id. If it does not exist, we reject or provision based on policy.
        # For this phase, we auto-provision a new QEMS Tenant if unknown, mapped securely.
        tenant_res = await session.execute(
            select(Tenant).filter(Tenant.entra_tenant_id == external_tenant_id)
        )
        tenant = tenant_res.scalars().first()
        if not tenant:
            tenant = Tenant(
                id=str(uuid.uuid4()),
                name=f"Entra Tenant {external_tenant_id[:8]}",
                entra_tenant_id=external_tenant_id
            )
            session.add(tenant)
            await session.flush()
            
        # Create user
        user = User(
            id=str(uuid.uuid4()),
            tenant_id=tenant.id,
            email=email,
            name=name,
            entra_id_sub=external_subject
        )
        session.add(user)
        await session.flush()
        
        # Assign default VIEWER role
        role_res = await session.execute(
            select(Role).filter(Role.name == "Viewer", Role.tenant_id == tenant.id)
        )
        role = role_res.scalars().first()
        if not role:
            role = Role(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                name="Viewer"
            )
            session.add(role)
            await session.flush()
            
        user_role = UserRole(
            id=str(uuid.uuid4()),
            user_id=user.id,
            role_id=role.id
        )
        session.add(user_role)
        await session.flush()
        
        return user

    @classmethod
    async def get_auth_context(
        cls, 
        session: AsyncSession, 
        user: User, 
        external_tenant_id: str
    ) -> AuthContext:
        """
        Constructs the authoritative AuthContext from the database for the given user.
        """
        # Fetch roles
        roles_res = await session.execute(
            select(Role.name)
            .join(UserRole, UserRole.role_id == Role.id)
            .filter(UserRole.user_id == user.id)
        )
        roles = roles_res.scalars().all()
        
        # Fetch project memberships
        projects_res = await session.execute(
            select(ProjectMember.project_id)
            .filter(ProjectMember.user_id == user.id)
        )
        accessible_projects = projects_res.scalars().all()
        
        # In a fully fleshed out RBAC system, we would join roles to permissions.
        # For Phase 3, we mock some generic permissions based on roles.
        permissions = ["VIEW_QUALITY_EVENT"]
        if "Admin" in roles or "QA Manager" in roles:
            permissions.extend([
                "CREATE_QUALITY_EVENT", 
                "EDIT_QUALITY_EVENT", 
                "REVIEW_QUALITY_EVENT",
                "MAKE_DECISION",
                "PERFORM_EFFECTIVENESS_REVIEW",
                "MANAGE_USERS",
                "MANAGE_PROJECT",
                "MANAGE_CONFIGURATION"
            ])
        if "Employee" in roles:
            permissions.extend([
                "CREATE_QUALITY_EVENT",
                "SUBMIT_REBUTTAL",
                "PERFORM_RCA",
                "MANAGE_CORRECTIVE_ACTION"
            ])
            
        # Give Viewer role baseline permissions
        
        return AuthContext(
            qems_user_id=user.id,
            qems_tenant_id=user.tenant_id,
            external_subject=user.entra_id_sub or "dev-sub",
            external_tenant_id=external_tenant_id,
            roles=list(roles),
            permissions=permissions,
            accessible_projects=list(accessible_projects)
        )
