import pytest
import pytest_asyncio
from unittest.mock import patch, AsyncMock
from app.integrations.microsoft.mock_graph_provider import MockMSGraphProvider
from app.integrations.microsoft.graph_api_provider import GraphAPIProvider
from app.integrations.microsoft.ms_graph_adapter import TeamsDestination, TeamsDestinationType
from app.core.config import Settings
from httpx import HTTPStatusError, RequestError

@pytest.fixture
def mock_provider():
    return MockMSGraphProvider()

@pytest.mark.asyncio
async def test_mock_provider_teams_message(mock_provider):
    dest = TeamsDestination(destination_type=TeamsDestinationType.CHAT, chat_id="123")
    result = await mock_provider.send_teams_message(dest, "Test Title", "Test Body")
    assert result is True
    assert len(mock_provider.sent_teams_messages) == 1
    assert mock_provider.sent_teams_messages[0]["title"] == "Test Title"

@pytest.mark.asyncio
async def test_mock_provider_outlook_email(mock_provider):
    result = await mock_provider.send_outlook_email("test@example.com", "Subject", "Body")
    assert result is True
    assert len(mock_provider.sent_emails) == 1
    assert mock_provider.sent_emails[0]["recipient_email"] == "test@example.com"

def test_production_mock_rejection(monkeypatch):
    monkeypatch.setenv("APPLICATION_ENV", "production")
    monkeypatch.setenv("MS_GRAPH_PROVIDER", "mock")
    monkeypatch.setenv("AI_PROVIDER", "gemini") # Ensure ai isn't failing first
    
    with pytest.raises(ValueError) as exc:
        Settings()
    assert "Mock MS Graph Provider is not allowed in production" in str(exc.value)

@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_graph_api_provider_token_acquisition(mock_post, monkeypatch):
    monkeypatch.setenv("MICROSOFT_CLIENT_ID", "test-client")
    monkeypatch.setenv("MICROSOFT_TENANT_ID", "test-tenant")
    monkeypatch.setenv("MICROSOFT_CLIENT_SECRET", "test-secret")
    
    from app.core.config import settings
    settings.MICROSOFT_CLIENT_ID = "test-client"
    settings.MICROSOFT_TENANT_ID = "test-tenant"
    settings.MICROSOFT_CLIENT_SECRET = "test-secret"
    
    provider = GraphAPIProvider()
    
    # Mock token response
    from unittest.mock import MagicMock
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json = MagicMock(return_value={"access_token": "valid_token", "expires_in": 3600})
    mock_response.raise_for_status = MagicMock(return_value=None)
    mock_post.return_value = mock_response

    token = await provider.get_app_token()
    assert token == "valid_token"
    
    # Should use cache the second time
    mock_post.reset_mock()
    token2 = await provider.get_app_token()
    assert token2 == "valid_token"
    assert mock_post.call_count == 0

@pytest.mark.asyncio
@patch("httpx.AsyncClient.post")
async def test_graph_api_provider_429(mock_post):
    provider = GraphAPIProvider()
    provider._cached_token = "dummy_token"
    provider._token_expires_at = __import__('datetime').datetime.now(__import__('datetime').timezone.utc) + __import__('datetime').timedelta(hours=1)
    
    mock_response = AsyncMock()
    mock_response.status_code = 429
    mock_post.return_value = mock_response
    
    dest = TeamsDestination(destination_type=TeamsDestinationType.CHAT, chat_id="123")
    result = await provider.send_teams_message(dest, "Test Title", "Test Body")
    
    assert result is False
