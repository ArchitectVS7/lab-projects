# TaskMan — Product Requirements Document

> **Status:** Active
> **Version:** 2.0
> **Last Updated:** 2026-03-07
> **Author:** VS7
> **Architecture:** [docs/architecture.md](./architecture.md)

---

## Overview

TaskMan is a full-stack task management platform that transforms productivity through **gamification, collaboration, and AI-driven delegation**. The system combines a powerful task model (dependencies, recurring tasks, time tracking, custom fields) with an RPG-like progression system (XP, achievements, quests, streaks) and intelligent automation (AI agents, calendar sync, webhook integrations).

**Core thesis:** Productivity tools fail when they become busywork. TaskMan rewards *actual completion* and *habit formation*, not data entry. Every feature must either help users finish work or celebrate the work they've finished.

### Target Users

- **Individual knowledge workers** — prioritize, track time, stay in "flow"
- **Small teams** — share projects, delegate, track dependencies and blockers
- **Habit builders** — daily check-ins, streak tracking, domain-specific progress
- **Process-driven orgs** — webhooks, API keys, custom fields, recurring workflows

---

## Goals

1. **Radically simplify task management** — no friction between thought and action (natural language parsing, quick-add shortcuts, keystroke navigation)

2. **Make productivity a game, not a chore** — XP systems, achievement hunts, level progression, and celebration mechanics that drive *daily* usage

3. **Enable asynchronous collaboration** — comments, mentions, notifications, and activity logs that replace status meeting spam

4. **Automate the repetitive** — recurring tasks, AI delegation, calendar sync, webhooks, so humans focus on novel work

5. **Accommodate all work styles** — Kanban, Table, Calendar, Week View, and Focus Mode let teams work their way

6. **Make data portable and extensible** — API keys, webhooks, custom fields, and a comprehensive activity audit trail

---

## Non-Goals

- Real-time video collaboration or screen-sharing (external tools exist for this)
- Time zone and localization complexity beyond English language support and UTC timestamps
- Mobile-native apps (responsive web is sufficient; browser-based)
- Unlimited custom fields or schema design by end-users (structured models only)
- On-premises deployment (cloud-first, Stripe billing required for Pro/Team)
- Calendar view for past tasks (calendar shows *future* only; archive is historical)

---

## Requirements

### Phase 1: Core Task Management (Complete ✅)

#### Task Model
- [ ] Title (required), description (Markdown), status (To Do, In Progress, In Review, Done)
- [ ] Priority (Low, Medium, High, Urgent) with XP multipliers
- [ ] Due date (with overdue flagging and notifications)
- [ ] Assignee (single, with notification on assignment)
- [ ] Tags (project-scoped, reusable, multi-select)
- [ ] Task dependencies (blocking relationships with visual graph)
- [ ] Recurring tasks (daily, weekly, monthly with configurable rules)
- [ ] Time tracking (start/stop, manual duration entry, logged by assignee)
- [ ] Comments (threaded, Markdown, @mentions with notifications)
- [ ] Custom fields (per-project, type-gated: DROPDOWN, TEXT, NUMBER, DATE)
- [ ] Attachments (file upload, limit per plan tier)
- [ ] Activity log (audit trail: who, what, when, old→new value)

#### Domains
- [ ] User-scoped areas of life/work (e.g., Coding, Health, Finance)
- [ ] 5 auto-seeded defaults on first fetch
- [ ] Domain-scoped XP tracking and streaks
- [ ] Task → Domain linkage (task can have multiple domains)
- [ ] Domain-specific achievements and progress visualization

#### Projects & Collaboration
- [ ] Project creation with owner and team members
- [ ] Role-based access control: OWNER > ADMIN > MEMBER > VIEWER
- [ ] Project membership management with role changes
- [ ] Project-level notifications (team activity, comment mentions)
- [ ] Shared task context, shared tags, shared custom fields

#### Views
- [ ] **Kanban** — drag-to-status swimlanes, filterable by assignee/tag/domain
- [ ] **Table** — sortable columns, inline editing, column visibility toggle
- [ ] **Calendar** — month/week grid, click to create, drag to reschedule
- [ ] **Week View** — 7-day grid with hourly time entry blocks
- [ ] **Focus Mode** — distraction-free single-task focus, keyboard shortcuts, XP feedback

#### Notifications
- [ ] In-app toast notifications (task assignment, comment mentions, overdue, achievements)
- [ ] Email digest (daily, weekly, configurable per user)
- [ ] Mention notifications with @-syntax
- [ ] Overdue warnings (24h, 1h before, on day of)
- [ ] Team activity summary (opt-in, shows recent completions)

---

### Phase 2: Gamification System (Complete ✅)

#### XP & Levels
- [ ] XP awards on task completion, scaled by priority and domain streak bonuses
- [ ] Level progression (1→100+, logarithmic curve, exponential XP cost)
- [ ] Visual progress bar to next level with remaining XP display
- [ ] Celebration animations: confetti, XP number slide, achievement pop-up
- [ ] Level-up modal with reward preview
- [ ] XP leaderboard per project (opt-in, public within team)

#### Achievements
- [ ] Achievement catalog (50+) with rarity tiers: Common, Rare, Epic, Legendary
- [ ] Unlock conditions: task count, streak length, time tracking milestones, speed, planning
- [ ] Notification and replay on unlock with rarity-appropriate celebration
- [ ] Achievement gallery with earned/locked status and progress toward locked
- [ ] Badge display on profile

#### Streaks
- [ ] Daily completion streak (resets on missed day, with 1-day grace window)
- [ ] Domain-specific streaks (tasks completed in that domain)
- [ ] Streak protection (once per week, re-roll a missed day with no cost)
- [ ] Streak notifications (morning motivation, evening "at risk" warning)
- [ ] Streak milestones unlock special achievements

#### Quests
- [ ] **Daily Quests** — 2–3 per day, revealed at login, examples: "Complete 5 tasks", "Finish a high-priority task", "Try time tracking"
- [ ] **Weekly Quests** — larger goals, e.g., "Master the Week View", "Complete 30 tasks", "Recruit a team member"
- [ ] **Character Quests** — one-time narrative-driven challenges tied to feature discovery
- [ ] Quest progress visualization and completion rewards (bonus XP)

#### Skills & Specialization
- [ ] Skill tree UI showing unlockable abilities (requires level milestones)
- [ ] Examples: "Time Tracking Pro" (+5% XP on time-logged tasks), "Delegation Master" (AI agents cost less)
- [ ] Permanent unlocks once purchased with in-game currency (earned via quests)

---

### Phase 3: Daily Check-In & Habits (Complete ✅)

#### Daily Check-In
- [ ] Morning ritual: "What are your top 3 priorities today?"
- [ ] Energy level self-report (1-10 scale, tracked over time)
- [ ] Blockers/notes for team transparency
- [ ] Domain focus selection (which areas will you work on today?)
- [ ] Streak animation on completion
- [ ] Evening recap: "How did today go?" — tone, energy, accomplishments summary
- [ ] Check-in history with trends and productivity insights

#### Analytics Dashboard
- [ ] Productivity summary (tasks completed, time tracked, XP earned, current streak)
- [ ] AI-generated insights: "You're most productive on Tuesdays" or "Blocking tasks hurt your flow"
- [ ] Domain breakdown (XP and streaks by domain, visual stacked bar)
- [ ] Team insights (who's been shipping, blockers, overdue count)
- [ ] Export check-in history (CSV)

---

### Phase 4: AI Features (Complete ✅)

#### AI Agent Delegation
- [ ] Natural language input: "Fix the login bug" → agent understands intent
- [ ] Queue UI with agent status: QUEUED → IN_PROGRESS → COMPLETED/FAILED
- [ ] Agent delegations: rewritable subtasks, research, code review suggestions
- [ ] Agent status notifications (per-task real-time via WebSocket)
- [ ] Cost model: PRO tier gets N free delegations/month, TEAM tier gets more
- [ ] Fallback on API/auth failure: task marked FAILED with error message displayed in queue UI; user can retry via "Retry" button; failed delegations do not count against monthly quota; if Claude API is unreachable after 3 attempts with exponential backoff (2s, 4s, 8s), delegation permanently marked FAILED with `failureReason` stored for support diagnosis

#### AI Agent Scope and Limitations

Agents operate as an **advisory and draft-generation layer only** — they do not take autonomous actions on external systems. Specifically:

| Capability | Supported | Notes |
|------------|-----------|-------|
| Subtask decomposition | Yes | Agent proposes subtasks; user must approve before creation |
| Research summarization | Yes | Agent retrieves context from task history and linked comments |
| Code review suggestions | Yes | Draft feedback on code snippets pasted into the task description |
| Writing draft descriptions | Yes | Agent rewrites vague task descriptions into structured acceptance criteria |
| Direct file or codebase access | No | Agent has no external tool calls; operates on task data only |
| Autonomous task status changes | No | Agent cannot mark tasks complete; changes require explicit user action |
| Sending notifications on behalf of user | No | Agents cannot @mention or email team members |
| Integrating with external APIs | No | No OAuth tokens or secrets are accessible to agents |

The agent receives: the task title, description, comments, assignee, priority, and project context (up to 15 most recent activity log entries). It does not receive: user credentials, API keys, file attachments, or data from other users' tasks outside the project.

#### AI Insights
- [ ] Daily/weekly summarization of productivity patterns
- [ ] Streak predictions: "Keep going — you're 2 days from a milestone"
- [ ] Task recommendations: "Based on your focus domains today, try this task next"
- [ ] Team capacity planning: "Team is overloaded; consider deferring low-priority items"

---

### Phase 5: Integrations (Complete ✅)

#### Calendar Sync
- [ ] One-way sync: Outlook, Google Calendar, Apple Calendar
- [ ] Pull due dates from calendar into TaskMan
- [ ] Pull TaskMan tasks back to user's calendar
- [ ] Auth via OAuth2 (Microsoft, Google, Apple per provider)
- [ ] Automatic sync every 6 hours or on-demand refresh
- [ ] Conflict resolution: calendar wins on date conflicts

#### Webhooks
- [ ] Project-level webhook subscriptions (PRO+ feature)
- [ ] Events: `task.created`, `task.updated`, `task.completed`, `task.deleted`, `comment.added`, `project_member.added`, `project_member.removed`, `agent_delegation.completed`, `agent_delegation.failed`
- [ ] Webhook payload with full task context and change delta
- [ ] Delivery retry logic (exponential backoff: 10s, 30s, 2m, 10m, 30m — max 5 retries over ~43 minutes)
- [ ] Delivery log with success/failure status, HTTP response code, response body (truncated at 2KB), and timestamps
- [ ] IP whitelisting option for enterprise users
- [ ] Webhook secret (HMAC-SHA256 signature in `X-TaskMan-Signature` header) for payload verification
- [ ] Configurable per-event filtering: subscribers select which event types they receive

**Payload schema** (all events share this envelope):

```json
{
  "event": "task.completed",
  "timestamp": "2026-03-07T14:23:00Z",
  "project_id": "proj_...",
  "actor": { "id": "usr_...", "name": "Jordan" },
  "data": {
    "task": { "id": "task_...", "title": "...", "status": "Done", "priority": "High" },
    "changes": { "status": { "from": "In Progress", "to": "Done" } }
  }
}
```

Fields present in `data` vary by event type; `changes` is omitted for `task.created` and `task.deleted`.

#### API Keys
- [ ] User-generated API keys with scopes (READ_TASKS, WRITE_TASKS, READ_PROJECTS, etc.)
- [ ] Rate limiting per key: 10 req/sec per user
- [ ] Token rotation and revocation
- [ ] API documentation with curl/JS/Python examples
- [ ] Audit log entry for all API calls (via X-Request-ID)

---

### Phase 6: Planning & Time Blocking (Complete ✅)

#### Time Tracking
- [ ] Start/stop timer on tasks with elapsed time display
- [ ] Manual duration entry (ISO format: 2h 30m)
- [ ] Time-log history per task (who worked, when, how long)
- [ ] Billable/non-billable flag per time entry
- [ ] Weekly time report (total by project, by domain)
- [ ] Estimates vs. actuals (show estimate vs. time logged)

#### Recurring & Batch Operations
- [ ] Bulk status changes (select multiple tasks → update status for all)
- [ ] Bulk tag assignment/removal
- [ ] Bulk priority changes
- [ ] Bulk assign to team member
- [ ] Bulk duplicate/clone tasks with date offset

---

### Phase 7: Billing & Plans (Complete ✅)

#### Plans
| Feature | Free | Pro | Team |
|---------|------|-----|------|
| Projects | 1 | 5 | Unlimited |
| Team size | 1 | 5 | 20 |
| Custom fields | 0 | 10 per project | 20 per project |
| AI delegations | 0 | 10/month | 50/month |
| API keys | No | 3 | 10 |
| Webhooks | No | 2 per project | 10 per project |
| Attachments | No | 500MB/mo | 2GB/mo |
| Billing cycle | N/A | Monthly / Annual | Monthly / Annual |

#### Billing Features
- [ ] Stripe integration (checkout, customer portal, webhooks)
- [ ] Invoice history and PDF download
- [ ] Subscription management (upgrade, downgrade, cancel)
- [ ] Seats-based pricing for Team (add/remove members, prorated charges)
- [ ] Annual discount (20% off monthly rate)
- [ ] Free trial: 14 days for Pro/Team with credit card
- [ ] Failed payment retry (3 retries over 5 days, then cancel)

---

### Phase 8: Authentication & Security (Complete ✅)

#### Authentication
- [ ] Email/password sign-up with 12-char password, special character required
- [ ] JWT tokens in HTTP-only, Secure, SameSite=Lax cookies (7-day expiry)
- [ ] Forgot password flow with email verification link (1-hour expiry)
- [ ] API key authentication via `X-API-Key` header with `taskman_` prefix
- [ ] Bearer token fallback for mobile/cross-origin (Authorization header)

#### Security Measures
- [ ] Hash API keys with SHA-256 before DB storage
- [ ] Per-user rate limiter: 300 req/min for authenticated sessions
- [ ] Auth endpoints rate limited: 10 attempts per 15 minutes
- [ ] CSRF token in form submissions (Next.js style)
- [ ] XSS protection: React JSX escaping, no `dangerouslySetInnerHTML`
- [ ] SQL injection prevention: parameterized queries via Prisma
- [ ] SSRF prevention: block loopback IPs in webhook URLs
- [ ] Enum-based authorization (OWNER > ADMIN > MEMBER > VIEWER, enforced per route)

#### Audit & Compliance
- [ ] Activity log for all mutations (task changes, member changes, API calls)
- [ ] Structured logging: user, action, resource, timestamp, old→new values
- [ ] Webhook delivery log with request/response bodies
- [ ] 180-day retention on activity logs, 90-day on webhook logs
- [ ] GDPR data export endpoint (JSON dump of all user data)
- [ ] Account deletion with 30-day grace period

---

## Data Model Summary

The full Prisma schema lives in `backend/prisma/schema.prisma` and is documented in [docs/architecture.md](./architecture.md). The 28 core models are grouped below for quick reference.

| Group | Models | Notes |
|-------|--------|-------|
| **Identity** | `User`, `ApiKey` | Users own projects; API keys scoped per user |
| **Projects** | `Project`, `ProjectMember` | Role: OWNER > ADMIN > MEMBER > VIEWER |
| **Tasks** | `Task`, `TaskDependency`, `RecurringTask`, `TaskTag`, `Tag`, `Attachment`, `CustomFieldDefinition`, `CustomFieldValue`, `TimeEntry`, `Comment`, `ActivityLog` | Core entity group |
| **Gamification** | `Achievement`, `UserAchievement`, `UserQuest`, `UserSkill`, `XPLog`, `StreakProtectionLog`, `Domain`, `TaskDomain` | XP, quests, streaks, skills, domains |
| **Check-ins** | `DailyCheckin` | One record per user per day |
| **AI** | `AgentDelegation` | Status: QUEUED → IN_PROGRESS → COMPLETED / FAILED |
| **Notifications** | `Notification` | In-app; email via Resend |
| **Integrations** | `Webhook`, `WebhookLog` | Per-project, PRO+ |
| **Billing** | Stripe-managed; `User.plan` (FREE / PRO / TEAM) | No billing model in Prisma; Stripe is source of truth |

Key field conventions: all PKs are `cuid()`; all timestamps are UTC; `ActivityLog` records carry `userId`, `taskId`, `action`, `field`, `oldValue`, `newValue`. See architecture.md for full field-level documentation and index strategy.

---

## Pricing Tiers

| Feature | Free | Pro ($12/mo or $115/yr) | Team ($29/seat/mo or $278/seat/yr) |
|---------|------|--------------------------|-------------------------------------|
| Projects | 1 | 5 | Unlimited |
| Team members per project | 1 (solo) | Up to 5 | Up to 20 per project |
| Custom fields | 0 | 10 per project | 20 per project |
| AI agent delegations | 0 | 10 / month | 50 / month (pooled per team) |
| API keys | 0 | 3 | 10 |
| Webhooks | 0 | 2 per project | 10 per project |
| File attachments | 0 | 500 MB / month | 2 GB / month |
| Calendar sync | Google only (read) | Google + Outlook + Apple | Google + Outlook + Apple (bidirectional in v2.1) |
| Priority support | No | Email | Dedicated Slack channel |
| Annual discount | N/A | 20% (pay $115 vs $144) | 20% (pay $278 vs $348 per seat) |
| Free trial | 14-day Pro trial (no card required for first 7 days) | — | 14-day Team trial |
| Seat billing | N/A | N/A | Prorated on add/remove; billed monthly |

**Plan enforcement:** Enforced at the route layer via `requirePlan()` and `requireQuota()` middleware (see `backend/src/middleware/`). Attempting a gated action as a Free user returns HTTP 402 with an upgrade prompt payload.

---

## Performance and Scalability Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| API p95 response time | < 300 ms | For reads (GET /tasks, GET /projects) |
| API p95 response time | < 500 ms | For writes (task create, status update) |
| Concurrent authenticated users | 500 simultaneous | Single Railway instance; horizontal scaling at 1,000+ |
| Tasks per project | Up to 10,000 | Pagination required beyond 200 per list response |
| WebSocket connections | 500 concurrent | Socket.io with sticky sessions |
| Webhook delivery throughput | 100 events/minute per project | Queued via in-process job; Redis queue at scale |
| Rate limits (API keys) | 10 req/sec per key, 300 req/min per session | Enforced via token bucket middleware |
| Database connection pool | 10 connections (Prisma default) | Increase to 20 at 200+ concurrent users |
| Email (Resend) | Daily digest: < 5 min latency; transactional: < 30 sec | Via Resend webhooks for delivery status |

**Scaling strategy:** Railway auto-deploy with horizontal scaling triggers at 80% CPU or 500+ concurrent WebSocket connections. PostgreSQL remains single-instance with read replicas added at 1,000+ DAU.

---

## Security and Compliance

### Data Encryption

- **At rest:** PostgreSQL data encrypted at rest by Railway (AES-256). File attachments stored with provider-level encryption.
- **In transit:** TLS 1.2+ enforced on all connections; HSTS header set on production.
- **API keys:** Stored as SHA-256 hashes; plaintext shown only once at creation.
- **Passwords:** bcrypt with cost factor 12.

### GDPR

- Users may request a full data export (JSON) via the account settings page — export generated within 24 hours.
- Account deletion removes all personal data within 30 days (grace period allows recovery); task content created in shared projects is anonymised (author set to "Deleted User").
- Data processing agreement (DPA) available to Team plan customers on request.
- No personal data transferred outside EU/EEA unless user selects a non-EU deployment region (not offered in v1).

### SOC 2 Readiness

- Activity logs retained 180 days; webhook delivery logs retained 90 days.
- All mutations recorded in `ActivityLog` with actor, resource, action, and old/new values.
- Access control (OWNER > ADMIN > MEMBER > VIEWER) enforced at route layer with unit tests per role.
- Structured logging shipped to Railway Log Drain for external SIEM ingestion.
- SOC 2 Type II audit targeted for Year 2 (post 1,000 Team plan customers).

---

## Mobile Responsiveness

TaskMan is a **responsive web application** targeting browser-based use on mobile devices. No native app exists in v1.

| Breakpoint | Viewport | Adaptations |
|------------|----------|-------------|
| `xs` | < 480 px | Single-column layout; sidebar hidden behind hamburger; Kanban shows one column at a time |
| `sm` | 480–767 px | Two-column Kanban; table view scrolls horizontally; focus mode full-screen |
| `md` | 768–1023 px | Three-column Kanban; sidebar collapsible; calendar shows week view by default |
| `lg` | 1024–1279 px | Full sidebar; all views available |
| `xl` | ≥ 1280 px | Wide layout with optional two-pane task detail |

**Touch targets:** All interactive elements ≥ 44×44 px. Drag-to-status in Kanban uses `dnd-kit` with pointer and touch event support. Quick-add command palette accessible via floating action button on mobile (replacing keyboard shortcut).

**Testing targets:** Chrome on iOS 16+ Safari, Android Chrome 110+. Minimum tested device: iPhone SE (375 px wide), Samsung Galaxy A-series (360 px wide).

---

## Rollout and Migration Strategy

### New User Onboarding

- On first login, users are shown a 3-step guided tour (dismissible): create first project, add first task, complete it for XP.
- Default domain set ("Work") pre-created; 5 domains total seeded on first `/api/domains` fetch.
- Free trial of Pro automatically activated for 14 days; no credit card required for the first 7 days.

### Existing User Data Import

TaskMan supports bulk import for users migrating from other tools:

| Source | Format | Mechanism |
|--------|--------|-----------|
| CSV (any tool) | `.csv` with columns: title, description, status, priority, due_date, tags | `/api/import/csv` endpoint; field mapping UI |
| Todoist | JSON export | `/api/import/todoist` — maps projects, tasks, labels, due dates |
| Linear | CSV export | `/api/import/linear` — maps teams → projects, states → statuses |
| Asana | CSV export | `/api/import/asana` — maps sections → projects, assignees matched by email |

Import behavior: duplicate detection by title+project (warns, does not auto-merge). Attachments not imported. Time entries not imported. Import creates an `ActivityLog` entry of type `IMPORT` with source and item count.

### Plan Downgrades

When a Team plan downgrades to Pro or Free, excess resources are not deleted immediately. Users receive a 14-day grace period to reduce usage (archive projects, remove members, delete webhooks). After the grace period, the system auto-archives excess projects (oldest first) and deactivates excess webhooks. Archived projects remain readable but not editable.

---

## User Stories

### Individual Knowledge Worker (Jordan, 29)

- **As a** developer, **I want** to quick-add tasks from a command palette without leaving my flow, **so that** capturing ideas takes under 5 seconds and never interrupts my work.
- **As a** remote worker, **I want** to log time against tasks with a one-click timer, **so that** I can produce accurate weekly reports without reconstructing my day from memory.
- **As a** habit builder, **I want** a morning check-in that asks my top 3 priorities and my energy level, **so that** I build a daily ritual and can see patterns in my productivity over time.
- **As a** knowledge worker, **I want** to see AI-generated productivity insights ("You're most productive on Tuesdays"), **so that** I can schedule deep work around my personal rhythms.

### Small Team Lead (Priya, 38)

- **As a** team lead, **I want** to assign tasks and see who's blocked at a glance in a Kanban view, **so that** I can run async standups instead of daily meetings.
- **As a** project manager, **I want** task dependencies with a visual graph, **so that** blockers surface automatically and I'm never surprised by downstream delays.
- **As a** team organizer, **I want** @mention comments that fire notifications, **so that** team communication stays in context on the task rather than scattered across Slack.
- **As a** lead, **I want** an XP leaderboard for completed tasks per project, **so that** shipping effort gets celebrated and the team has a healthy bit of competition.

### Habit Builder (Marcus, 44)

- **As a** habit builder, **I want** domain-specific XP and streaks (e.g., "Health" domain), **so that** I can track consistent progress in distinct areas of my life, not just total tasks.
- **As a** streak-motivated user, **I want** a once-per-week streak protection, **so that** a single missed day doesn't reset months of progress.
- **As a** quest completionist, **I want** daily and weekly quests with bonus XP, **so that** I have a fresh reason to open the app every day even when my backlog is clear.

### Power User / Process-Driven Organization

- **As a** power user, **I want** webhook integrations with custom payloads on task.created and task.completed, **so that** I can pipe TaskMan events into my team's internal tooling without manual polling.
- **As an** admin, **I want** role-based access control (OWNER > ADMIN > MEMBER > VIEWER) enforced at the route level, **so that** junior team members cannot accidentally delete or reassign tasks outside their scope.
- **As a** developer, **I want** user-generated API keys with scopes, **so that** I can automate task creation from CI/CD pipelines without sharing my personal credentials.

---

## Testing

### Strategy

TaskMan's test suite treats **production behavior as the specification**. Every route and service is tested against a real database (PostgreSQL test instance) to catch ORM edge cases, constraint violations, and transaction rollbacks that unit mocks cannot surface.

| Dimension | Approach |
|-----------|----------|
| **Backend API** | Jest + Supertest — HTTP round-trips against `taskapp_test` DB |
| **Frontend components** | Vitest + React Testing Library — component behavior, not DOM snapshots |
| **End-to-end** | Not in CI currently; manual pre-release regression pass |
| **Performance** | Manual load check; automated threshold gating is a v2 item |

### Test Database Setup

```bash
# Start PostgreSQL via Docker
docker compose up -d postgres

# Create the test database (once)
psql -U taskapp -c "CREATE DATABASE taskapp_test;"

# Deploy migrations to test DB
DATABASE_URL=postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test \
  npx prisma migrate deploy

# Run backend tests
cd backend && npm test
```

### Coverage Targets

| Area | Current | Target |
|------|---------|--------|
| Backend routes | ~440 tests / 24 suites | ≥ 90% route coverage |
| Frontend components | Vitest (Zustand stores, API hooks) | ≥ 80% |
| Gamification (XP, quests, streaks) | Full suite in `gamification.test.ts` | 100% happy path + all edge cases |
| Auth & security | `auth.test.ts`, rate-limiting integration tests | 100% auth flows |

### Critical Test Contracts

1. **XP is never awarded without task completion** — no side-effectful XP leaks.
2. **Role enforcement is tested at the route layer**, not just the middleware unit — every OWNER-only route must have a MEMBER-tries-it test.
3. **Stripe webhook tests use the raw body** — processed with `express.raw()`, not `express.json()`.
4. **Recurring task generation is idempotent** — running the scheduler twice produces the same set of open tasks, not duplicates.
5. **All `ActivityLog` entries are verified** — mutations on tasks, members, and API calls each assert a log row exists with correct `oldValue`/`newValue`.

---

## Tech Stack

| Layer | Technologies |
|-------|---|
| **Frontend** | React 18, TypeScript, Vite, Zustand, TanStack Query, React Router, Tailwind CSS, Framer Motion, Socket.io-client, dnd-kit |
| **Backend** | Node.js, TypeScript, Express, Prisma ORM, PostgreSQL, Socket.io, JWT, bcrypt, Zod, Jest, Stripe SDK |
| **DevOps** | Docker, Docker Compose, PostgreSQL, Railway (deployment) |
| **Integrations** | Stripe (billing), Resend (email), Outlook/Google/Apple (calendar OAuth), Socket.io (real-time) |

---

## Success Metrics

| Metric | Target | Rationale |
|--------|--------|-----------|
| Daily active users (DAU) | 500+ | Habit-forming products live by daily return |
| 30-day retention | 65%+ | Gamification must drive sustained engagement |
| Avg tasks/user/month | 40+ | Usage indicates real value capture |
| Team plan adoption | 20%+ of paid | Collaboration features unlock revenue |
| Time to first completion | <5 min | Low friction is critical; quick-add is success metric |
| NPS (Net Promoter Score) | 50+ | Loyal users drive word-of-mouth |

---

## Timeline

| Phase | Duration | Status | Notes |
|-------|----------|--------|-------|
| **Phase 1** Core Tasks | Done | ✅ | All task model features, views, notifications |
| **Phase 2** Gamification | Done | ✅ | XP, levels, achievements, streaks, quests |
| **Phase 3** Check-Ins & Habits | Done | ✅ | Daily check-in flow, analytics, insights |
| **Phase 4** AI Features | Done | ✅ | Agent delegation, insights, prompt engineering |
| **Phase 5** Integrations | Done | ✅ | Calendar sync, webhooks, API keys, rate limiting |
| **Phase 6** Time Blocking | Done | ✅ | Time tracking, recurring, bulk operations |
| **Phase 7** Billing | Done | ✅ | Stripe integration, plan enforcement, seat pricing |
| **Phase 8** Security Hardening | Done | ✅ | 27 hardening fixes, rate limiting, audit logs |
| **Phase 9** Scale & Polish | Ongoing | 🟡 | Performance, mobile UX, edge case refinements |

---

## Open Questions

| Question | Owner | Status |
|----------|-------|--------|
| Should time entries be billable per project or per domain? | VS7 | Backlog |
| Do we auto-create recurring instances or require manual trigger? | VS7 | Resolved (auto-create on schedule/completion) |
| Calendar sync: pull-only or bidirectional? | VS7 | Resolved (pull-only initially, push in v2.1) |
| SMS-based 2FA or just TOTP? | VS7 | Backlog (email-based recovery codes for now) |
| Private projects vs. all projects visible within team? | VS7 | Resolved (all visible; RLS per role) |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2026-03-07 | VS7 | Restored from design docs; all phases documented as complete; timeline updated |
| 1.0 | 2024-Q1 | VS7 | Initial PRD (archived) |
