from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from enum import Enum

class TeamsDestinationType(Enum):
    CHANNEL = "CHANNEL"
    CHAT = "CHAT"

class TeamsDestination(BaseModel):
    destination_type: TeamsDestinationType
    team_id: Optional[str] = None
    channel_id: Optional[str] = None
    chat_id: Optional[str] = None

class MSGraphAdapter(ABC):
    """
    Abstract base class for Microsoft Graph integration.
    """
    @abstractmethod
    async def send_teams_message(self, destination: TeamsDestination, title: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Sends a message to a Microsoft Teams chat or channel."""
        pass

    @abstractmethod
    async def send_outlook_email(self, recipient_email: str, subject: str, body: str, is_html: bool = True) -> bool:
        """Sends an email using Microsoft Outlook/Graph Mail.Send."""
        pass

    @abstractmethod
    async def get_app_token(self) -> str:
        """Retrieves an access token for application-level Microsoft Graph requests."""
        pass
