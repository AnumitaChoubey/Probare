from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.db.models.user import User
from app.db.base_class import utc_now
from app.auth.security import verify_password, create_access_token
from app.auth.deps import get_current_user

router = APIRouter(tags=["auth"])

@router.post("/login")
async def login_access_token(
    db: Annotated[AsyncSession, Depends(get_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> dict:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # Find user by username
    result = await db.execute(
        select(User).where(User.username == form_data.username)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Update last login
    user.last_login_at = utc_now()
    await db.commit()
    
    # Extract roles
    roles = [ur.role.code for ur in user.user_roles]
    
    # Generate token
    token = create_access_token(
        subject=user.id, 
        roles=roles, 
        full_name=user.full_name or user.username
    )
    
    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.get("/me")
async def read_users_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)]
) -> dict:
    """
    Get current user.
    """
    # Fetch roles efficiently
    result = await db.execute(
        select(User).where(User.id == current_user.id)
    )
    user = result.scalar_one()
    roles = [ur.role.code for ur in user.user_roles]
    
    # Exactly matching the spec AUTH-2
    return {
        "user_id": user.id,
        "full_name": user.full_name or user.username,
        "roles": roles
    }
