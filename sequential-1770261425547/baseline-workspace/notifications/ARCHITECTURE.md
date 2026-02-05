# Notification System - Architecture Design

## Overview

A multi-channel notification system supporting email, SMS, and push notifications with async delivery, automatic retries, delivery tracking, and user preference management.

## Constraints

| # | Constraint | Solution |
|---|------------|----------|
| 1 | Multi-channel (email, SMS, push) | Provider abstraction with `NotificationChannel` interface |
| 2 | Async delivery | Queue-based architecture with background workers |
| 3 | Delivery tracking + retries | Status persistence + exponential backoff |
| 4 | User preferences + quiet hours | Preference check before queuing + delayed scheduling |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENTS                                        │
│                    (Web App, Mobile App, Internal Services)                      │
└─────────────────────────────────────┬───────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ POST /notify    │  │ GET /notify/:id │  │ User Prefs API  │                  │
│  │ POST /notify/   │  │ GET /users/:id/ │  │ PUT /users/:id/ │                  │
│  │      bulk       │  │   notifications │  │   preferences   │                  │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘                  │
└───────────┼─────────────────────┼───────────────────┼────────────────────────────┘
            │                     │                   │
            ▼                     │                   │
┌───────────────────────────┐     │                   │
│   NOTIFICATION SERVICE    │     │                   │
│  ┌─────────────────────┐  │     │                   │
│  │ Preference Checker  │◀─┼─────┼───────────────────┘
│  │ • Channel enabled?  │  │     │
│  │ • Category allowed? │  │     │
│  │ • Rate limit OK?    │  │     │
│  │ • Quiet hours?      │  │     │
│  └──────────┬──────────┘  │     │
│             │             │     │
│             ▼             │     │
│  ┌─────────────────────┐  │     │
│  │ Notification Store  │◀─┼─────┘
│  │ • Create record     │  │         ┌──────────────────────┐
│  │ • Track status      │  │         │      DATABASES       │
│  └──────────┬──────────┘  │         │  ┌────────────────┐  │
│             │             │────────▶│  │  PostgreSQL    │  │
└─────────────┼─────────────┘         │  │  • Notifications│  │
              │                       │  │  • Preferences  │  │
              ▼                       │  │  • Delivery log │  │
┌───────────────────────────┐         │  └────────────────┘  │
│     NOTIFICATION QUEUE    │         │  ┌────────────────┐  │
│  ┌─────────────────────┐  │         │  │     Redis      │  │
│  │ Priority Queues     │  │────────▶│  │  • Job queue   │  │
│  │ • critical (p=10)   │  │         │  │  • Rate limits │  │
│  │ • high (p=5)        │  │         │  │  • Idempotency │  │
│  │ • normal (p=2)      │  │         │  └────────────────┘  │
│  │ • low (p=1)         │  │         └──────────────────────┘
│  └──────────┬──────────┘  │
│             │             │
│  ┌──────────┴──────────┐  │
│  │ Delayed/Scheduled   │  │
│  │ • Quiet hours delay │  │
│  │ • Scheduled sends   │  │
│  └─────────────────────┘  │
└─────────────┬─────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              WORKER POOL                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │  Worker 1   │  │  Worker 2   │  │  Worker 3   │  │  Worker N   │            │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │
│         │                │                │                │                    │
│         └────────────────┴────────────────┴────────────────┘                    │
│                                   │                                             │
│                     ┌─────────────┴─────────────┐                               │
│                     ▼                           ▼                               │
│              ┌─────────────┐             ┌─────────────┐                        │
│              │  Delivery   │             │   Retry     │                        │
│              │  Processor  │             │   Handler   │                        │
│              └──────┬──────┘             └──────┬──────┘                        │
│                     │                           │                               │
│                     └─────────────┬─────────────┘                               │
└───────────────────────────────────┼─────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          CHANNEL PROVIDERS                                       │
│                                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │     EMAIL       │    │      SMS        │    │      PUSH       │             │
│  │  ┌───────────┐  │    │  ┌───────────┐  │    │  ┌───────────┐  │             │
│  │  │ SendGrid  │  │    │  │  Twilio   │  │    │  │    FCM    │  │             │
│  │  ├───────────┤  │    │  ├───────────┤  │    │  ├───────────┤  │             │
│  │  │  Mailgun  │  │    │  │  AWS SNS  │  │    │  │   APNs    │  │             │
│  │  │ (backup)  │  │    │  │ (backup)  │  │    │  │ (backup)  │  │             │
│  │  └───────────┘  │    │  └───────────┘  │    │  └───────────┘  │             │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘             │
└───────────┼──────────────────────┼──────────────────────┼───────────────────────┘
            │                      │                      │
            ▼                      ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              WEBHOOKS                                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐             │
│  │ POST /webhooks/ │    │ POST /webhooks/ │    │ POST /webhooks/ │             │
│  │    sendgrid     │    │     twilio      │    │      fcm        │             │
│  └────────┬────────┘    └────────┬────────┘    └────────┬────────┘             │
│           │                      │                      │                       │
│           └──────────────────────┴──────────────────────┘                       │
│                                  │                                              │
│                                  ▼                                              │
│                    ┌───────────────────────┐                                    │
│                    │  Update Delivery      │                                    │
│                    │  Status in DB         │                                    │
│                    │  • delivered          │                                    │
│                    │  • bounced            │                                    │
│                    │  • opened             │                                    │
│                    │  • clicked            │                                    │
│                    └───────────────────────┘                                    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Send Notification

```
Client                API              Service           Queue            Worker            Provider
  │                    │                  │                │                 │                  │
  │ POST /notify       │                  │                │                 │                  │
  ├───────────────────▶│                  │                │                 │                  │
  │                    │ Check prefs      │                │                 │                  │
  │                    ├─────────────────▶│                │                 │                  │
  │                    │                  │                │                 │                  │
  │                    │   ┌──────────────┴──────────────┐ │                 │                  │
  │                    │   │ • Channel enabled?          │ │                 │                  │
  │                    │   │ • Category allowed?         │ │                 │                  │
  │                    │   │ • Rate limit OK?            │ │                 │                  │
  │                    │   │ • In quiet hours?           │ │                 │                  │
  │                    │   │   → If yes, schedule delay  │ │                 │                  │
  │                    │   └──────────────┬──────────────┘ │                 │                  │
  │                    │                  │                │                 │                  │
  │                    │ Create record    │                │                 │                  │
  │                    │ (status=queued)  │                │                 │                  │
  │                    │◀─────────────────┤                │                 │                  │
  │                    │                  │                │                 │                  │
  │                    │                  │ Enqueue        │                 │                  │
  │                    │                  ├───────────────▶│                 │                  │
  │                    │                  │                │                 │                  │
  │ 202 Accepted       │                  │                │                 │                  │
  │ { id, status }     │                  │                │                 │                  │
  │◀───────────────────┤                  │                │                 │                  │
  │                    │                  │                │                 │                  │
  │                    │                  │                │ Dequeue         │                  │
  │                    │                  │                ├────────────────▶│                  │
  │                    │                  │                │                 │                  │
  │                    │                  │                │                 │ Send             │
  │                    │                  │                │                 ├─────────────────▶│
  │                    │                  │                │                 │                  │
  │                    │                  │                │                 │ Result           │
  │                    │                  │                │                 │◀─────────────────┤
  │                    │                  │                │                 │                  │
  │                    │                  │ Update status  │                 │                  │
  │                    │                  │ (status=sent)  │◀────────────────┤                  │
  │                    │                  │                │                 │                  │
```

### 2. Retry Flow

```
                    Attempt 1          Attempt 2          Attempt 3          Attempt 4
                        │                  │                  │                  │
Time ──────────────────▶│                  │                  │                  │
                        │                  │                  │                  │
                   Send fails         +1 min            +2 min             +4 min
                   (500 error)       Retry #1          Retry #2           Retry #3
                        │                  │                  │                  │
                        ▼                  ▼                  ▼                  ▼
                   ┌─────────┐        ┌─────────┐        ┌─────────┐        ┌─────────┐
                   │ FAILED  │───────▶│ FAILED  │───────▶│ FAILED  │───────▶│ SUCCESS │
                   │ retry=1 │        │ retry=2 │        │ retry=3 │        │  SENT   │
                   └─────────┘        └─────────┘        └─────────┘        └─────────┘
                                                                                  │
                                                                                  ▼
                                                                         Provider confirms
                                                                              delivery
                                                                                  │
                                                                                  ▼
                                                                            ┌───────────┐
                                                                            │ DELIVERED │
                                                                            └───────────┘
```

### 3. Quiet Hours Flow

```
User in NYC (UTC-5)
Quiet hours: 22:00 - 08:00

                    21:00 NYC           22:00 NYC           08:00 NYC
                        │                   │                   │
Time ───────────────────┼───────────────────┼───────────────────┼──────────▶
                        │                   │                   │
                        │    ┌──────────────┴──────────────┐    │
                        │    │       QUIET HOURS           │    │
                        │    │   Notifications delayed     │    │
                        │    └──────────────┬──────────────┘    │
                        │                   │                   │
    Normal notification │                   │                   │
    ────────────────────▶ Sent immediately  │                   │
                        │                   │                   │
                        │   Notification    │                   │
                        │   ─────────────────▶ Delayed          │
                        │                   │ scheduledAt=08:00 │
                        │                   │                   │
                        │  Critical notif   │                   │
                        │  ──────────────────▶ Sent (bypasses)  │
                        │                   │                   │
                        │                   │   Delayed notif   │
                        │                   │   ─────────────────▶ Sent
```

---

## Key Components

### 1. Notification Service

The orchestrator that handles all notification logic.

```typescript
class NotificationService {
  // Public API
  send(request): Promise<Notification>          // Queue single notification
  sendBulk(requests): Promise<Notification[]>   // Queue multiple
  sendWithFallback(request, fallbacks): Promise // Try alternate channels
  cancel(id): Promise<boolean>                  // Cancel if not sent
  getStatus(id): Promise<Notification>          // Check status
  
  // Worker methods
  startWorker(): void                           // Start processing queue
  processNotification(notification): Promise    // Handle single notification
  handleWebhook(channel, payload): Promise      // Process delivery webhook
}
```

### 2. Notification Channel (Interface)

Abstract interface for delivery providers.

```typescript
interface NotificationChannel {
  channelType: 'email' | 'sms' | 'push'
  providerName: string
  
  send(notification): Promise<DeliveryResult>
  sendBatch?(notifications): Promise<DeliveryResult[]>
  validateRecipient(notification): string | null
  parseWebhook?(payload, signature): Promise<WebhookEvent>
}
```

### 3. Preference Checker

Enforces user preferences before sending.

```typescript
class PreferenceChecker {
  canSend(userId, channel, category, priority): Promise<{
    allowed: boolean
    reason?: string
    delayUntil?: Date  // For quiet hours
  }>
}
```

### 4. Notification Store (Interface)

Persistence layer for notifications.

```typescript
interface NotificationStore {
  create(notification): Promise<Notification>
  get(id): Promise<Notification | null>
  markProcessing(id): Promise<Notification | null>  // Atomic lock
  markSent(id, providerId): Promise<Notification>
  markFailed(id, error, nextRetryAt?): Promise<Notification>
  updateDeliveryStatus(providerId, event): Promise<Notification>
  getRetryable(limit): Promise<Notification[]>
}
```

### 5. Notification Queue (Interface)

Job queue for async processing.

```typescript
interface NotificationQueue {
  enqueue(notification): Promise<void>
  enqueueDelayed(notification, delayMs): Promise<void>
  enqueueScheduled(notification, scheduledAt): Promise<void>
  process(handler): void
}
```

---

## Database Schema

### PostgreSQL

```sql
-- Notifications table
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         VARCHAR(20) NOT NULL,  -- email, sms, push
  recipient_id    VARCHAR(100) NOT NULL,
  recipient_data  JSONB NOT NULL,         -- { email, phone, deviceTokens }
  content         JSONB NOT NULL,
  priority        VARCHAR(20) DEFAULT 'normal',
  status          VARCHAR(20) DEFAULT 'queued',
  
  -- Tracking
  attempts        INT DEFAULT 0,
  max_attempts    INT DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_retry_at   TIMESTAMPTZ,
  last_error      TEXT,
  
  -- Provider info
  provider_id     VARCHAR(255),
  provider_name   VARCHAR(50),
  
  -- Delivery tracking
  sent_at         TIMESTAMPTZ,
  delivered_at    TIMESTAMPTZ,
  opened_at       TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  failed_at       TIMESTAMPTZ,
  
  -- Scheduling
  scheduled_at    TIMESTAMPTZ,
  queued_at       TIMESTAMPTZ DEFAULT NOW(),
  
  -- Deduplication
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Metadata
  metadata        JSONB DEFAULT '{}',
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_scheduled ON notifications(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_notifications_retry ON notifications(next_retry_at) WHERE status = 'failed';
CREATE INDEX idx_notifications_provider ON notifications(provider_id);

-- User preferences table
CREATE TABLE user_preferences (
  user_id         VARCHAR(100) PRIMARY KEY,
  
  -- Channel settings (JSONB for flexibility)
  channels        JSONB DEFAULT '{
    "email": {"enabled": true, "categories": {}},
    "sms": {"enabled": true, "categories": {}, "maxPerDay": 10},
    "push": {"enabled": true, "categories": {}}
  }',
  
  -- Quiet hours
  quiet_hours     JSONB DEFAULT '{"enabled": false}',
  timezone        VARCHAR(50) DEFAULT 'UTC',
  
  -- Global opt-out
  unsubscribed_at TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Rate limiting (or use Redis)
CREATE TABLE notification_rate_limits (
  user_id         VARCHAR(100),
  channel         VARCHAR(20),
  window_start    TIMESTAMPTZ,
  count           INT DEFAULT 1,
  PRIMARY KEY (user_id, channel, window_start)
);
```

### Redis Keys

```
# Job queue (BullMQ)
bull:notifications:waiting      # Jobs waiting to process
bull:notifications:active       # Jobs being processed
bull:notifications:delayed      # Scheduled/delayed jobs
bull:notifications:failed       # Failed jobs

# Rate limiting
ratelimit:{userId}:{channel}:hourly   # INCR + EXPIRE 3600
ratelimit:{userId}:{channel}:daily    # INCR + EXPIRE 86400

# Idempotency (prevent duplicates)
idempotency:{key}                     # SET NX EX 86400

# Processing locks
lock:notification:{id}                # SET NX EX 300
```

---

## API Endpoints

### Send Notifications

```
POST /api/v1/notifications
Content-Type: application/json

{
  "channel": "email",
  "recipient": {
    "userId": "user_123",
    "email": "user@example.com"
  },
  "content": {
    "subject": "Welcome!",
    "templateId": "welcome-email",
    "templateData": { "name": "John" }
  },
  "priority": "high",
  "metadata": {
    "category": "transactional"
  }
}

Response: 202 Accepted
{
  "id": "notif_abc123",
  "status": "queued",
  "channel": "email",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Get Status

```
GET /api/v1/notifications/{id}

Response: 200 OK
{
  "id": "notif_abc123",
  "status": "delivered",
  "channel": "email",
  "attempts": 1,
  "sentAt": "2024-01-15T10:00:01Z",
  "deliveredAt": "2024-01-15T10:00:03Z"
}
```

### User Preferences

```
GET /api/v1/users/{userId}/preferences
PUT /api/v1/users/{userId}/preferences

{
  "channels": {
    "email": { "enabled": true, "categories": { "marketing": false } },
    "sms": { "enabled": false },
    "push": { "enabled": true }
  },
  "quietHours": {
    "enabled": true,
    "startTime": "22:00",
    "endTime": "08:00",
    "days": ["mon", "tue", "wed", "thu", "fri"],
    "allowCritical": true
  },
  "timezone": "America/New_York"
}
```

### Webhooks (from providers)

```
POST /api/v1/webhooks/sendgrid
POST /api/v1/webhooks/twilio
POST /api/v1/webhooks/fcm
```

---

## Status State Machine

```
                    ┌──────────────────────────────────────────────┐
                    │                                              │
                    ▼                                              │
┌─────────┐    ┌─────────┐    ┌────────────┐    ┌──────────┐      │
│ QUEUED  │───▶│PROCESSING│───▶│    SENT    │───▶│DELIVERED │      │
└─────────┘    └─────────┘    └────────────┘    └──────────┘      │
     │              │               │                              │
     │              │               │          ┌──────────┐        │
     │              │               └─────────▶│  OPENED  │        │
     │              │                          └──────────┘        │
     │              │                               │              │
     │              │                               ▼              │
     │              │                          ┌──────────┐        │
     │              │                          │ CLICKED  │        │
     │              │                          └──────────┘        │
     │              │                                              │
     │              │         ┌────────────┐                       │
     │              └────────▶│  FAILED    │───────────────────────┘
     │                        │ (retry)    │       (if retryable)
     │                        └────────────┘
     │                              │
     │                              │ (max attempts or permanent)
     │                              ▼
     │                        ┌────────────┐
     │                        │  FAILED    │
     │                        │ (permanent)│
     │                        └────────────┘
     │
     │
     │       ┌────────────┐
     └──────▶│ CANCELLED  │
             └────────────┘
```

---

## Scaling Considerations

| Component | Scaling Strategy |
|-----------|-----------------|
| **API** | Horizontal (stateless), load balancer |
| **Workers** | Horizontal, increase count based on queue depth |
| **Queue** | Redis Cluster or SQS (auto-scales) |
| **Database** | Read replicas for status queries, partition by date |
| **Providers** | Multiple providers per channel for failover |

### Throughput Estimates

| Component | Capacity |
|-----------|----------|
| Single worker | ~100 notifications/sec |
| 10 workers | ~1,000 notifications/sec |
| Redis queue | ~100,000 enqueue/sec |
| PostgreSQL | ~10,000 writes/sec |

---

## Monitoring & Alerts

### Key Metrics

```
# Queue health
notifications_queue_depth{priority="*"}
notifications_queue_latency_seconds

# Delivery
notifications_sent_total{channel="*", status="*"}
notifications_delivery_latency_seconds

# Errors
notifications_failed_total{channel="*", error="*"}
notifications_retry_total{channel="*", attempt="*"}

# Rate limiting
notifications_blocked_total{reason="*"}
```

### Alerts

| Alert | Condition |
|-------|-----------|
| Queue backlog | queue_depth > 10,000 for 5 min |
| High failure rate | failure_rate > 5% for 10 min |
| Provider down | provider_errors > 100 in 1 min |
| Slow delivery | p99_latency > 30s |

---

## Summary

This notification system handles:

1. **Multi-channel delivery** via provider abstraction
2. **Async processing** via queue-based architecture  
3. **Reliability** via retries with exponential backoff
4. **Delivery tracking** via webhooks and status updates
5. **User control** via preferences and quiet hours
6. **Scale** via horizontal worker scaling

The design separates concerns cleanly:
- **Service** = orchestration logic
- **Store** = persistence (swap PostgreSQL/MongoDB)
- **Queue** = job processing (swap Redis/SQS)
- **Channels** = delivery providers (swap SendGrid/Mailgun)
