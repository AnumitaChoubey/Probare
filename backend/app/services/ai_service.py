import uuid
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.exceptions import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.config import settings
from app.models.integration import AIAnalysisRun, AIInsight, AIUsageRecord
from app.repositories.ai_repository import AIAnalysisRunRepository, AIInsightRepository, AIUsageRecordRepository
from app.repositories.quality_event_repository import QualityEventRepository
from app.integrations.ai.provider import AIProvider, AIAnalysisRequest
from app.integrations.ai.mock_provider import MockAIProvider
from app.integrations.ai.gemini_provider import GeminiProvider
class AIService:
    def __init__(self, 
                 db: AsyncSession, 
                 run_repo: AIAnalysisRunRepository,
                 insight_repo: AIInsightRepository,
                 usage_repo: AIUsageRecordRepository,
                 event_repo: QualityEventRepository):
        self.db = db # Used for initial and final transactions, but NOT during AI execution
        self.run_repo = run_repo
        self.insight_repo = insight_repo
        self.usage_repo = usage_repo
        self.event_repo = event_repo
        
        # We need audit_service and timeline_service for logging
        from app.services.audit_service import AuditService
        from app.services.timeline_service import TimelineService
        self.audit_service = AuditService()
        self.timeline_service = TimelineService()

    def _get_provider(self) -> AIProvider:
        provider_name = settings.AI_PROVIDER.lower()
        if provider_name == "mock":
            if settings.is_production:
                raise HTTPException(status_code=500, detail="Mock AI Provider is not allowed in production")
            return MockAIProvider()
        elif provider_name == "gemini":
            return GeminiProvider()
        else:
            raise HTTPException(status_code=500, detail=f"Unsupported AI Provider: {provider_name}")

    async def _queue_analysis(self, request: AIAnalysisRequest, idempotency_key: str, user_id: str) -> AIAnalysisRun:
        run_id = str(uuid.uuid4())
        
        # Check idempotency
        existing_run = await self.run_repo.get_by_idempotency_key(self.db, idempotency_key)
        if existing_run:
            if existing_run.status == "COMPLETED":
                # Return the existing successful run to prevent duplicate AI calls
                return existing_run
            # If FAILED, we might retry. If QUEUED/RUNNING, we should technically wait or reject.
            # For simplicity, we just create a new one if it failed before, or reject if running.
            if existing_run.status in ["QUEUED", "RUNNING"]:
                raise HTTPException(status_code=409, detail="Analysis is already running for this request")
        
        # Create QUEUED run
        run = AIAnalysisRun(
            id=run_id,
            tenant_id=request.tenant_id,
            project_id=request.project_id,
            quality_event_id=request.quality_event_id,
            event_version=request.event_version,
            analysis_type=request.analysis_type,
            provider=settings.AI_PROVIDER,
            model=request.model_config_override.get('model', 'default') if request.model_config_override else 'default',
            status="QUEUED",
            started_at=datetime.now(timezone.utc),
            idempotency_key=idempotency_key
        )
        
        self.db.add(run)
        
        try:
            await self.db.commit() # MUST COMMIT BEFORE AI CALL
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(status_code=409, detail="Analysis is already running for this request")
            
        await self.db.refresh(run)
        
        # Log to timeline
        await self.timeline_service.record_event(
            session=self.db,
            quality_event_id=request.quality_event_id,
            project_id=request.project_id,
            tenant_id=request.tenant_id,
            event_type="AI_ANALYSIS_QUEUED",
            description=f"AI Analysis queued for: {request.analysis_type}",
            actor_id=user_id
        )
        await self.db.commit()
        return run

    async def execute_analysis_sync(self, request: AIAnalysisRequest, user_id: str) -> AIInsight:
        """
        Executes AI analysis synchronously for the HTTP client, but ensures NO DB transactions 
        are held open during the external network request.
        """
        # Validate event
        event = await self.event_repo.get(self.db, request.quality_event_id, project_id=request.project_id)
        if not event:
            raise HTTPException(status_code=404, detail="Quality Event not found")
            
        idempotency_key = f"{request.tenant_id}:{request.project_id}:{request.quality_event_id}:{request.event_version}:{request.analysis_type}"
        
        # 1. Start Transaction: Queue the run
        run = await self._queue_analysis(request, idempotency_key, user_id)
        
        if run.status == "COMPLETED":
            # Idempotency hit: return existing insight
            insights = await self.insight_repo.get_all_by_event_and_project(self.db, request.quality_event_id, request.project_id)
            # Find the specific insight for this run
            for insight in insights:
                if insight.analysis_run_id == run.id:
                    return insight
        
        # 2. Update to RUNNING (Optional but good for background workers, here we do it fast)
        run.status = "RUNNING"
        self.db.add(run)
        await self.db.commit()

        # 3. EXTERNAL AI CALL (No DB transaction held!)
        provider = self._get_provider()
        
        try:
            # We don't wrap this in self.db transaction. 
            result = await provider.analyze(request)
        except Exception as e:
            logger.error(f"AI Provider threw unhandled exception: {e}")
            run.status = "FAILED"
            run.error_info = str(e)
            run.completed_at = datetime.now(timezone.utc)
            
            # Re-open transaction to save failure state
            self.db.add(run)
            await self.db.commit()
            raise HTTPException(status_code=500, detail="AI Analysis failed unexpectedly")

        # 4. Process Results and Persist
        
        # We start a new transaction conceptually, but we can reuse self.db because it was committed/closed 
        # (SQLAlchemy AsyncSession handles rolling back implicit transactions if needed, but since we committed, it's clean).
        if result.error_info:
            run.status = "FAILED"
            run.error_info = result.error_info
            run.completed_at = datetime.now(timezone.utc)
            self.db.add(run)
            await self.timeline_service.record_event(
                session=self.db,
                quality_event_id=request.quality_event_id,
                project_id=request.project_id,
                tenant_id=request.tenant_id,
                event_type="AI_ANALYSIS_FAILED",
                description=f"AI Analysis failed: {result.error_info}",
                actor_id=user_id
            )
            await self.db.commit()
            raise HTTPException(status_code=500, detail=f"AI Analysis returned an error: {result.error_info}")
            
        run.status = "COMPLETED"
        run.completed_at = datetime.now(timezone.utc)
        self.db.add(run)
        
        # Create Insight
        insight_id = str(uuid.uuid4())
        insight = AIInsight(
            id=insight_id,
            tenant_id=request.tenant_id,
            project_id=request.project_id,
            analysis_run_id=run.id,
            quality_event_id=request.quality_event_id,
            insight_type=request.analysis_type,
            model_provider=result.provider,
            model_name=result.model,
            result=result.structured_output,
            confidence=result.confidence,
            rationale=result.rationale,
            created_by_id=user_id,
            status="Draft"
        )
        self.db.add(insight)
        
        # Create Usage Record
        usage_record = AIUsageRecord(
            id=str(uuid.uuid4()),
            tenant_id=request.tenant_id,
            project_id=request.project_id,
            analysis_run_id=run.id,
            provider=result.provider,
            model=result.model,
            input_tokens=result.usage.input_tokens,
            output_tokens=result.usage.output_tokens,
            estimated_cost=result.usage.estimated_cost,
            duration_ms=result.usage.duration_ms
        )
        self.db.add(usage_record)
        
        await self.timeline_service.record_event(
            session=self.db,
            quality_event_id=request.quality_event_id,
            project_id=request.project_id,
            tenant_id=request.tenant_id,
            event_type="AI_ANALYSIS_COMPLETED",
            description=f"AI Analysis completed. Insight ID: {insight_id}",
            actor_id=user_id
        )
        
        await self.audit_service.record_action(
            session=self.db,
            tenant_id=request.tenant_id,
            project_id=request.project_id,
            entity_type="AIAnalysisRun",
            entity_id=run.id,
            action="COMPLETED",
            actor_id=user_id,
            new_value={"usage": {"input": result.usage.input_tokens, "output": result.usage.output_tokens}}
        )
        
        await self.db.commit()
        await self.db.refresh(insight)
        
        return insight

    async def get_insights_for_event(self, project_id: str, event_id: str) -> list[AIInsight]:
        # Simple read
        return await self.insight_repo.get_all_by_event_and_project(self.db, event_id, project_id)
