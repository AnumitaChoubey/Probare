from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.core import User, Tenant, ProjectMember, Role, UserRole
from app.schemas.auth import AuthContext
import uuid

class AuthService:
    """Service to handle user provisioning and identity mapping."""
    
    @classmethod
    async def get_user_by_identity(
        cls,
        session: AsyncSession,
        provider: str,
        provider_subject: str
    ) -> Optional[User]:
        from app.models.core import UserIdentity
        result = await session.execute(
            select(User)
            .join(UserIdentity, UserIdentity.user_id == User.id)
            .filter(UserIdentity.provider == provider, UserIdentity.provider_subject == provider_subject)
        )
        return result.scalars().first()

    @classmethod
    async def register_clerk_identity(
        cls,
        session: AsyncSession,
        provider_subject: str,
        email: str,
        name: str
    ) -> User:
        """Provisions a baseline QEMS user mapped to a Clerk identity."""
        from app.models.core import UserIdentity
        
        # We auto-provision a new QEMS Tenant if unknown, mapped securely.
        # Or attach to a default tenant.
        tenant_res = await session.execute(select(Tenant).filter(Tenant.name == "Default Clerk Tenant"))
        tenant = tenant_res.scalars().first()
        if not tenant:
            tenant = Tenant(
                id=str(uuid.uuid4()),
                name="Default Clerk Tenant"
            )
            session.add(tenant)
            await session.flush()
            
        import logging
        logger = logging.getLogger("auth_service")
        logger.setLevel(logging.DEBUG)
        
        # Check if user with this email already exists
        logger.debug(f"Attempting to provision Clerk user with email: {email}, subject: {provider_subject}")
        user_res = await session.execute(select(User).filter(User.email == email))
        user = user_res.scalars().first()
        
        if not user:
            logger.debug(f"User with email {email} not found. Creating new user.")
            user = User(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                email=email,
                name=name
            )
            session.add(user)
            await session.flush()
            
            # Ensure a default project exists
            from app.models.core import Project, ProjectMember, Role, UserRole
            project_res = await session.execute(select(Project).filter(Project.tenant_id == tenant.id, Project.name == "Default Project"))
            project = project_res.scalars().first()
            if not project:
                logger.debug("Creating Default Project.")
                project = Project(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant.id,
                    name="Default Project"
                )
                session.add(project)
                await session.flush()
                
            if email in ["charanchandra1006@gmail.com", "charanchandra200623@gmail.com"]:
                default_role_name = "System Administrator"
            else:
                default_role_name = "Frontline Employee"
            
            # Add user to project as default role
            pm = ProjectMember(
                project_id=project.id,
                user_id=user.id,
                role=default_role_name
            )
            session.add(pm)
            
            # Ensure the role exists and assign it globally
            role_res = await session.execute(select(Role).filter(Role.tenant_id == tenant.id, Role.name == default_role_name))
            role = role_res.scalars().first()
            if not role:
                logger.debug(f"Creating {default_role_name} role.")
                role = Role(
                    id=str(uuid.uuid4()),
                    tenant_id=tenant.id,
                    name=default_role_name
                )
                session.add(role)
                await session.flush()
                
            ur = UserRole(
                id=str(uuid.uuid4()),
                user_id=user.id,
                role_id=role.id
            )
            session.add(ur)
        else:
            logger.debug(f"Found existing user {user.id} for email {email}. Linking identity.")
            
        identity = UserIdentity(
            id=str(uuid.uuid4()),
            user_id=user.id,
            provider="clerk",
            provider_subject=provider_subject
        )
        session.add(identity)
        await session.flush()
        
        logger.debug(f"Successfully finished register_clerk_identity for {provider_subject}.")
        return user

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
        Locates an existing user by external_subject (Entra ID flow). 
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
        
        # Provision a default Project for the new Tenant
        project_res = await session.execute(
            select(Project).filter(Project.tenant_id == tenant.id)
        )
        project = project_res.scalars().first()
        if not project:
            project = Project(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                name="Default Quality Project",
                description="Auto-provisioned default project"
            )
            session.add(project)
            await session.flush()
            
        # Map user to project
        pm = ProjectMember(
            id=str(uuid.uuid4()),
            project_id=project.id,
            user_id=user.id,
            role="Administrator"
        )
        session.add(pm)
        await session.flush()
        
        # Assign default Administrator role
        role_res = await session.execute(
            select(Role).filter(Role.name == "Administrator", Role.tenant_id == tenant.id)
        )
        role = role_res.scalars().first()
        if not role:
            role = Role(
                id=str(uuid.uuid4()),
                tenant_id=tenant.id,
                name="Administrator"
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
        
        # Provide an exact mapping from recognized Frontend roles to Backend permissions
        # This acts as the Server-Authoritative source of truth, removing UI hardcodes.
        permissions = ["VIEW_QUALITY_EVENT"]
        
        # Determine broad read capabilities
        if any(r in roles for r in ["QA Reviewer", "QA Manager", "Quality Governance", "Executive / Leadership", "System Administrator", "Administrator"]):
            permissions.append("VIEW_ALL_QUALITY_EVENTS")
            permissions.append("canViewAllTeams")
            
        if any(r in roles for r in ["Admin", "Administrator", "System Administrator", "QA Manager"]):
            permissions.extend([
                "CREATE_QUALITY_EVENT", "EDIT_QUALITY_EVENT", "REVIEW_QUALITY_EVENT",
                "MAKE_DECISION", "PERFORM_EFFECTIVENESS_REVIEW", "MANAGE_USERS",
                "MANAGE_PROJECT", "MANAGE_CONFIGURATION",
                # Frontend mapped
                "canCreateEvent", "canEditEvent", "canReviewRebuttal", "canEscalate", 
                "canPerformRCA", "canCreateCAPA", "canReviewEffectiveness", "canCalibrate",
                "canViewExecutiveAnalytics", "canExportAuditPackage", "canManageSettings"
            ])
            if "System Administrator" in roles or "Administrator" in roles:
                permissions.append("canSubmitRebuttal")
                
        if "QA Auditor" in roles or "QA Reviewer" in roles:
            permissions.extend([
                "CREATE_QUALITY_EVENT", "EDIT_QUALITY_EVENT", "REVIEW_QUALITY_EVENT",
                "canCreateEvent", "canEditEvent", "canReviewRebuttal", "canEscalate",
                "canPerformRCA", "canCreateCAPA", "canCalibrate", "canExportAuditPackage"
            ])
            if "QA Reviewer" in roles:
                permissions.append("canReviewEffectiveness")
                
        if "Quality Governance" in roles:
            permissions.extend([
                "CREATE_QUALITY_EVENT", "EDIT_QUALITY_EVENT", "REVIEW_QUALITY_EVENT",
                "canCreateEvent", "canEditEvent", "canReviewRebuttal", "canEscalate",
                "canPerformRCA", "canCreateCAPA", "canReviewEffectiveness", "canCalibrate",
                "canViewExecutiveAnalytics", "canExportAuditPackage", "canManageSettings"
            ])

        if "Team Lead" in roles:
            permissions.extend([
                "CREATE_QUALITY_EVENT",
                "canCreateEvent", "canSubmitRebuttal", "canEscalate", "canPerformRCA",
                "canCreateCAPA", "canViewExecutiveAnalytics"
            ])
            
        if "Frontline Employee" in roles or "Employee" in roles:
            permissions.extend([
                "CREATE_QUALITY_EVENT", "SUBMIT_REBUTTAL", "PERFORM_RCA", "MANAGE_CORRECTIVE_ACTION",
                "canSubmitRebuttal"
            ])
            
        if "Executive / Leadership" in roles:
            permissions.extend(["canViewExecutiveAnalytics", "canExportAuditPackage"])
        
        return AuthContext(
            qems_user_id=user.id,
            qems_tenant_id=user.tenant_id,
            external_subject=user.entra_id_sub or "dev-sub",
            external_tenant_id=external_tenant_id,
            roles=list(roles),
            permissions=permissions,
            accessible_projects=list(accessible_projects),
            user_name=user.name,
            user_email=user.email,
        )
