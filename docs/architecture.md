# TaskMan — Architecture

> **Status:** Active
> **Version:** 1.0
> **Last Updated:** 2026-03-06
> **Author:** VS7
> **PRD:** [docs/prd.md](./prd.md)

---

## System Overview

TaskMan is a full-stack task and project management web application hosted at taskman.app. It is containerised with Docker Compose and deployable to either a self-hosted environment or Railway. The application exposes a REST API backend (Node.js/TypeScript), a React SPA frontend (TypeScript/Vite), a CLI tool, and end-to-end tests via Playwright. PostgreSQL (managed via Prisma ORM) is the sole data store. An optional AI agent delegation feature calls an external LLM API.

### Top-Level Diagram

```
                        [ Browser ]
                             |
                    [ Frontend (Vite/React) ]
                         port 3000
                             |
                     REST API calls
                             |
                    [ Backend (Express/TS) ]
                         port 4000
                    /         |         \
           [ Prisma ]   [ Resend ]   [ Stripe ]
               |          (email)   (billing, opt)
       [ PostgreSQL ]
         port 5432
               |
       [ LangChain /
         AI Agent ]  ←→  External LLM API
                             |
               [ iCal (optional CALENDAR_PUBLIC_URL) ]

[ CLI ]  →  REST API (port 4000)
[ Playwright e2e ]  →  Full stack (ports 3000 + 4000)
```

---

## Component Architecture

### 1. Frontend (`frontend/`)
- **Responsibility:** Single-page application serving all user-facing views — Kanban, table, calendar, and week views; task creation/editing; focus mode (top 3 tasks); daily check-in; gamification dashboard (XP/levels/streaks/achievements); team collaboration UI; creator dashboard; billing/upgrade flow.
- **Technology:** TypeScript, React, Vite, Tailwind CSS
- **Inputs:** User interactions; REST API responses from backend
- **Outputs:** Rendered UI; REST API calls to backend (port 4000)
- **Notes:** Built as a static bundle (`dist/`) served by the frontend Docker container. `vite.config.ts` proxies API calls to the backend in development.

### 2. Backend (`backend/`)
- **Responsibility:** Business logic, authentication, data access, and all external integrations. Exposes a REST API consumed by the frontend, CLI, and webhooks.
- **Technology:** Node.js, TypeScript, Express (inferred), Prisma ORM
- **Inputs:** HTTP requests from frontend, CLI, and webhook consumers
- **Outputs:** JSON API responses; database writes via Prisma; emails via Resend; Stripe webhook handling; AI agent calls
- **Key source layout:**
  ```
  backend/src/
  ├── app.ts              — Express app setup
  ├── index.ts            — Server entrypoint
  ├── routes/             — Route handlers (tasks, projects, auth, agents, billing, calendar, checkins, analytics, notifications, ...)
  ├── services/           — Business logic (xpService.ts, seed.service.ts)
  ├── controllers/        — Controller layer (between routes and services)
  ├── middleware/         — Auth, error handling
  └── lib/                — Shared utilities
  backend/prisma/
  ├── schema.prisma       — Database schema
  ├── migrations/         — SQL migrations (auto-applied on Docker startup)
  └── seed.ts             — Seed data
  ```

### 3. Database (PostgreSQL)
- **Responsibility:** Sole persistent data store. Holds all users, tasks, projects, teams, activity logs, XP records, attachments metadata, API keys, and webhook configs.
- **Technology:** PostgreSQL 15 (Docker service, port 5432)
- **Inputs:** Prisma client queries from backend
- **Outputs:** Query results to backend
- **Notes:** Schema managed exclusively via Prisma migrations. Migrations run automatically on container start via `backend/start.sh`.

### 4. CLI (`cli/`)
- **Responsibility:** Command-line interface for power users and CI/CD pipelines. Wraps backend API calls.
- **Technology:** Node.js/TypeScript (inferred from project stack)
- **Inputs:** Shell commands from user or CI
- **Outputs:** REST calls to backend API; formatted terminal output

### 5. AI Agent Delegation
- **Responsibility:** Allows users to delegate tasks to an AI agent. The agent interprets task context, executes a chain of sub-steps, and updates task state.
- **Technology:** Routed via `backend/src/routes/agents.ts`; external LLM API call (provider not specified in codebase)
- **Inputs:** Task context, user instruction from frontend
- **Outputs:** Updated task records; agent activity log entries
- **Notes:** Rate-limited by plan tier (Free: 0, Pro: 50/mo, Team: 200/mo shared).

### 6. iCal Calendar Sync
- **Responsibility:** Exports tasks as an iCal feed for consumption by external calendar apps (Google Calendar, Apple Calendar, Outlook).
- **Technology:** `backend/src/routes/calendar.ts`; `CALENDAR_PUBLIC_URL` env var sets the public base URL for feed links
- **Inputs:** Tasks with due dates from the database
- **Outputs:** `.ics` feed via a public (unauthenticated) URL

### 7. Gamification Engine
- **Responsibility:** Awards XP for task completion, manages levels, streaks, and achievements.
- **Technology:** `backend/src/services/xpService.ts`
- **Inputs:** Task completion events from routes
- **Outputs:** Updated XP/level/streak records in the database; achievement unlock events to the notification system

### 8. End-to-End Tests (`e2e/`)
- **Responsibility:** Automated browser-level tests covering critical user flows.
- **Technology:** Playwright (`playwright.config.ts`)
- **Inputs:** Running frontend (port 3000) + backend (port 4000)
- **Outputs:** Test reports in `playwright-report/` and `test-results/`

---

## Data Architecture

All data lives in PostgreSQL. Prisma is the single access layer — no raw SQL queries outside migrations.

| Entity | Notes |
|--------|-------|
| Users | Authentication via JWT; password reset via Resend email |
| Tasks | Core entity; supports tags, custom fields, dependencies, recurring rules, time entries, attachments, comments |
| Projects | Container for tasks; supports RBAC (owner, editor, viewer) |
| Teams | Group of users; shared projects, shared AI agent quota |
| Activity Logs | Append-only audit trail; 30-day retention on Free plan |
| XP / Achievements | Gamification state per user |
| API Keys | Hashed; scoped per user; plan-limited (Free: 0, Pro: 5, Team: 25) |
| Webhooks | URL + event filter; plan-limited (Free: 0, Pro: 5, Team: 25) |
| Attachments | Metadata in DB; binary stored to `backend/uploads/` on disk |

---

## API Architecture

The backend exposes a REST API on port 4000. Routes map closely to resource names.

| Route Prefix | Responsibility |
|---|---|
| `/auth` | Login, register, password reset (Resend) |
| `/tasks` | CRUD, filtering, bulk operations |
| `/projects` | CRUD, member management |
| `/agents` | AI agent delegation |
| `/billing` | Stripe checkout, plan management, webhooks |
| `/calendar` | iCal feed generation |
| `/checkins` | Daily check-in records |
| `/analytics` | Usage stats, creator dashboard data |
| `/notifications` | In-app notification delivery |
| `/export`, `/import` | Data portability |
| `/time-entries` | Time tracking per task |
| `/recurring-tasks` | Recurrence rule management |
| `/dependencies` | Task dependency graph |
| `/custom-fields` | Per-project field definitions |
| `/tags` | Tag CRUD |
| `/comments` | Per-task threaded comments |

Authentication is JWT-based. The `middleware/` layer validates tokens on protected routes.

---

## Deployment Architecture

### Docker Compose (Self-host)

```
docker-compose.yml
├── frontend    — Vite build served via Nginx or Node static server (port 3000)
├── backend     — Node.js API server (port 4000); runs Prisma migrations on start
└── postgres    — PostgreSQL 15 (port 5432); data volume persisted to host
```

### Railway (Managed)

Documented in `docs/other/RAILWAY_DEPLOYMENT.md`. Services are deployed as separate Railway services from the same repo. PostgreSQL is provisioned as a Railway managed add-on.

### Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `JWT_SECRET` | Yes | Signs auth tokens |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RESEND_API_KEY` | Yes | Transactional email (password reset) |
| `CORS_ORIGIN` | Yes | Allowed frontend origin |
| `STRIPE_SECRET_KEY` | Optional | Billing |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook validation |
| `CALENDAR_PUBLIC_URL` | Optional | Base URL for iCal feed links |

---

## Security Architecture

| Concern | Approach |
|---------|----------|
| Authentication | JWT tokens; short-lived access + refresh token pattern |
| Password storage | Hashed (bcrypt or equivalent) |
| API key access | Hashed in DB; plain value shown once at creation |
| RBAC | Project-level roles: owner, editor, viewer; enforced in backend middleware |
| Stripe webhooks | Signature verification via `STRIPE_WEBHOOK_SECRET` |
| Attachment storage | Files stored server-side in `backend/uploads/`; paths not user-controllable |
| CORS | Restricted to `CORS_ORIGIN` |

---

## Decision Log

| # | Decision | Alternatives Considered | Rationale | Consequence |
|---|----------|------------------------|-----------|-------------|
| 1 | Docker Compose as primary deployment | Kubernetes, bare metal | Simple self-hosting story; single `docker-compose up` for contributors and self-hosters | Not auto-scaling; Railway is the recommended managed path |
| 2 | Prisma ORM | Knex, Sequelize, raw SQL | Type-safe queries, first-class migration tooling, good TypeScript integration | Adds Prisma schema as another source of truth to keep in sync with the DB |
| 3 | Vite for frontend build | CRA, Next.js | Fast HMR, small bundles, no SSR complexity needed for a SPA task manager | No SSR; SEO is irrelevant for an authenticated app |
| 4 | Playwright for e2e | Cypress | Better multi-browser support, faster CI execution, better async handling | Slightly steeper initial setup than Cypress |
| 5 | Resend for transactional email | SendGrid, SES, Nodemailer | Simple API, generous free tier, developer-first DX | Single point of dependency for password reset |
| 6 | Three pricing tiers (Free / Pro / Team) | Two tiers, usage-based | Matches standard SaaS expectation; team tier enables B2B expansion | Plan enforcement logic must be maintained in backend for all rate-limited features |

---

## Open Questions

| Question | Owner | Due | Status |
|----------|-------|-----|--------|
| Which LLM provider powers AI agent delegation? | VS7 | Pre-Pro launch | Open |
| Attachment storage strategy at scale — local disk is not suitable for multi-instance | VS7 | Before Railway scale-out | Open |
| Cross-device notification delivery — is web push planned? | VS7 | Post-MVP | Open |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-06 | VS7 | Initial draft — derived from codebase survey |
