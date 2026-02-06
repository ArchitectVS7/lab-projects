"""Channel provider interfaces and implementations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Protocol
from .types import Channel, SendResult


@dataclass
class RenderedContent:
    """Rendered notification content for a channel."""
    subject: Optional[str] = None  # Email subject
    body: str = ""
    html_body: Optional[str] = None  # Email HTML
    title: Optional[str] = None  # Push title
    image_url: Optional[str] = None
    action_url: Optional[str] = None
    data: Optional[dict] = None  # Push data payload


class NotificationChannel(ABC):
    """Abstract base class for notification channels."""

    @property
    @abstractmethod
    def name(self) -> Channel:
        """Channel identifier."""
        pass

    @abstractmethod
    async def send(self, recipient: str, content: RenderedContent) -> SendResult:
        """Send notification to recipient."""
        pass

    @abstractmethod
    def validate_recipient(self, recipient: str) -> bool:
        """Validate recipient address format."""
        pass


class EmailChannel(NotificationChannel):
    """Email channel using SendGrid."""

    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email

    @property
    def name(self) -> Channel:
        return Channel.EMAIL

    async def send(self, recipient: str, content: RenderedContent) -> SendResult:
        """Send email via SendGrid."""
        try:
            # In real implementation:
            # from sendgrid import SendGridAPIClient
            # from sendgrid.helpers.mail import Mail
            # 
            # message = Mail(
            #     from_email=self.from_email,
            #     to_emails=recipient,
            #     subject=content.subject,
            #     html_content=content.html_body or content.body,
            # )
            # sg = SendGridAPIClient(self.api_key)
            # response = sg.send(message)
            # return SendResult(
            #     success=True,
            #     provider_message_id=response.headers.get('X-Message-Id'),
            # )
            
            # Placeholder
            return SendResult(success=True, provider_message_id="sg_123")
        except Exception as e:
            return SendResult(
                success=False,
                error=str(e),
                retryable=self._is_retryable(e),
            )

    def validate_recipient(self, recipient: str) -> bool:
        """Basic email validation."""
        import re
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, recipient))

    def _is_retryable(self, error: Exception) -> bool:
        """Check if error is retryable."""
        error_str = str(error).lower()
        return any(x in error_str for x in ['timeout', '429', '500', '502', '503'])


class SMSChannel(NotificationChannel):
    """SMS channel using Twilio."""

    def __init__(self, account_sid: str, auth_token: str, from_number: str):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_number = from_number

    @property
    def name(self) -> Channel:
        return Channel.SMS

    async def send(self, recipient: str, content: RenderedContent) -> SendResult:
        """Send SMS via Twilio."""
        try:
            # In real implementation:
            # from twilio.rest import Client
            # 
            # client = Client(self.account_sid, self.auth_token)
            # message = client.messages.create(
            #     body=content.body,
            #     from_=self.from_number,
            #     to=recipient,
            # )
            # return SendResult(success=True, provider_message_id=message.sid)
            
            # Placeholder
            return SendResult(success=True, provider_message_id="twilio_123")
        except Exception as e:
            return SendResult(
                success=False,
                error=str(e),
                retryable=self._is_retryable(e),
            )

    def validate_recipient(self, recipient: str) -> bool:
        """Basic phone number validation."""
        import re
        # E.164 format
        pattern = r'^\+[1-9]\d{1,14}$'
        return bool(re.match(pattern, recipient))

    def _is_retryable(self, error: Exception) -> bool:
        error_str = str(error).lower()
        return any(x in error_str for x in ['timeout', '429', '500', '502', '503'])


class PushChannel(NotificationChannel):
    """Push notification channel using Firebase Cloud Messaging."""

    def __init__(self, credentials_path: str):
        self.credentials_path = credentials_path
        # In real implementation:
        # import firebase_admin
        # from firebase_admin import credentials
        # cred = credentials.Certificate(credentials_path)
        # firebase_admin.initialize_app(cred)

    @property
    def name(self) -> Channel:
        return Channel.PUSH

    async def send(self, recipient: str, content: RenderedContent) -> SendResult:
        """Send push notification via FCM."""
        try:
            # In real implementation:
            # from firebase_admin import messaging
            # 
            # message = messaging.Message(
            #     notification=messaging.Notification(
            #         title=content.title,
            #         body=content.body,
            #         image=content.image_url,
            #     ),
            #     data=content.data,
            #     token=recipient,
            # )
            # response = messaging.send(message)
            # return SendResult(success=True, provider_message_id=response)
            
            # Placeholder
            return SendResult(success=True, provider_message_id="fcm_123")
        except Exception as e:
            error_str = str(e)
            # Check for invalid token
            if 'not registered' in error_str.lower():
                return SendResult(success=False, error=error_str, retryable=False)
            return SendResult(
                success=False,
                error=error_str,
                retryable=self._is_retryable(e),
            )

    def validate_recipient(self, recipient: str) -> bool:
        """Validate FCM token format."""
        # FCM tokens are ~150+ characters
        return len(recipient) > 100

    def _is_retryable(self, error: Exception) -> bool:
        error_str = str(error).lower()
        return any(x in error_str for x in ['timeout', '429', '500', '502', '503'])
