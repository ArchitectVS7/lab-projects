# TaskMan Integration Handoff — Hub Feature Port

> **For:** Claude Code agent working on `/Users/vs7/Dev/TaskMan`
> **From:** VS7 + Claude (Cowork session, Feb 25 2026)
> **Goal:** Port 5 features from a Productivity Hub prototype into the existing TaskMan application

---

## Executive Summary

VS7 maintains two productivity systems:

1. **TaskMan** (`/Users/vs7/Dev/TaskMan`) — A full-stack task management SaaS with React/TypeScript frontend, Express/Prisma/PostgreSQL backend, Socket.io real-time layer, gamification, and a CLI. Production-grade: 397+ tests, 67 API endpoints, 18+ Prisma models. Feature-complete through Sprint 9.

2. **Productivity Hub** — A single-file HTML dashboard (localStorage, vanilla JS) built as a personal command center. It has features TaskMan lacks: daily/weekly check-ins, AI agent task delegation, and life-domain-based organization.

**The decision:** Port the Hub's unique features INTO TaskMan. TaskMan has the real infrastructure (database, auth, API, tests, real-time). Rebuilding that inside a static HTML page would be impractical. The Hub served as a UX prototype — now those patterns need a proper backend.

---

## What to Build (5 Features)

### Feature 1: Daily Check-in System

**What it does:** A structured daily reflection. The user answers: (1) top 3 priorities, (2) energy level 1–10, (3) blockers/concerns, (4) which domains to focus on today. Check-ins are saved with history viewable over time.

**Why it matters:** TaskMan tracks *what* gets done. Check-ins track *how the person feels* and *what they intend* to do. The combination enables energy-vs-productivity correlation in analytics.

#### Backend

**New Prisma model:**

```prisma
model DailyCheckin {
  id             String   @id @default(uuid())
  userId         String   @map("user_id")
  date           DateTime @db.Date
  priorities     String   @db.Text    // Free text, user's top 3
  energyLevel    Int      @map("energy_level") // 1-10
  blockers       String?  @db.Text
  focusDomains   String[] @map("focus_domains") // Array of domain tag IDs or names
  createdAt      DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, date])
  @@index([userId, date])
  @@map("daily_checkins")
}
```

Add `checkins DailyCheckin[]` to the `User` model.

**New routes** (`backend/src/routes/checkins.ts`):

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/checkins` | Create or update today's check-in |
| `GET` | `/api/checkins` | List check-ins (paginated, date range filter) |
| `GET` | `/api/checkins/today` | Get today's check-in (or 404) |
| `GET` | `/api/checkins/streak` | Get consecutive check-in day count |

**Validation (Zod):**

```typescript
const checkinSchema = z.object({
  priorities: z.string().min(1).max(2000),
  energyLevel: z.number().int().min(1).max(10),
  blockers: z.string().max(2000).optional(),
  focusDomains: z.array(z.string()).optional(),
});
```

Register in `app.ts`: `app.use('/api/checkins', checkinRoutes);`

#### Frontend

**New component:** `CheckinPage.tsx` (or a panel/modal accessible from Dashboard)

UI elements:
- Textarea for priorities (placeholder: "1.\n2.\n3.")
- 1–10 energy picker (clickable circles, fill up to selected value, accent color)
- Textarea for blockers
- Domain tag chips (toggle on/off, colored by domain)
- "Save Check-in" button
- Right sidebar: today's active tasks + check-in history (last 5 entries)

**New route in React Router:** `/checkin` or integrate as a tab on Dashboard.

**New API functions in `frontend/src/lib/api.ts`:**

```typescript
export const checkinsApi = {
  create: (data: CheckinInput) => fetchApi('/checkins', { method: 'POST', body: JSON.stringify(data) }),
  getToday: () => fetchApi('/checkins/today'),
  getAll: (params?: { startDate?: string; endDate?: string }) => fetchApi(`/checkins?${new URLSearchParams(params)}`),
  getStreak: () => fetchApi('/checkins/streak'),
};
```

**React Query keys:** `['checkins']`, `['checkins', 'today']`, `['checkins', 'streak']`

#### Analytics Integration

Extend `/api/analytics/insights` to correlate energy level with task completion:

```typescript
// In analytics.ts insights endpoint, add:
const checkins = await prisma.dailyCheckin.findMany({
  where: { userId, date: { gte: twoWeeksAgo } },
  orderBy: { date: 'desc' },
});

const avgEnergy = checkins.length
  ? Math.round(checkins.reduce((s, c) => s + c.energyLevel, 0) / checkins.length * 10) / 10
  : null;

// Add to response:
checkinInsights: {
  avgEnergy,
  checkinStreak: calculateStreak(checkins),
  energyTrend: checkins.length >= 2
    ? checkins[0].energyLevel - checkins[checkins.length - 1].energyLevel
    : 0,
}
```

---

### Feature 2: Weekly Planning View

**What it does:** A 7-day grid showing tasks distributed across the week with summary stats (completed, added, delegated) and domain color coding. Sits alongside existing Table/Kanban/Calendar views.

**Why it matters:** TaskMan's calendar is monthly. This is a compact weekly planner for sprint-style thinking.

#### Implementation

This is primarily a **frontend feature**. No new backend models needed — it queries existing tasks filtered by `dueDate` within the current week.

**New component:** `WeekView.tsx`

```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Sun │ Mon │ Tue │ Wed │ Thu │ Fri │ Sat │
│  23 │  24 │ *25*│  26 │  27 │  28 │  1  │
│     │     │     │     │     │     │     │
│ ●T1 │ ●T2 │ ●T3 │     │ ●T4 │     │     │
│ ●T5 │     │ ●T6 │     │     │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
Summary: 12 completed · 3 added · 1 delegated
```

- Each day column shows tasks with due dates in that range
- Today's column has accent border
- Tasks show a colored dot by domain/project
- Summary bar at top: tasks completed/added/delegated that week
- Navigation: prev/next week buttons
- Task click opens task detail modal (reuse existing `TaskDetailModal`)

**Integration point:** Add "Week" as a new view option alongside Table/Kanban/Calendar in the tasks page view toggle. The existing `TasksPage.tsx` has a view switcher — add `'week'` to the enum.

**Data source:** Same `tasksApi.getAll()` filtered client-side by `dueDate` within the week range, or add a server-side `?dueDateStart=...&dueDateEnd=...` filter param if not already present. Check existing task query params in `backend/src/routes/tasks.ts`.

---

### Feature 3: AI Agent Delegation System

**What it does:** Users can delegate tasks to specialized AI agents. Six agent types: Research, Writing, Social Media, Code, Outreach, Analytics. One-click delegation from any task. Dedicated "Agent Queue" view shows all delegated tasks grouped by agent.

**Why it matters:** This is the most differentiated feature. It turns TaskMan from a tracker into a command center where work can be dispatched to AI workers.

#### Backend

**New Prisma model:**

```prisma
enum AgentType {
  RESEARCH
  WRITING
  SOCIAL_MEDIA
  CODE
  OUTREACH
  ANALYTICS
}

enum AgentTaskStatus {
  QUEUED
  IN_PROGRESS
  COMPLETED
  FAILED
}

model AgentDelegation {
  id          String          @id @default(uuid())
  taskId      String          @map("task_id")
  userId      String          @map("user_id")
  agentType   AgentType       @map("agent_type")
  status      AgentTaskStatus @default(QUEUED)
  instructions String?        @db.Text
  result       String?        @db.Text
  startedAt    DateTime?      @map("started_at")
  completedAt  DateTime?      @map("completed_at")
  createdAt    DateTime       @default(now()) @map("created_at")

  task Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([taskId])
  @@index([userId, status])
  @@map("agent_delegations")
}
```

Add relations to `Task` and `User` models:
- `Task`: `agentDelegations AgentDelegation[]`
- `User`: `agentDelegations AgentDelegation[]`

**New routes** (`backend/src/routes/agents.ts`):

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/agents/delegate` | Delegate a task to an agent |
| `GET` | `/api/agents/queue` | Get all delegated tasks for current user |
| `GET` | `/api/agents/queue/:agentType` | Get delegated tasks filtered by agent type |
| `PUT` | `/api/agents/:id/status` | Update delegation status (for webhook callbacks) |
| `DELETE` | `/api/agents/:id` | Remove delegation (un-delegate) |

**Validation:**

```typescript
const delegateSchema = z.object({
  taskId: z.string().uuid(),
  agentType: z.enum(['RESEARCH', 'WRITING', 'SOCIAL_MEDIA', 'CODE', 'OUTREACH', 'ANALYTICS']),
  instructions: z.string().max(5000).optional(),
});
```

**Webhook integration:** When a task is delegated, fire a `task.delegated` webhook event through the existing webhook dispatcher. This allows external AI services to pick up the work. Add `'task.delegated'` and `'task.agent_completed'` to the webhook event types.

Register in `app.ts`: `app.use('/api/agents', agentRoutes);`

#### Frontend

**New page:** `AgentQueuePage.tsx` (route: `/agents`)

Layout:
- Top: 6 agent cards in a grid, each showing agent name, icon, role description, and count of assigned tasks
- Bottom: list of all delegated tasks with agent assignment, status badge, and remove button

**Task-level integration:**
- Add a lightning bolt (⚡) button to `TaskCard.tsx` and task detail views
- Clicking opens a small popover/modal to select agent type and optional instructions
- Delegated tasks show a purple "Delegated → [Agent]" badge
- Agent auto-assignment heuristic by project/tag (configurable, but sensible defaults):
  - Code-tagged tasks → CODE agent
  - Marketing-tagged → SOCIAL_MEDIA agent
  - Writing/book-tagged → WRITING agent
  - etc.

**New navigation item:** Add "Agent Queue" to the sidebar nav in `Layout.tsx`, after the existing items.

#### Socket.io Events

Add real-time events for agent status changes:

```typescript
// Server-side: when agent status changes
io.to(`user:${userId}`).emit('agent:status', { delegationId, status, agentType });

// Client-side: listen and invalidate React Query
socket.on('agent:status', () => {
  queryClient.invalidateQueries({ queryKey: ['agents'] });
});
```

---

### Feature 4: Domain / Life-Area Tagging

**What it does:** Tasks can be tagged with a "domain" — a high-level life area like Coding, Marketing, Book Writing, Rock Band, Health. Domains have preset colors and icons. The dashboard shows per-domain progress rings.

**Why it matters:** TaskMan's existing tags are project-scoped and freeform. Domains are user-level, cross-project categories for life management.

#### Implementation Options

**Option A (Recommended): New model** — Cleanest separation, no collision with existing tags.

```prisma
model Domain {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  name      String
  color     String   @default("#6366f1")
  icon      String?  // Emoji or icon identifier
  sortOrder Int      @default(0) @map("sort_order")
  createdAt DateTime @default(now()) @map("created_at")

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks TaskDomain[]

  @@unique([userId, name])
  @@index([userId])
  @@map("domains")
}

model TaskDomain {
  taskId   String @map("task_id")
  domainId String @map("domain_id")

  task   Task   @relation(fields: [taskId], references: [id], onDelete: Cascade)
  domain Domain @relation(fields: [domainId], references: [id], onDelete: Cascade)

  @@id([taskId, domainId])
  @@map("task_domains")
}
```

Add relations:
- `User`: `domains Domain[]`
- `Task`: `domains TaskDomain[]`

**Option B: Extend existing Tag model** — Add a `type` field (`TAG` | `DOMAIN`) and make domains user-scoped instead of project-scoped. Less migration, but muddies the Tag concept.

**New routes** (`backend/src/routes/domains.ts`):

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/domains` | Create a domain |
| `GET` | `/api/domains` | List user's domains with task counts |
| `PUT` | `/api/domains/:id` | Update domain name/color/icon |
| `DELETE` | `/api/domains/:id` | Delete domain |
| `POST` | `/api/domains/:id/tasks/:taskId` | Assign task to domain |
| `DELETE` | `/api/domains/:id/tasks/:taskId` | Remove task from domain |

Register in `app.ts`: `app.use('/api/domains', domainRoutes);`

#### Frontend

- **Domain picker** on task create/edit forms (multi-select chips, colored by domain)
- **Domain filter** in task list sidebar (click domain to filter)
- **Domain cards on Dashboard** showing: icon, name, task count, completion %, progress bar
- **Seed defaults** for VS7: Coding (blue, 💻), Marketing (yellow, 📣), Book Writing (purple, 📖), Rock Band (pink, 🎸), Health (green, 🏃)

---

### Feature 5: Overall Progress Overview Panel

**What it does:** A visual widget on the Dashboard showing total task completion percentage as a circular progress ring, plus per-domain mini-bars. Complements the existing XP/level display.

**Why it matters:** XP rewards effort (gamification). Completion % tracks throughput (productivity). Both are useful, different metrics.

#### Implementation

**Purely frontend** — no new backend needed. Uses existing task data.

**New component:** `ProgressOverview.tsx`

```
┌──────────────────────────────────┐
│  ╭───╮                           │
│  │67%│  67% Overall Completion   │
│  ╰───╯  42 of 63 tasks done     │
│                                  │
│  💻 Coding      ████████░░  80%  │
│  📣 Marketing   █████░░░░░  50%  │
│  📖 Book        ███░░░░░░░  30%  │
│  🎸 Band        ██████░░░░  60%  │
│  🏃 Health      ████████░░  75%  │
└──────────────────────────────────┘
```

- SVG circular progress ring (animated on mount)
- Per-domain horizontal progress bars (colored by domain)
- Counts: "X of Y tasks done"
- Place above or alongside the existing `InsightsWidget` on `DashboardPage.tsx`

---

## Codebase Reference

### Directory Structure

```
/Users/vs7/Dev/TaskMan/
├── backend/
│   ├── prisma/schema.prisma          ← Add new models here
│   ├── src/
│   │   ├── app.ts                    ← Register new routes here
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── tasks.ts
│   │   │   ├── tags.ts               ← Reference for tag pattern
│   │   │   ├── analytics.ts          ← Extend with checkin data
│   │   │   ├── checkins.ts           ← NEW
│   │   │   ├── agents.ts             ← NEW
│   │   │   └── domains.ts            ← NEW
│   │   ├── middleware/
│   │   │   ├── auth.ts               ← AuthRequest type, authenticate middleware
│   │   │   └── errorHandler.ts       ← AppError class
│   │   └── lib/
│   │       ├── prisma.ts             ← Prisma client singleton
│   │       └── swagger.ts            ← API docs (update with new endpoints)
│   └── tests/                        ← Add tests for new routes
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx     ← Add ProgressOverview + checkin prompt
│   │   │   ├── TasksPage.tsx         ← Add Week view option
│   │   │   ├── CheckinPage.tsx       ← NEW
│   │   │   └── AgentQueuePage.tsx    ← NEW
│   │   ├── components/
│   │   │   ├── TaskCard.tsx          ← Add delegate button + domain badges
│   │   │   ├── ProgressOverview.tsx  ← NEW
│   │   │   ├── WeekView.tsx          ← NEW
│   │   │   ├── DomainPicker.tsx      ← NEW
│   │   │   └── CheckinPanel.tsx      ← NEW
│   │   ├── lib/
│   │   │   └── api.ts               ← Add checkinsApi, agentsApi, domainsApi
│   │   ├── store/
│   │   │   └── auth.ts              ← Reference for Zustand pattern
│   │   └── types/index.ts           ← Add new TypeScript types
│   └── tests/
├── cli/                              ← Optional: add `taskman checkin` command
├── docker-compose.yml
└── package.json
```

### Key Patterns to Follow

**Backend route pattern** (see `tags.ts` as template):
- Import: Router, z (Zod), prisma, AppError, authenticate/AuthRequest
- Apply `authenticate` middleware
- Validate UUIDs with regex helper
- Check project membership for authorization
- Use Zod for body validation
- Wrap handlers in try/catch, pass errors to `next()`
- Return 201 for creates, 204 for deletes

**Frontend data fetching** (see `DashboardPage.tsx`):
- Use `useQuery` from TanStack React Query
- Query keys: `['resource']` or `['resource', id]`
- API functions in `frontend/src/lib/api.ts`
- Loading states: use Skeleton components
- Empty states: use `EmptyState` component

**State management:**
- Server state: React Query (don't duplicate in Zustand)
- Client-only state: Zustand with `persist` middleware
- Theme/preferences: `useThemeStore`

**Styling:**
- Tailwind CSS with dark mode (`dark:` prefix)
- Color theme via CSS variables (`var(--primary-base)`)
- Responsive: `sm:`, `md:`, `lg:` breakpoints

### Existing Infrastructure to Leverage

| Need | Use This |
|------|----------|
| Auth on new routes | `authenticate` middleware from `middleware/auth.ts` |
| Input validation | Zod schemas (see any route file) |
| Error handling | `throw new AppError(message, statusCode)` |
| Real-time updates | Socket.io rooms: `user:${userId}`, `task:${taskId}` |
| Webhook dispatch | Existing webhook dispatcher in webhook routes |
| Notifications | `Notification` model + socket event pattern |
| Pagination | Cursor-based pattern used in tasks/comments |
| Testing | Jest for backend, Vitest for frontend, Playwright for E2E |

### Database Migration

After adding new models to `schema.prisma`:

```bash
cd backend
npx prisma migrate dev --name add-checkins-agents-domains
npx prisma generate
```

---

## Implementation Priority

| Order | Feature | Effort | Dependencies |
|-------|---------|--------|--------------|
| 1 | Domain Tagging | 1 sprint | None — foundational, other features reference it |
| 2 | Daily Check-in | 1–2 sprints | Domains (for focusDomains field) |
| 3 | Progress Overview | < 1 sprint | Domains (for per-domain bars) |
| 4 | Weekly Planning View | 1 sprint | None (frontend only, uses existing task data) |
| 5 | AI Agent Delegation | 2–3 sprints | None, but most complex |

**Start with Domains** because check-ins reference them (focusDomains) and the progress overview needs them for per-domain breakdowns.

---

## Testing Requirements

Each feature should include:

- **Backend unit tests** (Jest): Route handlers, validation, edge cases
- **Frontend component tests** (Vitest): Rendering, interactions, loading/error states
- **E2E tests** (Playwright): Full user flows (create checkin, delegate task, etc.)

Follow the existing pattern: `backend/tests/` mirrors `backend/src/routes/`, frontend tests in `frontend/src/__tests__/` or colocated.

The project currently has **397+ passing tests**. New features should maintain or improve that count.

---

## VS7's Preferences

- Dark mode is the default working mode
- Accent color: `#D97757` (warm orange) in the Hub — TaskMan uses configurable themes
- Domains for VS7: Coding (💻 blue), Marketing (📣 yellow), Book Writing (📖 purple), Rock Band (🎸 pink), Health & Hobbies (🏃 green)
- Prefers visual progress indicators (rings, bars) over just numbers
- Wants the AI agent system to eventually connect to real AI services via webhooks