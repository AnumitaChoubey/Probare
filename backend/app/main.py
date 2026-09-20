import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.database import get_db
from app.api.errors import QEMSAPIException, qems_exception_handler, global_exception_handler, business_error_handler, validation_exception_handler
from app.api.middleware import RequestContextMiddleware
from app.domain.exceptions import QEMSBusinessError
from fastapi.exceptions import RequestValidationError
from app.api.v1.api import api_router
from contextlib import asynccontextmanager

setup_logging()

from app.core.scheduler import setup_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize rate limiter
    # import redis.asyncio as redis_async
    # from fastapi_limiter import FastAPILimiter
    # redis = redis_async.from_url(settings.REDIS_URL, encoding="utf-8", decode_responses=True)
    # await FastAPILimiter.init(redis)
    
    # Start APScheduler jobs only if not in testing mode
    if os.getenv("APPLICATION_ENV") != "testing":
        setup_scheduler()
    
    yield
    
    # Shutdown APScheduler
    if os.getenv("APPLICATION_ENV") != "testing":
        shutdown_scheduler()
    
    # await redis.close()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RequestContextMiddleware)

# Exception handlers
app.add_exception_handler(QEMSAPIException, qems_exception_handler)
app.add_exception_handler(QEMSBusinessError, business_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/health/live")
async def health_live():
    return {"status": "alive"}

@app.get("/health/ready")
async def health_ready(db: AsyncSession = Depends(get_db)):
    try:
        # Check database connection
        await db.execute(text("SELECT 1"))
        
        # Check Redis connection
        import redis.asyncio as redis_async
        r = redis_async.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        
        # Check MinIO connection
        import httpx
        minio_health_url = f"{settings.STORAGE_ENDPOINT}/minio/health/live"
        async with httpx.AsyncClient() as client:
            resp = await client.get(minio_health_url, timeout=2.0)
            resp.raise_for_status()

        return {"status": "ready"}
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {"status": "error", "message": "Dependency connection failed", "details": str(e)}
