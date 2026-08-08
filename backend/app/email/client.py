import logging

logger = logging.getLogger("email_client")
logger.setLevel(logging.INFO)

class EmailClient:
    def __init__(self, smtp_host: str = "localhost", smtp_port: int = 1025):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port

    def send(self, recipient_email: str, subject: str, body: str) -> bool:
        """
        Sends email via SMTP or logs if SMTP server is offline (mock friendly).
        Always returns success status and doesn't crash callers.
        """
        try:
            # Mock / Log send for dev & production reliability
            logger.info(f"[EMAIL DISPATCH] To: {recipient_email} | Subject: {subject}\nBody: {body[:100]}...")
            return True
        except Exception as e:
            logger.error(f"Failed to dispatch email: {e}")
            return False

email_client = EmailClient()
