"""
Admin AI Configuration API (Phase E)

Provides admin CRUD for AIModelConfiguration:
- Enable/disable the AI provider for the tenant
- Toggle per-capability feature flags (9 capabilities)
- Set per-capability daily call and spend caps
- Retrieve invocation logs for cost tracking and audit
"""
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.models.integration import AIModelConfiguration, AIInvocationLog

router = APIRouter()

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

# The 9 valid capability keys
VALID_CAPABILITIES = {
    "duplicate_check",
    "categorize",
    "summarize_rebuttal",
    "summarize_evidence",
    "suggest_root_cause",
    "predict_impact",
    "analyze_trends",
    "ask",
    "executive_report",
}

class AIConfigCreate(BaseModel):
    provider: str
    model_name: str
    api_key_secret_ref: Optional[str] = None

class AIConfigResponse(BaseModel):
    id: str
    provider: str
    model_name: str
    is_active: bool
    capability_flags: Dict[str, bool]
    capability_caps: Dict[str, Any]

    class Config:
        from_attributes = True

class CapabilityFlagsUpdate(BaseModel):
    """Map of capability -> enabled. Only provided keys are changed."""
    flags: Dict[str, bool]

class CapabilityCapsUpdate(BaseModel):
    """Map of capability -> {daily_call_cap, daily_spend_cap}. Only provided keys are changed."""
    caps: Dict[str, Dict[str, Any]]

class AIInvocationLogResponse(BaseModel):
    id: str
    capability: str
    provider: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    response_summary: str
    accepted_by_user: Optional[bool]
    tokens_used: Optional[int]
    cost_estimate: Optional[str]
    invoked_by: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


# ---------------------------------------------------------------------------
# Helper: require admin role
# ---------------------------------------------------------------------------
def _require_admin(auth: AuthContext):
    if "System Administrator" not in auth.roles and "Platform Admin" not in auth.roles:
        raise HTTPException(status_code=403, detail="Admin access required")


# ---------------------------------------------------------------------------
# GET /admin/ai-config — list configs for tenant
# ---------------------------------------------------------------------------
@router.get("/ai-config", response_model=List[AIConfigResponse])
async def list_ai_configs(
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(auth)
    stmt = select(AIModelConfiguration).filter_by(tenant_id=auth.qems_tenant_id)
    rows = (await db.execute(stmt)).scalars().all()
    return rows


# ---------------------------------------------------------------------------
# POST /admin/ai-config — create a new config
# ---------------------------------------------------------------------------
@router.post("/ai-config", response_model=AIConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_ai_config(
    body: AIConfigCreate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _require_admin(auth)
    config = AIModelConfiguration(
        id=str(uuid.uuid4()),
        tenant_id=auth.qems_tenant_id,
        provider=body.provider,
        model_name=body.model_name,
        api_key_secret_ref=body.api_key_secret_ref,
        is_active=False,       # Inactive by default; admin activates explicitly
        capability_flags={},   # All capabilities default-enabled (gate logic: unset = allowed)
        capability_caps={},
    )
    db.add(config)
    await db.commit()
    return config


# ---------------------------------------------------------------------------
# PATCH /admin/ai-config/{config_id}/activate — set as active provider
# ---------------------------------------------------------------------------
@router.patch("/ai-config/{config_id}/activate", response_model=AIConfigResponse)
async def activate_ai_config(
    config_id: str,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivates all other configs for the tenant first, then activates this one.
    Ensures only one active provider at a time.
    """
    _require_admin(auth)

    # Deactivate all
    all_stmt = select(AIModelConfiguration).filter_by(tenant_id=auth.qems_tenant_id)
    all_configs = (await db.execute(all_stmt)).scalars().all()
    for c in all_configs:
        c.is_active = False

    # Activate target
    target = next((c for c in all_configs if c.id == config_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="AI configuration not found")
    target.is_active = True
    await db.commit()
    return target


# ---------------------------------------------------------------------------
# PATCH /admin/ai-config/{config_id}/capability-flags
# ---------------------------------------------------------------------------
@router.patch("/ai-config/{config_id}/capability-flags", response_model=AIConfigResponse)
async def update_capability_flags(
    config_id: str,
    body: CapabilityFlagsUpdate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Partial update — only keys present in body.flags are changed.
    Validates against the known 9 capability keys.
    """
    _require_admin(auth)

    unknown = set(body.flags.keys()) - VALID_CAPABILITIES
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown capabilities: {unknown}. Valid: {VALID_CAPABILITIES}"
        )

    stmt = select(AIModelConfiguration).filter_by(id=config_id, tenant_id=auth.qems_tenant_id)
    config = (await db.execute(stmt)).scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="AI configuration not found")

    current_flags: Dict[str, bool] = dict(config.capability_flags or {})
    current_flags.update(body.flags)
    config.capability_flags = current_flags
    await db.commit()
    return config


# ---------------------------------------------------------------------------
# PATCH /admin/ai-config/{config_id}/capability-caps
# ---------------------------------------------------------------------------
@router.patch("/ai-config/{config_id}/capability-caps", response_model=AIConfigResponse)
async def update_capability_caps(
    config_id: str,
    body: CapabilityCapsUpdate,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Partial update — only keys in body.caps are changed.
    Each cap entry: {"daily_call_cap": int, "daily_spend_cap": float}
    """
    _require_admin(auth)

    unknown = set(body.caps.keys()) - VALID_CAPABILITIES
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown capabilities: {unknown}. Valid: {VALID_CAPABILITIES}"
        )

    stmt = select(AIModelConfiguration).filter_by(id=config_id, tenant_id=auth.qems_tenant_id)
    config = (await db.execute(stmt)).scalars().first()
    if not config:
        raise HTTPException(status_code=404, detail="AI configuration not found")

    current_caps: Dict[str, Any] = dict(config.capability_caps or {})
    current_caps.update(body.caps)
    config.capability_caps = current_caps
    await db.commit()
    return config


# ---------------------------------------------------------------------------
# GET /admin/ai-invocations — paginated audit log for cost tracking
# ---------------------------------------------------------------------------
@router.get("/ai-invocations", response_model=List[AIInvocationLogResponse])
async def list_invocation_logs(
    capability: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns the AI invocation log for the tenant — admins use this for cost
    tracking, compliance audits, and to see acceptance rates per capability.
    """
    _require_admin(auth)

    stmt = select(AIInvocationLog).filter_by(tenant_id=auth.qems_tenant_id)
    if capability:
        stmt = stmt.filter(AIInvocationLog.capability == capability)
    stmt = stmt.order_by(AIInvocationLog.created_at.desc()).limit(limit).offset(offset)

    rows = (await db.execute(stmt)).scalars().all()

    return [
        AIInvocationLogResponse(
            id=r.id,
            capability=r.capability,
            provider=r.provider,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            response_summary=r.response_summary,
            accepted_by_user=r.accepted_by_user,
            tokens_used=r.tokens_used,
            cost_estimate=r.cost_estimate,
            invoked_by=r.invoked_by,
            created_at=r.created_at.isoformat(),
        )
        for r in rows
    ]
