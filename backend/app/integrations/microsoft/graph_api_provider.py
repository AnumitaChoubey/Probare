import httpx
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from app.core.config import settings
from .ms_graph_adapter import MSGraphAdapter, TeamsDestination, TeamsDestinationType

logger = logging.getLogger(__name__)

class GraphAPIProvider(MSGraphAdapter):
    """
    Production implementation of Microsoft Graph adapter using Entra authentication.
    """
    def __init__(self):
        self.tenant_id = settings.MICROSOFT_TENANT_ID
        self.client_id = settings.MICROSOFT_CLIENT_ID
        self.client_secret = settings.MICROSOFT_CLIENT_SECRET
        self.token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        self._cached_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None

    async def get_app_token(self) -> str:
        # Check cache
        if self._cached_token and self._token_expires_at:
            if datetime.now(timezone.utc) < (self._token_expires_at - timedelta(minutes=5)):
                return self._cached_token

        if not self.client_id or not self.client_secret:
            logger.error("Microsoft Graph credentials are not fully configured.")
            raise ValueError("Incomplete MS Graph configuration.")

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.token_url,
                    data={
                        "client_id": self.client_id,
                        "scope": "https://graph.microsoft.com/.default",
                        "client_secret": self.client_secret,
                        "grant_type": "client_credentials"
                    },
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()
                self._cached_token = data["access_token"]
                expires_in = int(data.get("expires_in", 3599))
                self._token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
                return self._cached_token
            except httpx.HTTPStatusError as e:
                logger.error(f"Failed to acquire Microsoft Graph token. HTTP Status: {e.response.status_code}")
                raise
            except httpx.RequestError as e:
                logger.error("Network error while trying to acquire Microsoft Graph token.")
                raise

    async def send_teams_message(self, destination: TeamsDestination, title: str, body: str, metadata: Optional[Dict[str, Any]] = None) -> bool:
        token = None
        headers = {}
        url = ""
        payload = {}
        
        if destination.destination_type == TeamsDestinationType.WORKFLOW_WEBHOOK:
            if not destination.webhook_url:
                logger.error("Teams Workflow webhook requires webhook_url")
                return False
            url = destination.webhook_url
            headers = {"Content-Type": "application/json"}
            payload = {
                "type": "message",
                "attachments": [
                    {
                        "contentType": "application/vnd.microsoft.card.adaptive",
                        "contentUrl": None,
                        "content": {
                            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                            "type": "AdaptiveCard",
                            "version": "1.4",
                            "body": [
                                {
                                    "type": "TextBlock",
                                    "text": title,
                                    "weight": "Bolder",
                                    "size": "Medium"
                                },
                                {
                                    "type": "TextBlock",
                                    "text": body,
                                    "wrap": True
                                }
                            ]
                        }
                    }
                ]
            }
        else:
            token = await self.get_app_token()
            headers = {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
            payload = {
                "body": {
                    "contentType": "html",
                    "content": f"<h3>{title}</h3><p>{body}</p>"
                }
            }
        
        if destination.destination_type == TeamsDestinationType.CHANNEL:
            if not destination.team_id or not destination.channel_id:
                logger.error("Channel messaging requires team_id and channel_id")
                return False
            url = f"https://graph.microsoft.com/v1.0/teams/{destination.team_id}/channels/{destination.channel_id}/messages"
        elif destination.destination_type == TeamsDestinationType.CHAT:
            if not destination.chat_id:
                logger.error("Chat messaging requires chat_id")
                return False
            url = f"https://graph.microsoft.com/v1.0/chats/{destination.chat_id}/messages"
        elif destination.destination_type != TeamsDestinationType.WORKFLOW_WEBHOOK:
            return False

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, headers=headers, json=payload, timeout=15.0)
                if resp.status_code == 429:
                    logger.warning("Microsoft Graph rate limit (429) hit when sending Teams message.")
                    # Let caller handle retry (throw specific or False)
                    return False
                resp.raise_for_status()
                return True
            except httpx.HTTPStatusError as e:
                logger.error(f"Graph API HTTP Error sending Teams message: {e.response.status_code}")
                return False
            except httpx.RequestError as e:
                logger.error("Graph API Request Error sending Teams message.")
                return False

    async def send_outlook_email(self, recipient_email: str, subject: str, body: str, is_html: bool = True) -> bool:
        token = await self.get_app_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Typically uses a service account mailbox or app-only user endpoint
        # For app-only context without a specific sender, /users/{id}/sendMail requires specifying the sender user id.
        # Assuming MICROSOFT_CLIENT_ID or a configured sender email.
        sender_email = settings.MICROSOFT_CLIENT_ID # or dedicated setting. For now let's just use a placeholder
        if not sender_email:
            return False
            
        url = f"https://graph.microsoft.com/v1.0/users/{sender_email}/sendMail"
        
        payload = {
            "message": {
                "subject": subject,
                "body": {
                    "contentType": "html" if is_html else "text",
                    "content": body
                },
                "toRecipients": [
                    {
                        "emailAddress": {
                            "address": recipient_email
                        }
                    }
                ]
            },
            "saveToSentItems": "false"
        }

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(url, headers=headers, json=payload, timeout=15.0)
                resp.raise_for_status()
                return True
            except Exception as e:
                logger.error(f"Failed to send Outlook email to {recipient_email}")
                return False
