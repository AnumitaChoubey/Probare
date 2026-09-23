from fastapi import APIRouter

# Import sub-routers here when they are created
from app.api.v1.routers import auth
from app.api.v1.routers import quality_events
from app.api.v1.routers import evidence
from app.api.v1.routers import ai_insights
from app.api.v1.routers import ai
from app.api.v1.routers import microsoft_integrations
from app.api.v1.routers import rebuttals
from app.api.v1.routers import rca
from app.api.v1.routers import capa
from app.api.v1.routers import effectiveness
from app.api.v1.routers import communications

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(quality_events.router, prefix="/projects", tags=["quality_events"])
api_router.include_router(evidence.router)
api_router.include_router(ai_insights.router)
api_router.include_router(ai.router)
api_router.include_router(microsoft_integrations.router)
api_router.include_router(rebuttals.router)
api_router.include_router(rca.router)
api_router.include_router(capa.router)
api_router.include_router(effectiveness.router)
api_router.include_router(communications.router, prefix="/projects", tags=["communications"])
