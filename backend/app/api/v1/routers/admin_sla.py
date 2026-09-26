import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.models.meta import SLAPolicy, EscalationMatrix, EscalationRule, WorkingHoursCalendar, Holiday

router = APIRouter()

# Schemas
class SLAPolicyCreate(BaseModel):
    process_id: Optional[str] = None
    stage: str
    severity: Optional[str] = None
    duration_minutes: int
    use_working_hours: str
    warning_threshold_pct: int = 80
    escalation_matrix_id: Optional[str] = None

class SLAPolicyResponse(SLAPolicyCreate):
    id: str

@router.get("/sla-policies", response_model=List[SLAPolicyResponse])
async def list_sla_policies(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(SLAPolicy).filter_by(tenant_id=auth_context.qems_tenant_id, active=True)
    res = await session.execute(stmt)
    return res.scalars().all()

@router.post("/sla-policies", response_model=SLAPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_sla_policy(
    policy_in: SLAPolicyCreate,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    from datetime import datetime, timezone
    
    policy = SLAPolicy(
        id=str(uuid.uuid4()),
        tenant_id=auth_context.qems_tenant_id,
        process_id=policy_in.process_id,
        stage=policy_in.stage,
        severity=policy_in.severity,
        duration_minutes=policy_in.duration_minutes,
        use_working_hours=policy_in.use_working_hours,
        warning_threshold_pct=policy_in.warning_threshold_pct,
        escalation_matrix_id=policy_in.escalation_matrix_id,
        active=True,
        effective_from=datetime.now(timezone.utc)
    )
    session.add(policy)
    await session.commit()
    return policy

class EscalationMatrixCreate(BaseModel):
    name: str

class EscalationMatrixResponse(EscalationMatrixCreate):
    id: str

@router.get("/escalation-matrices", response_model=List[EscalationMatrixResponse])
async def list_escalation_matrices(
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    stmt = select(EscalationMatrix).filter_by(tenant_id=auth_context.qems_tenant_id)
    res = await session.execute(stmt)
    return res.scalars().all()

@router.post("/escalation-matrices", response_model=EscalationMatrixResponse, status_code=status.HTTP_201_CREATED)
async def create_escalation_matrix(
    matrix_in: EscalationMatrixCreate,
    auth_context: AuthContext = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    matrix = EscalationMatrix(
        id=str(uuid.uuid4()),
        tenant_id=auth_context.qems_tenant_id,
        name=matrix_in.name
    )
    session.add(matrix)
    await session.commit()
    return matrix
