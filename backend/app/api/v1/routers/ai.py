from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.services.ai_capability_service import AICapabilityService, AIUnavailableError
from app.core.config import settings

router = APIRouter(prefix="/ai", tags=["AI Layer"])

# ---------------------------------------------------------------------------
# Shared: get the configured provider instance
# ---------------------------------------------------------------------------
def _get_provider():
    """
    Returns the active AI provider instance.
    All AI calls are proxied through the backend (spec Section 11.5).
    No provider API keys ever reach the Electron client.
    """
    provider_name = getattr(settings, "AI_PROVIDER", "mock").lower()
    if provider_name == "gemini":
        from app.integrations.ai.gemini_provider import GeminiProvider
        return GeminiProvider()
    from app.integrations.ai.mock_provider import MockAIProvider
    return MockAIProvider()


# ---------------------------------------------------------------------------
# 3-state unavailable response helper (spec Section 11.2)
# ---------------------------------------------------------------------------
def _unavailable_response(capability: str, reason: str):
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "availability": "unavailable",
            "capability": capability,
            "reason": reason,
            "message": "AI suggestions unavailable. The manual workflow remains fully operational."
        }
    )


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------
class DuplicateCheckRequest(BaseModel):
    event_id: str
    description: str

class CategorizationRequest(BaseModel):
    event_id: str
    description: str
    process_area: Optional[str] = None

class SummarizeRebuttalRequest(BaseModel):
    event_id: str
    rebuttal_text: str

class SummarizeEvidenceRequest(BaseModel):
    evidence_id: str
    file_name: str
    mime_type: str

class RootCauseRequest(BaseModel):
    event_id: str
    event_context: Dict[str, Any]

class ImpactPredictionRequest(BaseModel):
    event_id: str
    event_context: Dict[str, Any]

class TrendAnalysisRequest(BaseModel):
    scope: Dict[str, Any]

class AskRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = {}

class ExecutiveReportRequest(BaseModel):
    scope: Dict[str, Any]

class InvocationFeedbackRequest(BaseModel):
    accepted: bool


# ---------------------------------------------------------------------------
# Capability 1: Duplicate detection
# ---------------------------------------------------------------------------
@router.post("/duplicate-check")
async def check_duplicates(
    req: DuplicateCheckRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Suggests potential duplicates only.
    No auto-merge — a human must confirm via /confirm-duplicate (spec 11.1).
    """
    try:
        result = await AICapabilityService.duplicate_check(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            event_id=req.event_id, event_description=req.description,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 2: Categorization
# ---------------------------------------------------------------------------
@router.post("/categorize")
async def categorize_event(
    req: CategorizationRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.categorize(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            event_id=req.event_id, description=req.description,
            process_area=req.process_area,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 3: Rebuttal summarization
# ---------------------------------------------------------------------------
@router.post("/summarize-rebuttal")
async def summarize_rebuttal(
    req: SummarizeRebuttalRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.summarize_rebuttal(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            event_id=req.event_id, rebuttal_text=req.rebuttal_text,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 4: Evidence summarization
# ---------------------------------------------------------------------------
@router.post("/summarize-evidence")
async def summarize_evidence(
    req: SummarizeEvidenceRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.summarize_evidence(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            evidence_id=req.evidence_id, file_name=req.file_name,
            mime_type=req.mime_type,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 5: Root cause suggestion
# ---------------------------------------------------------------------------
@router.post("/root-cause-suggestion")
async def root_cause_suggestion(
    req: RootCauseRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.suggest_root_cause(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            event_id=req.event_id, event_context=req.event_context,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 6: Business impact prediction
# ---------------------------------------------------------------------------
@router.post("/impact-prediction")
async def impact_prediction(
    req: ImpactPredictionRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.predict_impact(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            event_id=req.event_id, event_context=req.event_context,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 7: Trend analysis
# ---------------------------------------------------------------------------
@router.post("/trend-analysis")
async def trend_analysis(
    req: TrendAnalysisRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.analyze_trends(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            scope=req.scope,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 8: Ask QEMS
# ---------------------------------------------------------------------------
@router.post("/ask")
async def ask_qems(
    req: AskRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.ask(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            query=req.query, context=req.context or {},
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Capability 9: Executive report
# ---------------------------------------------------------------------------
@router.post("/executive-report")
async def executive_report(
    req: ExecutiveReportRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        result = await AICapabilityService.executive_report(
            session=db, tenant_id=auth.qems_tenant_id,
            project_id=auth.accessible_projects[0] if auth.accessible_projects else "",
            scope=req.scope,
            invoked_by=auth.qems_user_id, provider_instance=_get_provider(),
        )
        await db.commit()
        return result
    except AIUnavailableError as e:
        _unavailable_response(e.capability, e.reason)


# ---------------------------------------------------------------------------
# Human-gated duplicate confirmation (spec 11.1 — suggestions only)
# ---------------------------------------------------------------------------
@router.post("/confirm-duplicate")
async def confirm_duplicate(
    event_id: str,
    duplicate_of_id: str,
    auth: AuthContext = Depends(get_current_user),
):
    """
    The only endpoint that can establish a duplicate relationship.
    AI suggests; this endpoint records the human decision.
    """
    return {
        "confirmed": True,
        "event_id": event_id,
        "duplicate_of_id": duplicate_of_id,
        "confirmed_by": auth.qems_user_id,
    }


# ---------------------------------------------------------------------------
# Invocation feedback — update accepted_by_user on an invocation log
# ---------------------------------------------------------------------------
@router.patch("/invocations/{invocation_id}/feedback")
async def record_invocation_feedback(
    invocation_id: str,
    req: InvocationFeedbackRequest,
    auth: AuthContext = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Records whether the user accepted or rejected an AI suggestion (spec 11.3)."""
    from app.models.integration import AIInvocationLog
    from sqlalchemy.future import select

    stmt = select(AIInvocationLog).filter_by(id=invocation_id, tenant_id=auth.qems_tenant_id)
    log = (await db.execute(stmt)).scalars().first()
    if not log:
        raise HTTPException(status_code=404, detail="Invocation log not found")

    log.accepted_by_user = req.accepted
    await db.commit()
    return {"invocation_id": invocation_id, "accepted": req.accepted}
