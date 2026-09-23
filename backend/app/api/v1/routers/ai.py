from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user, require_permissions
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.services.ai_service import AIService
from app.repositories.ai_repository import AIAnalysisRunRepository, AIInsightRepository, AIUsageRecordRepository
from app.repositories.quality_event_repository import QualityEventRepository
from app.integrations.ai.provider import AIAnalysisRequest

router = APIRouter(prefix="/projects/{project_id}/ai", tags=["AI Copilot"])

class ClassifyRequest(BaseModel):
    description: str
    processArea: Optional[str] = None
    financialImpact: Optional[float] = None

class ClassifyResponse(BaseModel):
    errorType: str
    sopId: str
    suggestedTitle: str
    expectedOutcome: str
    actualOutcome: str
    suggestedSeverity: str

def get_ai_service(db: AsyncSession = Depends(get_db)) -> AIService:
    run_repo = AIAnalysisRunRepository()
    insight_repo = AIInsightRepository()
    usage_repo = AIUsageRecordRepository()
    event_repo = QualityEventRepository()
    return AIService(db, run_repo, insight_repo, usage_repo, event_repo)

@router.post("/classify", response_model=ClassifyResponse)
async def classify_error(
    project_id: str,
    payload: ClassifyRequest,
    auth: AuthContext = Depends(get_current_user),
    service: AIService = Depends(get_ai_service)
):
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    
    constraints = {
        "output_format": "JSON exactly matching the requested schema: errorType, sopId, suggestedTitle, expectedOutcome, actualOutcome, suggestedSeverity",
        "severity_rules": "Calculate severity as CRITICAL, HIGH, MEDIUM, or LOW based on financial impact and description."
    }
    
    request = AIAnalysisRequest(
        analysis_type="quality_event_classification",
        tenant_id=auth.qems_tenant_id,
        project_id=project_id,
        quality_event_id="NEW", # Pseudo ID for uncreated event
        event_version=0,
        structured_input={
            "description": payload.description,
            "process_area": payload.processArea,
            "financial_impact": payload.financialImpact
        },
        constraints=constraints
    )
    
    # We use execute_analysis_sync but it saves an AIInsight which requires a real event_id.
    # Instead, we can bypass saving the insight and just call the provider directly!
    
    # Actually, we don't need to persist a "Classification Insight" into the DB for a draft event.
    provider = service._get_provider("gemini")
    result = await provider.analyze(request)
    
    if result.error_info:
        # User requested to connect with real AI and remove mock data fallback
        raise HTTPException(status_code=500, detail=f"AI Classification Failed: {result.error_info}")
        
    out = result.structured_output
    
    return ClassifyResponse(
        errorType=out.get("errorType", "General Procedural Error"),
        sopId=out.get("sopId", "SOP-GEN-001"),
        suggestedTitle=out.get("suggestedTitle", "New Quality Event"),
        expectedOutcome=out.get("expectedOutcome", "Processed according to SOP."),
        actualOutcome=out.get("actualOutcome", "Deviation occurred."),
        suggestedSeverity=out.get("suggestedSeverity", "MEDIUM")
    )
