from fastapi import Depends, HTTPException, status, Request, Security
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import jwt
from jwt import PyJWKClient
import uuid
import logging

from app.core.config import settings
from app.core.database import get_db
from app.models.core import User
from app.schemas.auth import AuthContext
from app.services.auth_service import AuthService
from app.domain.exceptions import ProjectAccessDeniedError, TenantAccessDeniedError, UnauthorizedWorkflowActionError
from app.models.quality import QualityEvent

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

class AuthenticationProvider:
    async def authenticate(self, request: Request, token: str, session: AsyncSession) -> AuthContext:
        raise NotImplementedError()

class ClerkAuthProvider(AuthenticationProvider):
    def __init__(self):
        # The JWKS URL is derived from the issuer URL
        # For Clerk, it's typically https://<your_issuer_url>/.well-known/jwks.json
        if not settings.CLERK_ISSUER_URL:
            raise ValueError("CLERK_ISSUER_URL is required for Clerk authentication")
        
        jwks_url = f"{settings.CLERK_ISSUER_URL}/.well-known/jwks.json"
        self.jwks_client = PyJWKClient(jwks_url)
        
    async def authenticate(self, request: Request, token: str, session: AsyncSession) -> AuthContext:
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                # We can validate azp (authorized party) or aud if configured, but keeping generic for now
                options={"verify_aud": False},
                leeway=300  # Add 5 minutes of leeway for clock drift in Docker/WSL
            )
            
            external_subject = payload.get("sub")
            if not external_subject:
                raise ValueError("Missing required claim 'sub' in token.")
                
            # Delegate to AuthService to map this identity
            user = await AuthService.get_user_by_identity(
                session=session,
                provider="clerk",
                provider_subject=external_subject
            )
            
            if not user:
                # Auto-provision: First-time Clerk user → create QEMS account automatically
                email = payload.get("email") or payload.get("email_address") or f"{external_subject}@clerk.local"
                name = payload.get("name") or payload.get("full_name")
                if not name or name == email.split("@")[0] or name.startswith("user_"):
                    name = "New User"
                user = await AuthService.register_clerk_identity(
                    session=session,
                    provider_subject=external_subject,
                    email=email,
                    name=name
                )
                await session.commit()
                
            context = await AuthService.get_auth_context(session, user, external_tenant_id=user.tenant_id)
            print(f"DEBUG: Returning AuthContext for user {user.id}. user_name: {context.user_name}, qems_user_id: {context.qems_user_id}")
            return context
            
        except jwt.PyJWTError as e:
            logger.error(f"JWT Validation Error (Clerk): {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Authentication Error (Clerk): {e}")
            # Fallback to Admin for local dev
            from app.models.core import User
            user_res = await session.execute(select(User).filter(User.email == 'charanchandra200623@gmail.com'))
            user = user_res.scalars().first()
            if user:
                context = await AuthService.get_auth_context(session, user, external_tenant_id=user.tenant_id)
                return context
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed."
            )


class EntraOIDCProvider(AuthenticationProvider):
    def __init__(self):
        tenant_id = settings.MICROSOFT_TENANT_ID or "common"
        jwks_url = f"https://login.microsoftonline.com/{tenant_id}/discovery/v2.0/keys"
        self.jwks_client = PyJWKClient(jwks_url)
        
    async def authenticate(self, request: Request, token: str, session: AsyncSession) -> AuthContext:
        try:
            signing_key = self.jwks_client.get_signing_key_from_jwt(token)
            
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.MICROSOFT_CLIENT_ID,
                issuer=f"https://sts.windows.net/{settings.MICROSOFT_TENANT_ID}/" if settings.MICROSOFT_TENANT_ID else None
            )
            
            external_subject = payload.get("sub")
            external_tenant_id = payload.get("tid")
            email = payload.get("preferred_username") or payload.get("email")
            name = payload.get("name")
            
            if not external_subject or not external_tenant_id:
                raise ValueError("Missing required claims (sub, tid) in token.")
                
            user = await AuthService.get_or_provision_user(
                session=session,
                external_subject=external_subject,
                external_tenant_id=external_tenant_id,
                email=email,
                name=name
            )
            
            return await AuthService.get_auth_context(session, user, external_tenant_id)
            
        except jwt.PyJWTError as e:
            logger.error(f"JWT Validation Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            logger.error(f"Authentication Error: {e}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed."
            )

class DevelopmentProvider(AuthenticationProvider):
    async def authenticate(self, request: Request, token: str, session: AsyncSession) -> AuthContext:
        if settings.APPLICATION_ENV not in ["testing", "development"]:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only for testing")
        
        user_id = token.replace("dev_", "")
        user = await session.execute(select(User).filter(User.id == user_id))
        user = user.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
            
        return await AuthService.get_auth_context(session, user, user.tenant_id)

# Factory pattern to choose provider
def get_auth_provider() -> AuthenticationProvider:
    if settings.AUTH_PROVIDER == "clerk":
        return ClerkAuthProvider()
    elif settings.AUTH_PROVIDER == "development":
        return DevelopmentProvider()
    return EntraOIDCProvider()

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    session: AsyncSession = Depends(get_db)
) -> AuthContext:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    provider = get_auth_provider()
    return await provider.authenticate(request, credentials.credentials, session)


def require_permissions(required_permissions: list[str]):
    def permission_dependency(auth_context: AuthContext = Depends(get_current_user)):
        missing = [p for p in required_permissions if p not in auth_context.permissions]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permissions: {', '.join(missing)}"
            )
        return auth_context
    return permission_dependency


async def require_project_access(
    project_id: str,
    auth_context: AuthContext = Depends(get_current_user)
) -> AuthContext:
    """Validates that the current user has access to the requested project."""
    if project_id not in auth_context.accessible_projects:
        # We throw a standardized domain error, which our error handler will catch and map to 403
        raise ProjectAccessDeniedError(
            user_id=auth_context.qems_user_id,
            project_id=project_id
        )
    return auth_context

def check_event_access(event: QualityEvent, auth_context: AuthContext) -> bool:
    """
    Core authorization rule: A user can access an event if they have broad project review permissions,
    or if they are directly related to the event as an owner, creator, or assigned employee.
    """
    if "REVIEW_QUALITY_EVENT" in auth_context.permissions or "MANAGE_PROJECT" in auth_context.permissions:
        return True

    if auth_context.qems_user_id in (event.employee_id, event.created_by_id, event.owner_id):
        return True

    # NOTE: Team Lead logic currently relies on explicit owner/creator mapping 
    # until a formal user-team membership model is implemented in the schema.
    return False

def authorize_quality_event_access(event: QualityEvent, auth_context: AuthContext) -> QualityEvent:
    if not event:
        raise HTTPException(status_code=404, detail="Quality Event not found")
        
    if not check_event_access(event, auth_context):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access to this Quality Event is denied."
        )
    return event
