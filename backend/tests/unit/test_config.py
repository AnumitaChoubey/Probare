import pytest
import os
from app.core.config import Settings
from pydantic import ValidationError

def test_production_mock_ai_provider_rejected():
    """Verify that APPLICATION_ENV=production + AI_PROVIDER=mock throws a ValidationError during init."""
    os.environ["APPLICATION_ENV"] = "production"
    os.environ["AI_PROVIDER"] = "mock"
    os.environ["DATABASE_URL"] = "postgresql+asyncpg://postgres:postgres@localhost:5432/qems"
    os.environ["REDIS_URL"] = "redis://localhost:6379/0"
    os.environ["STORAGE_ENDPOINT"] = "localhost:9000"
    os.environ["STORAGE_ACCESS_KEY"] = "minioadmin"
    os.environ["STORAGE_SECRET_KEY"] = "minioadmin"
    os.environ["STORAGE_BUCKET"] = "qems-evidence"
    
    try:
        with pytest.raises(ValidationError) as excinfo:
            Settings()
        
        assert "Mock AI Provider is not allowed in production" in str(excinfo.value)
    finally:
        # Cleanup env vars
        del os.environ["APPLICATION_ENV"]
        del os.environ["AI_PROVIDER"]
