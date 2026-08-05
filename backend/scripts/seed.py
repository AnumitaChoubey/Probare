import asyncio
from app.core.config import settings
from app.db.session import async_session_maker
from app.db.models.user import User
from app.db.models.role import Role
from app.db.models.user_role import UserRole
from app.auth.security import get_password_hash
from sqlalchemy import select

async def seed_db():
    print("Seeding database...")
    async with async_session_maker() as session:
        # Seed Roles
        roles_to_create = [
            {"code": "AUD", "name": "Auditor"},
            {"code": "QAL", "name": "QA Lead"},
            {"code": "OPS_AGT", "name": "Operations Agent"},
            {"code": "OPS_MGR", "name": "Operations Manager"},
            {"code": "ADMIN", "name": "System Administrator"},
        ]
        
        for role_data in roles_to_create:
            result = await session.execute(select(Role).where(Role.code == role_data["code"]))
            if not result.scalar_one_or_none():
                session.add(Role(code=role_data["code"], name=role_data["name"]))
        
        await session.commit()
        
        # Seed Admin User
        result = await session.execute(select(User).where(User.username == "admin"))
        admin_user = result.scalar_one_or_none()
        
        if not admin_user:
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("password123"),
                full_name="Admin User",
                email="admin@qems.com"
            )
            session.add(admin_user)
            await session.commit()
            
            # Assign ADMIN role
            result = await session.execute(select(Role).where(Role.code == "ADMIN"))
            admin_role = result.scalar_one()
            
            session.add(UserRole(user_id=admin_user.id, role_id=admin_role.id))
            await session.commit()
            
    print("Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_db())
