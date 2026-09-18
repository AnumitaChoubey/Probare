from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.schemas.auth import AuthContext
from app.core.database import get_db
from app.services.ai_service import AIService
from app.repositories.ai_repository import AIAnalysisRunRepository, AIInsightRepository, AIUsageRecordRepository
from app.repositories.quality_event_repository import QualityEventRepository
from app.integrations.ai.provider import AIAnalysisRequest

router = APIRouter(prefix="/projects/{project_id}/quality-events/{event_id}/ai", tags=["AI Insights"])

class AIAnalyzePayload(BaseModel):
    analysis_type: str
    event_version: int
    structured_input: Dict[str, Any]
    model_config_override: Optional[Dict[str, Any]] = None
    constraints: Optional[Dict[str, Any]] = None

class AIInsightResponse(BaseModel):
    id: str
    insight_type: str
    model_provider: str
    model_name: str
    result: Dict[str, Any]
    confidence: Optional[str]
    rationale: Optional[str]
    status: str

    class Config:
        from_attributes = True

def get_ai_service(db: AsyncSession = Depends(get_db)) -> AIService:
    run_repo = AIAnalysisRunRepository()
    insight_repo = AIInsightRepository()
    usage_repo = AIUsageRecordRepository()
    event_repo = QualityEventRepository()
    return AIService(db, run_repo, insight_repo, usage_repo, event_repo)

@router.post("/analyze", response_model=AIInsightResponse, status_code=200)
async def trigger_analysis(
    project_id: str,
    event_id: str,
    payload: AIAnalyzePayload,
    auth: AuthContext = Depends(get_current_user),
    service: AIService = Depends(get_ai_service)
):
    # Authorization
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    if "EDIT_QUALITY_EVENT" not in auth.permissions:
        raise HTTPException(status_code=403, detail="Permission denied")

    request = AIAnalysisRequest(
        analysis_type=payload.analysis_type,
        tenant_id=auth.qems_tenant_id,
        project_id=project_id,
        quality_event_id=event_id,
        event_version=payload.event_version,
        structured_input=payload.structured_input,
        model_config_override=payload.model_config_override,
        constraints=payload.constraints
    )

    insight = await service.execute_analysis_sync(request, auth.qems_user_id)
    return insight

@router.get("/insights", response_model=List[AIInsightResponse])
async def get_insights(
    project_id: str,
    event_id: str,
    auth: AuthContext = Depends(get_current_user),
    service: AIService = Depends(get_ai_service)
):
    # Authorization
    if project_id not in auth.accessible_projects:
        raise HTTPException(status_code=403, detail="Project access denied")
    if "VIEW_QUALITY_EVENT" not in auth.permissions:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    return await service.get_insights_for_event(project_id, event_id)
