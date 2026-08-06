from fastapi import Depends, HTTPException, status
from app.auth.deps import get_current_user

def require_role(required_role_code: str):
    def role_checker(current_user = Depends(get_current_user)):
        # current_user.roles is typically a list of Role objects or Role models
        # depending on how SQLAlchemy eager loaded it.
        # Assuming current_user has a 'roles' relationship
        has_role = any(role.code == required_role_code for role in current_user.roles)
        if not has_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {required_role_code} required"
            )
        return current_user
    return role_checker
