# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TaskMan is a full-stack task management application built as a monorepo with separate backend (Express + Prisma + PostgreSQL) and frontend (React + Vite) services.

## Development Commands

### Backend (in `backend/`)

```bash
# Development
npm run dev                    # Start dev server with tsx watch
npm run build                  # Compile TypeScript to dist/
npm start                      # Run compiled server

# Database
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Create and apply new migration
npm run prisma:migrate:deploy  # Deploy migrations (production)
npm run prisma:studio          # Open Prisma Studio GUI
npm run prisma:seed            # Seed database with test data

# Testing
npm test                       # Run all tests with Jest
npm test -- --testPathPattern=auth   # Run a single test suite (e.g., auth.test.ts)
npm test -- --testNamePattern="login"  # Run tests matching a name pattern
# NODE_OPTIONS=--experimental-vm-modules is required (included in npm test script)

# Linting
npm run lint                   # Check for lint errors
npm run lint:fix               # Auto-fix lint errors
```

### Frontend (in `frontend/`)

```bash
# Development
npm run dev                    # Start Vite dev server
npm run build                  # Build for production
npm run preview                # Preview production build

# Testing
npm test                       # Run Vitest tests
npm run test:watch             # Run tests in watch mode
npm run coverage               # Generate coverage report
# Run a single test file:
npx vitest run src/components/SomeComponent.test.tsx

# Type checking & linting
npm run type-check             # TypeScript type checking
npm run lint                   # Check for lint errors
npm run lint:fix               # Auto-fix lint errors
```

### Docker Compose (from root)

```bash
docker-compose up              # Start all services (postgres, backend, frontend)
docker-compose up postgres     # Start only PostgreSQL
docker-compose down            # Stop all services
```

## Architecture

### Backend Structure

- **Authentication**: JWT tokens stored in HTTP-only cookies (`auth_token`). Also supports API key authentication via `X-API-Key` header with `taskman_` prefix
- **Dual auth paths**: Cookie/Bearer JWT (primary) and API key (for integrations)
- **Authorization**: Role-based access control (OWNER > ADMIN > MEMBER > VIEWER) at project level
- **Validation**: All inputs validated with Zod schemas
- **Real-time**: Socket.io for WebSocket connections, authenticated via JWT from cookie
- **Error handling**: Centralized error handler with `AppError` class
- **Rate limiting**: API key-specific rate limiting middleware
- **Routes**: Organized by feature in `src/routes/`, mounted in `src/app.ts`
- **Middleware**: Authentication, error handling, rate limiting, and RBAC in `src/middleware/`
- **Database**: Prisma ORM with PostgreSQL, schema in `prisma/schema.prisma`

### Frontend Structure

- **State management**: Zustand stores in `src/store/` (auth, layout, timer, density, theme, socket, etc.)
- **Data fetching**: TanStack React Query with API client in `src/lib/api.ts`
- **Routing**: React Router v6 — pages include Dashboard, Tasks, Check-in (`/checkin`), Agent Queue (`/agents`)
- **Real-time**: Socket.io client in `src/lib/socket.ts` with hooks in `src/hooks/`
- **Styling**: Tailwind CSS with theme system and density settings
- **Animations**: Framer Motion with performance optimizations
- **Key components**: `DelegateModal` (AI agent delegation), `DomainPicker` (domain selection), `ProgressOverview`, `WeekView`

### Database Schema (28 models)

Key models:
- **User**: Authentication and profile (with XP, level, streak fields)
- **Project**: Container for tasks with team members
- **Task**: Core entity with status, priority, assignments, dependencies
- **ProjectMember**: Project membership with roles
- **RecurringTask**: Template for generating recurring tasks
- **TimeEntry**: Time tracking with start/end/duration
- **Comment**: Threaded comments on tasks with @mentions
- **ActivityLog**: Audit trail for task changes
- **Tag/TaskTag**: Project-scoped tags for tasks
- **CustomFieldDefinition/CustomFieldValue**: Extensible task metadata
- **Attachment**: File uploads linked to tasks
- **TaskDependency**: Task blocking relationships
- **Notification**: User notifications
- **ApiKey/Webhook/WebhookLog**: API integration features
- **Achievement/UserAchievement**: Gamification badges
- **UserQuest/UserSkill/XPLog/StreakProtectionLog**: Gamification progression
- **Domain/TaskDomain**: User-scoped life/work areas (e.g. Coding, Marketing); auto-seeded with 5 defaults on first fetch
- **DailyCheckin**: Daily check-in records (priorities, energy level, blockers, focus domains)
- **AgentDelegation**: AI agent task delegation with status tracking (QUEUED → IN_PROGRESS → COMPLETED/FAILED)

### Testing

- **Backend**: Jest with ts-jest, supertest for API testing, ~440 tests across 24 suites
- **Test database**: `taskapp_test` at `postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test`
- **Test pattern**: `beforeAll` for setup, create users via API endpoints, `--runInBand --forceExit` flags
- **Windows note**: Set env vars separately (not inline Unix-style)
- **Coverage**: Suites include Auth, Projects, Tasks, Time tracking, Comments, Analytics, Domains, Checkins, Agents, Webhooks, WebSocket, Gamification, etc.

### WebSocket Architecture

- Socket.io server initialized in `src/index.ts` via `initializeSocket()`
- Authentication: JWT extracted from cookie on connection
- Rooms: User-specific (`user:<userId>`) and task-specific (`task:<taskId>`)
- Events: Real-time updates for tasks, comments, notifications, agent status (`agent:status`)
- Client hooks: `useSocket`, `useTaskSocket` in frontend

### Activity Logging

- Non-critical operation (try-catch, no throw)
- Logs all task changes (create, update, delete, status changes)
- Also logs comment and dependency changes
- Stored in `ActivityLog` model with user, task, action, field, oldValue, newValue

### Comment System

- Routes use per-route `authenticate` middleware (not `router.use`) to avoid catching unrelated `/api/*` paths
- Supports threaded replies via `parentId`
- Markdown rendering support
- @mentions trigger notifications
- Real-time updates via WebSocket

## Environment Variables

### Backend `.env`

```env
PORT=4000
DATABASE_URL=postgresql://taskapp:taskapp_secret@postgres:5432/taskapp?schema=public
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
RESEND_API_KEY=re_...           # Email delivery (forgot-password, etc.)
FRONTEND_URL=http://localhost:5173  # Used for reset-password links
# Stripe (required for billing features):
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...
STRIPE_PRICE_TEAM_ANNUAL=price_...
```

**Important**:
- Use `postgres` as hostname in Docker Compose (service name), `localhost` for local development
- `JWT_SECRET` is REQUIRED - server will refuse to start without it
- `CORS_ORIGIN` supports comma-separated origins for multi-service deployments

### Frontend `.env.local`

```env
VITE_API_URL=http://localhost:4000
```

## Common Patterns

### Creating New Routes

1. Create route file in `backend/src/routes/[feature].ts`
2. Use `authenticate` middleware for protected routes
3. Validate inputs with Zod schemas
4. Import and mount in `src/app.ts`
5. Add tests in `backend/tests/`

### Database Changes

1. Modify `prisma/schema.prisma`
2. Run `npm run prisma:migrate` (creates migration + generates client)
3. **Windows Prisma DLL issue**: If dev server is running, you may get DLL lock errors. Types still work from migration step, but restart dev server if needed.
4. Update TypeScript types and routes accordingly

### Real-time Features

1. Define event in socket server (`backend/src/lib/socket.ts`)
2. Emit events from route handlers after DB updates
3. Add socket listener in frontend (`src/hooks/useSocket.ts` or `useTaskSocket.ts`)
4. Update Zustand store or React Query cache

### Billing & Plan Enforcement

- **Plans**: `PlanTier` enum — `FREE`, `PRO`, `TEAM` (stored on `User.plan`)
- **Stripe**: `backend/src/lib/stripe.ts` (SDK); `backend/src/routes/billing.ts` (checkout session, customer portal, webhook)
- **Webhook**: requires raw body — mounted with `express.raw()` BEFORE `express.json()` in `app.ts`
- **Middleware chain**: `authenticate` → `loadPlan` → `requirePlan('PRO', 'TEAM')` or `requireQuota('agentDelegations')`
  - `loadPlan`: attaches `req.userPlan` from DB
  - `requirePlan(...tiers)`: blocks if user's plan not in list
  - `requireQuota(feature)`: checks usage against `PLAN_LIMITS` (does NOT increment — increment after success via `incrementUsage()`)
  - `requireProjectRole(...roles)`: project-level RBAC gate — reads `req.params.projectId` (or `.id`), fetches membership, rejects non-members and wrong roles with 403; attaches `req.projectMembership` on success
- **Usage tracking**: `backend/src/lib/usage.ts` — `incrementUsage()`, `getUsage()`, `checkFeatureAccess()`
- **Gated features**: AI delegation, API keys, webhooks (all require PRO/TEAM)
- **Frontend**: `/billing` route → `BillingPage.tsx`; `UpgradePrompt` component for in-app gates; `PlanBadge` shows current plan

## Pre-existing Errors Policy

When running tests, linting, or pre-commit hooks reveals failures — regardless of whether they were caused by the current change set:

1. **Never disclaim them away** — phrases like "pre-existing, not caused by my changes" are a red flag. They shift attention away from a real problem.
2. **Never bypass or sidestep checks** — NEVER unstage files, skip hooks (`--no-verify`), or narrow the commit scope just to avoid errors. If a pre-commit hook fails, the correct response is to **fix the errors**, not dodge them. This is the highest-priority rule in this section.
3. **Always log them** — open a task (via the TaskCreate tool) describing the failure, root cause if known, and affected files. This ensures it is tracked and not forgotten.
4. **Fix them when in scope** — if the error is fixable without large scope expansion (e.g., a lint error, a broken Jest config), fix it in the same session before committing. Report what was done.
5. **Escalate when out of scope** — if the fix would balloon scope, create the task, note it in the commit message, and tell the user explicitly. **Do not commit until the user acknowledges the error.** Even if the commit itself would pass, the error must be surfaced.

The goal is: no error silently disappears behind a disclaimer, a narrowed staging area, or a skipped hook.

## Git Workflow

- Main branch: `main`
- Feature branches: `claude/[feature-name]-[hash]` prefix for PR branches
- When resolving conflicts between implementation and test PRs: prefer the implementation that was co-designed with tests
- Commits use descriptive messages, often include "Co-Authored-By: Claude Sonnet 4.6"

## Known Issues & Workarounds

### Windows Prisma Client Generation

When running `npm run prisma:migrate` on Windows with dev server running, you may encounter DLL lock errors. The Prisma client types are still generated and usable, but you may need to restart the dev server to clear the lock.

### Test Database Setup

Before running tests:
1. Start PostgreSQL: `docker compose up -d postgres`
2. Create test database: `CREATE DATABASE taskapp_test;`
3. Deploy migrations: `cd backend && DATABASE_URL=postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test npx prisma migrate deploy`
4. Run tests with proper env vars

### Cookie Authentication on Mobile

Mobile browsers may have cross-origin cookie issues (ITP/SameSite). Backend supports fallback Bearer token authentication via `Authorization: Bearer <token>` header.

## Tech Stack Summary

**Backend**: Node.js, TypeScript, Express, Prisma, PostgreSQL, Socket.io, JWT, bcrypt, Zod, Jest
**Frontend**: React 18, TypeScript, Vite, Zustand, TanStack Query, React Router, Tailwind CSS, Framer Motion, Socket.io-client, dnd-kit
**DevOps**: Docker, Docker Compose, Railway (deployment platform)
