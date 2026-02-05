# Notification System Design

## Overview

A multi-channel notification system supporting email, SMS, and push notifications with async delivery, retry logic, delivery tracking, and user preferences.

---

## Constraints

| # | Constraint | Solution |
|---|------------|----------|
| 1 | Multi-channel (email, SMS, push) | Channel provider abstraction |
| 2 | Async delivery | Queue-based architecture |
| 3 | Delivery tracking + retries | Delivery records + exponential backoff |
| 4 | User preferences + quiet hours | Preferences service + routing logic |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                 CLIENTS                                      │
│                    (Web App, Mobile App, Internal Services)                  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOTIFICATION SERVICE                               │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   notify()  │───▶│ Preferences │───▶│ Quiet Hours │───▶│   Enqueue   │  │
│  │             │    │   Filter    │    │    Check    │    │             │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └──────┬──────┘  │
│                                                                   │         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐           │         │
│  │  Template   │    │  Preferences│    │  Delivery   │           │         │
│  │  Service    │    │   Service   │    │   Service   │           │         │
│  └─────────────┘    └─────────────┘    └─────────────┘           │         │
└──────────────────────────────────────────────────────────────────┼─────────┘
                                                                   │
                                      ┌────────────────────────────┘
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              MESSAGE QUEUE                                   │
│                            (Redis + BullMQ)                                  │
│                                                                              │
│     ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│     │ email:queue  │    │  sms:queue   │    │ push:queue   │               │
│     └──────┬───────┘    └──────┬───────┘    └──────┬───────┘               │
│            │                   │                    │                        │
│     ┌──────┴───────┐    ┌──────┴───────┐    ┌──────┴───────┐               │
│     │ email:delayed│    │ sms:delayed  │    │ push:delayed │               │
│     │ (quiet hours)│    │ (quiet hours)│    │ (quiet hours)│               │
│     └──────────────┘    └──────────────┘    └──────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
                  │                   │                    │
                  ▼                   ▼                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               WORKERS                                        │
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │  Email Worker   │    │   SMS Worker    │    │   Push Worker   │         │
│  │                 │    │                 │    │                 │         │
│  │  - Render tmpl  │    │  - Render tmpl  │    │  - Render tmpl  │         │
│  │  - Send         │    │  - Send         │    │  - Send         │         │
│  │  - Track        │    │  - Track        │    │  - Track        │         │
│  │  - Retry/fail   │    │  - Retry/fail   │    │  - Retry/fail   │         │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘         │
└───────────┼──────────────────────┼──────────────────────┼───────────────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHANNEL PROVIDERS                                    │
│                                                                              │
│      ┌──────────┐           ┌──────────┐           ┌──────────┐            │
│      │ SendGrid │           │  Twilio  │           │   FCM    │            │
│      │   /SES   │           │          │           │  /APNs   │            │
│      └────┬─────┘           └────┬─────┘           └────┬─────┘            │
│           │                      │                      │                   │
│           └──────────────────────┼──────────────────────┘                   │
│                                  │                                          │
│                                  ▼                                          │
│                           ┌──────────┐                                      │
│                           │ Webhooks │ (delivery status callbacks)          │
│                           └────┬─────┘                                      │
└────────────────────────────────┼────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE                                        │
│                            (PostgreSQL)                                      │
│                                                                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  notifications  │  │delivery_records │  │ user_preferences│             │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Notification Service (API Layer)

**Responsibilities:**
- Accept notification requests
- Validate input
- Check user preferences
- Apply quiet hours logic
- Enqueue jobs to appropriate channels
- Provide delivery status queries

**Endpoints:**
```
POST   /notifications                    Send notification
GET    /notifications/:id                Get notification + delivery status
GET    /users/:id/notifications          List user's notifications

GET    /users/:id/preferences            Get preferences
PUT    /users/:id/preferences            Update preferences
POST   /users/:id/unsubscribe/:type      Unsubscribe from type

POST   /webhooks/:provider               Receive delivery callbacks
```

### 2. Preferences Service

**Responsibilities:**
- Store/retrieve user notification preferences
- Determine enabled channels per notification type
- Manage unsubscribe lists

**Logic:**
```
getChannelsForNotification(userId, type, urgency):
  1. Load user preferences
  2. Check if type is unsubscribed → return []
  3. Get type-specific channel overrides (or defaults)
  4. Filter to user-enabled channels only
  5. Return enabled channels with recipient addresses
```

### 3. Quiet Hours Service

**Responsibilities:**
- Determine if current time is in quiet hours
- Calculate delay until quiet hours end
- Handle timezone conversions
- Apply urgency bypass rules

**Logic:**
```
checkQuietHours(userId, urgency):
  1. Load user quiet hours settings
  2. If not enabled → return { blocked: false }
  3. Convert current time to user timezone
  4. Check if within quiet window
  5. If blocked AND (urgency=critical OR bypass allowed):
     → return { blocked: false }
  6. If blocked:
     → return { blocked: true, delayUntil: <end of quiet hours> }
```

### 4. Template Service

**Responsibilities:**
- Store notification templates per type and channel
- Render templates with provided data
- Support localization

**Template Structure:**
```
templates/
├── welcome/
│   ├── email.html
│   ├── email.txt
│   ├── sms.txt
│   └── push.json
├── order_shipped/
│   ├── email.html
│   └── push.json
```

### 5. Queue (Redis + BullMQ)

**Queues:**
- `notifications:email` - Email delivery jobs
- `notifications:sms` - SMS delivery jobs  
- `notifications:push` - Push notification jobs

**Job Structure:**
```json
{
  "id": "job_123",
  "notificationId": "notif_456",
  "userId": "user_789",
  "type": "order_shipped",
  "channel": "email",
  "recipient": "user@example.com",
  "data": { "orderId": "ORD-001", "trackingUrl": "..." },
  "urgency": "high",
  "attempts": 0,
  "maxAttempts": 5
}
```

**Delayed Jobs:**
- Quiet hours → delay until window ends
- Scheduled notifications → delay until send time
- Retries → exponential backoff

### 6. Workers

**Per-Channel Workers:**
- Email Worker → SendGrid/SES
- SMS Worker → Twilio
- Push Worker → FCM/APNs

**Worker Flow:**
```
1. Pick job from queue
2. Load template for (type, channel)
3. Render with data
4. Send via provider
5. On success:
   - Create/update delivery record (status: sent)
   - Ack job
6. On failure:
   - If retryable + attempts < max:
     - Update delivery record (attempts++)
     - Requeue with backoff
   - Else:
     - Update delivery record (status: failed)
     - Ack job
     - Alert ops if critical
```

### 7. Channel Providers

**Interface:**
```typescript
interface NotificationChannel {
  name: string;
  send(recipient: string, content: RenderedContent): Promise<SendResult>;
  validateRecipient(recipient: string): boolean;
  parseWebhook(request: WebhookRequest): DeliveryUpdate;
}
```

**Implementations:**
- `SendGridChannel` / `SESChannel` - Email
- `TwilioChannel` - SMS
- `FCMChannel` / `APNsChannel` - Push

---

## Data Models

### notifications
```sql
CREATE TABLE notifications (
  id              UUID PRIMARY KEY,
  user_id         UUID NOT NULL,
  type            VARCHAR(100) NOT NULL,
  data            JSONB NOT NULL,
  urgency         VARCHAR(20) DEFAULT 'normal',
  channels        VARCHAR(20)[] NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_notifications_user_id (user_id),
  INDEX idx_notifications_created_at (created_at)
);
```

### delivery_records
```sql
CREATE TABLE delivery_records (
  id                  UUID PRIMARY KEY,
  notification_id     UUID NOT NULL REFERENCES notifications(id),
  channel             VARCHAR(20) NOT NULL,
  recipient           VARCHAR(255) NOT NULL,
  status              VARCHAR(20) NOT NULL DEFAULT 'pending',
  attempts            INT DEFAULT 0,
  max_attempts        INT DEFAULT 5,
  provider_message_id VARCHAR(255),
  last_error          TEXT,
  scheduled_for       TIMESTAMPTZ,
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  failed_at           TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_delivery_notification (notification_id),
  INDEX idx_delivery_status (status),
  INDEX idx_delivery_provider_msg (provider_message_id)
);

-- Status: pending → sending → sent → delivered
--                          ↘ failed
--                          ↘ bounced
```

### user_preferences
```sql
CREATE TABLE user_preferences (
  user_id             UUID PRIMARY KEY,
  
  -- Channel settings
  email_enabled       BOOLEAN DEFAULT TRUE,
  email_address       VARCHAR(255),
  sms_enabled         BOOLEAN DEFAULT FALSE,
  sms_phone           VARCHAR(20),
  push_enabled        BOOLEAN DEFAULT TRUE,
  push_tokens         JSONB DEFAULT '[]',
  
  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,
  quiet_hours_tz      VARCHAR(50) DEFAULT 'UTC',
  quiet_bypass_urgent BOOLEAN DEFAULT TRUE,
  
  -- Type overrides (JSONB)
  type_preferences    JSONB DEFAULT '{}',
  unsubscribed_types  VARCHAR(100)[] DEFAULT '{}',
  
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- type_preferences example:
-- {
--   "marketing": { "enabled": false },
--   "order_updates": { "channels": ["email", "push"] },
--   "security": { "channels": ["email", "sms"], "bypassQuietHours": true }
-- }
```

---

## Data Flow

### Flow 1: Send Notification

```
Client                Service              Queue               Worker              Provider
  │                      │                   │                    │                    │
  │  POST /notify        │                   │                    │                    │
  │  {userId, type,      │                   │                    │                    │
  │   data, urgency}     │                   │                    │                    │
  │─────────────────────▶│                   │                    │                    │
  │                      │                   │                    │                    │
  │                      │ 1. Load prefs     │                    │                    │
  │                      │ 2. Filter channels│                    │                    │
  │                      │ 3. Check quiet hrs│                    │                    │
  │                      │ 4. Create notif   │                    │                    │
  │                      │    record         │                    │                    │
  │                      │                   │                    │                    │
  │                      │ 5. Enqueue jobs   │                    │                    │
  │                      │──────────────────▶│                    │                    │
  │                      │   (per channel)   │                    │                    │
  │                      │                   │                    │                    │
  │  { notificationId }  │                   │                    │                    │
  │◀─────────────────────│                   │                    │                    │
  │                      │                   │                    │                    │
  │                      │                   │ 6. Worker picks    │                    │
  │                      │                   │    job             │                    │
  │                      │                   │───────────────────▶│                    │
  │                      │                   │                    │                    │
  │                      │                   │                    │ 7. Render template │
  │                      │                   │                    │ 8. Send            │
  │                      │                   │                    │───────────────────▶│
  │                      │                   │                    │                    │
  │                      │                   │                    │    { messageId }   │
  │                      │                   │                    │◀───────────────────│
  │                      │                   │                    │                    │
  │                      │                   │                    │ 9. Update delivery │
  │                      │                   │                    │    record          │
  │                      │                   │                    │                    │
```

### Flow 2: Delivery Webhook

```
Provider              Service                    Database
   │                     │                          │
   │ POST /webhooks/     │                          │
   │ sendgrid            │                          │
   │ {messageId,         │                          │
   │  event: delivered}  │                          │
   │────────────────────▶│                          │
   │                     │                          │
   │                     │ 1. Validate signature    │
   │                     │ 2. Parse event           │
   │                     │ 3. Find delivery record  │
   │                     │    by provider_message_id│
   │                     │─────────────────────────▶│
   │                     │                          │
   │                     │ 4. Update status         │
   │                     │    (delivered_at = now)  │
   │                     │─────────────────────────▶│
   │                     │                          │
   │         200 OK      │                          │
   │◀────────────────────│                          │
```

### Flow 3: Retry on Failure

```
Worker                Queue                  Database
  │                     │                       │
  │ Send fails          │                       │
  │ (timeout/5xx)       │                       │
  │                     │                       │
  │ Check: attempts     │                       │
  │ < maxAttempts?      │                       │
  │                     │                       │
  │ Yes: Calculate      │                       │
  │ backoff delay       │                       │
  │                     │                       │
  │ Update delivery     │                       │
  │ record              │                       │
  │────────────────────────────────────────────▶│
  │                     │                       │
  │ Requeue with delay  │                       │
  │────────────────────▶│                       │
  │                     │                       │
  │ [After delay]       │                       │
  │◀────────────────────│                       │
  │                     │                       │
  │ Retry send...       │                       │
```

---

## Retry Strategy

```
Attempt   Delay        Total Elapsed
───────   ─────        ─────────────
1         0            0
2         1 min        1 min
3         5 min        6 min
4         30 min       36 min
5         2 hours      2h 36m
FAIL      -            -
```

**Non-Retryable Errors:**
- Invalid recipient (bad email, invalid phone)
- Unsubscribed/blocked by recipient
- Content rejected (spam)
- Authentication failure (misconfiguration)

**Retryable Errors:**
- Rate limited (429)
- Provider timeout
- Provider 5xx errors
- Network errors

---

## Quiet Hours Logic

```
┌─────────────────────────────────────────────────────────────┐
│                    Quiet Hours Check                         │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
                ┌───────────────────┐
                │ Quiet hours       │───No───▶ Send Now
                │ enabled?          │
                └─────────┬─────────┘
                          │ Yes
                          ▼
                ┌───────────────────┐
                │ Current time in   │───No───▶ Send Now
                │ quiet window?     │
                └─────────┬─────────┘
                          │ Yes
                          ▼
                ┌───────────────────┐
                │ Urgency =         │──Yes──▶ Send Now
                │ critical?         │
                └─────────┬─────────┘
                          │ No
                          ▼
                ┌───────────────────┐
                │ Urgency = high    │
                │ AND bypass        │──Yes──▶ Send Now
                │ allowed?          │
                └─────────┬─────────┘
                          │ No
                          ▼
                   Schedule for
                  quiet hours end
```

---

## Scalability Considerations

| Component | Scaling Strategy |
|-----------|------------------|
| API | Horizontal (stateless) |
| Queue | Redis Cluster / managed service |
| Workers | Horizontal, per-channel scaling |
| Database | Read replicas, partitioning by date |

**Bottlenecks & Solutions:**
- Provider rate limits → Multiple provider accounts, queuing
- Database writes → Batch inserts, async updates
- High volume → Separate queues by priority/urgency

---

## Monitoring & Alerts

**Metrics:**
- Queue depth per channel
- Delivery success rate
- Avg delivery latency
- Retry rate
- Provider error rates

**Alerts:**
- Queue depth > threshold
- Delivery success rate < 95%
- Provider errors spike
- Critical notification failed after all retries

---

## Security

- Webhook signature validation per provider
- API authentication (API keys / JWT)
- PII encryption at rest (email, phone)
- Audit log for preference changes
- Rate limiting on API endpoints
