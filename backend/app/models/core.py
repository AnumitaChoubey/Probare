from sqlalchemy import Column, String, ForeignKey, Table
from sqlalchemy.orm import relationship
from .base import Base, UUIDMixin, TimestampMixin, TenantMixin

class Tenant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "tenants"
    name = Column(String(255), nullable=False)
    entra_tenant_id = Column(String(255), unique=True, index=True, nullable=True)

class Project(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "projects"
    name = Column(String(255), nullable=False)
    tenant = relationship("Tenant")

class User(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "users"
    email = Column(String(255), nullable=False, unique=True, index=True)
    name = Column(String(255), nullable=False)
    entra_id_sub = Column(String(255), unique=True, index=True, nullable=True) # Deprecated in favor of UserIdentity

class UserIdentity(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_identities"
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    provider = Column(String(50), nullable=False) # e.g. "clerk", "entra"
    provider_subject = Column(String(255), nullable=False, index=True)
    # user = relationship("User", backref="identities")

class Role(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "roles"
    name = Column(String(255), nullable=False)

class Permission(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "permissions"
    name = Column(String(255), nullable=False, unique=True)

class UserRole(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "user_roles"
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role_id = Column(String(36), ForeignKey('roles.id', ondelete='CASCADE'), nullable=False, index=True)

class ProjectMember(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "project_members"
    project_id = Column(String(36), ForeignKey('projects.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    role = Column(String(50), nullable=False) # e.g. PROJECT_ADMIN, QA_MANAGER

class Team(Base, UUIDMixin, TimestampMixin, TenantMixin):
    __tablename__ = "teams"
    name = Column(String(255), nullable=False)
