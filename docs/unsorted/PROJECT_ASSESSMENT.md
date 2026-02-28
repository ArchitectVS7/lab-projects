# TaskMan — Full Project Assessment

**Date**: 2026-02-17
**Assessed by**: Claude Sonnet 4.5
**Branch**: `claude/assess-project-status-4mFex`

---

## Project Status

- **Active Development** — high commit frequency (109 commits/30 days)
- **Phase 1 Gamification Complete** — XP system, level progression, and celebrations implemented
- **Functional but Unstable** — recent fixes for CI/CD pipelines, authentication flows, and gamification
- Recent commit focus: mobile login redirect, TypeScript builds, notifications, gamification

---

## 1. Top-Level Directory Structure

```
/home/user/TaskMan/
├── backend/                    # Express API server
├── frontend/                   # React + Vite UI application
├── cli/                        # Command-line interface (TaskMan CLI)
├── e2e/                        # End-to-end tests (Playwright)
├── docs/                       # Project documentation
├── scripts/                    # Build and utility scripts
├── .github/                    # GitHub workflows / CI-CD
├── .docs-automation/           # Automated documentation generation
├── .husky/                     # Git hooks for commits
├── CLAUDE.md                   # Claude Code instructions
├── README.md                   # Project README
├── package.json                # Root workspace config
├── docker-compose.yml          # Multi-container orchestration
├── playwright.config.ts        # E2E test configuration
├── .env.example                # Environment variables template
└── tsconfig.e2e.json           # TypeScript config for E2E tests
```

---

## 2. Tech Stack Summary

**Backend**: Node.js, TypeScript, Express, Prisma, PostgreSQL, Socket.io, JWT, bcrypt, Zod, Jest
**Frontend**: React 18, TypeScript, Vite, Zustand, TanStack Query, React Router, Tailwind CSS, Framer Motion, Socket.io-client, dnd-kit
**E2E**: Playwright (root-level `e2e/` directory, `playwright.config.ts`)
**DevOps**: Docker, Docker Compose, Railway (deployment platform)

---

## 3. Backend Structure

### Routes (`backend/src/routes/`) — 16 files

| File | Purpose |
|---|---|
| `analytics.ts` | Analytics / creator dashboard endpoints |
| `attachments.ts` | File upload/download |
| `auth.ts` | Login, register, logout |
| `comments.ts` | Task comments with threading |
| `custom-fields.ts` | Custom field definitions for tasks |
| `dependencies.ts` | Task dependency management |
| `export.ts` | Export tasks (CSV, JSON) |
| `notifications.ts` | User notifications |
| `projects.ts` | Project CRUD, member management |
| `recurring-tasks.ts` | Recurring task templates |
| `tags.ts` | Project tags |
| `tasks.ts` | Task CRUD, status updates, time tracking (26 KB — largest) |
| `time-entries.ts` | Time tracking entries |
| `webhooks.ts` | Webhook configuration and logs |
| `xp.ts` | XP progression (gamification) |
| `seed.ts` | Database seeding |

### Mounted in `app.ts`

```
/api/auth             authRoutes
/api/projects         projectRoutes
/api/tasks            taskRoutes
/api/notifications    notificationRoutes
/api/analytics        analyticsRoutes
/api/recurring-tasks  recurringTasksRoutes
/api/time-entries     timeEntriesRoutes
/api                  commentRoutes       (unmounted prefix)
/api/export           exportRoutes
/api/tags             tagRoutes
/api/custom-fields    customFieldRoutes
/api/attachments      attachmentRoutes
/api                  dependencyRoutes    (unmounted prefix)
/api/webhooks         webhookRoutes
/api/seed             seedRoutes
/api/xp               xpRoutes
/health                                   (health check)
/api/docs             swaggerUi           (Swagger)
```

### Middleware

- `auth.ts` — JWT and API key authentication
- `apiKeyRateLimiter.ts` — Rate limiting per API key
- `errorHandler.ts` — Centralized error handling

### Services / Lib

- `xpService.ts` — XP calculation, leveling, achievements
- `socket.ts` — Socket.io server configuration
- `swagger.ts` — OpenAPI documentation
- `scheduler.ts` — Node-cron job scheduling
- `recurrence.ts` — Recurring task generation
- `webhookDispatcher.ts` — Webhook event dispatch
- `notifications.ts` — Notification creation
- `activityLog.ts` — Audit trail logging
- `mentions.ts` — @mention parsing
- `seed.service.ts` — Database seeding

### Tests (`backend/tests/`) — 21 files, 265+ tests, 7,607 lines

```
phase0.test.ts              Foundation tests
phase2.test.ts              Projects & team (31 KB)
phase3.test.ts              Tasks & time tracking (38 KB)
phase4.test.ts              Advanced features
phase4-ratelimit.test.ts    API key rate limiting
activity-logs.test.ts       Audit trail
analytics.test.ts           Creator metrics
api-keys.test.ts            API key auth
auth.test.ts                Authentication (19 KB)
comments.test.ts            Comment threading
creator-metrics.test.ts     Creator dashboard (16 KB)
cursor-pagination.test.ts   Cursor pagination (17 KB)
dependencies.test.ts        Task dependencies (18 KB)
export.test.ts              Export functionality
notifications.test.ts       Notification system
pagination.test.ts          Basic pagination
recurring-tasks.test.ts     Recurring task generation
sprint6.test.ts             Sprint 6 features
time-entries.test.ts        Time tracking
websocket.test.ts           Socket.io events
webhooks.test.ts            Webhook dispatch (18 KB)
```

---

## 4. Frontend Structure

### Pages (`frontend/src/pages/`) — 15 pages

```
DashboardPage.tsx              Main dashboard
ProjectsPage.tsx               Project list
ProjectDetailPage.tsx          Kanban board
TasksPage.tsx                  Kanban / list view
FocusPage.tsx                  Focus / timer mode
CalendarPage.tsx               Calendar view
DependenciesDashboardPage.tsx  Dependency visualization
ProfilePage.tsx                User profile & settings
LoginPage.tsx                  Login form
RegisterPage.tsx               Registration form
HelpPage.tsx                   Help / documentation
ApiKeysPage.tsx                API key management
WebhooksPage.tsx               Webhook configuration
CreatorDashboardPage.tsx       Analytics for creators
DocumentationCMSPage.tsx       Documentation management
```

### Components (`frontend/src/components/`) — 59 components

**Gamification (Phase 1):**
- `Gamification/XPBar.tsx` — XP progress bar
- `Gamification/LevelBadge.tsx` — User level display
- `Celebrations/CelebrationManager.tsx` — Animation queue
- `Celebrations/TaskCompleteCelebration.tsx` — Task completion toast
- `Celebrations/XPGainAnimation.tsx` — Floating XP display
- `Celebrations/LevelUpCelebration.tsx` — Level up modal with confetti

**Task management**: `TaskCard`, `TaskDetailModal`, `KanbanColumn`, `TaskTimePanel`, `SmartTaskInput`
**Navigation**: `CommandPalette`, `SearchBar`, `NotificationCenter`, `KeyboardShortcutsModal`
**Collaboration**: `CommentEditor`, `CommentList`, `MentionAutocomplete`, `DependencyList`, `DependencyPicker`
**Data viz**: `CalendarView`, `ActivityTimeline`, `InsightsWidget`, `Pagination`
**Utilities**: `LoadingSpinner`, `Toast`, `ErrorBoundary`, `EmptyState`, `GlassCard`, `Skeletons`, `ConnectionStatus`

### Zustand Stores (`frontend/src/store/`) — 10 stores

```
auth.ts            User authentication state
theme.ts           Theme (light / dark / custom)
timer.ts           Task timer state
density.ts         UI density / spacing
layout.ts          Layout configuration
celebration.ts     Celebration animation queue
commandPalette.ts  Command palette state
shortcutsModal.ts  Keyboard shortcuts display
socket.ts          Socket.io connection state
toast.ts           Toast notification queue
```

### Hooks (`frontend/src/hooks/`)

- `useSocket.ts` — Socket.io listeners + XP event handling
- `useTaskSocket.ts` — Task-specific socket events
- `useCommandPalette.ts` — Command palette control
- `useTaskDependencies.ts` — Dependency graph
- `usePerformanceAnimations.ts` — Performance-optimized animations

---

## 5. Database Schema

**21+ models, 8 enums** (CLAUDE.md lists 18 — count is stale after gamification migrations)

### Core Models

| Model | Key Fields |
|---|---|
| `User` | `xp`, `level`, `currentStreak`, `longestStreak`, `lastLoginAt` |
| `Project` | Owner, members with roles, tasks, recurring tasks, tags |
| `Task` | Status, priority, assignments, comments, attachments, dependencies |
| `ProjectMember` | Membership with OWNER / ADMIN / MEMBER / VIEWER roles |
| `TaskDependency` | Blocking relationships between tasks |
| `Comment` | Threaded replies via `parentId`, @mentions |
| `ActivityLog` | Audit trail (action, field, oldValue, newValue) |
| `Tag` | Project-scoped labels |
| `CustomFieldDefinition` | Extensible metadata definitions |
| `CustomFieldValue` | Custom values per task |
| `Attachment` | File uploads linked to tasks |
| `TimeEntry` | Start/end/duration for time tracking |
| `RecurringTask` | Template for recurring task generation |

### Gamification Models (added in migrations 20260208, 20260209)

| Model | Purpose |
|---|---|
| `Achievement` | Achievement definitions |
| `UserAchievement` | User progress on achievements |
| `UserQuest` | Daily / weekly / challenge quests |
| `UserSkill` | Skill tree unlocks |
| `XPLog` | XP transaction history |
| `StreakProtectionLog` | Used streak protections |

### Integration Models

| Model | Purpose |
|---|---|
| `ApiKey` | API key storage |
| `Webhook` | Webhook subscriptions |
| `WebhookLog` | Webhook delivery logs |
| `Notification` | User notifications |

### Enums

```
TaskStatus:          TODO, IN_PROGRESS, IN_REVIEW, DONE
Priority:            LOW, MEDIUM, HIGH, URGENT
ProjectRole:         OWNER, ADMIN, MEMBER, VIEWER
NotificationType:    TASK_ASSIGNED, TASK_DUE_SOON, TASK_OVERDUE, PROJECT_INVITE,
                     TASK_COMMENT, TASK_STATUS_CHANGED, MENTION
ActivityAction:      CREATED, UPDATED, DELETED, COMMENT_ADDED, COMMENT_EDITED,
                     COMMENT_DELETED, DEPENDENCY_ADDED, DEPENDENCY_REMOVED
RecurrenceFrequency: DAILY, WEEKLY, MONTHLY, CUSTOM
CustomFieldType:     TEXT, NUMBER, DATE, DROPDOWN
QuestType:           DAILY, WEEKLY, CHALLENGE, PERSONAL
```

### Database Migrations (8 total)

```
20260206002234_init
20260206235512_add_recurring_tasks
20260207010553_add_recurring_task_fk_relations
20260207023837_add_tags_custom_fields_attachments
20260207023539_add_comments_activity_logs
20260207044552_add_dependencies_apikeys_webhooks
20260208172043_add_achievements
20260209025452_add_gamification_fields
```

---

## 6. Architecture Patterns

### Authentication & Authorization

- **Primary**: JWT stored in HTTP-only cookies (`auth_token`)
- **Fallback**: Bearer token via `Authorization: Bearer <token>`
- **API integration**: API key auth with `taskman_` prefix via `X-API-Key` header
- **Roles**: OWNER > ADMIN > MEMBER > VIEWER (project-level)

### Real-time Communication

- Socket.io for WebSocket connections
- Rooms: `user:<userId>` and `task:<taskId>`
- Authentication: JWT from cookie on connection
- Events: tasks, comments, notifications, `xpGained`, `levelUp`

### Data Fetching

- Backend: RESTful API with Zod validation
- Frontend: TanStack React Query for caching and sync
- State: Zustand for local state management

### Gamification (Phase 1)

- **XP formula**: `BaseXP × PriorityMultiplier × ComplexityBonus × TimeBonus`
- **Level curve**: 150 → 326 → 530 → 760 → 1,014 XP per level (exponential)
- **Celebrations**: Queued animations via `celebration` Zustand store
- **Socket events**: `xpGained`, `levelUp` emitted from `xpService.ts`

---

## 7. CLI

Located at `/cli/`, provides command-line access to the backend.

**Commands**: `login`, `create`, `list`, `complete`, `show`, `update`, `projects`
**Structure**: `src/api/` (HTTP client), `src/config/`, `src/utils/`, `completions/` (shell completions)

---

## 8. Environment Variables

### Backend (`.env`)

```env
PORT=4000
DATABASE_URL=postgresql://taskapp:taskapp_secret@postgres:5432/taskapp?schema=public
JWT_SECRET=your-secret-key-here    # REQUIRED — server refuses to start without it
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173   # Comma-separated for multi-service
NODE_ENV=development
```

### Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:4000
```

### Test database

```
postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test
```

---

## 9. Known Issues

| Issue | Status | Commit |
|---|---|---|
| Mobile login redirect loop (cross-origin cookies / ITP) | Fixed | `e95fb1c` |
| TypeScript build step missing from backend CI | Fixed | `fb2d195` |
| Broken CMS admin route | Removed | `49cd11c` |
| xpService using removed `io` import | Fixed | `45d5554` |
| Backend `qs` moderate vulnerability | Fixed | this session |
| README port `3000` vs actual `4000` | Fixed | this session |
| README wrong testing framework (Playwright) | Fixed | this session |
| CLAUDE.md model count stale (18 vs 21+) | Open | — |
| CI/CD flakiness (PostgreSQL provisioning) | In progress | — |

---

## 10. Feature Completion Status

| Feature | Status |
|---|---|
| Task CRUD (status, priority, assignments) | ✅ Complete |
| Team collaboration (projects, members, roles) | ✅ Complete |
| Time tracking (start/stop/duration) | ✅ Complete |
| Recurring task templates | ✅ Complete |
| Comments with threading and @mentions | ✅ Complete |
| File attachments | ✅ Complete |
| Task dependencies / blocking | ✅ Complete |
| Tags and custom fields | ✅ Complete |
| Activity logging and audit trail | ✅ Complete |
| API key authentication + rate limiting | ✅ Complete |
| Webhooks for integrations | ✅ Complete |
| Phase 1 Gamification (XP, levels, celebrations) | ✅ Complete |
| Calendar and focus view modes | ✅ Complete |
| Real-time updates via Socket.io | ✅ Complete |
| Gamification phases 2–5 (achievements, skill tree, quests, streaks) | 🔶 Planned |
| CI/CD pipeline stability | 🔶 In progress |
| Mobile responsiveness | 🔶 In progress |

---

## 11. Key File Reference

| File | Size | Purpose |
|---|---|---|
| `backend/src/routes/tasks.ts` | 26.8 KB | Task CRUD, XP award logic |
| `backend/src/routes/auth.ts` | 13.9 KB | JWT / API key authentication |
| `backend/tests/phase3.test.ts` | 38.6 KB | Task & time tracking tests |
| `backend/tests/phase2.test.ts` | 31.4 KB | Projects & team tests |
| `backend/prisma/schema.prisma` | ~500 lines | Database schema |
| `docs/GAMIFICATION_DESIGN.md` | 25 KB | Gamification spec (phases 2–5) |
| `docs/PRD.md` | 95 KB | Full product requirements |
| `docs/ACTION_ITEMS.md` | — | Concise action report (this session) |
| `CLAUDE.md` | 8.8 KB | Claude Code development guide |

---

## 12. Recent Commits (at assessment time)

```
07d7c41  chore: sync local changes
fbb4f6e  Merge pull request #47 - V0 frontend redesign prompt
43510e7  Add comprehensive V0 frontend redesign prompt
2977f4b  Merge pull request #46 - Fix xpService build error
45d5554  Fix xpService build error (use getIO() instead of importing io)
a9dbeb5  testing and docs upgrade
55e81ef  feat: implement Phase 1 gamification system with XP, levels, celebrations
990fdd5  Merge pull request #45 - Fix mobile login redirect
04edce9  Fix mobile login redirect loop (cross-origin cookie issues)
e95fb1c  Merge pull request #44 - Investigate CI failures
ccd776b  docs: update PRD for v3.1 and regenerate documentation
fb2d195  fix: add TypeScript build step to backend CI job
49cd11c  fix: remove broken CMS admin route
c6dac8a  fix: auto-refresh projects when user is added
18213a3  fix: notify users when added to a project
```
