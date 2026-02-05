"""Notification system errors."""


class NotificationError(Exception):
    """Base exception for notification errors."""
    pass


class NotificationBlockedError(NotificationError):
    """Raised when notification is blocked by user preferences."""
    
    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


class NotificationNotFoundError(NotificationError):
    """Raised when notification is not found."""
    
    def __init__(self, notification_id: str):
        self.notification_id = notification_id
        super().__init__(f"Notification not found: {notification_id}")


class InvalidRecipientError(NotificationError):
    """Raised when recipient is invalid for channel."""
    
    def __init__(self, channel: str, reason: str):
        self.channel = channel
        self.reason = reason
        super().__init__(f"Invalid recipient for {channel}: {reason}")


class ChannelNotFoundError(NotificationError):
    """Raised when channel provider is not configured."""
    
    def __init__(self, channel: str):
        self.channel = channel
        super().__init__(f"Channel not configured: {channel}")


class DeliveryFailedError(NotificationError):
    """Raised when delivery fails permanently."""
    
    def __init__(self, notification_id: str, reason: str):
        self.notification_id = notification_id
        self.reason = reason
        super().__init__(f"Delivery failed for {notification_id}: {reason}")
