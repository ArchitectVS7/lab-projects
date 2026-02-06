"""Quiet hours service."""

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo
from .types import QuietHoursConfig, QuietHoursResult


class QuietHoursService:
    """Handles quiet hours logic."""

    def check(
        self,
        config: QuietHoursConfig,
        bypass: bool = False,
    ) -> QuietHoursResult:
        """
        Check if current time is in quiet hours.
        
        Args:
            config: User's quiet hours configuration
            bypass: If True, notification bypasses quiet hours
            
        Returns:
            QuietHoursResult with blocked status and delay_until if blocked
        """
        if not config.enabled:
            return QuietHoursResult(blocked=False)
        
        if bypass:
            return QuietHoursResult(blocked=False)
        
        if config.start is None or config.end is None:
            return QuietHoursResult(blocked=False)
        
        # Get current time in user's timezone
        try:
            tz = ZoneInfo(config.timezone)
        except Exception:
            tz = ZoneInfo("UTC")
        
        now = datetime.now(tz)
        current_time = now.time()
        
        # Check if in quiet window
        in_quiet_hours = self._is_in_window(
            current_time,
            config.start,
            config.end,
        )
        
        if not in_quiet_hours:
            return QuietHoursResult(blocked=False)
        
        # Calculate when quiet hours end
        delay_until = self._calculate_end_time(now, config.end, tz)
        
        return QuietHoursResult(blocked=True, delay_until=delay_until)

    def _is_in_window(
        self,
        current: time,
        start: time,
        end: time,
    ) -> bool:
        """
        Check if current time is in the quiet window.
        Handles overnight windows (e.g., 22:00 - 08:00).
        """
        if start <= end:
            # Normal window (e.g., 09:00 - 17:00)
            return start <= current <= end
        else:
            # Overnight window (e.g., 22:00 - 08:00)
            return current >= start or current <= end

    def _calculate_end_time(
        self,
        now: datetime,
        end: time,
        tz: ZoneInfo,
    ) -> datetime:
        """Calculate the datetime when quiet hours end."""
        today_end = datetime.combine(now.date(), end, tzinfo=tz)
        
        if today_end > now:
            # End time is later today
            return today_end
        else:
            # End time is tomorrow
            return today_end + timedelta(days=1)
