# P2: Developer Platform -- Parallel Development Roadmap

**Covers:** Public API + API Keys (#4), Webhooks (#5), CLI Tool (#6)
**Total estimated effort:** 19 days (compressible to ~12 with parallelism)
**Created:** 2026-02-07

---

## Table of Contents

1. [Parallel Strategy Overview](#1-parallel-strategy-overview)
2. [Phase 0: Shared Foundation](#2-phase-0-shared-foundation)
3. [Stream A: Public API + API Keys](#3-stream-a-public-api--api-keys)
4. [Stream B: Webhooks](#4-stream-b-webhooks)
5. [Stream C: CLI Tool](#5-stream-c-cli-tool)
6. [File Ownership Matrix](#6-file-ownership-matrix)
7. [Migration Sequencing](#7-migration-sequencing)
8. [Integration Testing Plan](#8-integration-testing-plan)
9. [Merge Order & Conflict Resolution](#9-merge-order--conflict-resolution)

---

## 1. Parallel Strategy Overview

### The Problem

All three P2 features share dependencies:
- Webhooks depends on Public API's auth model and an event dispatch mechanism
- CLI depends on Public API's key authentication
- Both Webhooks and API Keys modify `schema.prisma`, `auth.ts`, `app.ts`, and frontend types

Naive parallel development would produce constant merge conflicts.

### The Solution

Extract all shared contracts into a **Phase 0 foundation** that completes first, then develop three independent streams that only create new files or append to isolated sections.

```
Phase 0: Shared Foundation (2 days)
  ├── Single Prisma migration (all 3 models)
  ├── Unified auth middleware (cookie + API key)
  ├── Typed event bus (for webhook dispatch)
  └── Shared TypeScript types + Zod schemas
        │
        ├── Stream A: Public API + API Keys (8 days) ──┐
        │     New files only: routes/api-keys.ts,      │
        │     openapi config, frontend API key UI       │
        │                                               ├─► Integration
        ├── Stream B: Webhooks (5 days) ────────────────┤   Tests
        │     New files only: routes/webhooks.ts,       │   (1 day)
        │     lib/webhookDispatch.ts, frontend UI       │
        │                                               │
        └── Stream C: CLI Tool (4 days) ────────────────┘
              Entirely separate package: cli/
```

### Compression Timeline

| Week 1         | Week 2                           |
|----------------|----------------------------------|
| Phase 0 (D1-2) | Streams A+B+C continue (D6-10)  |
| Streams A+B+C begin (D3-5) | Integration tests (D11-12) |

---

## 2. Phase 0: Shared Foundation

**Duration:** 2 days
**Must complete before any stream begins**

### 2.1 Database Migration (Single Migration)

Create one migration `add_api_keys_webhooks` containing all three models. This eliminates migration ordering conflicts entirely.

**File:** `backend/prisma/schema.prisma` (additions)

```prisma
// --- API Keys ---

model ApiKey {
  id         String    @id @default(uuid())
  name       String                            // human-readable label
  keyHash    String    @map("key_hash")        // SHA-256 of the raw key
  keyPrefix  String    @map("key_prefix")      // first 8 chars for identification
  scopes     String    @default("*")           // comma-separated: "*", "tasks:read", etc.
  lastUsedAt DateTime? @map("last_used_at")
  expiresAt  DateTime? @map("expires_at")
  revokedAt  DateTime? @map("revoked_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([keyHash])
  @@index([userId])
  @@map("api_keys")
}

// --- Webhooks ---

model Webhook {
  id        String   @id @default(uuid())
  url       String                               // delivery URL (HTTPS required in prod)
  secret    String                               // HMAC signing secret
  events    String                               // comma-separated: "task.created,task.updated"
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")

  userId    String  @map("user_id")
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId String? @map("project_id")           // null = all user's projects

  deliveries WebhookDelivery[]

  @@index([userId])
  @@index([projectId])
  @@map("webhooks")
}

model WebhookDelivery {
  id           String   @id @default(uuid())
  event        String                             // e.g. "task.created"
  payload      String   @db.Text                  // JSON stringified payload
  status       String   @default("pending")       // pending | success | failed
  statusCode   Int?     @map("status_code")       // HTTP response code
  responseBody String?  @map("response_body") @db.Text
  attempts     Int      @default(0)
  nextRetryAt  DateTime? @map("next_retry_at")
  completedAt  DateTime? @map("completed_at")
  createdAt    DateTime @default(now()) @map("created_at")

  webhookId String  @map("webhook_id")
  webhook   Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId])
  @@index([status, nextRetryAt])
  @@map("webhook_deliveries")
}
```

**User model additions** (add to existing `User` model relations):
```prisma
apiKeys    ApiKey[]
webhooks   Webhook[]
```

**New enum (not needed -- events stored as comma-separated strings for flexibility)**

### 2.2 Auth Middleware Enhancement

**File:** `backend/src/middleware/auth.ts`

Extend the existing `authenticate` middleware to support API key auth alongside cookie/JWT auth. This is the single most critical shared piece.

**Contract:**

```typescript
export interface AuthRequest extends Request {
  userId?: string;
  authSource?: 'cookie' | 'apikey';  // NEW: identifies auth method
  apiKeyId?: string;                  // NEW: for rate limiting & audit
}
```

**Logic change to `extractToken`:**

```
1. Check HTTP-only cookie (existing) → authSource = 'cookie'
2. Check X-API-Key header → look up by SHA-256 hash
   - If found, not revoked, not expired → set userId, apiKeyId, authSource = 'apikey'
   - If not found → 401
3. Fallback: Bearer header in dev (existing) → authSource = 'cookie'
```

**Important:** The API key lookup hits the database. Cache hot keys in a Map with 60s TTL to avoid per-request DB queries.

### 2.3 Event Bus

**New file:** `backend/src/lib/events.ts`

A typed in-process event emitter that existing route handlers emit into, and the webhook dispatcher subscribes to.

**Contract:**

```typescript
import { EventEmitter } from 'events';

// Typed event names
export type AppEventType =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'task.status_changed'
  | 'task.assigned'
  | 'comment.created'
  | 'comment.deleted'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'member.added'
  | 'member.removed';

export interface AppEvent {
  type: AppEventType;
  userId: string;       // who triggered it
  projectId: string;    // which project
  resourceId: string;   // task/comment/project ID
  data: Record<string, unknown>;  // event-specific payload
  timestamp: string;    // ISO 8601
}

class AppEventBus extends EventEmitter {
  emit(event: 'app.event', payload: AppEvent): boolean;
  on(event: 'app.event', listener: (payload: AppEvent) => void): this;
}

export const eventBus = new AppEventBus();
```

**Integration points** (add `eventBus.emit(...)` calls after mutations in):
- `routes/tasks.ts` -- task CRUD and status changes
- `routes/comments.ts` -- comment creation/deletion
- `routes/projects.ts` -- project CRUD and member management

These emit calls are non-blocking fire-and-forget. If no subscribers exist (webhooks feature not loaded), the events simply go unhandled -- zero overhead.

### 2.4 Shared Types & Validation

**File:** `frontend/src/types/index.ts` (append)

```typescript
// --- API Key ---
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface ApiKeyCreateResponse {
  apiKey: ApiKey;
  rawKey: string;  // only returned once at creation
}

// --- Webhook ---
export interface Webhook {
  id: string;
  url: string;
  events: string;     // comma-separated
  active: boolean;
  projectId: string | null;
  createdAt: string;
  _count?: { deliveries: number };
}

export interface WebhookDelivery {
  id: string;
  event: string;
  status: 'pending' | 'success' | 'failed';
  statusCode: number | null;
  attempts: number;
  createdAt: string;
  completedAt: string | null;
}
```

**File:** `backend/src/lib/validation.ts` (new shared Zod schemas)

```typescript
import { z } from 'zod';

// API Key schemas
export const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  scopes: z.string().default('*'),
  expiresAt: z.string().datetime().optional(),
});

// Webhook schemas
export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.string().min(1),        // "task.created,task.updated"
  projectId: z.string().uuid().optional(),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.string().min(1).optional(),
  active: z.boolean().optional(),
  projectId: z.string().uuid().nullable().optional(),
});
```

### 2.5 Phase 0 Deliverables Checklist

| # | Deliverable | File(s) | Tests |
|---|------------|---------|-------|
| 0.1 | Prisma migration with ApiKey, Webhook, WebhookDelivery models | `schema.prisma`, migration SQL | Migration applies cleanly |
| 0.2 | Dual-mode auth middleware (cookie + API key) | `middleware/auth.ts` | 6 tests: cookie still works, API key auth, revoked key rejected, expired key rejected, missing key 401, lastUsedAt updated |
| 0.3 | Event bus with typed events | `lib/events.ts` | 3 tests: emit/subscribe, typed payload, no-subscriber no-crash |
| 0.4 | Shared Zod schemas | `lib/validation.ts` | Validated by route tests |
| 0.5 | Frontend types | `types/index.ts` | Type-checked at build |

---

## 3. Stream A: Public API + API Keys

**Duration:** 8 days (after Phase 0)
**Owner:** Backend-heavy developer
**New files only** -- no modifications to Phase 0 outputs

### A.1 API Key Management Routes (2 days)

**New file:** `backend/src/routes/api-keys.ts`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/api-keys` | Generate new API key | Cookie only (not API key -- security) |
| GET | `/api/api-keys` | List user's keys (prefix only) | Cookie only |
| DELETE | `/api/api-keys/:id` | Revoke key (soft delete) | Cookie only |

**Key generation logic:**
1. Generate 32 random bytes → base64url encode → `tm_` prefix → raw key (e.g. `tm_a1b2c3d4...`)
2. SHA-256 hash the raw key → store `keyHash` in DB
3. Store first 8 chars as `keyPrefix` for display
4. Return raw key exactly once in the POST response

**Security constraints:**
- API key management endpoints accept **cookie auth only** (prevent key escalation)
- Raw key is never stored or logged
- Revoked keys return 401 immediately (checked in auth middleware from Phase 0)

**Tests (in `backend/tests/api-keys.test.ts`):**
1. Create key → returns raw key + prefix
2. List keys → shows prefix, never raw key
3. Revoke key → subsequent API calls with that key return 401
4. Auth with valid API key → 200
5. Auth with revoked key → 401
6. Auth with expired key → 401
7. Auth with malformed key → 401
8. lastUsedAt updates on successful auth
9. Cookie-only enforcement on management endpoints

### A.2 Per-Key Rate Limiting (1 day)

**New file:** `backend/src/middleware/apiRateLimit.ts`

Use `express-rate-limit` (already a dependency) with a custom key generator that uses `req.apiKeyId`.

```
Rate limit: 1000 requests per hour per API key
Response on exceed: 429 Too Many Requests
Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

**Application:** Mount on all `/api/*` routes, only active when `req.authSource === 'apikey'`. Cookie-authenticated requests (frontend) are not rate-limited by this middleware (existing auth limiter handles brute-force).

**Tests:**
1. Under limit → requests succeed
2. At limit → 429 response with correct headers
3. After window reset → requests succeed again
4. Cookie auth → not rate limited by this middleware

### A.3 OpenAPI Spec Generation (2 days)

**New dependencies:** `swagger-jsdoc`, `swagger-ui-express`

**New files:**
- `backend/src/lib/openapi.ts` -- OpenAPI 3.0 spec definition
- `backend/src/routes/docs.ts` -- Swagger UI route

**Approach:** Define spec programmatically (not JSDoc annotations -- cleaner for this codebase). Document all 63+ existing endpoints grouped by resource.

**Mount:** `GET /api/docs` serves Swagger UI, `GET /api/docs/spec.json` returns raw spec.

**Scope of documentation (by priority):**
1. Task CRUD + status (most used by integrations)
2. Project CRUD + members
3. Comments, Tags, Custom Fields
4. Time Entries, Recurring Tasks
5. Analytics, Export, Notifications
6. API Key management
7. Webhook management (added by Stream B)

**No auth required** for docs endpoint (public API documentation).

### A.4 Frontend: API Key Management UI (2 days)

**New files:**
- `frontend/src/pages/SettingsPage.tsx` -- tabbed settings page (replaces profile nesting)
- `frontend/src/components/ApiKeyManager.tsx` -- key CRUD component

**New route:** `/settings` (add to `App.tsx`, sidebar)

**UI components:**
- **Key list table:** Name, prefix (`tm_a1b2...`), created date, last used, status (active/revoked/expired)
- **Create dialog:** Name input, scope selector (future), expiry picker (optional), copy-key-once modal with warning
- **Revoke confirmation:** "This action cannot be undone" dialog
- **Empty state:** Explains what API keys are for, links to API docs

**API client additions** (`frontend/src/lib/api.ts`):
```typescript
export const apiKeysApi = {
  list:   () => request<ApiKey[]>('/api/api-keys'),
  create: (data: { name: string }) => request<ApiKeyCreateResponse>('/api/api-keys', { method: 'POST', body: JSON.stringify(data) }),
  revoke: (id: string) => request<void>(`/api/api-keys/${id}`, { method: 'DELETE' }),
};
```

### A.5 Tests Summary

| Test File | Count | Coverage |
|-----------|-------|----------|
| `api-keys.test.ts` | 9 | CRUD, auth, revocation, expiry |
| `api-rate-limit.test.ts` | 4 | Limits, headers, reset, cookie bypass |
| **Total** | **13** | |

---

## 4. Stream B: Webhooks

**Duration:** 5 days (after Phase 0)
**Owner:** Full-stack developer (backend dispatch + frontend UI)
**New files only** -- no modifications to Phase 0 outputs

### B.1 Webhook CRUD Routes (1 day)

**New file:** `backend/src/routes/webhooks.ts`

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/webhooks` | Register new webhook | Cookie or API key |
| GET | `/api/webhooks` | List user's webhooks | Cookie or API key |
| GET | `/api/webhooks/:id` | Get webhook details | Cookie or API key |
| PUT | `/api/webhooks/:id` | Update webhook | Cookie or API key |
| DELETE | `/api/webhooks/:id` | Delete webhook | Cookie or API key |
| GET | `/api/webhooks/:id/deliveries` | List delivery attempts | Cookie or API key |
| POST | `/api/webhooks/:id/test` | Send test delivery | Cookie or API key |

**Webhook creation:**
1. Validate URL is HTTPS (in production; allow HTTP in dev for localhost testing)
2. Generate random 32-byte secret → hex encode → store
3. Return secret once (like API keys)
4. Validate event names against `AppEventType` enum from Phase 0

### B.2 Dispatch System (2 days)

**New file:** `backend/src/lib/webhookDispatch.ts`

**Architecture:**

```
eventBus.on('app.event') → dispatcher
  │
  ├── Find matching webhooks (event type + projectId)
  ├── For each webhook:
  │     ├── Create WebhookDelivery record (status: pending)
  │     ├── POST to webhook.url with:
  │     │     Headers:
  │     │       Content-Type: application/json
  │     │       X-Webhook-Id: <webhook.id>
  │     │       X-Webhook-Event: <event.type>
  │     │       X-Signature-256: sha256=<HMAC-SHA256(payload, secret)>
  │     │       X-Delivery-Id: <delivery.id>
  │     │     Body: JSON event payload
  │     │
  │     ├── On 2xx → mark delivery success
  │     └── On failure → schedule retry
  │
  └── Retry logic:
        Attempt 1: immediate
        Attempt 2: +60 seconds
        Attempt 3: +300 seconds (5 min)
        After 3 failures → mark delivery failed, deactivate webhook if 10 consecutive failures
```

**HMAC signature generation:**
```typescript
import crypto from 'crypto';
const signature = crypto
  .createHmac('sha256', webhook.secret)
  .update(JSON.stringify(payload))
  .digest('hex');
// Header: X-Signature-256: sha256=<signature>
```

**Retry implementation:** Use `setTimeout` for in-process retries (no Redis/queue needed at this scale). On server restart, pick up pending deliveries with `nextRetryAt < now()` during startup.

**Delivery payload format:**
```json
{
  "id": "delivery-uuid",
  "event": "task.created",
  "timestamp": "2026-02-07T12:00:00Z",
  "data": {
    "task": { "id": "...", "title": "...", "status": "TODO", ... },
    "project": { "id": "...", "name": "..." },
    "triggeredBy": { "id": "...", "name": "..." }
  }
}
```

### B.3 Frontend: Webhook Management UI (1.5 days)

**New files:**
- `frontend/src/components/WebhookManager.tsx` -- webhook list + CRUD
- `frontend/src/components/WebhookDeliveryLog.tsx` -- delivery history viewer

**Integration:** Add as a tab in `SettingsPage.tsx` (created by Stream A). If Stream A is not yet merged, create the page; it will be trivially reconciled since both use a tab pattern.

**UI components:**
- **Webhook list:** URL (truncated), events (badges), status (active/inactive toggle), delivery stats
- **Create/edit dialog:** URL input, event multi-select checkboxes, project scope selector (optional), active toggle
- **Secret display:** Show-once modal after creation (same pattern as API keys)
- **Delivery log:** Table with event, status (color-coded), status code, timestamp, attempt count, expandable payload viewer
- **Test button:** Sends a `webhook.test` event to verify connectivity

**API client additions** (`frontend/src/lib/api.ts`):
```typescript
export const webhooksApi = {
  list:       () => request<Webhook[]>('/api/webhooks'),
  get:        (id: string) => request<Webhook>(`/api/webhooks/${id}`),
  create:     (data: CreateWebhookData) => request<{ webhook: Webhook; secret: string }>('/api/webhooks', { method: 'POST', body: JSON.stringify(data) }),
  update:     (id: string, data: UpdateWebhookData) => request<Webhook>(`/api/webhooks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:     (id: string) => request<void>(`/api/webhooks/${id}`, { method: 'DELETE' }),
  deliveries: (id: string) => request<WebhookDelivery[]>(`/api/webhooks/${id}/deliveries`),
  test:       (id: string) => request<WebhookDelivery>(`/api/webhooks/${id}/test`, { method: 'POST' }),
};
```

### B.4 Event Bus Integration (0.5 days)

Add `eventBus.emit(...)` calls to existing route handlers. These are **append-only** changes (add lines after existing mutation logic). Each is a one-liner:

**`routes/tasks.ts`:**
```typescript
// After task creation (line ~200):
eventBus.emit('app.event', { type: 'task.created', userId: req.userId, projectId: task.projectId, resourceId: task.id, data: { task }, timestamp: new Date().toISOString() });

// After task update, status change, deletion -- same pattern
```

**`routes/comments.ts`:** After comment creation/deletion
**`routes/projects.ts`:** After project CRUD and member changes

### B.5 Tests Summary

| Test File | Count | Coverage |
|-----------|-------|----------|
| `webhooks.test.ts` | 8 | CRUD, ownership, validation |
| `webhook-dispatch.test.ts` | 7 | Dispatch on event, HMAC signature, retry on failure, max attempts, delivery logging, selective events, project scoping |
| **Total** | **15** | |

---

## 5. Stream C: CLI Tool

**Duration:** 4 days (after Phase 0.2 -- only needs auth middleware)
**Owner:** Any developer (completely isolated package)
**Entirely new directory** -- zero conflict risk

### C.1 Package Setup (0.5 days)

**New directory:** `cli/` at project root

```
cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry point, commander setup
│   ├── commands/
│   │   ├── auth.ts       # login, logout, whoami
│   │   ├── tasks.ts      # create, list, update, status
│   │   └── completion.ts # shell completion generation
│   ├── lib/
│   │   ├── api.ts        # HTTP client (fetch-based)
│   │   ├── config.ts     # Config storage (~/.taskmanrc)
│   │   └── output.ts     # Formatted terminal output
│   └── types.ts          # Shared types (subset of frontend types)
├── tests/
│   ├── commands.test.ts
│   └── config.test.ts
└── bin/
    └── taskman.js        # Shebang entry
```

**package.json:**
```json
{
  "name": "taskman-cli",
  "version": "0.1.0",
  "bin": { "taskman": "./bin/taskman.js" },
  "dependencies": {
    "commander": "^12.0.0",
    "chalk": "^5.3.0",
    "inquirer": "^9.2.0",
    "conf": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  }
}
```

### C.2 Authentication Commands (0.5 days)

**`taskman login`**
1. Prompt: "Enter your API key:" (masked input)
2. Validate key by calling `GET /api/auth/me` with `X-API-Key` header
3. On success: store key + server URL in `~/.taskmanrc` (encrypted via `conf`)
4. On failure: "Invalid API key. Generate one at <app-url>/settings"

**`taskman logout`**
- Clear stored credentials

**`taskman whoami`**
- Display current user name, email, server URL

**`taskman config set <key> <value>`**
- Set server URL: `taskman config set server https://taskman.example.com`

### C.3 Task Commands (2 days)

**`taskman create <title>`**
```
Options:
  -p, --project <id|name>    Project (required)
  -P, --priority <level>     low|medium|high|urgent (default: medium)
  -d, --due <date>           Due date (ISO or natural: "tomorrow", "next friday")
  -a, --assignee <email>     Assign to user
  --description <text>       Task description

Output:
  Created task "Fix login bug" (ID: abc-123)
  Project: TaskMan | Priority: HIGH | Due: 2026-02-14
```

**`taskman list`**
```
Options:
  -p, --project <id|name>    Filter by project
  -s, --status <status>      Filter: todo|in_progress|in_review|done
  -P, --priority <level>     Filter by priority
  --mine                     Only tasks assigned to me
  --json                     Output as JSON (for piping)
  -l, --limit <n>            Max results (default: 20)

Output (table):
  ID        STATUS       PRIORITY  TITLE              DUE
  abc-123   IN_PROGRESS  HIGH      Fix login bug      2026-02-14
  def-456   TODO         MEDIUM    Add dark mode      --
  ...
```

**`taskman update <id>`**
```
Options:
  -t, --title <title>
  -s, --status <status>
  -P, --priority <level>
  -d, --due <date>
  -a, --assignee <email>
```

**`taskman done <id>`**
- Shorthand for `taskman update <id> --status done`

### C.4 Shell Completions (0.5 days)

**`taskman completion`**
- `taskman completion bash` -- output bash completion script
- `taskman completion zsh` -- output zsh completion script
- `taskman completion install` -- auto-detect shell and install

Uses commander's built-in completion generation.

### C.5 API Client (0.5 days)

**File:** `cli/src/lib/api.ts`

Thin HTTP client using Node's native `fetch` (Node 18+):
- Reads API key + server URL from config
- Sets `X-API-Key` header on all requests
- Handles pagination (follows `nextCursor`)
- Parses error responses into friendly messages
- Timeout: 10 seconds per request

### C.6 Tests Summary

| Test File | Count | Coverage |
|-----------|-------|----------|
| `commands.test.ts` | 8 | create, list, update, done, login, logout, whoami, error handling |
| `config.test.ts` | 4 | save, load, clear, server URL |
| **Total** | **12** | |

---

## 6. File Ownership Matrix

This matrix defines which phase/stream **creates or modifies** each file. Streams marked "read" only import from the file -- no modifications.

| File | Phase 0 | Stream A | Stream B | Stream C |
|------|---------|----------|----------|----------|
| `backend/prisma/schema.prisma` | **MODIFY** | -- | -- | -- |
| `backend/src/middleware/auth.ts` | **MODIFY** | read | read | -- |
| `backend/src/lib/events.ts` | **CREATE** | -- | read | -- |
| `backend/src/lib/validation.ts` | **CREATE** | read | read | -- |
| `backend/src/app.ts` | -- | **ADD mount** | **ADD mount** | -- |
| `backend/src/routes/api-keys.ts` | -- | **CREATE** | -- | -- |
| `backend/src/routes/webhooks.ts` | -- | -- | **CREATE** | -- |
| `backend/src/routes/docs.ts` | -- | **CREATE** | -- | -- |
| `backend/src/lib/openapi.ts` | -- | **CREATE** | -- | -- |
| `backend/src/lib/webhookDispatch.ts` | -- | -- | **CREATE** | -- |
| `backend/src/middleware/apiRateLimit.ts` | -- | **CREATE** | -- | -- |
| `backend/routes/tasks.ts` | -- | -- | **APPEND** (emit) | -- |
| `backend/routes/comments.ts` | -- | -- | **APPEND** (emit) | -- |
| `backend/routes/projects.ts` | -- | -- | **APPEND** (emit) | -- |
| `frontend/src/types/index.ts` | **APPEND** | -- | -- | -- |
| `frontend/src/lib/api.ts` | -- | **APPEND** | **APPEND** | -- |
| `frontend/src/pages/SettingsPage.tsx` | -- | **CREATE** | **ADD tab** | -- |
| `frontend/src/components/ApiKeyManager.tsx` | -- | **CREATE** | -- | -- |
| `frontend/src/components/WebhookManager.tsx` | -- | -- | **CREATE** | -- |
| `frontend/src/components/WebhookDeliveryLog.tsx` | -- | -- | **CREATE** | -- |
| `frontend/src/App.tsx` | -- | **ADD route** | -- | -- |
| `cli/*` (entire directory) | -- | -- | -- | **CREATE** |

### Conflict Risk Analysis

| Risk | Files | Mitigation |
|------|-------|------------|
| **LOW** | `app.ts` -- both A and B add route mounts | Each adds a single `app.use()` line. Trivial 3-way merge. |
| **LOW** | `frontend/src/lib/api.ts` -- both A and B append | Each appends an independent `export const xxxApi` block at different positions. |
| **NONE** | `SettingsPage.tsx` -- A creates, B adds tab | B adds a tab component to A's page. If A hasn't merged yet, B creates its own page (reconciled later). |
| **NONE** | All other files | Either created by one stream only, or not modified after Phase 0. |

---

## 7. Migration Sequencing

### Single Migration Strategy

Phase 0 produces **one** Prisma migration that adds all models:

```
backend/prisma/migrations/
  └── 20260207000000_add_api_keys_webhooks/
        └── migration.sql
```

**Why one migration?** Multiple migrations created on parallel branches will have conflicting timestamps and migration history checksums. A single migration in Phase 0 eliminates this entirely.

**The migration must be applied before any stream begins development.** All streams then work against the same schema.

### If a stream needs schema changes after Phase 0

If a stream discovers it needs a model change during development:
1. Coordinate with other streams before modifying `schema.prisma`
2. Create the migration on a dedicated `schema-update-<feature>` branch
3. All streams rebase onto that branch before continuing
4. This should be rare -- Phase 0 defines the complete schema upfront

---

## 8. Integration Testing Plan

After all three streams merge, run a cross-cutting integration test suite.

**New file:** `backend/tests/integration/developer-platform.test.ts`

### Test Scenarios

| # | Scenario | Streams |
|---|----------|---------|
| 1 | Create API key → use key to create task → webhook fires for task.created | A + B |
| 2 | Create API key → CLI login with key → CLI create task → webhook fires | A + B + C |
| 3 | Revoke API key → CLI commands fail with 401 | A + C |
| 4 | API key rate limit → 429 after threshold → webhook deliveries not affected (internal) | A + B |
| 5 | Create webhook → create task via API key → verify HMAC signature in delivery | A + B |
| 6 | Deactivate webhook → create task → no delivery created | B |
| 7 | Webhook retry → mock failing endpoint → verify 3 attempts with backoff | B |
| 8 | OpenAPI spec → verify all new endpoints documented | A |

---

## 9. Merge Order & Conflict Resolution

### Recommended Merge Sequence

```
1. Phase 0 → main          (foundation, no conflicts possible)
2. Stream C → main          (entirely new directory, zero conflicts)
3. Stream A → main          (new files + minor app.ts change)
4. Stream B → main          (new files + event emit appends + app.ts line)
   └── Rebase onto Stream A's SettingsPage before merging
5. Integration tests → main (final validation)
```

### Why This Order?

- **Stream C first:** Zero file overlap with anything. Clean merge always.
- **Stream A before B:** Stream B's SettingsPage tab needs Stream A's SettingsPage to exist. Merging A first means B can cleanly add its tab.
- **Integration tests last:** Can only run when all three are merged.

### Handling Conflicts in `app.ts`

Both Stream A and Stream B add route mounts. The final `app.ts` should have:

```typescript
// Existing routes...
app.use('/api/attachments', attachmentRoutes);

// New routes (P2: Developer Platform)
app.use('/api/api-keys', apiKeyRoutes);     // Stream A
app.use('/api/webhooks', webhookRoutes);     // Stream B
app.use('/api/docs', docsRoutes);            // Stream A
```

This is a trivial conflict resolved by keeping both additions.

### Handling Conflicts in `frontend/src/lib/api.ts`

Both streams append API client methods. Final file has both:

```typescript
// ... existing exports ...

export const apiKeysApi = { ... };   // Stream A
export const webhooksApi = { ... };  // Stream B
```

No overlap -- each adds an independent export block.

---

## Appendix A: Environment Variables

New variables required (add to `.env.example`):

```bash
# Public API (Stream A)
API_KEY_HASH_SECRET=random-secret-for-key-generation   # Optional: extra entropy

# Webhooks (Stream B)
WEBHOOK_TIMEOUT_MS=10000         # HTTP timeout for webhook delivery (default: 10s)
WEBHOOK_MAX_RETRIES=3            # Max retry attempts (default: 3)
WEBHOOK_RETRY_BACKOFF=60         # Initial retry delay in seconds (default: 60)
```

## Appendix B: Dependencies to Install

### Phase 0
None -- all deps already present (crypto is built-in Node).

### Stream A
```bash
cd backend && npm install swagger-jsdoc swagger-ui-express
cd backend && npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

### Stream B
None -- uses built-in `crypto` and `fetch` (Node 18+).

### Stream C
```bash
cd cli && npm init -y
npm install commander chalk inquirer conf
npm install -D typescript vitest @types/node
```

## Appendix C: Task Dependency with P1

**P1: Smart Task Dependencies** is independent of all P2 work. It touches:
- `schema.prisma` (adds `TaskDependency` model)
- `routes/tasks.ts` (adds dependency endpoints)
- New frontend components for Gantt view

**Conflict risk with P2:** LOW
- Schema: different models, different migration
- Routes: P1 adds endpoints to `tasks.ts`, P2 Stream B appends event emits to `tasks.ts` -- different sections
- Frontend: completely different components

**Recommendation:** P1 and P2 Phase 0 migrations should be created on the same branch or sequenced (P1 first, then P2) to avoid migration history conflicts. If developed truly in parallel, coordinate migration timestamps.

---

**End of P2 Development Roadmap**
