from typing import Generic, TypeVar, Type, Optional, List, Any, Dict, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from pydantic import BaseModel
from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        self.model = model

    def _apply_scoping(self, query, tenant_id: Optional[str] = None, project_id: Optional[str] = None):
        if tenant_id and hasattr(self.model, 'tenant_id'):
            query = query.filter(self.model.tenant_id == tenant_id)
        if project_id and hasattr(self.model, 'project_id'):
            query = query.filter(self.model.project_id == project_id)
        return query

    async def get(
        self, db: AsyncSession, id: Any, tenant_id: Optional[str] = None, project_id: Optional[str] = None
    ) -> Optional[ModelType]:
        query = select(self.model).filter(self.model.id == id)
        query = self._apply_scoping(query, tenant_id, project_id)
        result = await db.execute(query)
        return result.scalars().first()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, tenant_id: Optional[str] = None, project_id: Optional[str] = None
    ) -> List[ModelType]:
        query = select(self.model)
        query = self._apply_scoping(query, tenant_id, project_id)
        query = query.offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType, tenant_id: Optional[str] = None, project_id: Optional[str] = None) -> ModelType:
        obj_in_data = obj_in.model_dump()
        
        # Automatically inject scoping properties if they exist on the model
        if tenant_id and hasattr(self.model, 'tenant_id'):
            obj_in_data['tenant_id'] = tenant_id
        if project_id and hasattr(self.model, 'project_id'):
            obj_in_data['project_id'] = project_id
            
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    def create_obj(self, **kwargs) -> ModelType:
        """Create a model instance without committing it immediately (for transaction boundary management)."""
        return self.model(**kwargs)

    async def update(
        self, db: AsyncSession, *, db_obj: ModelType, obj_in: Union[UpdateSchemaType, Dict[str, Any]]
    ) -> ModelType:
        obj_data = {c.name: getattr(db_obj, c.name) for c in db_obj.__table__.columns}
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
            
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
                
        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)
        return db_obj

    async def remove(
        self, db: AsyncSession, *, id: Any, tenant_id: Optional[str] = None, project_id: Optional[str] = None
    ) -> ModelType:
        obj = await self.get(db, id, tenant_id, project_id)
        if obj:
            await db.delete(obj)
            await db.flush()
        return obj
