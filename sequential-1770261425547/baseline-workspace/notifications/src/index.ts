// Core
export { NotificationService, NotificationServiceConfig, NotificationBlockedError } from './service';
export { NotificationChannel } from './channel';
export { NotificationStore } from './store';
export { NotificationQueue, QueueStats, priorityToWeight } from './queue';

// Preferences
export {
  PreferencesStore,
  PreferenceChecker,
  UserPreferences,
  ChannelPreferences,
  ChannelPreference,
  QuietHours,
  DayOfWeek,
  DEFAULT_PREFERENCES,
} from './preferences';

// Types
export * from './types';

// Channel implementations
export { SendGridChannel, EmailProviderConfig } from './channels/email';
export { TwilioChannel, SMSProviderConfig } from './channels/sms';
export { FCMChannel, PushProviderConfig } from './channels/push';
