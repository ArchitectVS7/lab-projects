"""User preferences service."""

from typing import Optional, Protocol
from .types import (
    Channel,
    Urgency,
    UserPreferences,
    ChannelConfig,
    TypePreference,
)


class PreferencesRepository(Protocol):
    """Interface for preferences storage."""
    
    def get(self, user_id: str) -> Optional[UserPreferences]:
        ...
    
    def save(self, preferences: UserPreferences) -> None:
        ...


class PreferencesService:
    """Manages user notification preferences."""

    # Default channels per notification type
    DEFAULT_CHANNELS: dict[str, list[Channel]] = {
        "welcome": [Channel.EMAIL],
        "order_shipped": [Channel.EMAIL, Channel.PUSH],
        "order_delivered": [Channel.EMAIL, Channel.PUSH],
        "password_reset": [Channel.EMAIL],
        "security_alert": [Channel.EMAIL, Channel.SMS],
        "marketing": [Channel.EMAIL],
        "message_received": [Channel.PUSH],
    }

    def __init__(self, repository: PreferencesRepository):
        self.repository = repository

    def get_preferences(self, user_id: str) -> UserPreferences:
        """Get user preferences, creating defaults if not found."""
        prefs = self.repository.get(user_id)
        if prefs is None:
            prefs = UserPreferences(user_id=user_id)
        return prefs

    def update_preferences(self, user_id: str, updates: dict) -> UserPreferences:
        """Update user preferences."""
        prefs = self.get_preferences(user_id)
        
        if "channels" in updates:
            for channel_name, config in updates["channels"].items():
                channel = Channel(channel_name)
                if channel not in prefs.channels:
                    prefs.channels[channel] = ChannelConfig()
                if "enabled" in config:
                    prefs.channels[channel].enabled = config["enabled"]
                if "address" in config:
                    prefs.channels[channel].address = config["address"]
        
        if "quiet_hours" in updates:
            qh = updates["quiet_hours"]
            prefs.quiet_hours.enabled = qh.get("enabled", prefs.quiet_hours.enabled)
            prefs.quiet_hours.timezone = qh.get("timezone", prefs.quiet_hours.timezone)
            prefs.quiet_hours.bypass_for_urgent = qh.get(
                "bypass_for_urgent", prefs.quiet_hours.bypass_for_urgent
            )
        
        if "push_tokens" in updates:
            prefs.push_tokens = updates["push_tokens"]
        
        self.repository.save(prefs)
        return prefs

    def unsubscribe(self, user_id: str, notification_type: str) -> None:
        """Unsubscribe user from a notification type."""
        prefs = self.get_preferences(user_id)
        prefs.unsubscribed_types.add(notification_type)
        self.repository.save(prefs)

    def resubscribe(self, user_id: str, notification_type: str) -> None:
        """Resubscribe user to a notification type."""
        prefs = self.get_preferences(user_id)
        prefs.unsubscribed_types.discard(notification_type)
        self.repository.save(prefs)

    def get_channels_for_notification(
        self,
        user_id: str,
        notification_type: str,
        urgency: Urgency,
    ) -> list[tuple[Channel, str]]:
        """
        Get enabled channels and recipients for a notification.
        
        Returns list of (channel, recipient) tuples.
        """
        prefs = self.get_preferences(user_id)
        
        # Check if unsubscribed from this type
        if notification_type in prefs.unsubscribed_types:
            # Allow critical notifications through
            if urgency != Urgency.CRITICAL:
                return []
        
        # Get type-specific preferences or defaults
        type_pref = prefs.type_preferences.get(notification_type)
        if type_pref and not type_pref.enabled:
            if urgency != Urgency.CRITICAL:
                return []
        
        # Determine channels for this type
        if type_pref and type_pref.channels:
            target_channels = type_pref.channels
        else:
            target_channels = self.DEFAULT_CHANNELS.get(
                notification_type,
                [Channel.EMAIL, Channel.PUSH]  # Default fallback
            )
        
        # Filter to user-enabled channels and get recipients
        result: list[tuple[Channel, str]] = []
        
        for channel in target_channels:
            channel_config = prefs.channels.get(channel, ChannelConfig())
            
            if not channel_config.enabled:
                continue
            
            # Get recipient address
            if channel == Channel.PUSH:
                # For push, we'll handle tokens separately
                if prefs.push_tokens:
                    for token in prefs.push_tokens:
                        result.append((channel, token))
            elif channel_config.address:
                result.append((channel, channel_config.address))
        
        return result

    def should_bypass_quiet_hours(
        self,
        user_id: str,
        notification_type: str,
        urgency: Urgency,
    ) -> bool:
        """Check if notification should bypass quiet hours."""
        if urgency == Urgency.CRITICAL:
            return True
        
        prefs = self.get_preferences(user_id)
        
        if urgency == Urgency.HIGH and prefs.quiet_hours.bypass_for_urgent:
            return True
        
        type_pref = prefs.type_preferences.get(notification_type)
        if type_pref and type_pref.bypass_quiet_hours:
            return True
        
        return False
