"""
Directly provision Charan's Clerk user into the production Neon database.
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_engine_config
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.services.auth_service import AuthService

CLERK_SUB = "user_3JXCd0Y2T5kCfHuSX0s1Jrzwfxb"
EMAIL = "charanchandra200623@gmail.com"
NAME = "Charan Chandra"

async def provision():
    db_url, db_connect_args = get_engine_config()
    engine = create_async_engine(db_url, connect_args=db_connect_args)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        existing = await AuthService.get_user_by_identity(session, "clerk", CLERK_SUB)
        if existing:
            print(f"[OK] User already provisioned: {existing.id}")
            from sqlalchemy.future import select
            from app.models.core import ProjectMember, Role, UserRole
            pm_res = await session.execute(select(ProjectMember).filter_by(user_id=existing.id))
            for pm in pm_res.scalars().all():
                print(f"   Project ID: {pm.project_id}")
            roles_res = await session.execute(
                select(Role.name).join(UserRole, UserRole.role_id == Role.id).filter(UserRole.user_id == existing.id)
            )
            print(f"   Roles: {roles_res.scalars().all()}")
            await engine.dispose()
            return

        print(f"Provisioning Clerk user: {CLERK_SUB} ({EMAIL})")
        user = await AuthService.register_clerk_identity(session, CLERK_SUB, EMAIL, NAME)
        await session.commit()
        print(f"[OK] Provisioned successfully!")
        print(f"   User ID:   {user.id}")
        print(f"   Tenant ID: {user.tenant_id}")

        from sqlalchemy.future import select
        from app.models.core import ProjectMember, Role, UserRole
        pm_res = await session.execute(select(ProjectMember).filter_by(user_id=user.id))
        for pm in pm_res.scalars().all():
            print(f"   Project ID: {pm.project_id}")

    await engine.dispose()

asyncio.run(provision())
