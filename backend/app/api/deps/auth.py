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

logger = logging.getLogger(__name__)

security = HTTPBearer()

class AuthenticationProvider:
    async def authenticate(self, request: Request, token: str, session: AsyncSession) -> AuthContext:
        raise NotImplementedError()

class DevelopmentProvider(AuthenticationProvider):
    async def authenticate(self, request: Request, token: str, session: AsyncSession) -> AuthContext:
        if settings.APPLICATION_ENV == "production" or settings.AUTH_PROVIDER != "development":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Development authentication is disabled in this environment."
            )
            
        if not token.startswith("dev_"):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid development token format."
            )
            
        user_id = token[4:] # strip "dev_"
        
        result = await session.execute(select(User).filter(User.id == user_id))
        user = result.scalars().first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unknown development user."
            )
            
        return await AuthService.get_auth_context(session, user, external_tenant_id="dev_tenant")


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

# Factory pattern to choose provider
def get_auth_provider() -> AuthenticationProvider:
    if settings.AUTH_PROVIDER == "development" and settings.APPLICATION_ENV in ["development", "testing"]:
        return DevelopmentProvider()
    return EntraOIDCProvider()

async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(security),
    session: AsyncSession = Depends(get_db)
) -> AuthContext:
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
