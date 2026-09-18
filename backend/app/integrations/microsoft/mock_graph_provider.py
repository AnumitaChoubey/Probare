import logging
from typing import Optional, Dict, Any
from .ms_graph_adapter import MSGraphAdapter, TeamsDestination

logger = logging.getLogger(__name__)

class MockMSGraphProvider(MSGraphAdapter):
    """
    Mock implementation of Microsoft Graph adapter for development and testing.
    Deterministic, logs outputs, and never performs real network calls.
    """
    def __init__(self):
        self.sent_teams_messages = []
        self.sent_emails = []

    async def send_teams_message(self, destination: TeamsDestination, title: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        logger.info(f"Mock MS Graph: Sent Teams Message to {destination.destination_type} - Title: {title}")
        self.sent_teams_messages.append({
            "destination": destination.model_dump(),
            "title": title,
            "body": body,
            "metadata": metadata
        })
        return True

    async def send_outlook_email(self, recipient_email: str, subject: str, body: str, is_html: bool = True) -> bool:
        logger.info(f"Mock MS Graph: Sent Outlook Email to {recipient_email} - Subject: {subject}")
        self.sent_emails.append({
            "recipient_email": recipient_email,
            "subject": subject,
            "body": body,
            "is_html": is_html
        })
        return True

    async def get_app_token(self) -> str:
        return "mock_token_12345"
