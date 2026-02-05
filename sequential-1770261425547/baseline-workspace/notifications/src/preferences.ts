import { ChannelType } from './types';

// ============ User Preferences ============

export interface UserPreferences {
  userId: string;
  
  // Channel preferences
  channels: ChannelPreferences;
  
  // Quiet hours (don't disturb)
  quietHours?: QuietHours;
  
  // Global opt-out
  unsubscribedAt?: Date;
  
  // Timezone for quiet hours calculation
  timezone: string;  // e.g., "America/New_York"
  
  updatedAt: Date;
}

export interface ChannelPreferences {
  email: ChannelPreference;
  sms: ChannelPreference;
  push: ChannelPreference;
}

export interface ChannelPreference {
  enabled: boolean;
  
  // Category-level preferences
  categories: Record<string, boolean>;  // e.g., { marketing: false, transactional: true }
  
  // Frequency limits
  maxPerDay?: number;
  maxPerHour?: number;
}

export interface QuietHours {
  enabled: boolean;
  startTime: string;   // "22:00" (24h format)
  endTime: string;     // "08:00"
  days: DayOfWeek[];   // Which days quiet hours apply
  
  // Allow critical notifications to bypass quiet hours
  allowCritical: boolean;
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

// ============ Preferences Store Interface ============

export interface PreferencesStore {
  /**
   * Get user preferences (returns defaults if not set).
   */
  get(userId: string): Promise<UserPreferences>;

  /**
   * Update user preferences.
   */
  update(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>;

  /**
   * Set channel enabled/disabled.
   */
  setChannelEnabled(userId: string, channel: ChannelType, enabled: boolean): Promise<void>;

  /**
   * Set category preference for a channel.
   */
  setCategoryPreference(
    userId: string,
    channel: ChannelType,
    category: string,
    enabled: boolean
  ): Promise<void>;

  /**
   * Set quiet hours.
   */
  setQuietHours(userId: string, quietHours: QuietHours | null): Promise<void>;

  /**
   * Global unsubscribe.
   */
  unsubscribe(userId: string): Promise<void>;

  /**
   * Resubscribe.
   */
  resubscribe(userId: string): Promise<void>;

  /**
   * Record notification sent (for rate limiting).
   */
  recordSent(userId: string, channel: ChannelType): Promise<void>;

  /**
   * Get send counts for rate limiting.
   */
  getSendCounts(userId: string, channel: ChannelType): Promise<{ hourly: number; daily: number }>;
}

// ============ Default Preferences ============

export const DEFAULT_PREFERENCES: Omit<UserPreferences, 'userId'> = {
  channels: {
    email: {
      enabled: true,
      categories: { transactional: true, marketing: true, updates: true },
    },
    sms: {
      enabled: true,
      categories: { transactional: true, marketing: false, updates: false },
      maxPerDay: 10,
    },
    push: {
      enabled: true,
      categories: { transactional: true, marketing: true, updates: true },
    },
  },
  quietHours: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    allowCritical: true,
  },
  timezone: 'UTC',
  updatedAt: new Date(),
};

// ============ Preference Checker ============

export class PreferenceChecker {
  constructor(private store: PreferencesStore) {}

  /**
   * Check if notification can be sent based on user preferences.
   * Returns null if allowed, or reason string if blocked.
   */
  async canSend(
    userId: string,
    channel: ChannelType,
    category: string,
    priority: string
  ): Promise<{ allowed: boolean; reason?: string; delayUntil?: Date }> {
    const prefs = await this.store.get(userId);

    // Global unsubscribe
    if (prefs.unsubscribedAt) {
      return { allowed: false, reason: 'User has unsubscribed from all notifications' };
    }

    // Channel disabled
    const channelPref = prefs.channels[channel];
    if (!channelPref.enabled) {
      return { allowed: false, reason: `User has disabled ${channel} notifications` };
    }

    // Category disabled
    if (channelPref.categories[category] === false) {
      return { allowed: false, reason: `User has disabled ${category} notifications for ${channel}` };
    }

    // Rate limiting
    if (channelPref.maxPerHour || channelPref.maxPerDay) {
      const counts = await this.store.getSendCounts(userId, channel);

      if (channelPref.maxPerHour && counts.hourly >= channelPref.maxPerHour) {
        return { allowed: false, reason: `Hourly rate limit exceeded for ${channel}` };
      }

      if (channelPref.maxPerDay && counts.daily >= channelPref.maxPerDay) {
        return { allowed: false, reason: `Daily rate limit exceeded for ${channel}` };
      }
    }

    // Quiet hours
    if (prefs.quietHours?.enabled) {
      const quietCheck = this.isInQuietHours(prefs.quietHours, prefs.timezone, priority);
      if (quietCheck.inQuietHours) {
        return {
          allowed: false,
          reason: 'User is in quiet hours',
          delayUntil: quietCheck.endsAt,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if current time is within quiet hours.
   */
  private isInQuietHours(
    quietHours: QuietHours,
    timezone: string,
    priority: string
  ): { inQuietHours: boolean; endsAt?: Date } {
    // Critical notifications can bypass quiet hours
    if (priority === 'critical' && quietHours.allowCritical) {
      return { inQuietHours: false };
    }

    const now = new Date();
    const userTime = this.getTimeInTimezone(now, timezone);
    const currentDay = this.getDayOfWeek(now, timezone);

    // Check if today is a quiet day
    if (!quietHours.days.includes(currentDay)) {
      return { inQuietHours: false };
    }

    const currentMinutes = userTime.hours * 60 + userTime.minutes;
    const startMinutes = this.parseTime(quietHours.startTime);
    const endMinutes = this.parseTime(quietHours.endTime);

    let inQuietHours: boolean;
    let endsAt: Date;

    if (startMinutes <= endMinutes) {
      // Same day: e.g., 09:00 - 17:00
      inQuietHours = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      endsAt = this.getDateAtTime(now, quietHours.endTime, timezone);
    } else {
      // Overnight: e.g., 22:00 - 08:00
      inQuietHours = currentMinutes >= startMinutes || currentMinutes < endMinutes;
      
      if (currentMinutes >= startMinutes) {
        // After start, ends tomorrow
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        endsAt = this.getDateAtTime(tomorrow, quietHours.endTime, timezone);
      } else {
        // Before end, ends today
        endsAt = this.getDateAtTime(now, quietHours.endTime, timezone);
      }
    }

    return { inQuietHours, endsAt };
  }

  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getTimeInTimezone(date: Date, timezone: string): { hours: number; minutes: number } {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    return {
      hours: parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0'),
      minutes: parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0'),
    };
  }

  private getDayOfWeek(date: Date, timezone: string): DayOfWeek {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const day = formatter.format(date).toLowerCase();
    return day.slice(0, 3) as DayOfWeek;
  }

  private getDateAtTime(baseDate: Date, time: string, timezone: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(baseDate);
    
    // This is a simplification - in production use a proper timezone library
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
}
