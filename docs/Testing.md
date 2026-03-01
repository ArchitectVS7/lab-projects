# Testing Guide

## Overview

TaskMan uses a three-layer testing pyramid:

```
         /\
        /E2E\         ← Playwright (~18 spec files, Chromium only)
       /------\
      /  Integ  \     ← Backend Jest/supertest (~32 suites)
     /------------\
    /  Unit Tests  \  ← Frontend Vitest (~16 test files)
   /----------------\
```

Each layer has a different scope, speed, and trigger. Unit tests run on every commit; E2E tests run in CI on every PR and push to `main`.

---

## Layer 1 — Frontend Unit Tests (Vitest)

**Location**: `frontend/src/**/__tests__/*.test.tsx` and `frontend/src/store/__tests__/`

**Tool**: Vitest + React Testing Library

**What they cover**: Individual components and Zustand stores in isolation — no real API calls, no real browser.

**Test files**:
- Components: `CalendarView`, `CommandPalette`, `DelegateModal`, `DensityPicker`, `DomainPicker`, `KanbanColumn`, `KeyboardShortcutsModal`, `LayoutSwitcher`, `ProgressOverview`, `SkeletonsAndEmptyStates`, `TaskCard`, `TimerWidget`, `WeekView`
- Pages: `AgentQueuePage`, `CheckinPage`, `FocusPage`
- Stores: `auth`

**Commands** (run from `frontend/`):
```bash
npm test                          # Run all tests once
npm run test:watch                # Watch mode during development
npm run coverage                  # Generate coverage report
npx vitest run src/components/__tests__/TaskCard.test.tsx  # Single file
```

**Triggered by**: Pre-commit hook (every commit).

---

## Layer 2 — Backend Integration Tests (Jest + supertest)

**Location**: `backend/tests/*.test.ts`

**Tool**: Jest with ts-jest, supertest for HTTP requests against the real Express app

**What they cover**: Full HTTP request/response cycles against the actual route handlers, middleware, and a real PostgreSQL test database. No mocking of the DB layer.

**Test suites** (32 files):
- Auth, password-reset, API keys
- Tasks, projects, comments, dependencies, attachments
- Time entries, recurring tasks, calendar
- Agents, webhooks, billing, custom-fields
- Analytics, creator-metrics, cursor-pagination, pagination
- Domains, checkins, notifications, activity-logs
- Export, import, sprint6, phase2/3/4, websocket
- Request ID, user rate limiter

**Commands** (run from `backend/`):
```bash
npm test                                              # Run all suites
npm test -- --testPathPattern=auth                   # Single suite by filename
npm test -- --testNamePattern="login"                # Tests matching a name
```

The `npm test` script sets `NODE_OPTIONS=--experimental-vm-modules` automatically (required for ESM/Jest interop).

**Test database setup** (one-time, local):
```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Create the test database (if it doesn't exist)
psql postgresql://taskapp:taskapp_secret@localhost:5432/postgres -c "CREATE DATABASE taskapp_test;"

# 3. Deploy migrations to the test DB
cd backend
DATABASE_URL=postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test \
  npx prisma migrate deploy
```

**Environment**: Tests use `taskapp_test` database. The `DATABASE_URL` env var must point to it. CI sets this automatically; locally you must have Postgres running.

**Jest flags**: `--runInBand` (serial execution) and `--forceExit` are set in the test script to avoid hanging connections.

**Triggered by**: Pre-push hook (every push).

---

## Layer 3 — E2E Tests (Playwright)

**Location**: `e2e/*.spec.ts`

**Tool**: Playwright, Chromium only

**What they cover**: Real browser interactions against a running backend + frontend. Playwright spins both servers up automatically via `webServer` config.

**Spec files** (18):
- `auth.spec.ts` — login, register, logout
- `tasks.spec.ts`, `task-details.spec.ts` — CRUD, status changes
- `projects.spec.ts` — project management
- `navigation.spec.ts` — routing, sidebar
- `search.spec.ts` — global search
- `settings.spec.ts` — user profile settings
- `timer.spec.ts` — time tracking
- `calendar-view.spec.ts`, `focus-mode.spec.ts`
- `dependencies.spec.ts`, `dependencies-dashboard.spec.ts`
- `creator-dashboard.spec.ts`, `command-palette-enhanced.spec.ts`
- `keyboard-shortcuts.spec.ts`, `ui-density-layout.spec.ts`
- `accessibility-controls.spec.ts`, `empty-states-skeletons.spec.ts`

**Configuration** (`playwright.config.ts`):
- Base URL: `http://localhost:3000` (frontend Vite dev server)
- Backend: `http://localhost:4000` (Express dev server, test DB)
- Single worker, no parallelism (`workers: 1`, `fullyParallel: false`)
- 1 retry on CI, 0 locally
- Screenshots on failure, video retained on failure, traces on first retry
- Timeouts: 30s per test, 5s for assertions, 10s for actions

**Commands** (run from repo root):
```bash
npx playwright test                          # Run all specs
npx playwright test e2e/auth.spec.ts         # Single spec file
npx playwright test --headed                 # Show browser window
npx playwright show-report                   # Open last HTML report
```

**Prerequisites**: Both servers must be startable (Postgres running, `backend/.env` present with `JWT_SECRET`). Playwright manages server lifecycle automatically.

**Triggered by**: CI only (not a local hook — too slow for pre-commit/pre-push).

---

## Git Hooks

Managed by Husky. Hooks live in `.husky/`.

| Hook | What runs |
|------|-----------|
| `pre-commit` | `lint-staged` (ESLint on staged files) + `npm test --prefix frontend` (Vitest) |
| `pre-push` | `npm test --prefix backend` (Jest) + `npm run type-check --prefix frontend` |

`lint-staged` runs with `--concurrent false` so lint and tests don't race.

**Policy**: Hooks must not be bypassed with `--no-verify`. If a hook fails, fix the error — do not unstage files or skip the hook.

---

## CI Pipeline (GitHub Actions)

Three jobs defined in `.github/workflows/ci.yml`, triggered on every push to `main` and every PR targeting `main`:

### `backend` job
1. Spins up Postgres 16 as a service
2. Installs deps, runs lint, builds TypeScript
3. Deploys migrations to `taskapp_test`
4. Runs `npm test`

### `frontend` job
1. Installs deps, runs lint, type-check
2. Runs `npm test` (Vitest)
3. Runs `npm run build`

### `e2e` job
- Runs **after** both `backend` and `frontend` pass (`needs: [backend, frontend]`)
- Spins up Postgres 16, deploys migrations
- Caches Playwright browsers (keyed on `package-lock.json`)
- Runs `npx playwright test`
- Uploads HTML report as artifact (30-day retention)
- Uploads `test-results/` on failure (7-day retention)

### `deploy` job
- Runs only on push to `main` after all three jobs pass
- No-op step (Railway deploys automatically via GitHub integration)

---

## Adding New Tests

### New backend integration test
1. Create `backend/tests/[feature].test.ts`
2. Import `app` from `../src/app` and `PrismaClient` from `@prisma/client`
3. Use `beforeAll` to create users via the API (not directly in DB)
4. Clean up in `afterAll` with `prisma.$disconnect()`
5. No need to manually register the suite — Jest picks up all `*.test.ts` files

### New frontend unit test
1. Create `frontend/src/[components|pages|store]/__tests__/[Name].test.tsx`
2. Use React Testing Library + `vi.mock()` for external deps
3. Follow React 19 strict lint rules: no `setState` in render, no refs during render

### New E2E spec
1. Create `e2e/[feature].spec.ts`
2. Use the `e2e/helpers/` utilities for common auth and API setup
3. Each test should be self-contained — create its own data, clean up after itself
4. Keep tests focused; avoid asserting on implementation details

---

## Quick Reference

```bash
# Local unit tests (fast, ~2-3s)
cd frontend && npm test

# Local integration tests (~45-60s, needs Postgres)
cd backend && npm test

# Single backend suite
cd backend && npm test -- --testPathPattern=billing

# E2E (needs Postgres + both servers startable)
npx playwright test

# E2E headed (debug mode)
npx playwright test --headed --project=chromium

# View last E2E report
npx playwright show-report
```
