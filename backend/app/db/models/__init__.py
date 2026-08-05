from app.db.models.user import User
from app.db.models.role import Role
from app.db.models.user_role import UserRole

# Expose models for SQLAlchemy registry
__all__ = ["User", "Role", "UserRole"]
