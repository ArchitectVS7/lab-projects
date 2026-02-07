# TaskMan Development Roadmap

## Sprint-Based Feature Checklist

This roadmap organizes TaskMan's evolution into balanced sprints, each containing one substantial feature and complementary quick wins. Based on competitive analysis of Todoist, TickTick, Things 3, Notion, Asana, and Monday.com.

---

## Sprint 1: Foundation ✅ COMPLETED

**Status:** Shipped to `claude/research-competitor-features-VXbt7`

### Core Features
- ✅ **Dark Mode** (3 days) - Light/Dark/System themes with persistence
  - Zustand store (`theme.ts`) with `persist` middleware
  - ThemeToggle component in Layout sidebar
- ✅ **Search & Filtering** (5 days) - Full-text search, advanced filters, date ranges
  - Filter bar in TasksPage (project, status, priority filters)
  - Backend query param filtering in `tasks.ts` route
- ✅ **Notifications System** (5 days) - Real-time notifications with auto-refresh
  - `notifications.ts` backend route with CRUD
  - `NotificationCenter.tsx` frontend component

**Impact:** Modern baseline established. App no longer "vanilla."

---

## Sprint 2: Visual Customization & AI Foundation ✅ COMPLETED

**Status:** All features implemented and verified.

**Goal:** Give users control over appearance + lay groundwork for intelligent features

### Quick Wins
- [x] **Color Theme System** (4-5 days)
  - 5 preset themes (Indigo, Purple, Rose, Emerald, Amber)
  - Theme switcher UI in settings
  - Replace hardcoded colors with CSS variables
  - Implemented in `frontend/src/lib/themes.ts`

- [x] **Layout Templates** (3-4 days)
  - 5 layouts: Compact, Spacious, Minimal, Split, Dashboard-First
  - Layout switcher in user settings
  - Collapsible sidebar for Minimal mode
  - Implemented in `frontend/src/store/layout.ts`
  - **Result:** 5 colors × 5 layouts = 25 UI combinations

### Substantial Task
- [x] **AI-Powered Task Insights** (7 days)
  - Track task completion patterns (day of week, time of day)
  - Calculate velocity metrics (tasks/week, completion rate)
  - Generate insights: "You complete tasks 30% faster on Tuesdays"
  - Smart suggestions: "This task usually takes 2 hours based on history"
  - Backend: Analytics table, aggregation queries
  - Frontend: `InsightsWidget.tsx` dashboard component used in DashboardPage

**Sprint Result:** Users can customize appearance to their taste + see intelligent insights about their productivity patterns.

---

## Sprint 3: Power User Features & Polish ✅ COMPLETED

**Status:** All features implemented and integrated

**Goal:** Speed up workflows for keyboard users + add visual polish

### Quick Wins
- ✅ **Command Palette** (2 days)
  - `Cmd+K` / `Ctrl+K` to open
  - Search tasks, navigate pages, create tasks
  - Keyboard navigation (arrows, Enter, Escape)
  - Keyboard-first workflow (Linear/Notion style)
  - Glass morphism styling with Framer Motion
  - Implemented in `CommandPalette.tsx` + `useCommandPalette.ts`

- ✅ **Glassmorphism + Micro-interactions** (3 days)
  - Frosted glass effect on modals/cards (`GlassCard.tsx`, `glass-card` CSS classes)
  - Button hover scale animations
  - Task completion celebrations (confetti via `TaskCompletionCelebration.tsx`)
  - Smooth scale-in animations on modal open
  - Uses Framer Motion and canvas-confetti

### Substantial Task
- ✅ **Recurring Tasks** (5 days)
  - Daily, weekly, monthly, custom patterns
  - Weekly tasks support specific days (Mon, Wed, Fri, etc.)
  - Monthly tasks support specific day of month
  - Start/end date configuration
  - Automatic generation via cron scheduler (daily at 6 AM)
  - Manual generation endpoint
  - Recurring task badges in table and kanban views
  - Backend: RecurringTask model, `recurring-tasks.ts` route, `recurrence.ts` logic
  - Frontend: `RecurrencePickerModal.tsx` UI, recurring badges with Repeat icon

**Sprint Result:** App feels fast and polished. Power users can fly through tasks with keyboard shortcuts. Recurring tasks automate repetitive work.

---

## Sprint 4: Time Management & Views ✅ COMPLETED

**Status:** All features implemented. Skeleton loading, empty states, time tracking, and calendar view all functional.

**Goal:** Help users visualize and manage time better

### Quick Wins
- [x] **Skeleton Loading States** (2 days)
  - Replace spinners with content placeholders
  - `Skeletons.tsx`: `DashboardSkeleton`, `TableSkeleton`, `KanbanSkeleton`, `ProjectCardSkeleton`
  - View-aware loading (table skeleton vs kanban skeleton based on active view)
  - Shimmer animation pattern with `animate-pulse`

- [x] **Empty State Illustrations** (1 day)
  - `EmptyStates.tsx`: SVG illustrations for tasks, projects, calendar, time entries
  - `EmptyState.tsx`: Generic reusable empty state with action buttons
  - Framer Motion slide-up entrance animations
  - CTA buttons to create first items

### Substantial Task
- [x] **Time Tracking + Calendar View** (7 days)
  - **Time Tracking:**
    - Start/stop timer on tasks (`TimerWidget.tsx`, `timer.ts` Zustand store)
    - Manual time entry (`TaskTimePanel.tsx`)
    - Time estimates vs. actual
    - Pomodoro mode (25min work / 5min break) — full countdown timer in store
  - **Calendar View:**
    - Custom-built monthly calendar (`CalendarView.tsx`) — no external library needed
    - Drag tasks to reschedule (drag-and-drop with overlay)
    - Dedicated calendar page route (`CalendarPage.tsx`)
  - Backend: `time-entries.ts` route with full CRUD
  - Frontend: Timer widget, time panel, calendar component

**Sprint Result:** Users can see tasks in time context + track how long things actually take.

---

## Sprint 5: Team Collaboration ✅ COMPLETED

**Status:** All features implemented including WebSocket real-time, comments, activity logs, and @mentions.

**Goal:** Enable better team communication and real-time updates

### Quick Wins
- [x] **Activity Logs** (3 days)
  - Track all task changes (status, assignee, description)
  - Show "who did what when" on task detail
  - Backend: `activityLog.ts` library for logging changes in task routes
  - Frontend: `ActivityTimeline.tsx` component

- [x] **@Mentions in Comments** (2 days)
  - Parse @username in comments (`mentions.ts` library)
  - Send notification to mentioned user
  - Frontend: `MentionAutocomplete.tsx` autocomplete dropdown

### Substantial Task
- [x] **Comments System + WebSocket Real-time** (10 days)
  - **Comments:**
    - Discussion threads on tasks (`comments.ts` backend route)
    - `CommentEditor.tsx` for composing, `CommentList.tsx` for display
    - Edit/delete own comments
  - **WebSocket:**
    - Socket.IO server (`backend/src/lib/socket.ts`) integrated with HTTP server
    - Real-time task updates (when teammate changes task)
    - Real-time notifications via socket events
    - Presence indicators (`presence:update` events — who's viewing tasks)
    - Frontend: `socket.ts` client, `useSocket.ts` / `useTaskSocket.ts` hooks
    - `ConnectionStatus.tsx` component showing connection state
    - `socket.ts` Zustand store for socket state management
  - ⚠️ **Note:** Rich text editor uses custom implementation, not `slate` or `tiptap`

**Sprint Result:** Team can discuss tasks inline + see live updates without refreshing.

---

## Sprint 6: Flexibility & Attachments ✅ COMPLETED

**Status:** All features implemented and verified. Tests passing (224/224).

**Goal:** Let users customize data model + attach files

### Quick Wins
- [x] **Density Settings** (1 day)
  - Comfortable / Compact / Spacious modes via Zustand store with localStorage persistence
  - CSS custom properties for padding, font sizes, gap, row height applied globally
  - Gmail-style DensityPicker component in Profile settings
  - Density classes applied to document root, affecting all components

- [x] **Framer Motion Integration** (2 days)
  - Page transitions with AnimatePresence in Layout (fade + slide)
  - Modal enter/exit animations (modalOverlay, modalContent variants)
  - Task card hover effects (y-translate + shadow)
  - Drag indicator pulse animation
  - Table row fade-in animations

### Substantial Task
- [x] **Custom Fields + Tags + File Attachments** (10 days)
  - **Tags:**
    - Color-coded tags per project (Tag model, TaskTag join table)
    - TagBadge component with colored dot + removable pills
    - TagPicker with inline tag creation (8 color presets)
    - Tags returned in task API responses (taskInclude updated)
    - Full CRUD API: GET/POST/PUT/DELETE + add/remove from tasks
    - Role-based access: OWNER/ADMIN can manage tags, MEMBER+ can tag tasks
  - **Custom Fields:**
    - CustomFieldDefinition model (TEXT, NUMBER, DATE, DROPDOWN types)
    - CustomFieldValue model with unique task+field constraint
    - CustomFieldsForm component with dynamic field rendering
    - Full CRUD API + get/set values per task (upsert pattern)
    - DROPDOWN type supports JSON array of options
    - Role-based access: OWNER/ADMIN manage definitions, MEMBER+ set values
  - **File Attachments:**
    - Attachment model with file metadata (name, mime, size, path)
    - Multer-based upload with disk storage, unique filenames
    - 10MB size limit, MIME type allowlist (images, docs, archives)
    - FileAttachments component with drag-and-drop upload zone
    - File list with icons, sizes, download, and delete actions
    - File cleanup on delete (removes from disk)
    - Role-based access: MEMBER+ can upload, uploader or ADMIN/OWNER can delete
  - Backend: Prisma migration, 3 new route files, Zod validation throughout
  - Frontend: 4 new components, API client modules, TypeScript types
  - Tests: 224 passing (including Sprint 6 test suite)

**Sprint Result:** Users can structure data their way + attach supporting files.

---

## Sprint 7: Differentiation - Analytics & Focus ⚠️ PARTIAL

**Status:** Focus Mode implemented. Creator Dashboard and Smart Dependencies not started.

**Goal:** Build features competitors don't have

### Quick Win
- [x] **Focus Mode** (3 days)
  - Hide sidebar — standalone full-screen route (`/focus`) outside Layout wrapper
  - Shows top 1-3 priority tasks with large animated cards
  - Distraction-free view with task completion animations (AnimatePresence)
  - Minimal UI with large task cards sorted by priority then due date
  - "Completed today" counter
  - Implemented in `FocusPage.tsx` with protected route in `App.tsx`
  - ⚠️ **Not implemented:** "Don't break the chain" streak tracker

### Substantial Tasks
- [ ] **Creator Accountability Dashboard** (5 days)
  - Who creates the most tasks?
  - Self-assigned vs. delegated ratio
  - Task velocity by creator
  - Bottleneck identification
  - Position as "anti-busywork" feature

- [ ] **Smart Task Dependencies** (7 days)
  - Link tasks as blockers/dependencies
  - Critical path visualization (Gantt-style)
  - Auto-adjust due dates when dependency shifts
  - "What's blocking me today?" view
  - Backend: Dependencies table, graph algorithms
  - Frontend: Dependency picker, timeline chart

**Sprint Result:** Focus mode provides distraction-free deep work. Creator Dashboard and Smart Dependencies remain as future work.

---

## Sprint 8: Developer Experience & Scale ⚠️ PARTIAL

**Status:** Pagination system implemented. CLI Tool, Public API, and Webhooks not started.

**Goal:** Attract developer users + prepare for scale

### Quick Win
- [ ] **CLI Tool** (4 days)
  - `taskman create "Write docs" --project="TaskMan" --priority=high`
  - List tasks in terminal
  - Quick capture from command line
  - Position as "developer-first" tool

### Substantial Tasks
- [ ] **Public API + Webhooks** (10 days)
  - RESTful API with API keys
  - Webhooks for task events (created, updated, completed)
  - Rate limiting, pagination, filtering
  - Auto-generated OpenAPI docs
  - Position as "task manager for developers"

- [x] **Pagination System** (3 days) ✅ IMPLEMENTED
  - Backend: Offset-based pagination with `skip`/`take` in `tasks.ts` and `projects.ts`
  - Backward-compatible: Returns raw array without `page` param, envelope `{ data, pagination }` with it
  - Frontend: `Pagination.tsx` component with page buttons, prev/next, ellipsis for large page counts
  - "Showing X-Y of Z" display text
  - Page auto-resets on filter change
  - Limit clamped to max 100 per page
  - Backend integration tests (`pagination.test.ts`)
  - ⚠️ **Note:** Uses offset-based pagination (not cursor-based as originally planned)

**Sprint Result:** Pagination prevents performance issues at scale. CLI and Public API remain as future work.

---

## Sprint 9: Advanced Capabilities ⚠️ PARTIAL

**Status:** Keyboard Shortcuts Guide and Export Data implemented. Natural Language Input not started.

**Goal:** Cover remaining competitive features

### Quick Wins
- [x] **Keyboard Shortcuts Guide** (1 day)
  - `?` key opens shortcuts modal (skips when focus is in inputs)
  - `KeyboardShortcutsModal.tsx` documents all keyboard commands organized by group
  - Platform-aware modifier key display (⌘ on Mac, Ctrl on others)
  - `shortcutsModal.ts` Zustand store for open/close state
  - Framer Motion AnimatePresence for enter/exit
  - ⚠️ **Not implemented:** Printable cheat sheet export

- [x] **Export Data** (2 days)
  - `export.ts` backend route supporting CSV and JSON formats
  - Proper CSV escaping (commas, quotes, newlines)
  - Filters by user's project membership with optional projectId filter
  - Frontend: `exportApi.downloadTasks()` with blob download via `URL.createObjectURL`
  - Export dropdown menu in TasksPage header (Export CSV / Export JSON)
  - Backend integration tests (`export.test.ts`)

### Substantial Task
- [ ] **Natural Language Input** (10 days)
  - Parse "Buy milk tomorrow at 3pm in Project X"
  - Extract title, project, due date, priority
  - Use NLP library (compromise, chrono-node)
  - Smart quick-add bar
  - Todoist-style experience

**Sprint Result:** Keyboard shortcuts discoverable. Data export enables portability. Natural language input remains as future work.

---

## Sprint 10: Nice-to-Have Features

**Status:** Not started.

**Goal:** Bonus features if time permits

### Medium Tasks
- [ ] **Habit Tracking** (5 days)
  - Daily habits alongside tasks
  - Streak tracking, calendar visualization
  - TickTick's differentiator

- [ ] **Collaborative Estimation** (4 days)
  - Planning poker for team estimation
  - T-shirt sizing, Fibonacci points
  - Velocity tracking

- [ ] **Voice Input** (7 days)
  - Voice-to-task creation
  - Use Web Speech API
  - Mobile-friendly

- [ ] **Burnout Prevention Dashboard** (5 days)
  - Warn when team member is over-assigned
  - Workload balancing suggestions
  - Unique feature nobody has

---

## Critical Tech Debt (Address Alongside Sprints)

These should be tackled incrementally, not as separate sprints:

- [x] **Pagination** (Sprint 8) - ✅ Offset-based pagination on tasks and projects routes
- [~] **Rate Limiting** (Sprint 8) - ⚠️ PARTIAL: Auth routes only (`express-rate-limit` on login/register). Not API-wide.
- [ ] **E2E Testing** (Ongoing) - No Playwright/Cypress setup. Only Jest + supertest unit/integration tests exist.
- [x] **Error Boundaries** (Sprint 3) - ✅ `ErrorBoundary.tsx` component, used in `main.tsx`
- [ ] **Performance Monitoring** (Sprint 6) - No Sentry or similar integrated
- [~] **Mobile Responsiveness Audit** (Sprint 4) - ⚠️ Tailwind responsive classes used throughout (`sm:`, `md:`, `lg:` breakpoints) but no formal audit conducted

---

## UI Library Integrations (Use as Needed)

Install these incrementally when relevant:

- ✅ **Framer Motion** - Animations, page transitions (Sprint 3, 6) - INSTALLED
- ✅ **canvas-confetti** - Task completion celebrations (Sprint 3) - INSTALLED
- ✅ **socket.io-client** - WebSocket real-time (Sprint 5) - INSTALLED
- ✅ **multer** - File upload handling (Sprint 6) - INSTALLED
- [ ] **shadcn/ui** - Dialogs, dropdowns (Future sprints)
- [ ] **react-colorful** - Color picker (Sprint 2) — not needed, preset colors used instead
- [x] **Calendar view** (Sprint 4) — Custom-built, no external library needed
- [x] **Comment editor** (Sprint 5) — Custom-built, not `slate` or `tiptap`
- [ ] **Aceternity UI** - Landing page wow factor (Marketing)

---

## Strategic Positioning

**TaskMan's Identity:**
- "The task manager for developers" (leverage TypeScript, API-first)
- "Fast, focused, no-nonsense" (anti-bloatware vs. Notion/Monday.com)
- "Privacy-first, self-hostable" (Docker deployment option)
- "Beautiful AND functional" (design + engineering balance)

**Unique Selling Points After Completion:**
1. Creator accountability analytics (Sprint 7) - "Stop busywork"
2. Smart task dependencies (Sprint 7) - "See your critical path"
3. Developer-first (Sprint 8) - "API, CLI, webhooks"
4. Focus mode (Sprint 7) - "Deep work built-in" ✅ IMPLEMENTED
5. Burnout prevention (Sprint 10) - "Protect your team"

---

## Competitor Feature Parity Checklist

Comparing TaskMan to Todoist, TickTick, Things 3, Notion, Asana, Monday.com:

### Must-Have (Table Stakes)
- ✅ Dark mode
- ✅ Search & filtering
- ✅ Notifications
- ✅ Recurring tasks (Sprint 3)
- ✅ Calendar view (Sprint 4)
- ✅ Time tracking (Sprint 4)
- ✅ Comments (Sprint 5)
- ✅ File attachments (Sprint 6)
- ✅ Custom fields/tags (Sprint 6)
- ✅ Activity logs (Sprint 5)

### High-Value Differentiators
- ✅ AI-powered insights (Sprint 2)
- ✅ Command palette (Sprint 3)
- ✅ Real-time WebSocket (Sprint 5)
- [ ] Natural language input (Sprint 9)
- [ ] Public API (Sprint 8)
- [ ] Creator analytics (Sprint 7) - UNIQUE
- [ ] Smart dependencies (Sprint 7) - UNIQUE
- ✅ Focus mode (Sprint 7) - UNIQUE

### Nice-to-Have
- [ ] Voice input (Sprint 10)
- [ ] Habit tracking (Sprint 10)
- [ ] Collaborative estimation (Sprint 10)
- [ ] Integrations (Post-MVP)

---

## Effort Summary by Sprint

| Sprint | Quick Wins | Substantial Task | Total Days | Status |
|--------|-----------|------------------|------------|--------|
| 1 ✅    | 8 days    | -                | 8 days     | Complete |
| 2 ✅    | 7-9 days  | 7 days           | 14-16 days | Complete |
| 3 ✅    | 5 days    | 5 days           | 10 days    | Complete |
| 4 ✅    | 3 days    | 7 days           | 10 days    | Complete |
| 5 ✅    | 5 days    | 10 days          | 15 days    | Complete |
| 6 ✅    | 3 days    | 10 days          | 13 days    | Complete |
| 7 ⚠️    | 3 days    | 12 days          | 15 days    | Partial (Focus Mode only) |
| 8 ⚠️    | 4 days    | 13 days          | 17 days    | Partial (Pagination only) |
| 9 ⚠️    | 3 days    | 10 days          | 13 days    | Partial (Shortcuts + Export) |
| 10     | -         | 21 days          | 21 days    | Not started |

**Total Development Time:** ~136 days (6-7 months) for complete roadmap

**MVP (Sprints 1-6):** ✅ COMPLETE — ~76 days of competitive feature parity achieved

**Remaining work:** Sprint 7 substantial tasks (12 days), Sprint 8 quick win + substantial (14 days), Sprint 9 substantial (10 days), Sprint 10 (21 days) = ~57 days

---

## Next Immediate Actions

MVP (Sprints 1-6) is complete. Remaining high-impact items to prioritize:

1. **Creator Accountability Dashboard** (Sprint 7, 5 days)
   - Backend: Analytics queries for task creation patterns
   - Frontend: Dashboard with creator metrics, bottleneck identification
   - High differentiation value

2. **Smart Task Dependencies** (Sprint 7, 7 days)
   - Backend: Dependencies table, graph algorithms
   - Frontend: Dependency picker, timeline/Gantt chart
   - Critical for project management credibility

3. **Public API + Webhooks** (Sprint 8, 10 days)
   - API key authentication layer
   - Webhook event system
   - OpenAPI auto-documentation
   - Positions TaskMan as developer-first tool

4. **Natural Language Input** (Sprint 9, 10 days)
   - NLP parsing with chrono-node or compromise
   - Smart quick-add bar
   - Major UX differentiator

**Quick wins available:** CLI Tool (Sprint 8, 4 days), Focus Mode streak tracker (1 day), Printable shortcuts cheat sheet (0.5 days)

---

## Research Sources

**Task Manager Reviews:**
- [26 Best Personal Task Management Software Reviewed in 2026](https://thedigitalprojectmanager.com/tools/best-personal-task-management-software/)
- [7 best to do list apps of 2026 | Zapier](https://zapier.com/blog/best-todo-list-apps/)
- [Todoist vs TickTick (2026): Task Apps Compared](https://toolfinder.co/comparisons/todoist-vs-ticktick)

**Platform Comparisons:**
- [Notion vs Asana vs Monday.com (2025 Comparison)](https://ones.com/blog/notion-vs-asana-vs-monday-com/)
- [Notion Vs Asana Vs Monday Work Management Comparison 2026](https://monday.com/blog/project-management/notion-vs-asana-vs-monday-work-management/)

**UI/UX Trends:**
- [10 UI/UX Design Trends That Will Dominate 2025 & Beyond](https://www.bootstrapdash.com/blog/ui-ux-design-trends)
- [Dark Mode vs Light Mode: The Complete UX Guide for 2025](https://altersquare.io/dark-mode-vs-light-mode-the-complete-ux-guide-for-2025/)

**React Libraries:**
- [14 Best React UI Component Libraries in 2026](https://www.untitledui.com/blog/react-component-libraries)
- [React UI libraries in 2025](https://makersden.io/blog/react-ui-libs-2025-comparing-shadcn-radix-mantine-mui-chakra)
- [Motion — JavaScript & React animation library](https://motion.dev)
- [10+ Trending Animated UI Component Libraries (2025 Edition)](https://dev.to/jay_sarvaiya_reactjs/10-trending-animated-ui-component-libraries-2025-edition-1af4)

---

## Current Tech Stack

**Frontend:** React 18.2, TypeScript 5.4, Vite 5.1, Tailwind CSS 3.4, Zustand 4.5, TanStack Query 5.28, dnd-kit 6.1, Framer Motion, socket.io-client

**Backend:** Node.js 18+, TypeScript 5.4, Express 4.18, PostgreSQL 16, Prisma 5.10, Zod 3.22, Socket.IO, Multer

**Current Features:** Authentication, Projects, Tasks (table + kanban + calendar), Role-based permissions, Dashboard, Dark mode ✅, Search ✅, Notifications ✅, Command Palette ✅, Glassmorphism ✅, Recurring Tasks ✅, Time Tracking ✅, Calendar View ✅, Comments ✅, Activity Logs ✅, @Mentions ✅, WebSocket Real-time ✅, Tags ✅, Custom Fields ✅, File Attachments ✅, Density Settings ✅, Focus Mode ✅, Pagination ✅, Export Data ✅, Keyboard Shortcuts Guide ✅, Skeleton Loading ✅, Empty States ✅, Error Boundaries ✅, AI Insights ✅, Color Themes ✅, Layout Templates ✅
