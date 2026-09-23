from fastapi import APIRouter, Depends
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext

router = APIRouter()

@router.get("/me", response_model=AuthContext)
async def get_me(current_user: AuthContext = Depends(get_current_user)):
    """
    Returns the authenticated user's context, including roles and project memberships.
    """
    return current_user

from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.services.auth_service import AuthService
from app.api.deps.auth import get_auth_provider, ClerkAuthProvider
from pydantic import BaseModel
import jwt

class RegisterRequest(BaseModel):
    pass # Information comes from the token

@router.post("/register")
async def register_user(
    request: Request,
    session: AsyncSession = Depends(get_db)
):
    """
    Used when a Clerk user logs in but has no QEMS identity mapping.
    This provisions a baseline QEMS user.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    provider = get_auth_provider()
    
    if isinstance(provider, ClerkAuthProvider):
        try:
            signing_key = provider.jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                options={"verify_aud": False},
                leeway=300
            )
            
            sub = payload.get("sub")
            email = payload.get("email") or payload.get("primary_email_address_id") or "unknown@clerk.dev"
            name = payload.get("name", "New Clerk User")
            
            if not sub:
                raise HTTPException(status_code=400, detail="Token missing subject claim")
                
            user = await AuthService.get_user_by_identity(session, "clerk", sub)
            if user:
                return {"message": "User already mapped"}
                
            new_user = await AuthService.register_clerk_identity(session, sub, email, name)
            await session.commit()
            return {"message": "User provisioned successfully", "user_id": new_user.id}
            
        except jwt.PyJWTError as e:
            raise HTTPException(status_code=401, detail=f"Token validation failed: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Registration is only supported for Clerk currently")
