import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.integration import AIAnalysisRun
import asyncio

@pytest.mark.asyncio
async def test_ai_concurrent_idempotency(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data, monkeypatch):
    """Verify concurrent requests cannot execute duplicate LLM calls and handle IntegrityError."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    from app.core.config import settings
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")

    payload = {
        "analysis_type": "classification",
        "event_version": 1,
        "structured_input": {"text": "Test classification"}
    }
    
    # We will mock the AI provider so it just sleeps, allowing us to hit the endpoints concurrently
    from app.integrations.ai.mock_provider import MockAIProvider
    async def mock_analyze(*args, **kwargs):
        await asyncio.sleep(0.5)
        # return dummy structured output
        from app.integrations.ai.provider import AIAnalysisResult, AIUsageMetadata
        return AIAnalysisResult(
            structured_output={"category": "Hardware"},
            confidence="HIGH",
            rationale="Test",
            provider="mock",
            model="default",
            usage=AIUsageMetadata(prompt_tokens=10, completion_tokens=10, total_tokens=0, cost=100.0)
        )
    monkeypatch.setattr(MockAIProvider, "analyze", mock_analyze)
    
    url = f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/ai/analyze"
    
    # Fire two requests concurrently
    task1 = client.post(url, json=payload, headers=headers)
    task2 = client.post(url, json=payload, headers=headers)
    
    response1, response2 = await asyncio.gather(task1, task2)
    
    # One should succeed (200) and one should get 409 Conflict due to IntegrityError handling
    status_codes = [response1.status_code, response2.status_code]
    assert 200 in status_codes
    assert 409 in status_codes

@pytest.mark.asyncio
async def test_ai_malformed_provider_output(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data, monkeypatch):
    """Verify malformed provider output marks the AI run as FAILED and doesn't persist invalid AIInsight."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    from app.core.config import settings
    monkeypatch.setattr(settings, "AI_PROVIDER", "mock")

    payload = {
        "analysis_type": "classification",
        "event_version": 2,
        "structured_input": {"text": "Malformed test"}
    }
    
    from app.integrations.ai.mock_provider import MockAIProvider
    from app.integrations.ai.provider import AIAnalysisResult, AIUsageMetadata
    async def mock_analyze_fail(*args, **kwargs):
        return AIAnalysisResult(
            structured_output={}, # Missing required fields perhaps, but let's simulate provider returning error
            confidence="LOW",
            rationale="Failed to parse",
            provider="mock",
            model="default",
            usage=AIUsageMetadata(prompt_tokens=0, completion_tokens=0, total_tokens=0, cost=0.0),
            error_info="Provider failed to return valid JSON schema"
        )
    monkeypatch.setattr(MockAIProvider, "analyze", mock_analyze_fail)
    
    url = f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/ai/analyze"
    response = await client.post(url, json=payload, headers=headers)
    
    assert response.status_code == 500
    assert "AI Analysis returned an error" in response.text
    
    # Verify AIAnalysisRun is FAILED
    stmt = select(AIAnalysisRun).where(
        AIAnalysisRun.quality_event_id == data['event'].id,
        AIAnalysisRun.event_version == 2
    )
    result = await db_session.execute(stmt)
    run = result.scalar_one()
    
    assert run.status == "FAILED"
    assert run.error_info == "Provider failed to return valid JSON schema"

@pytest.mark.asyncio
async def test_ai_malformed_client_input(client: AsyncClient, db_session: AsyncSession, setup_ai_test_data):
    """Verify malformed client API input returns HTTP 422."""
    data = setup_ai_test_data
    headers = {"Authorization": f"Bearer dev_{data['user'].id}"}
    
    # Missing required 'structured_input'
    payload = {
        "analysis_type": "classification",
        "event_version": 1
    }
    
    url = f"/api/v1/projects/{data['project'].id}/quality-events/{data['event'].id}/ai/analyze"
    response = await client.post(url, json=payload, headers=headers)
    
    assert response.status_code == 422
