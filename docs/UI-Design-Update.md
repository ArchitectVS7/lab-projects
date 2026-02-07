# TaskMan Development Roadmap

## Sprint-Based Feature Checklist

This roadmap organizes TaskMan's evolution into balanced sprints, each containing one substantial feature and complementary quick wins. Based on competitive analysis of Todoist, TickTick, Things 3, Notion, Asana, and Monday.com.

---

## Sprint 1: Foundation ✅ COMPLETED

**Status:** Shipped to `claude/research-competitor-features-VXbt7`

### Core Features
- ✅ **Dark Mode** (3 days) - Light/Dark/System themes with persistence
- ✅ **Search & Filtering** (5 days) - Full-text search, advanced filters, date ranges
- ✅ **Notifications System** (5 days) - Real-time notifications with auto-refresh

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
  - Effort: Create `themes.ts`, update Tailwind config, add theme picker modal

- [x] **Layout Templates** (3-4 days)
  - 5 layouts: Compact, Spacious, Minimal, Split, Dashboard-First
  - Layout switcher in user settings
  - Collapsible sidebar for Minimal mode
  - **Result:** 5 colors × 5 layouts = 25 UI combinations

### Substantial Task
- [x] **AI-Powered Task Insights** (7 days)
  - Track task completion patterns (day of week, time of day)
  - Calculate velocity metrics (tasks/week, completion rate)
  - Generate insights: "You complete tasks 30% faster on Tuesdays"
  - Smart suggestions: "This task usually takes 2 hours based on history"
  - Backend: Analytics table, aggregation queries
  - Frontend: Insights dashboard widget

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

- ✅ **Glassmorphism + Micro-interactions** (3 days)
  - Frosted glass effect on modals/cards
  - Button hover scale animations
  - Task completion celebrations (confetti)
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
  - Backend: RecurringTask model, recurrence logic, API endpoints
  - Frontend: RecurrencePickerModal UI, recurring badges

**Sprint Result:** App feels fast and polished. Power users can fly through tasks with keyboard shortcuts. Recurring tasks automate repetitive work.

---

## Sprint 4: Time Management & Views

**Goal:** Help users visualize and manage time better

### Quick Wins
- [ ] **Skeleton Loading States** (2 days)
  - Replace spinners with content placeholders
  - Dashboard, projects, tasks skeletons
  - Perceived performance boost

- [ ] **Empty State Illustrations** (1 day)
  - Friendly illustrations for empty screens
  - Use undraw.co or humaaans
  - Onboarding guidance

### Substantial Task
- [ ] **Time Tracking + Calendar View** (7 days)
  - **Time Tracking:**
    - Start/stop timer on tasks
    - Manual time entry
    - Time estimates vs. actual
    - Pomodoro mode (25min work / 5min break)
  - **Calendar View:**
    - Monthly calendar showing due dates
    - Drag tasks to reschedule
    - Week view option
  - Backend: Time entries table
  - Frontend: Calendar component (use `react-big-calendar` or build custom)

**Sprint Result:** Users can see tasks in time context + track how long things actually take.

---

## Sprint 5: Team Collaboration

**Goal:** Enable better team communication and real-time updates

### Quick Wins
- [ ] **Activity Logs** (3 days)
  - Track all task changes (status, assignee, description)
  - Show "who did what when" on task detail
  - Backend: Activity table, middleware to log changes
  - Frontend: Activity timeline component

- [ ] **@Mentions in Comments** (2 days)
  - Parse @username in comments
  - Send notification to mentioned user
  - Frontend: Autocomplete dropdown

### Substantial Task
- [ ] **Comments System + WebSocket Real-time** (10 days)
  - **Comments:**
    - Discussion threads on tasks
    - Rich text editor (use `slate` or `tiptap`)
    - Edit/delete own comments
  - **WebSocket:**
    - Real-time task updates (when teammate changes task)
    - Real-time notifications (replace 30s polling)
    - Presence indicators (who's viewing this task)
  - Backend: Comments table, WebSocket server setup
  - Frontend: WebSocket client, comment UI

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

## Sprint 7: Differentiation - Analytics & Focus

**Goal:** Build features competitors don't have

### Quick Win
- [ ] **Focus Mode** (3 days)
  - Hide sidebar, show only 1-3 top-priority tasks
  - Distraction-free view
  - "Don't break the chain" streak tracker
  - Minimal UI with large task cards

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

**Sprint Result:** Unique features that set TaskMan apart. Team can see who's overloading whom + understand project critical paths.

---

## Sprint 8: Developer Experience & Scale

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

- [ ] **Pagination System** (3 days) ⚠️ CRITICAL
  - Backend: Cursor-based pagination
  - Frontend: Infinite scroll or page buttons
  - Required before scaling

**Sprint Result:** Developers can integrate TaskMan into their workflows. App won't break at scale.

---

## Sprint 9: Advanced Capabilities

**Goal:** Cover remaining competitive features

### Quick Wins
- [ ] **Keyboard Shortcuts Guide** (1 day)
  - `?` to show shortcuts modal
  - Document all keyboard commands
  - Printable cheat sheet

- [ ] **Export Data** (2 days)
  - Export tasks to CSV/JSON
  - Data portability
  - GDPR compliance

### Substantial Task
- [ ] **Natural Language Input** (10 days)
  - Parse "Buy milk tomorrow at 3pm in Project X"
  - Extract title, project, due date, priority
  - Use NLP library (compromise, chrono-node)
  - Smart quick-add bar
  - Todoist-style experience

**Sprint Result:** Users can capture tasks naturally without form fields.

---

## Sprint 10: Nice-to-Have Features

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

- [ ] **Pagination** (Sprint 8) - CRITICAL before scaling
- [ ] **Rate Limiting** (Sprint 8) - Protect API
- [ ] **E2E Testing** (Ongoing) - Set up Playwright, add tests per feature
- [ ] **Error Boundaries** (Sprint 3) - Wrap async operations
- [ ] **Performance Monitoring** (Sprint 6) - Add Sentry or similar
- [ ] **Mobile Responsiveness Audit** (Sprint 4) - Ensure all features work on mobile

---

## UI Library Integrations (Use as Needed)

Install these incrementally when relevant:

- ✅ **Framer Motion** - Animations, page transitions (Sprint 3, 6) - INSTALLED
- ✅ **canvas-confetti** - Task completion celebrations (Sprint 3) - INSTALLED
- [ ] **shadcn/ui** - Dialogs, dropdowns (Future sprints)
- [ ] **react-colorful** - Color picker (Sprint 2)
- [ ] **react-big-calendar** or **FullCalendar** - Calendar view (Sprint 4)
- [ ] **slate** or **tiptap** - Rich text editor for comments (Sprint 5)
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
4. Focus mode (Sprint 7) - "Deep work built-in"
5. Burnout prevention (Sprint 10) - "Protect your team"

---

## Competitor Feature Parity Checklist

Comparing TaskMan to Todoist, TickTick, Things 3, Notion, Asana, Monday.com:

### Must-Have (Table Stakes)
- ✅ Dark mode
- ✅ Search & filtering
- ✅ Notifications
- ✅ Recurring tasks (Sprint 3)
- [ ] Calendar view (Sprint 4)
- [ ] Time tracking (Sprint 4)
- [ ] Comments (Sprint 5)
- [ ] File attachments (Sprint 6)
- [ ] Custom fields/tags (Sprint 6)
- [ ] Activity logs (Sprint 5)

### High-Value Differentiators
- [ ] AI-powered insights (Sprint 2)
- ✅ Command palette (Sprint 3)
- [ ] Real-time WebSocket (Sprint 5)
- [ ] Natural language input (Sprint 9)
- [ ] Public API (Sprint 8)
- [ ] Creator analytics (Sprint 7) - UNIQUE
- [ ] Smart dependencies (Sprint 7) - UNIQUE
- [ ] Focus mode (Sprint 7) - UNIQUE

### Nice-to-Have
- [ ] Voice input (Sprint 10)
- [ ] Habit tracking (Sprint 10)
- [ ] Collaborative estimation (Sprint 10)
- [ ] Integrations (Post-MVP)

---

## Effort Summary by Sprint

| Sprint | Quick Wins | Substantial Task | Total Days |
|--------|-----------|------------------|------------|
| 1 ✅    | 8 days    | -                | 8 days     |
| 2 ✅    | 7-9 days  | 7 days           | 14-16 days |
| 3 ✅    | 5 days    | 5 days           | 10 days    |
| 4      | 3 days    | 7 days           | 10 days    |
| 5      | 5 days    | 10 days          | 15 days    |
| 6      | 3 days    | 10 days          | 13 days    |
| 7      | 3 days    | 12 days          | 15 days    |
| 8      | 4 days    | 13 days          | 17 days    |
| 9      | 3 days    | 10 days          | 13 days    |
| 10     | -         | 21 days          | 21 days    |

**Total Development Time:** ~136 days (6-7 months) for complete roadmap

**MVP (Sprints 1-6):** ~76 days (3.5 months) for competitive feature parity

---

## Next Immediate Actions

From Sprint 2, prioritize these first:

1. **Color Theme System** (4-5 days)
   - File: `frontend/src/lib/themes.ts`
   - Update Tailwind config with CSS variables
   - Create theme picker modal

2. **Layout Templates** (3-4 days)
   - File: `frontend/src/store/layout.ts`
   - 5 layout variants
   - Layout switcher UI

3. **AI Task Insights Foundation** (7 days)
   - Backend: Analytics aggregation
   - Track completion patterns
   - Generate insights

**Or** if you prefer immediate user-facing impact, jump to Sprint 3:
- Command palette (2 days) - Instant power user love
- Glassmorphism polish (3 days) - Visual wow factor

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

**Frontend:** React 18.2, TypeScript 5.4, Vite 5.1, Tailwind CSS 3.4, Zustand 4.5, TanStack Query 5.28, dnd-kit 6.1

**Backend:** Node.js 18+, TypeScript 5.4, Express 4.18, PostgreSQL 16, Prisma 5.10, Zod 3.22

**Current Features:** Authentication, Projects, Tasks (table + kanban), Role-based permissions, Dashboard, Dark mode ✅, Search ✅, Notifications ✅, Command Palette ✅, Glassmorphism ✅, Recurring Tasks ✅
