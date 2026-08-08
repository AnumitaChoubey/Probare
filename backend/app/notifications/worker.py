import logging
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.db.models.notification_template import NotificationTemplate
from backend.app.db.models.notifications_log import NotificationsLog
from backend.app.db.models.in_app_notification import InAppNotification
from backend.app.email.client import email_client

logger = logging.getLogger("notification_worker")

class NotificationWorker:
    def process_trigger(
        self,
        db: Session,
        template_code: str,
        recipient_user_id: str,
        recipient_email: str,
        error_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> NotificationsLog:
        """
        Executes notification dispatch:
        1. Fetch template
        2. Render tokens
        3. Insert notifications_log (QUEUED)
        4. Attempt email dispatch -> update status
        5. Independently insert in_app_notification row
        """
        context = context or {}

        # 1. Fetch template
        template = db.query(NotificationTemplate).filter_by(code=template_code, is_active=True).first()
        if not template:
            # Fallback default template if template code not yet seeded
            subject = f"Notification Alert [{template_code}]"
            body = f"An update occurred for Error {error_id or 'N/A'}."
            for k, v in context.items():
                body += f"\n{k}: {v}"
        else:
            subject = template.subject_template
            body = template.body_template
            for token_key, token_val in context.items():
                subject = subject.replace(f"{{{token_key}}}", str(token_val))
                body = body.replace(f"{{{token_key}}}", str(token_val))

        # 2. Insert notifications_log (QUEUED)
        log_entry = NotificationsLog(
            error_id=error_id,
            template_code=template_code,
            channel="EMAIL",
            recipient_user_id=recipient_user_id,
            status="QUEUED",
            created_at=datetime.utcnow(),
        )
        db.add(log_entry)
        db.commit()
        db.refresh(log_entry)

        # 3. Attempt email dispatch
        try:
            success = email_client.send(
                recipient_email=recipient_email,
                subject=subject,
                body=body,
            )
            if success:
                log_entry.status = "SENT"
                log_entry.dispatched_at = datetime.utcnow()
            else:
                log_entry.status = "FAILED"
                log_entry.failure_reason = "SMTP client failed to send message"
        except Exception as e:
            log_entry.status = "FAILED"
            log_entry.failure_reason = str(e)
            logger.error(f"Error during email send: {e}")

        db.commit()

        # 4. Independent in-app notification insert (MUST run regardless of email failure)
        try:
            in_app_msg = body.split("\n")[0] if "\n" in body else body
            in_app_notif = InAppNotification(
                user_id=recipient_user_id,
                error_id=error_id,
                template_code=template_code,
                message=in_app_msg,
                is_read=False,
                created_at=datetime.utcnow(),
            )
            db.add(in_app_notif)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"Failed to create in-app notification: {e}")

        return log_entry

notification_worker = NotificationWorker()
