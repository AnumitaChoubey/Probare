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
