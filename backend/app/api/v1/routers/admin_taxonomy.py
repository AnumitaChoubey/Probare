from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.models.meta import QualityCategory, Process, SubProcess, ErrorType

router = APIRouter()

# Schema Base
class CategoryCreate(BaseModel):
    name: str

class CategoryResponse(CategoryCreate):
    id: str

class ProcessCreate(BaseModel):
    quality_category_id: Optional[str]
    name: str

class ProcessResponse(ProcessCreate):
    id: str

class SubProcessCreate(BaseModel):
    process_id: str
    name: str

class SubProcessResponse(SubProcessCreate):
    id: str

class ErrorTypeCreate(BaseModel):
    sub_process_id: str
    name: str

class ErrorTypeResponse(ErrorTypeCreate):
    id: str

@router.get("/categories", response_model=List[CategoryResponse])
async def list_categories(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(QualityCategory).filter_by(tenant_id=auth_context.qems_tenant_id)
    return (await session.execute(stmt)).scalars().all()

@router.post("/categories", response_model=CategoryResponse)
async def create_category(
    item: CategoryCreate,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    obj = QualityCategory(id=str(uuid.uuid4()), tenant_id=auth_context.qems_tenant_id, name=item.name)
    session.add(obj)
    await session.commit()
    return obj

@router.get("/processes", response_model=List[ProcessResponse])
async def list_processes(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(Process).filter_by(tenant_id=auth_context.qems_tenant_id)
    return (await session.execute(stmt)).scalars().all()

@router.post("/processes", response_model=ProcessResponse)
async def create_process(
    item: ProcessCreate,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    obj = Process(id=str(uuid.uuid4()), tenant_id=auth_context.qems_tenant_id, name=item.name, quality_category_id=item.quality_category_id)
    session.add(obj)
    await session.commit()
    return obj

@router.get("/sub-processes", response_model=List[SubProcessResponse])
async def list_sub_processes(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(SubProcess).filter_by(tenant_id=auth_context.qems_tenant_id)
    return (await session.execute(stmt)).scalars().all()

@router.post("/sub-processes", response_model=SubProcessResponse)
async def create_sub_process(
    item: SubProcessCreate,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    obj = SubProcess(id=str(uuid.uuid4()), tenant_id=auth_context.qems_tenant_id, name=item.name, process_id=item.process_id)
    session.add(obj)
    await session.commit()
    return obj

@router.get("/error-types", response_model=List[ErrorTypeResponse])
async def list_error_types(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(ErrorType).filter_by(tenant_id=auth_context.qems_tenant_id)
    return (await session.execute(stmt)).scalars().all()

@router.post("/error-types", response_model=ErrorTypeResponse)
async def create_error_type(
    item: ErrorTypeCreate,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    obj = ErrorType(id=str(uuid.uuid4()), tenant_id=auth_context.qems_tenant_id, name=item.name, sub_process_id=item.sub_process_id)
    session.add(obj)
    await session.commit()
    return obj
