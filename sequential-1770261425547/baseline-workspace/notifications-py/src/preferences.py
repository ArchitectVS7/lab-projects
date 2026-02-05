"""User notification preferences."""

from dataclasses import dataclass, field
from datetime import datetime, time
from typing import Optional
from zoneinfo import ZoneInfo

from .models import ChannelType, Priority


@dataclass
class ChannelPreference:
    enabled: bool = True
    categories: dict[str, bool] = field(default_factory=dict)
    max_per_hour: Optional[int] = None
    max_per_day: Optional[int] = None


@dataclass
class QuietHours:
    enabled: bool = False
    start_time: str = "22:00"  # 24h format
    end_time: str = "08:00"
    days: list[str] = field(default_factory=lambda: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"])
    allow_critical: bool = True


@dataclass
class UserPreferences:
    user_id: str
    channels: dict[ChannelType, ChannelPreference] = field(default_factory=lambda: {
        ChannelType.EMAIL: ChannelPreference(categories={"transactional": True, "marketing": True}),
        ChannelType.SMS: ChannelPreference(categories={"transactional": True, "marketing": False}, max_per_day=10),
        ChannelType.PUSH: ChannelPreference(categories={"transactional": True, "marketing": True}),
    })
    quiet_hours: QuietHours = field(default_factory=QuietHours)
    timezone: str = "UTC"
    unsubscribed_at: Optional[datetime] = None
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class PreferenceCheckResult:
    allowed: bool
    reason: Optional[str] = None
    delay_until: Optional[datetime] = None


class PreferenceChecker:
    """Checks user preferences before sending notifications."""
    
    def __init__(self, store: "PreferencesStore"):
        self.store = store
    
    async def can_send(
        self,
        user_id: str,
        channel: ChannelType,
        category: str,
        priority: Priority,
    ) -> PreferenceCheckResult:
        """
        Check if notification can be sent based on user preferences.
        Returns PreferenceCheckResult with allowed=True or reason for blocking.
        """
        prefs = await self.store.get(user_id)
        
        # Global unsubscribe
        if prefs.unsubscribed_at:
            return PreferenceCheckResult(
                allowed=False,
                reason="User has unsubscribed from all notifications"
            )
        
        # Channel disabled
        channel_pref = prefs.channels.get(channel)
        if not channel_pref or not channel_pref.enabled:
            return PreferenceCheckResult(
                allowed=False,
                reason=f"User has disabled {channel.value} notifications"
            )
        
        # Category disabled
        if category in channel_pref.categories and not channel_pref.categories[category]:
            return PreferenceCheckResult(
                allowed=False,
                reason=f"User has disabled {category} notifications for {channel.value}"
            )
        
        # Rate limiting
        if channel_pref.max_per_hour or channel_pref.max_per_day:
            counts = await self.store.get_send_counts(user_id, channel)
            
            if channel_pref.max_per_hour and counts.get("hourly", 0) >= channel_pref.max_per_hour:
                return PreferenceCheckResult(
                    allowed=False,
                    reason=f"Hourly rate limit exceeded for {channel.value}"
                )
            
            if channel_pref.max_per_day and counts.get("daily", 0) >= channel_pref.max_per_day:
                return PreferenceCheckResult(
                    allowed=False,
                    reason=f"Daily rate limit exceeded for {channel.value}"
                )
        
        # Quiet hours
        if prefs.quiet_hours.enabled:
            quiet_check = self._check_quiet_hours(prefs.quiet_hours, prefs.timezone, priority)
            if quiet_check.in_quiet_hours:
                return PreferenceCheckResult(
                    allowed=False,
                    reason="User is in quiet hours",
                    delay_until=quiet_check.ends_at
                )
        
        return PreferenceCheckResult(allowed=True)
    
    def _check_quiet_hours(
        self,
        quiet_hours: QuietHours,
        timezone: str,
        priority: Priority,
    ) -> "QuietHoursCheck":
        """Check if current time is within quiet hours."""
        # Critical notifications can bypass
        if priority == Priority.CRITICAL and quiet_hours.allow_critical:
            return QuietHoursCheck(in_quiet_hours=False)
        
        try:
            tz = ZoneInfo(timezone)
        except KeyError:
            tz = ZoneInfo("UTC")
        
        now = datetime.now(tz)
        current_day = now.strftime("%a").lower()[:3]
        
        # Check if today is a quiet day
        if current_day not in quiet_hours.days:
            return QuietHoursCheck(in_quiet_hours=False)
        
        # Parse times
        start_time = self._parse_time(quiet_hours.start_time)
        end_time = self._parse_time(quiet_hours.end_time)
        current_time = now.time()
        
        # Check if in quiet hours
        if start_time <= end_time:
            # Same day range (e.g., 09:00 - 17:00)
            in_quiet = start_time <= current_time < end_time
            ends_at = datetime.combine(now.date(), end_time, tzinfo=tz)
        else:
            # Overnight range (e.g., 22:00 - 08:00)
            in_quiet = current_time >= start_time or current_time < end_time
            if current_time >= start_time:
                # After start, ends tomorrow
                tomorrow = now.date().replace(day=now.day + 1)
                ends_at = datetime.combine(tomorrow, end_time, tzinfo=tz)
            else:
                # Before end, ends today
                ends_at = datetime.combine(now.date(), end_time, tzinfo=tz)
        
        return QuietHoursCheck(in_quiet_hours=in_quiet, ends_at=ends_at if in_quiet else None)
    
    def _parse_time(self, time_str: str) -> time:
        """Parse HH:MM time string."""
        parts = time_str.split(":")
        return time(int(parts[0]), int(parts[1]))


@dataclass
class QuietHoursCheck:
    in_quiet_hours: bool
    ends_at: Optional[datetime] = None


# Import at end to avoid circular dependency
from .interfaces import PreferencesStore
