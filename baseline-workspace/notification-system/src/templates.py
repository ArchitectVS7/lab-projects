"""Template service for rendering notifications."""

from typing import Optional, Protocol
from dataclasses import dataclass
from .types import Channel
from .channels import RenderedContent


@dataclass
class Template:
    """Notification template."""
    type: str
    channel: Channel
    subject: Optional[str] = None
    title: Optional[str] = None
    body: str = ""
    html_body: Optional[str] = None


class TemplateRepository(Protocol):
    """Interface for template storage."""
    
    def get(self, notification_type: str, channel: Channel) -> Optional[Template]:
        ...


class TemplateService:
    """Renders notification templates."""

    def __init__(self, repository: TemplateRepository):
        self.repository = repository

    def render(
        self,
        notification_type: str,
        channel: Channel,
        data: dict,
    ) -> RenderedContent:
        """
        Render a template with provided data.
        
        Args:
            notification_type: Type of notification (e.g., "order_shipped")
            channel: Target channel
            data: Variables to substitute in template
            
        Returns:
            RenderedContent ready for sending
        """
        template = self.repository.get(notification_type, channel)
        
        if template is None:
            # Fallback to basic rendering
            return self._render_fallback(notification_type, channel, data)
        
        return RenderedContent(
            subject=self._interpolate(template.subject, data) if template.subject else None,
            title=self._interpolate(template.title, data) if template.title else None,
            body=self._interpolate(template.body, data),
            html_body=self._interpolate(template.html_body, data) if template.html_body else None,
        )

    def _interpolate(self, text: Optional[str], data: dict) -> Optional[str]:
        """Simple template interpolation using {variable} syntax."""
        if text is None:
            return None
        
        result = text
        for key, value in data.items():
            result = result.replace(f"{{{key}}}", str(value))
        
        return result

    def _render_fallback(
        self,
        notification_type: str,
        channel: Channel,
        data: dict,
    ) -> RenderedContent:
        """Fallback rendering when no template found."""
        # Convert type to readable title
        title = notification_type.replace("_", " ").title()
        
        # Build basic body from data
        body_parts = [f"{k}: {v}" for k, v in data.items() if not k.startswith("_")]
        body = "\n".join(body_parts) if body_parts else title
        
        return RenderedContent(
            subject=title if channel == Channel.EMAIL else None,
            title=title if channel == Channel.PUSH else None,
            body=body,
        )


class InMemoryTemplateRepository:
    """In-memory template storage for development/testing."""

    def __init__(self):
        self.templates: dict[tuple[str, Channel], Template] = {}
        self._load_defaults()

    def _load_defaults(self):
        """Load default templates."""
        # Welcome email
        self.templates[("welcome", Channel.EMAIL)] = Template(
            type="welcome",
            channel=Channel.EMAIL,
            subject="Welcome to Our App, {name}!",
            body="Hi {name},\n\nWelcome aboard! We're excited to have you.",
            html_body="<h1>Hi {name}!</h1><p>Welcome aboard! We're excited to have you.</p>",
        )
        
        # Order shipped
        self.templates[("order_shipped", Channel.EMAIL)] = Template(
            type="order_shipped",
            channel=Channel.EMAIL,
            subject="Your order #{order_id} has shipped!",
            body="Great news! Your order #{order_id} is on its way.\n\nTrack it here: {tracking_url}",
            html_body="<h1>Great news!</h1><p>Your order #{order_id} is on its way.</p><p><a href='{tracking_url}'>Track your package</a></p>",
        )
        
        self.templates[("order_shipped", Channel.PUSH)] = Template(
            type="order_shipped",
            channel=Channel.PUSH,
            title="Order Shipped! 📦",
            body="Your order #{order_id} is on the way!",
        )
        
        # Security alert
        self.templates[("security_alert", Channel.EMAIL)] = Template(
            type="security_alert",
            channel=Channel.EMAIL,
            subject="Security Alert: {alert_type}",
            body="We detected {alert_type} on your account.\n\nTime: {timestamp}\nLocation: {location}\n\nIf this wasn't you, please secure your account immediately.",
        )
        
        self.templates[("security_alert", Channel.SMS)] = Template(
            type="security_alert",
            channel=Channel.SMS,
            body="Security Alert: {alert_type} detected on your account. If this wasn't you, secure your account now.",
        )

    def get(self, notification_type: str, channel: Channel) -> Optional[Template]:
        return self.templates.get((notification_type, channel))

    def add(self, template: Template) -> None:
        self.templates[(template.type, template.channel)] = template
