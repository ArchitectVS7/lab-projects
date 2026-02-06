# TaskMan Roadmap Evaluation Report
## PRD Alignment, Testing Requirements, and Strategic Impact Analysis
### Date: 2026-02-06

---

## Executive Summary

This report evaluates all 10 sprints from the TaskMan Development Roadmap against the current PRD, test infrastructure, and implementation plan. Each feature is assessed for:
- **PRD Impact**: Does this require PRD updates? New sections? Architectural changes?
- **Testing Requirements**: Backend tests, frontend tests, E2E scenarios
- **Implementation Risks**: Breaking changes, dependencies, complexity
- **Strategic Value**: How this differentiates TaskMan from competitors

### Key Findings
- **Sprint 2 (Color Themes & AI Insights)**: Already partially implemented! Analytics backend exists with bugs fixed during audit
- **Sprint 5 (Comments & WebSocket)**: Major architectural shift, requires PRD overhaul
- **Sprint 7 (Creator Analytics & Dependencies)**: High strategic value, moderate complexity
- **Sprint 8 (Pagination)**: CRITICAL tech debt, must prioritize

---

## SPRINT 1: Foundation ✅ COMPLETED

### Status: SHIPPED
All features (Dark Mode, Search & Filtering, Notifications) are already implemented.

### Audit Note
During the comprehensive audit, we discovered:
- ✅ **Notifications System** exists but has **zero test coverage**
- ✅ Backend routes working at `/api/notifications`
- ❌ Not documented in IMPLEMENTATION_PLAN.md or PRD.md

### Required Actions for Sprint 1
1. **Add notification tests** (HIGH PRIORITY)
   ```
   backend/tests/notifications.test.ts (NEW)
   Required Tests:
   - GET /api/notifications → returns user's notifications
   - POST /api/notifications/mark-read/:id → marks as read
   - DELETE /api/notifications/:id → deletes notification
   - Authorization: users only see own notifications
   - Notifications created on project/task events
   ```

2. **Update PRD.md** - Add Section 2.9: Notifications
   ```markdown
   ## 2.9 Notifications System
   - GET /api/notifications - List user's notifications
   - POST /api/notifications/mark-read/:id - Mark as read
   - DELETE /api/notifications/:id - Delete notification
   - Real-time notification creation on task/project events
   - Frontend: Notification bell icon, unread count badge
   ```

3. **Update IMPLEMENTATION_PLAN.md** - Document Sprint 1 completion

---

## SPRINT 2: Visual Customization & AI Foundation

### Feature 2.1: Color Theme System (4-5 days)

#### PRD Impact: ⚠️ MINOR UPDATE REQUIRED
**New PRD Section**: 2.11 User Preferences
```markdown
## 2.11 User Preferences
### 2.11.1 Color Themes
- Endpoint: GET/PUT /api/auth/preferences
- Supported themes: Indigo (default), Purple, Rose, Emerald, Amber
- Theme stored in user preferences table
- Frontend: Theme picker in settings, CSS variables for colors
```

#### Implementation Strategy
**Backend Changes:**
```typescript
// Add to User model (backend/prisma/schema.prisma)
model User {
  // ... existing fields
  theme      String   @default("indigo")  // NEW
}

// Add to PUT /api/auth/profile (backend/src/routes/auth.ts)
const updateProfileSchema = z.object({
  name: z.string().trim().min(2).optional(),
  avatarUrl: z.string().url().optional().nullable(),
  theme: z.enum(['indigo', 'purple', 'rose', 'emerald', 'amber']).optional(), // NEW
});
```

**Frontend Changes:**
```typescript
// frontend/src/lib/themes.ts (NEW)
export const themes = {
  indigo: { primary: '#6366f1', ... },
  purple: { primary: '#a855f7', ... },
  // ... 3 more themes
};

// frontend/src/components/ThemePicker.tsx (NEW)
// Theme switcher modal with color swatches
```

#### Testing Requirements
**Backend Tests** (add to `backend/tests/auth.test.ts`):
```typescript
describe('Theme Management', () => {
  test('updates user theme → 200', async () => {
    await request(app)
      .put('/api/auth/profile')
      .set('Cookie', authCookie)
      .send({ theme: 'purple' })
      .expect(200);
  });

  test('rejects invalid theme → 400', async () => {
    await request(app)
      .put('/api/auth/profile')
      .set('Cookie', authCookie)
      .send({ theme: 'invalid' })
      .expect(400);
  });

  test('theme persists across login → 200', async () => {
    // Update theme, logout, login, verify theme returned
  });
});
```

**Frontend Tests** (NEW):
```typescript
// frontend/src/components/__tests__/ThemePicker.test.tsx
describe('ThemePicker', () => {
  test('renders all 5 themes');
  test('applies theme on selection');
  test('persists theme to backend');
  test('shows current theme as selected');
});
```

#### Migration Required
```sql
-- Add theme column to users table
ALTER TABLE users ADD COLUMN theme VARCHAR(20) DEFAULT 'indigo';
```

#### Risks: 🟢 LOW
- Non-breaking change (adds column with default)
- Frontend-heavy, minimal backend logic
- No impact on existing features

#### Strategic Value: ⭐⭐⭐ MEDIUM
- Table stakes feature (competitors have it)
- Low differentiation, but expected by users
- Quick win for user satisfaction

---

### Feature 2.2: Layout Templates (3-4 days)

#### PRD Impact: ⚠️ MINOR UPDATE REQUIRED
**Update PRD Section 2.11**: Add layout preference
```markdown
### 2.11.2 Layout Preferences
- Supported layouts: Compact, Spacious, Minimal, Split, Dashboard-First
- Layout stored in localStorage (no backend persistence)
- Affects sidebar visibility, spacing, component density
```

#### Implementation Strategy
**Frontend Only** (No backend changes):
```typescript
// frontend/src/store/layout.ts (NEW)
interface LayoutState {
  layout: 'compact' | 'spacious' | 'minimal' | 'split' | 'dashboard-first';
  sidebarCollapsed: boolean;
  setLayout: (layout: Layout) => void;
}

// Uses Zustand persist middleware, localStorage key: 'layout-preferences'
```

#### Testing Requirements
**Frontend Tests Only**:
```typescript
// frontend/src/store/__tests__/layout.test.ts
describe('Layout Store', () => {
  test('defaults to compact layout');
  test('persists layout to localStorage');
  test('toggles sidebar collapse');
  test('loads persisted layout on mount');
});

// E2E Tests (Playwright - NEW)
test('layout switcher changes UI density', async ({ page }) => {
  // Navigate to settings, change layout, verify spacing changes
});
```

#### Risks: 🟢 LOW
- Frontend-only feature
- No API changes, no database migration
- Purely presentational

#### Strategic Value: ⭐⭐ LOW
- Nice-to-have customization
- Low differentiation (basic UX flexibility)
- Effort could be better spent on unique features

---

### Feature 2.3: AI-Powered Task Insights (7 days)

#### PRD Impact: 🔴 MAJOR UPDATE REQUIRED
**This feature is already 70% implemented!**

During the audit, we discovered:
- ✅ Backend route exists at `/api/analytics/insights`
- ✅ Velocity calculation implemented (week-over-week)
- ✅ Most productive day analysis implemented
- ✅ Bugs fixed (import errors, wrong request type)
- ❌ **Zero test coverage**
- ❌ Not documented in PRD or IMPLEMENTATION_PLAN

**New PRD Section**: 2.10 Analytics & Insights
```markdown
## 2.10 Analytics & Insights

### 2.10.1 Productivity Insights
- **Endpoint**: GET /api/analytics/insights
- **Requires**: Authentication
- **Returns**:
  - Velocity metrics (tasks completed this week vs. last week)
  - Change percentage (e.g., "+30% faster this week")
  - Most productive day of week (based on 2-week history)
  - Contextual insight message
- **Frontend**: Dashboard widget showing insights
- **Refresh**: On-demand or dashboard load
```

#### Implementation Strategy
**Backend** (Already exists - `backend/src/routes/analytics.ts`):
```typescript
// ✅ Already implemented:
// - GET /insights → velocity, patterns, insight message
// - Tracks completed tasks by week
// - Calculates most productive day
// - Generates contextual insights

// 📝 TODO: Add more sophisticated insights:
// - Time of day patterns (morning vs. afternoon productivity)
// - Task completion time estimates (based on historical data)
// - Burnout risk detection (too many tasks assigned)
```

**Frontend** (NEW):
```typescript
// frontend/src/components/InsightsDashboard.tsx (NEW)
export function InsightsDashboard() {
  const { data } = useQuery({
    queryKey: ['analytics', 'insights'],
    queryFn: () => analyticsApi.getInsights(),
  });

  return (
    <div className="insights-widget">
      <h3>Your Productivity Insights</h3>
      <div className="velocity">
        <span>{data.velocity.thisWeek} tasks this week</span>
        <Badge variant={data.velocity.changePercent > 0 ? 'success' : 'warning'}>
          {data.velocity.changePercent}%
        </Badge>
      </div>
      <p>{data.insight}</p>
      <p className="subtle">You're most productive on {data.patterns.mostProductiveDay}s</p>
    </div>
  );
}
```

#### Testing Requirements
**Backend Tests** (HIGH PRIORITY - NEW):
```typescript
// backend/tests/analytics.test.ts (NEW FILE)
describe('Analytics: Productivity Insights', () => {
  test('GET /api/analytics/insights with tasks → 200', async () => {
    // Create tasks completed in different weeks
    // Verify velocity calculation
    // Verify most productive day calculation
  });

  test('GET /api/analytics/insights with zero tasks → 200', async () => {
    const res = await request(app)
      .get('/api/analytics/insights')
      .set('Cookie', authCookie)
      .expect(200);

    expect(res.body.insight).toBe("Complete some tasks to unlock insights!");
  });

  test('velocity calculation correctness', async () => {
    // Create 5 tasks completed this week, 3 last week
    // Verify: thisWeek=5, lastWeek=3, changePercent=+67%
  });

  test('most productive day with tie → first day alphabetically', async () => {
    // Create equal tasks on Monday and Tuesday
    // Verify consistent tie-breaking
  });

  test('requires authentication → 401', async () => {
    await request(app).get('/api/analytics/insights').expect(401);
  });
});
```

**Frontend Tests** (NEW):
```typescript
// frontend/src/components/__tests__/InsightsDashboard.test.tsx
describe('InsightsDashboard', () => {
  test('displays velocity metrics');
  test('shows positive change in green');
  test('shows negative change in warning color');
  test('displays most productive day');
  test('handles loading state');
  test('handles error state');
});
```

#### Migration Required
None - analytics queries existing task data.

#### Risks: 🟡 MEDIUM
- Backend already exists but untested (could have bugs)
- Frontend integration might reveal UX issues
- Performance concern: aggregating all user tasks (pagination needed at scale)

#### Strategic Value: ⭐⭐⭐⭐⭐ VERY HIGH
- **Differentiator**: Most competitors don't have this
- Provides immediate value to users
- Foundation for future AI features
- Low implementation cost (70% done)

**RECOMMENDATION**: Prioritize this in Sprint 2. Add tests, build frontend widget, ship quickly.

---

## SPRINT 3: Power User Features & Polish

### Feature 3.1: Command Palette (2 days)

#### PRD Impact: ⚠️ MINOR UPDATE REQUIRED
**New PRD Section**: 2.12 Quick Actions
```markdown
## 2.12 Quick Actions
### 2.12.1 Command Palette
- Keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Windows)
- Search tasks by title/description
- Navigate pages (Dashboard, Tasks, Projects, Profile)
- Quick-create task
- Recent actions history
- Frontend only, no backend changes
```

#### Implementation Strategy
**Frontend Only**:
```typescript
// Uses shadcn/ui Command component
// frontend/src/components/CommandPalette.tsx (NEW)
import { Command } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input placeholder="Type a command or search..." />
      <Command.List>
        <Command.Group heading="Navigation">
          <Command.Item onSelect={() => navigate('/')}>Dashboard</Command.Item>
          <Command.Item onSelect={() => navigate('/tasks')}>Tasks</Command.Item>
          // ...
        </Command.Group>
        <Command.Group heading="Tasks">
          {tasks.map(task => (
            <Command.Item key={task.id} onSelect={() => openTask(task)}>
              {task.title}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

#### Testing Requirements
**Frontend Tests**:
```typescript
// frontend/src/components/__tests__/CommandPalette.test.tsx
describe('CommandPalette', () => {
  test('opens on Cmd+K / Ctrl+K');
  test('closes on Escape');
  test('searches tasks');
  test('navigates to pages on selection');
  test('shows recent actions');
});
```

**E2E Tests** (HIGH VALUE):
```typescript
// e2e/command-palette.spec.ts (NEW)
test('full command palette workflow', async ({ page }) => {
  await page.keyboard.press('Meta+K');
  await page.fill('[placeholder="Type a command"]', 'Buy milk');
  await page.keyboard.press('Enter');
  // Verify task modal opens with "Buy milk" pre-filled
});
```

#### Dependencies
- `cmdk` package (shadcn/ui Command)
- Keyboard event handling
- React Router for navigation

#### Risks: 🟢 LOW
- Frontend-only feature
- No backend changes
- Well-tested component library (cmdk)

#### Strategic Value: ⭐⭐⭐⭐ HIGH
- Power user favorite (Linear, Notion, Raycast style)
- Low effort, high impact
- Differentiates from traditional task managers
- Developer-friendly

**RECOMMENDATION**: High priority for Sprint 3. Quick win, developer appeal.

---

### Feature 3.2: Glassmorphism + Micro-interactions (3 days)

#### PRD Impact: ❌ NO PRD UPDATE REQUIRED
Purely visual polish, no functional changes.

#### Implementation Strategy
**Frontend Only**:
```css
/* Glassmorphism effect */
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Use Framer Motion for animations */
<motion.button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  transition={{ type: 'spring', stiffness: 400 }}
>
  Click me
</motion.button>
```

#### Testing Requirements
**Visual Regression Tests** (Optional):
- Use Playwright screenshots to detect unintended style changes
- Manual QA on modals, cards, buttons

#### Dependencies
- `framer-motion` package
- CSS backdrop-filter support (check browser compatibility)

#### Risks: 🟢 LOW
- Purely visual
- Can be feature-flagged for testing
- Minimal performance impact (modern browsers)

#### Strategic Value: ⭐⭐ LOW
- Nice polish, but doesn't add functionality
- Helps "premium" perception
- Low priority unless targeting design-conscious users

---

### Feature 3.3: Recurring Tasks (5 days)

#### PRD Impact: 🔴 MAJOR UPDATE REQUIRED
**New PRD Section**: 2.5.11 Recurring Tasks
```markdown
### 2.5.11 Recurring Tasks
- **Recurrence patterns**: Daily, Weekly, Monthly, Custom
- **Backend**:
  - New table: `task_recurrence` (recurrence_rule, next_occurrence_date)
  - Cron job or scheduled function to generate next occurrences
  - PUT /api/tasks/:id/recurrence - Set recurrence rule
  - DELETE /api/tasks/:id/recurrence - Remove recurrence
- **Frontend**:
  - Recurrence picker in task modal (dropdown + custom rule builder)
  - "Complete and create next" button on recurring tasks
  - Show recurrence indicator (icon) on task cards
```

#### Implementation Strategy
**Database Migration**:
```prisma
// backend/prisma/schema.prisma
model Task {
  // ... existing fields
  recurrence Recurrence?
}

model Recurrence {
  id                String   @id @default(uuid())
  taskId            String   @unique @map("task_id")
  task              Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  pattern           RecurrencePattern
  interval          Int      @default(1)  // e.g., every 2 weeks
  daysOfWeek        Int[]    @default([])  // [1,3,5] for Mon/Wed/Fri
  dayOfMonth        Int?     // 15 for 15th of month
  nextOccurrence    DateTime @map("next_occurrence")

  @@map("recurrences")
}

enum RecurrencePattern {
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM
}
```

**Backend Routes**:
```typescript
// backend/src/routes/tasks.ts
router.put('/:id/recurrence', authenticate, async (req, res, next) => {
  // Set recurrence rule for task
  // Calculate next_occurrence based on pattern
});

router.delete('/:id/recurrence', authenticate, async (req, res, next) => {
  // Remove recurrence rule
});

router.post('/:id/complete-recurring', authenticate, async (req, res, next) => {
  // Mark current as DONE, create next occurrence
});
```

**Scheduled Job** (NEW):
```typescript
// backend/src/jobs/generate-recurring-tasks.ts (NEW)
// Runs daily at midnight
// Finds recurrences where next_occurrence <= today
// Creates new task instances
// Updates next_occurrence
```

#### Testing Requirements
**Backend Tests** (HIGH COMPLEXITY):
```typescript
// backend/tests/recurring-tasks.test.ts (NEW)
describe('Recurring Tasks', () => {
  test('PUT /api/tasks/:id/recurrence with daily pattern → 201');
  test('PUT /api/tasks/:id/recurrence with weekly pattern → 201');
  test('calculates next occurrence correctly for daily');
  test('calculates next occurrence correctly for weekly');
  test('calculates next occurrence correctly for monthly');
  test('POST /api/tasks/:id/complete-recurring → creates next instance');
  test('DELETE /api/tasks/:id/recurrence → removes rule');
  test('recurring task generation job creates tasks correctly');
  test('does not create duplicate occurrences');
  test('OWNER/ADMIN can set recurrence on any task');
  test('MEMBER cannot set recurrence on others' tasks');
});
```

**Frontend Tests**:
```typescript
// frontend/src/components/__tests__/RecurrencePicker.test.tsx
describe('RecurrencePicker', () => {
  test('renders recurrence pattern options');
  test('daily pattern shows interval input');
  test('weekly pattern shows day checkboxes');
  test('monthly pattern shows day-of-month dropdown');
  test('submits correct recurrence data to backend');
});
```

#### Dependencies
- Scheduling library: `node-cron` or `agenda`
- Date manipulation: `date-fns`
- Cron job needs to run even when no HTTP traffic (Railway background worker)

#### Risks: 🔴 HIGH
- **Breaking change**: Adds new table, requires migration
- **Complexity**: Date calculations are error-prone (timezones, DST)
- **Job reliability**: What if cron job fails? Missed recurrences?
- **Authorization**: Must enforce role-based access on recurrence endpoints
- **Scale concern**: Many recurring tasks = many cron jobs

#### Strategic Value: ⭐⭐⭐⭐ HIGH
- **Must-have feature**: All major competitors have this (Todoist, TickTick, Things)
- High user demand
- Unlocks use cases: daily habits, weekly meetings, monthly bills

**RECOMMENDATION**: Essential feature, but high complexity. Allocate 7-10 days, not 5. Needs thorough testing.

---

## SPRINT 4: Time Management & Views

### Feature 4.1: Skeleton Loading States (2 days)

#### PRD Impact: ❌ NO PRD UPDATE REQUIRED
UX improvement, no functional changes.

#### Implementation Strategy
**Frontend Only**:
```typescript
// frontend/src/components/Skeleton.tsx (NEW)
export function TaskSkeleton() {
  return (
    <div className="animate-pulse flex space-x-4">
      <div className="flex-1 space-y-4 py-1">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// Use in TasksPage.tsx
{isLoading ? <TaskSkeleton /> : <TaskList tasks={tasks} />}
```

#### Testing Requirements
**Visual Tests Only** (Optional):
- Playwright screenshot comparison
- Manual QA

#### Risks: 🟢 LOW
- Frontend-only
- No functional changes

#### Strategic Value: ⭐⭐ LOW
- Nice UX polish
- Perceived performance improvement
- Low priority

---

### Feature 4.2: Time Tracking + Calendar View (7 days)

#### PRD Impact: 🔴 MAJOR UPDATE REQUIRED
**New PRD Section**: 2.13 Time Tracking
```markdown
## 2.13 Time Tracking

### 2.13.1 Time Entries
- **Endpoints**:
  - POST /api/tasks/:id/time-entries - Start/stop timer or add manual entry
  - GET /api/tasks/:id/time-entries - List entries for task
  - DELETE /api/time-entries/:id - Delete entry
- **Fields**: start_time, end_time, duration_seconds, entry_type (TIMER|MANUAL)
- **Frontend**:
  - Timer button on task cards
  - Manual time entry form
  - Total time spent on task
  - Time estimate vs. actual comparison

### 2.13.2 Calendar View
- **Endpoint**: GET /api/tasks?calendar=true&month=2026-02
- **Returns**: Tasks with due dates, grouped by date
- **Frontend**:
  - Monthly calendar showing task due dates
  - Drag-and-drop to reschedule (updates task.dueDate)
  - Week view toggle
  - Uses react-big-calendar or custom implementation
```

#### Implementation Strategy
**Database Migration**:
```prisma
// backend/prisma/schema.prisma
model TimeEntry {
  id              String    @id @default(uuid())
  taskId          String    @map("task_id")
  task            Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId          String    @map("user_id")
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  startTime       DateTime  @map("start_time")
  endTime         DateTime? @map("end_time")
  durationSeconds Int?      @map("duration_seconds")
  entryType       TimeEntryType @map("entry_type")
  createdAt       DateTime  @default(now()) @map("created_at")

  @@map("time_entries")
}

enum TimeEntryType {
  TIMER
  MANUAL
}

model Task {
  // ... existing fields
  timeEntries     TimeEntry[]
  estimatedHours  Float?      @map("estimated_hours")  // NEW
}
```

**Backend Routes**:
```typescript
// backend/src/routes/tasks.ts
router.post('/:id/time-entries', authenticate, async (req, res, next) => {
  // Start timer (start_time = now, end_time = null)
  // OR stop timer (end_time = now, calculate duration)
  // OR add manual entry (both start and end provided)
});

router.get('/:id/time-entries', authenticate, async (req, res, next) => {
  // Return all time entries for task
  // Sum total duration_seconds
});

router.delete('/time-entries/:id', authenticate, async (req, res, next) => {
  // Delete entry (only creator can delete)
});

// Calendar endpoint
router.get('/', authenticate, async (req, res, next) => {
  // If ?calendar=true, return tasks grouped by due date
  // Filter by month if ?month=2026-02
});
```

**Frontend Calendar** (NEW):
```bash
npm install react-big-calendar date-fns
```

```typescript
// frontend/src/pages/CalendarView.tsx (NEW)
import { Calendar, momentLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS },
});

export function CalendarView() {
  const { data: tasks } = useQuery({
    queryKey: ['tasks', { calendar: true }],
    queryFn: () => tasksApi.getAll({ calendar: true }),
  });

  const events = tasks?.map(task => ({
    title: task.title,
    start: new Date(task.dueDate!),
    end: new Date(task.dueDate!),
    resource: task,
  })) || [];

  return (
    <Calendar
      localizer={localizer}
      events={events}
      onSelectEvent={openTaskModal}
      onEventDrop={rescheduleTask}  // Requires react-dnd integration
    />
  );
}
```

#### Testing Requirements
**Backend Tests** (HIGH COMPLEXITY):
```typescript
// backend/tests/time-tracking.test.ts (NEW)
describe('Time Tracking', () => {
  test('POST /api/tasks/:id/time-entries starts timer → 201');
  test('POST /api/tasks/:id/time-entries stops timer → 200, calculates duration');
  test('POST /api/tasks/:id/time-entries adds manual entry → 201');
  test('GET /api/tasks/:id/time-entries → returns all entries');
  test('GET /api/tasks/:id/time-entries → calculates total time');
  test('DELETE /api/time-entries/:id by creator → 204');
  test('DELETE /api/time-entries/:id by other user → 403');
  test('cannot start timer if another timer is running');
  test('calendar view groups tasks by due date');
  test('calendar view filters by month parameter');
});
```

**Frontend Tests**:
```typescript
// frontend/src/components/__tests__/TimeTracker.test.tsx
describe('TimeTracker', () => {
  test('starts timer on button click');
  test('stops timer and displays duration');
  test('displays total time on task card');
  test('manual entry form submits correctly');
  test('timer persists across page refresh (stores in localStorage)');
});

// frontend/src/pages/__tests__/CalendarView.test.tsx
describe('CalendarView', () => {
  test('renders calendar with tasks');
  test('clicking task opens modal');
  test('drag-and-drop updates due date');
  test('month navigation works');
});
```

#### Dependencies
- `react-big-calendar` (or custom calendar)
- `date-fns` for date manipulation
- WebSocket (future) for live timer updates across tabs

#### Risks: 🔴 HIGH
- **Breaking change**: New table, migration required
- **Complexity**: Timer state management (what if browser crashes mid-timer?)
- **Calendar performance**: Rendering 1000+ tasks on calendar could be slow
- **Timezone issues**: Time entries must handle user timezones correctly
- **Drag-and-drop**: Complex interaction, many edge cases

#### Strategic Value: ⭐⭐⭐⭐⭐ VERY HIGH
- **Must-have feature**: Top 3 most requested by users
- Productivity tool essential
- Todoist, TickTick, Clockify all have this
- Differentiator: Combined time tracking + calendar in one view

**RECOMMENDATION**: High priority, but estimate 10 days not 7. Requires careful planning.

---

## SPRINT 5: Team Collaboration

### Feature 5.1: Activity Logs (3 days)

#### PRD Impact: ⚠️ MINOR UPDATE REQUIRED
**New PRD Section**: 2.14 Activity Logs
```markdown
## 2.14 Activity Logs
- **Endpoint**: GET /api/tasks/:id/activity
- **Tracks**: status changes, assignee changes, description edits, comments
- **Returns**: Activity entries with user, action, timestamp
- **Frontend**: Activity timeline on task detail modal
- **Backend**: Middleware to intercept PUT requests, log changes
```

#### Implementation Strategy
**Database Migration**:
```prisma
// backend/prisma/schema.prisma
model Activity {
  id          String   @id @default(uuid())
  taskId      String   @map("task_id")
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  action      String   // "status_changed", "assignee_changed", "comment_added"
  oldValue    String?  @map("old_value")
  newValue    String?  @map("new_value")
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([taskId])
  @@map("activities")
}

model Task {
  // ... existing fields
  activities Activity[]
}
```

**Backend Middleware**:
```typescript
// backend/src/middleware/activityLogger.ts (NEW)
export function logActivity(action: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const oldTask = await prisma.task.findUnique({ where: { id: req.params.id } });

    // Continue with request
    res.on('finish', async () => {
      if (res.statusCode === 200) {
        const newTask = await prisma.task.findUnique({ where: { id: req.params.id } });

        // Detect changes
        if (oldTask.status !== newTask.status) {
          await prisma.activity.create({
            data: {
              taskId: newTask.id,
              userId: req.userId!,
              action: 'status_changed',
              oldValue: oldTask.status,
              newValue: newTask.status,
            },
          });
        }
        // ... check other fields
      }
    });

    next();
  };
}

// Apply to task update route
router.put('/:id', authenticate, logActivity('update'), async (req, res, next) => {
  // ... existing update logic
});
```

**Backend Route**:
```typescript
router.get('/:id/activity', authenticate, async (req, res, next) => {
  const activities = await prisma.activity.findMany({
    where: { taskId: req.params.id },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(activities);
});
```

#### Testing Requirements
**Backend Tests** (MEDIUM COMPLEXITY):
```typescript
// backend/tests/activity-logs.test.ts (NEW)
describe('Activity Logs', () => {
  test('changing task status creates activity log');
  test('changing assignee creates activity log');
  test('editing description creates activity log');
  test('GET /api/tasks/:id/activity returns logs in order');
  test('activity log includes user info');
  test('deleting task cascades delete activities');
});
```

**Frontend Tests**:
```typescript
// frontend/src/components/__tests__/ActivityTimeline.test.tsx
describe('ActivityTimeline', () => {
  test('renders activity entries');
  test('displays relative time (e.g., "2 hours ago")');
  test('groups activities by date');
  test('shows user avatar and name');
});
```

#### Risks: 🟡 MEDIUM
- **Performance**: Activity table grows quickly (1 entry per change)
- **Middleware complexity**: Detecting changes correctly
- **Breaking change**: New table, migration required

#### Strategic Value: ⭐⭐⭐ MEDIUM
- Expected in team collaboration tools
- Table stakes for transparency
- Low differentiation (everyone has this)

---

### Feature 5.2: Comments System + WebSocket Real-time (10 days)

#### PRD Impact: 🔴 MAJOR ARCHITECTURAL UPDATE
**New PRD Section**: 2.15 Comments & Real-time Collaboration
```markdown
## 2.15 Comments System
### 2.15.1 Comments
- **Endpoints**:
  - POST /api/tasks/:id/comments - Add comment
  - PUT /api/comments/:id - Edit own comment
  - DELETE /api/comments/:id - Delete own comment
  - GET /api/tasks/:id/comments - List comments
- **Features**: Threaded replies, @mentions, rich text (optional)
- **Authorization**: Anyone with task access can comment

### 2.15.2 WebSocket Real-time Updates
- **WebSocket endpoint**: ws://api.example.com/ws
- **Events**:
  - task_updated: Broadcast task changes to all connected clients
  - comment_added: Real-time comment notifications
  - user_presence: Show who's viewing task
- **Backend**: WebSocket server using `ws` library
- **Frontend**: WebSocket client with auto-reconnect
```

#### Implementation Strategy
**Database Migration**:
```prisma
// backend/prisma/schema.prisma
model Comment {
  id          String    @id @default(uuid())
  taskId      String    @map("task_id")
  task        Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String    @map("user_id")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  content     String
  parentId    String?   @map("parent_id")  // For threaded replies
  parent      Comment?  @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies     Comment[] @relation("CommentReplies")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  @@index([taskId])
  @@map("comments")
}

model Task {
  // ... existing fields
  comments Comment[]
}
```

**Backend WebSocket Server** (NEW):
```typescript
// backend/src/websocket.ts (NEW)
import { WebSocketServer } from 'ws';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws, req) => {
    // Extract userId from auth token in upgrade request
    const token = extractTokenFromRequest(req);
    const userId = verifyToken(token);

    ws.userId = userId;

    ws.on('message', (data) => {
      const msg = JSON.parse(data);

      if (msg.type === 'subscribe_task') {
        ws.taskId = msg.taskId;
        // Track presence
      }
    });

    ws.on('close', () => {
      // Clean up presence
    });
  });

  return wss;
}

// Broadcast helper
export function broadcastTaskUpdate(taskId, update) {
  wss.clients.forEach((client) => {
    if (client.taskId === taskId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'task_updated', data: update }));
    }
  });
}
```

**Frontend WebSocket Client** (NEW):
```typescript
// frontend/src/lib/websocket.ts (NEW)
export function useWebSocket(taskId: string | null) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!taskId) return;

    const ws = new WebSocket('ws://localhost:4000/ws');

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe_task', taskId }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'task_updated') {
        // Invalidate React Query cache, refetch task
        queryClient.invalidateQueries(['tasks', taskId]);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect after 3s
      setTimeout(() => setSocket(ws), 3000);
    };

    setSocket(ws);

    return () => ws.close();
  }, [taskId]);

  return { socket, connected };
}
```

#### Testing Requirements
**Backend Tests** (VERY HIGH COMPLEXITY):
```typescript
// backend/tests/comments.test.ts (NEW)
describe('Comments System', () => {
  test('POST /api/tasks/:id/comments → 201');
  test('GET /api/tasks/:id/comments → returns all comments');
  test('PUT /api/comments/:id by creator → 200');
  test('PUT /api/comments/:id by other user → 403');
  test('DELETE /api/comments/:id by creator → 204');
  test('threaded replies load correctly');
  test('@mentions parsed and notified');
});

// backend/tests/websocket.test.ts (NEW)
describe('WebSocket Real-time', () => {
  test('client connects with valid token');
  test('client rejected with invalid token');
  test('task update broadcasts to subscribers');
  test('comment added broadcasts to subscribers');
  test('user presence tracked correctly');
  test('client auto-reconnects on disconnect');
});
```

**E2E Tests** (CRITICAL):
```typescript
// e2e/real-time-collaboration.spec.ts (NEW)
test('two users see real-time task updates', async ({ browser }) => {
  const page1 = await browser.newPage();
  const page2 = await browser.newPage();

  // User 1 opens task
  await page1.goto('/tasks/123');

  // User 2 opens same task
  await page2.goto('/tasks/123');

  // User 1 changes status
  await page1.click('[data-testid="status-dropdown"]');
  await page1.click('text=In Progress');

  // Verify User 2 sees change without refresh
  await expect(page2.locator('[data-testid="task-status"]')).toHaveText('In Progress');
});
```

#### Dependencies
- `ws` (WebSocket server)
- Rich text editor: `slate` or `tiptap` (if rich text)
- @mentions parsing library

#### Risks: 🔴 VERY HIGH
- **Major architectural change**: Adds stateful WebSocket server
- **Scalability**: WebSocket connections don't scale horizontally easily (need Redis pub/sub)
- **Complexity**: Connection management, reconnection logic, presence tracking
- **Testing difficulty**: WebSocket tests are complex
- **Deployment**: Railway needs to support WebSocket upgrades
- **Breaking change**: Requires frontend rewrite for real-time features

#### Strategic Value: ⭐⭐⭐⭐⭐ VERY HIGH
- **Major differentiator**: Real-time collaboration is premium feature
- Enables true team collaboration
- Modern expectation (Notion, Figma, Linear all have it)
- Foundation for future features (cursors, co-editing)

**RECOMMENDATION**:
- Estimate 15 days, not 10
- Split into 2 phases: Comments first (Sprint 5), WebSocket later (Sprint 6)
- Consider using managed WebSocket service (Pusher, Ably) instead of building from scratch

---

## SPRINT 6: Flexibility & Attachments

### Feature 6.1: Custom Fields + Tags + File Attachments (10 days)

#### PRD Impact: 🔴 MAJOR UPDATE REQUIRED
**New PRD Section**: 2.16 Custom Fields & Attachments
```markdown
## 2.16 Custom Fields & Attachments

### 2.16.1 Custom Fields
- **Admin/Owner only**: Define custom fields per project
- **Field types**: Text, Number, Date, Dropdown, Checkbox
- **Endpoints**:
  - POST /api/projects/:id/fields - Create field definition
  - GET /api/projects/:id/fields - List fields
  - DELETE /api/projects/:id/fields/:fieldId - Delete field
  - PUT /api/tasks/:id/field-values - Set values for task
- **Database**: JSON column on Task model, or separate FieldValue table

### 2.16.2 Tags
- **Global tags**: System-wide tag taxonomy
- **Endpoints**:
  - GET /api/tags - List all tags
  - POST /api/tags - Create tag
  - PUT /api/tasks/:id/tags - Set tags on task
- **Multi-select**: Tasks can have multiple tags
- **Color-coded**: Each tag has color

### 2.16.3 File Attachments
- **Endpoints**:
  - POST /api/tasks/:id/attachments - Upload file (multipart/form-data)
  - GET /api/attachments/:id - Download file
  - DELETE /api/attachments/:id - Delete file
- **Storage**: AWS S3, Cloudinary, or local filesystem
- **Limits**: 10MB per file, 5 files per task
- **Types**: Images, PDFs, docs (whitelist)
```

#### Implementation Strategy
**Database Migration** (LARGE):
```prisma
// backend/prisma/schema.prisma
model CustomField {
  id          String     @id @default(uuid())
  projectId   String     @map("project_id")
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String
  fieldType   FieldType  @map("field_type")
  options     Json?      // For dropdown: ["Option 1", "Option 2"]
  required    Boolean    @default(false)
  createdAt   DateTime   @default(now()) @map("created_at")

  @@map("custom_fields")
}

enum FieldType {
  TEXT
  NUMBER
  DATE
  DROPDOWN
  CHECKBOX
}

model FieldValue {
  id       String      @id @default(uuid())
  taskId   String      @map("task_id")
  task     Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  fieldId  String      @map("field_id")
  field    CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  value    Json        // Store any type of value

  @@unique([taskId, fieldId])
  @@map("field_values")
}

model Tag {
  id        String   @id @default(uuid())
  name      String   @unique
  color     String
  tasks     Task[]   @relation("TaskTags")

  @@map("tags")
}

model Task {
  // ... existing fields
  customFieldValues FieldValue[]
  tags              Tag[]        @relation("TaskTags")
  attachments       Attachment[]
}

model Attachment {
  id          String   @id @default(uuid())
  taskId      String   @map("task_id")
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id])
  filename    String
  mimeType    String   @map("mime_type")
  size        Int      // bytes
  storageKey  String   @map("storage_key")  // S3 key or local path
  uploadedAt  DateTime @default(now()) @map("uploaded_at")

  @@map("attachments")
}
```

**Backend File Upload** (NEW):
```typescript
// backend/src/routes/tasks.ts
import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const upload = multer({ storage: multer.memoryStorage() });

router.post('/:id/attachments', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) throw new AppError('No file uploaded', 400);

    // Validate file size and type
    if (file.size > 10 * 1024 * 1024) throw new AppError('File too large (max 10MB)', 400);
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) throw new AppError('Invalid file type', 400);

    // Upload to S3
    const s3 = new S3Client({ region: 'us-east-1' });
    const storageKey = `attachments/${uuidv4()}-${file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: storageKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    }));

    // Create attachment record
    const attachment = await prisma.attachment.create({
      data: {
        taskId: req.params.id,
        userId: req.userId!,
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
      },
    });

    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
});
```

#### Testing Requirements
**Backend Tests** (VERY HIGH COMPLEXITY):
```typescript
// backend/tests/custom-fields.test.ts (NEW)
describe('Custom Fields', () => {
  test('POST /api/projects/:id/fields as OWNER → 201');
  test('POST /api/projects/:id/fields as MEMBER → 403');
  test('GET /api/projects/:id/fields → returns all fields');
  test('PUT /api/tasks/:id/field-values → sets values');
  test('validates value type matches field type');
  test('required fields enforced on task creation');
});

// backend/tests/tags.test.ts (NEW)
describe('Tags', () => {
  test('POST /api/tags → 201');
  test('GET /api/tags → returns all tags');
  test('PUT /api/tasks/:id/tags → sets tags');
  test('filtering tasks by tag works');
});

// backend/tests/attachments.test.ts (NEW)
describe('File Attachments', () => {
  test('POST /api/tasks/:id/attachments with valid file → 201');
  test('rejects file over 10MB → 400');
  test('rejects invalid file type → 400');
  test('GET /api/attachments/:id → downloads file');
  test('DELETE /api/attachments/:id by uploader → 204');
  test('DELETE /api/attachments/:id by other user → 403');
  test('deleting task cascades delete attachments and S3 objects');
});
```

#### Dependencies
- `multer` (file upload middleware)
- `@aws-sdk/client-s3` (S3 client) OR local filesystem
- S3 bucket configuration (env vars: S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)

#### Risks: 🔴 VERY HIGH
- **Breaking changes**: Multiple new tables, migrations
- **Cost**: S3 storage costs scale with usage
- **Complexity**: File upload, validation, storage, cleanup
- **Security**: File type validation critical (prevent malicious uploads)
- **Custom fields**: Complex UI for field builder
- **Performance**: Large attachments slow down page load

#### Strategic Value: ⭐⭐⭐⭐ HIGH
- **Flexibility**: Let users structure data their way
- **Differentiator**: Not all task managers have custom fields
- **File attachments**: Must-have for collaboration
- Unlocks enterprise use cases

**RECOMMENDATION**:
- Estimate 15 days, not 10
- Start with tags (easiest), then attachments, then custom fields
- Consider using Cloudinary instead of S3 (easier setup)

---

## SPRINT 7: Differentiation - Analytics & Focus

### Feature 7.1: Creator Accountability Dashboard (5 days)

#### PRD Impact: ⚠️ MINOR UPDATE REQUIRED
**New PRD Section**: 2.10.2 Creator Analytics
```markdown
### 2.10.2 Creator Accountability Dashboard
- **Endpoint**: GET /api/analytics/creator-metrics
- **Metrics**:
  - Tasks created per user
  - Self-assigned vs. delegated ratio
  - Task velocity by creator
  - Bottleneck identification (who's creating more than completing)
- **Permissions**: OWNER/ADMIN only (sensitive team data)
- **Frontend**: Dashboard page showing creator leaderboard, charts
```

#### Implementation Strategy
**Backend Route** (NEW):
```typescript
// backend/src/routes/analytics.ts
router.get('/creator-metrics', authenticate, async (req, res, next) => {
  try {
    // Verify user is OWNER/ADMIN on at least one project
    const userProjects = await prisma.projectMember.findMany({
      where: { userId: req.userId, role: { in: ['OWNER', 'ADMIN'] } },
    });
    if (userProjects.length === 0) throw new AppError('Insufficient permissions', 403);

    // Get all projects user manages
    const projectIds = userProjects.map(p => p.projectId);

    // Aggregate by creator
    const creatorStats = await prisma.task.groupBy({
      by: ['creatorId'],
      where: { projectId: { in: projectIds } },
      _count: { id: true },
      _sum: { durationSeconds: true },
    });

    // Join with user data
    const creators = await Promise.all(creatorStats.map(async (stat) => {
      const user = await prisma.user.findUnique({ where: { id: stat.creatorId } });

      // Calculate self-assigned vs. delegated
      const selfAssigned = await prisma.task.count({
        where: { creatorId: stat.creatorId, assigneeId: stat.creatorId },
      });
      const delegated = stat._count.id - selfAssigned;

      return {
        user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        tasksCreated: stat._count.id,
        selfAssigned,
        delegated,
        delegationRatio: delegated / stat._count.id,
      };
    }));

    res.json({ creators });
  } catch (error) {
    next(error);
  }
});
```

**Frontend Dashboard** (NEW):
```typescript
// frontend/src/pages/CreatorDashboard.tsx (NEW)
export function CreatorDashboard() {
  const { data } = useQuery({
    queryKey: ['analytics', 'creator-metrics'],
    queryFn: () => analyticsApi.getCreatorMetrics(),
  });

  return (
    <div>
      <h1>Creator Accountability Dashboard</h1>
      <p className="subtitle">See who's creating tasks and who's completing them</p>

      <div className="leaderboard">
        {data?.creators.map(creator => (
          <div key={creator.user.id} className="creator-card">
            <Avatar src={creator.user.avatarUrl} name={creator.user.name} />
            <div className="stats">
              <span>{creator.tasksCreated} tasks created</span>
              <span>{creator.selfAssigned} self-assigned</span>
              <span>{creator.delegated} delegated</span>
              <Badge variant={creator.delegationRatio > 0.7 ? 'warning' : 'success'}>
                {Math.round(creator.delegationRatio * 100)}% delegation
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### Testing Requirements
**Backend Tests** (MEDIUM COMPLEXITY):
```typescript
// backend/tests/creator-analytics.test.ts (NEW)
describe('Creator Analytics', () => {
  test('GET /api/analytics/creator-metrics as OWNER → 200');
  test('GET /api/analytics/creator-metrics as ADMIN → 200');
  test('GET /api/analytics/creator-metrics as MEMBER → 403');
  test('calculates self-assigned vs. delegated correctly');
  test('only includes tasks from user's managed projects');
});
```

#### Risks: 🟡 MEDIUM
- **Privacy concern**: Sensitive team data (who's overloading whom)
- **Performance**: Aggregating all tasks could be slow
- **Interpretation**: Metrics need context (delegating isn't always bad)

#### Strategic Value: ⭐⭐⭐⭐⭐ VERY HIGH
- **UNIQUE**: No competitor has this
- **Anti-busywork positioning**: "Stop creating tasks for others"
- **Management tool**: Identify bottlenecks
- High differentiation potential

**RECOMMENDATION**: High priority, unique feature. Add clear messaging about positive use (team balance, not blame).

---

### Feature 7.2: Smart Task Dependencies (7 days)

#### PRD Impact: 🔴 MAJOR UPDATE REQUIRED
**New PRD Section**: 2.5.12 Task Dependencies
```markdown
### 2.5.12 Task Dependencies
- **Link tasks**: Mark tasks as blockers or dependencies
- **Endpoints**:
  - POST /api/tasks/:id/dependencies - Add dependency
  - DELETE /api/tasks/:id/dependencies/:dependencyId - Remove
  - GET /api/tasks/:id/dependencies - List dependencies
- **Visualization**: Gantt-style timeline showing critical path
- **Auto-adjust**: When blocker's due date shifts, dependent task suggests new date
- **Frontend**: Dependency picker, timeline view
```

#### Implementation Strategy
**Database Migration**:
```prisma
// backend/prisma/schema.prisma
model TaskDependency {
  id            String   @id @default(uuid())
  taskId        String   @map("task_id")        // The dependent task
  task          Task     @relation("DependentOn", fields: [taskId], references: [id], onDelete: Cascade)
  dependsOnId   String   @map("depends_on_id")  // The blocker task
  dependsOn     Task     @relation("Blocks", fields: [dependsOnId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now()) @map("created_at")

  @@unique([taskId, dependsOnId])
  @@map("task_dependencies")
}

model Task {
  // ... existing fields
  dependsOn    TaskDependency[] @relation("DependentOn")
  blocks       TaskDependency[] @relation("Blocks")
}
```

**Backend Routes**:
```typescript
// backend/src/routes/tasks.ts
router.post('/:id/dependencies', authenticate, async (req, res, next) => {
  // Create dependency link
  // Validate no circular dependencies (A depends on B, B depends on A)
});

router.get('/:id/dependencies', authenticate, async (req, res, next) => {
  // Return all blocking and blocked tasks
});

// Critical path calculation
router.get('/:projectId/critical-path', authenticate, async (req, res, next) => {
  // Graph algorithm: longest path through dependencies
  // Returns sequence of tasks with earliest start/finish times
});
```

**Frontend Gantt Chart** (NEW):
```bash
npm install react-gantt-chart
```

```typescript
// frontend/src/pages/GanttView.tsx (NEW)
import { Gantt, Task, ViewMode } from 'gantt-task-react';

export function GanttView() {
  const { data: tasks } = useQuery(['tasks']);

  const ganttTasks: Task[] = tasks?.map(task => ({
    id: task.id,
    name: task.title,
    start: new Date(task.createdAt),
    end: task.dueDate ? new Date(task.dueDate) : new Date(),
    dependencies: task.dependsOn.map(d => d.dependsOnId),
    progress: task.status === 'DONE' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0,
  })) || [];

  return <Gantt tasks={ganttTasks} viewMode={ViewMode.Day} />;
}
```

#### Testing Requirements
**Backend Tests** (HIGH COMPLEXITY):
```typescript
// backend/tests/task-dependencies.test.ts (NEW)
describe('Task Dependencies', () => {
  test('POST /api/tasks/:id/dependencies → 201');
  test('prevents circular dependencies → 400');
  test('GET /api/tasks/:id/dependencies → returns blockers and blocked');
  test('deleting task cascades delete dependencies');
  test('GET /api/projects/:id/critical-path → calculates longest path');
  test('only OWNER/ADMIN/MEMBER can add dependencies');
});
```

#### Risks: 🔴 HIGH
- **Complexity**: Graph algorithms, cycle detection
- **Performance**: Critical path calculation on large project graphs
- **UX**: Hard to visualize complex dependency webs
- **Breaking change**: New table, migration

#### Strategic Value: ⭐⭐⭐⭐⭐ VERY HIGH
- **Differentiator**: Asana has this, but most task managers don't
- **Project management essential**: Critical path is PM 101
- **Enterprise appeal**: Serious teams need this

**RECOMMENDATION**: High priority, but estimate 10 days not 7. Consider using existing Gantt library instead of building from scratch.

---

## SPRINT 8: Developer Experience & Scale

### Feature 8.1: CLI Tool (4 days)

#### PRD Impact: ⚠️ MINOR UPDATE REQUIRED
**New PRD Section**: 2.17 CLI Tool
```markdown
## 2.17 CLI Tool
- **Command**: `taskman create "Write docs" --project="TaskMan" --priority=high`
- **Features**:
  - List tasks: `taskman list --status=TODO`
  - Create task: `taskman create <title> [options]`
  - Update task: `taskman update <id> --status=DONE`
  - Authentication: API key or OAuth token stored in ~/.taskman/config
- **Installation**: npm install -g taskman-cli
```

#### Implementation Strategy
**New Repository**:
```bash
# Create separate repo: taskman-cli
npm init -y
npm install commander inquirer axios chalk
```

**CLI Tool** (NEW):
```typescript
// taskman-cli/src/index.ts
#!/usr/bin/env node
import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';

const program = new Command();

program
  .name('taskman')
  .description('TaskMan CLI - Task management from your terminal')
  .version('1.0.0');

program
  .command('create <title>')
  .description('Create a new task')
  .option('-p, --project <name>', 'Project name')
  .option('--priority <level>', 'Priority (LOW, MEDIUM, HIGH, URGENT)')
  .option('-d, --description <desc>', 'Task description')
  .action(async (title, options) => {
    // Load API key from ~/.taskman/config
    const apiKey = loadConfig().apiKey;

    try {
      const res = await axios.post('https://api.taskman.com/api/tasks', {
        title,
        projectId: await resolveProjectId(options.project),
        priority: options.priority?.toUpperCase() || 'MEDIUM',
        description: options.description,
      }, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      console.log(chalk.green('✓'), 'Task created:', res.data.id);
    } catch (error) {
      console.error(chalk.red('✗'), 'Failed to create task:', error.message);
    }
  });

program
  .command('list')
  .description('List tasks')
  .option('-s, --status <status>', 'Filter by status')
  .option('-p, --project <name>', 'Filter by project')
  .action(async (options) => {
    // ... list tasks
  });

program.parse();
```

#### Testing Requirements
**CLI Tests**:
```typescript
// taskman-cli/tests/cli.test.ts
describe('CLI', () => {
  test('taskman create "Buy milk" creates task');
  test('taskman list shows tasks');
  test('taskman list --status=TODO filters correctly');
  test('requires API key in config');
  test('handles API errors gracefully');
});
```

#### Risks: 🟢 LOW
- Separate project, no impact on main app
- Standard CLI patterns (commander, inquirer)

#### Strategic Value: ⭐⭐⭐⭐ HIGH
- **Developer appeal**: Devs love CLI tools
- **Positioning**: "Task manager for developers"
- **Unique**: Most task managers don't have CLI
- **Quick capture**: Fast task creation from terminal

**RECOMMENDATION**: High priority for developer positioning. Consider adding shell completion (zsh, bash).

---

### Feature 8.2: Public API + Webhooks (10 days)

#### PRD Impact: 🔴 MAJOR UPDATE REQUIRED
**New PRD Sections**: 2.18 Public API, 2.19 Webhooks
```markdown
## 2.18 Public API
- **Authentication**: API keys (not JWT cookies)
- **Endpoints**: All existing endpoints available via API key auth
- **Rate limiting**: 1000 requests/hour per key
- **API keys**: Generate in settings, revoke anytime
- **Documentation**: Auto-generated OpenAPI docs at /api/docs

## 2.19 Webhooks
- **Events**: task.created, task.updated, task.completed, project.created
- **Endpoint**: POST /api/webhooks (configure webhook URL)
- **Payload**: JSON with event type and data
- **Retry**: 3 attempts with exponential backoff
- **Security**: HMAC signature verification
```

#### Implementation Strategy
**Database Migration**:
```prisma
// backend/prisma/schema.prisma
model ApiKey {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String   // "Production", "Testing"
  key         String   @unique  // bcrypt hashed
  lastUsedAt  DateTime? @map("last_used_at")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("api_keys")
}

model Webhook {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  url         String
  events      String[]  // ["task.created", "task.updated"]
  secret      String    // For HMAC signature
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("webhooks")
}

model WebhookLog {
  id          String   @id @default(uuid())
  webhookId   String   @map("webhook_id")
  webhook     Webhook  @relation(fields: [webhookId], references: [id], onDelete: Cascade)
  event       String
  payload     Json
  responseCode Int?    @map("response_code")
  error       String?
  attemptedAt DateTime @default(now()) @map("attempted_at")

  @@map("webhook_logs")
}
```

**Backend Middleware** (NEW):
```typescript
// backend/src/middleware/apiKey.ts (NEW)
export const authenticateApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return next();  // Fall through to cookie auth

  // Hash and lookup
  const hashedKey = hashApiKey(apiKey);
  const keyRecord = await prisma.apiKey.findUnique({ where: { key: hashedKey } });

  if (!keyRecord) return next(new AppError('Invalid API key', 401));

  // Update last used
  await prisma.apiKey.update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } });

  req.userId = keyRecord.userId;
  next();
};

// Update existing auth middleware
export const authenticate = (req, res, next) => {
  // Try API key first, then cookie
  authenticateApiKey(req, res, (err) => {
    if (!err && req.userId) return next();
    // Fall back to cookie auth
    authenticateCookie(req, res, next);
  });
};
```

**Webhook Dispatcher** (NEW):
```typescript
// backend/src/lib/webhooks.ts (NEW)
export async function dispatchWebhook(event: string, payload: any, userId: string) {
  const webhooks = await prisma.webhook.findMany({
    where: { userId, active: true, events: { has: event } },
  });

  for (const webhook of webhooks) {
    // Send async, don't block request
    sendWebhook(webhook, event, payload).catch(console.error);
  }
}

async function sendWebhook(webhook: Webhook, event: string, payload: any) {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString() });
  const signature = createHmac('sha256', webhook.secret).update(body).digest('hex');

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
      },
      body,
    });

    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        responseCode: res.status,
      },
    });
  } catch (error) {
    await prisma.webhookLog.create({
      data: {
        webhookId: webhook.id,
        event,
        payload,
        error: error.message,
      },
    });

    // Retry logic (3 attempts with exponential backoff)
    // ...
  }
}

// Call in task create route
router.post('/', authenticate, async (req, res, next) => {
  // ... create task
  await dispatchWebhook('task.created', task, req.userId);
  res.status(201).json(task);
});
```

**OpenAPI Docs** (NEW):
```typescript
// backend/src/routes/docs.ts (NEW)
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiSpec } from './openapi-generator';

const spec = generateOpenApiSpec();

router.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec));
```

#### Testing Requirements
**Backend Tests** (VERY HIGH COMPLEXITY):
```typescript
// backend/tests/api-keys.test.ts (NEW)
describe('API Keys', () => {
  test('POST /api/auth/api-keys → 201, returns key (unhashed)');
  test('GET /api/auth/api-keys → lists user's keys');
  test('DELETE /api/auth/api-keys/:id → revokes key');
  test('request with valid API key → 200');
  test('request with invalid API key → 401');
  test('API key auth updates lastUsedAt');
  test('rate limiting enforced per API key');
});

// backend/tests/webhooks.test.ts (NEW)
describe('Webhooks', () => {
  test('POST /api/webhooks → 201, creates webhook');
  test('GET /api/webhooks → lists user's webhooks');
  test('DELETE /api/webhooks/:id → deletes webhook');
  test('task creation dispatches task.created webhook');
  test('webhook includes HMAC signature');
  test('webhook retries on failure (3 attempts)');
  test('webhook logs success and failures');
});
```

#### Dependencies
- `swagger-ui-express` (API docs)
- `openapi-typescript` (generate types from OpenAPI spec)

#### Risks: 🔴 VERY HIGH
- **Security**: API keys must be stored securely (hashed, not plain text)
- **Rate limiting**: Prevent abuse
- **Webhook reliability**: Retry logic, logging, monitoring
- **Documentation**: OpenAPI spec must be kept in sync with routes
- **Breaking change**: Multiple new tables, migrations

#### Strategic Value: ⭐⭐⭐⭐⭐ VERY HIGH
- **Developer positioning**: "Task manager for developers"
- **Integrations**: Enables Zapier, Make, custom scripts
- **Automation**: Webhooks unlock workflow automation
- **Enterprise appeal**: Public API is enterprise expectation

**RECOMMENDATION**:
- High priority for developer positioning
- Estimate 15 days, not 10
- Start with API keys, then webhooks, then docs

---

### Feature 8.3: Pagination System (3 days) ⚠️ CRITICAL

#### PRD Impact: 🔴 CRITICAL UPDATE REQUIRED
**Update PRD Section 2.5.1**: Add pagination
```markdown
### 2.5.1 List Tasks (Updated)
- **Pagination**: Cursor-based pagination for scalability
- **Query parameters**:
  - `cursor`: Opaque cursor for next page
  - `limit`: Results per page (default 50, max 100)
- **Response**: `{ tasks: Task[], nextCursor: string | null }`
```

#### Implementation Strategy
**Backend Pagination** (UPDATE EXISTING):
```typescript
// backend/src/routes/tasks.ts (UPDATE)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const cursor = req.query.cursor as string | undefined;

    // Get user's projects
    const projectIds = await getUserProjectIds(req.userId!);

    // Cursor-based pagination
    const tasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        ...(cursor && { id: { lt: cursor } }),  // Tasks with ID < cursor
      },
      take: limit + 1,  // Fetch one extra to determine if there's a next page
      orderBy: { createdAt: 'desc' },
      include: { project: true, assignee: true, creator: true },
    });

    const hasMore = tasks.length > limit;
    const results = hasMore ? tasks.slice(0, limit) : tasks;
    const nextCursor = hasMore ? results[results.length - 1].id : null;

    res.json({ tasks: results, nextCursor });
  } catch (error) {
    next(error);
  }
});
```

**Frontend Infinite Scroll** (NEW):
```typescript
// frontend/src/pages/TasksPage.tsx (UPDATE)
import { useInfiniteQuery } from '@tanstack/react-query';

export function TasksPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['tasks'],
    queryFn: ({ pageParam }) => tasksApi.getAll({ cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const tasks = data?.pages.flatMap(page => page.tasks) || [];

  return (
    <div>
      {tasks.map(task => <TaskCard key={task.id} task={task} />)}

      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
```

#### Testing Requirements
**Backend Tests** (MEDIUM COMPLEXITY):
```typescript
// backend/tests/pagination.test.ts (NEW)
describe('Task Pagination', () => {
  test('GET /api/tasks?limit=10 → returns 10 tasks');
  test('GET /api/tasks?cursor=<id> → returns tasks after cursor');
  test('nextCursor is null when no more pages');
  test('enforces max limit of 100');
  test('pagination works with filters (status, priority)');
});
```

**Frontend Tests**:
```typescript
// frontend/src/pages/__tests__/TasksPage.test.tsx
describe('TasksPage Pagination', () => {
  test('loads initial page');
  test('clicking "Load more" fetches next page');
  test('hides "Load more" when no more pages');
  test('infinite scroll works (E2E)');
});
```

#### Risks: 🟡 MEDIUM
- **Breaking change**: Frontend must handle paginated responses
- **Complexity**: Cursor-based pagination requires ID-based ordering
- **Filters**: Pagination + filters can be tricky

#### Strategic Value: ⭐⭐⭐⭐⭐ **CRITICAL**
- **Required for scale**: App will break at 1000+ tasks without pagination
- **Performance**: Reduces database load, faster initial page load
- **Must-have**: Table stakes for any production app

**RECOMMENDATION**: **HIGHEST PRIORITY**. Must be done before Sprint 8. Consider doing in Sprint 4.

---

## SPRINT 9: Advanced Capabilities

### Feature 9.1: Natural Language Input (10 days)

#### PRD Impact: ⚠️ MINOR UPDATE REQUIRED
**New PRD Section**: 2.20 Natural Language Task Creation
```markdown
## 2.20 Natural Language Task Creation
- **Frontend**: Smart quick-add bar
- **Parsing**: Extract title, project, due date, priority from natural language
  - Example: "Buy milk tomorrow at 3pm in Project X" → title="Buy milk", dueDate=tomorrow 3pm, projectId=X
- **Libraries**: chrono-node (date parsing), compromise (NLP)
- **Backend**: No changes, uses existing POST /api/tasks endpoint
```

#### Implementation Strategy
**Frontend Only** (NEW):
```bash
npm install chrono-node compromise
```

```typescript
// frontend/src/components/SmartTaskInput.tsx (NEW)
import nlp from 'compromise';
import * as chrono from 'chrono-node';

export function SmartTaskInput() {
  const [input, setInput] = useState('');

  const handleCreate = () => {
    const parsed = parseNaturalLanguage(input);
    tasksApi.create(parsed);
  };

  return (
    <div className="smart-input">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Buy milk tomorrow at 3pm in Project X"
      />
      <button onClick={handleCreate}>Create Task</button>
    </div>
  );
}

function parseNaturalLanguage(input: string) {
  // Extract date
  const dateResults = chrono.parse(input);
  const dueDate = dateResults[0]?.start.date();

  // Remove date from input
  let title = input;
  if (dateResults[0]) {
    title = title.replace(dateResults[0].text, '').trim();
  }

  // Extract project (look for "in Project X" or "#ProjectX")
  const projectMatch = title.match(/in\s+([A-Za-z0-9\s]+)|#([A-Za-z0-9]+)/);
  const projectName = projectMatch?.[1] || projectMatch?.[2];
  if (projectName) {
    title = title.replace(projectMatch[0], '').trim();
  }

  // Extract priority (look for "urgent", "high", "low")
  const doc = nlp(title);
  const priorities = doc.match('(urgent|high|low|medium)').text();
  const priority = priorities ? priorities.toUpperCase() : 'MEDIUM';
  title = doc.not('(urgent|high|low|medium)').text();

  return {
    title,
    dueDate: dueDate?.toISOString(),
    projectId: await resolveProjectId(projectName),
    priority,
  };
}
```

#### Testing Requirements
**Frontend Tests** (HIGH COMPLEXITY):
```typescript
// frontend/src/lib/__tests__/nlp-parser.test.ts
describe('Natural Language Parser', () => {
  test('parses "Buy milk tomorrow" → title, dueDate');
  test('parses "Meeting at 3pm" → title, dueDate with time');
  test('parses "Task in Project X" → title, projectId');
  test('parses "urgent task" → title, priority=URGENT');
  test('handles complex input: "Buy milk tomorrow at 3pm urgent in Project X"');
  test('gracefully handles unparseable input');
});
```

#### Dependencies
- `chrono-node` (date parsing)
- `compromise` (NLP)

#### Risks: 🟡 MEDIUM
- **Accuracy**: NLP is not 100% accurate (user frustration if wrong)
- **Complexity**: Many edge cases, hard to test exhaustively
- **Localization**: Works well for English, not other languages

#### Strategic Value: ⭐⭐⭐⭐ HIGH
- **Differentiator**: Todoist has this, but most don't
- **UX delight**: Fast task capture without forms
- **Power user feature**: Keyboard-first workflow

**RECOMMENDATION**: High value, but lower priority than core features. Consider adding after Sprint 8.

---

## SPRINT 10: Nice-to-Have Features

### Features: Habit Tracking, Voice Input, Burnout Prevention

These are **low priority** compared to core features. Only pursue after Sprints 1-8 are complete.

#### Strategic Value: ⭐⭐ LOW
- Nice polish, but not essential
- Low differentiation
- Consider as future experiments

---

## CRITICAL TECH DEBT PRIORITIES

### 1. Pagination ⚠️ **CRITICAL** - Move to Sprint 4
**Impact**: App will break at scale without pagination
**Effort**: 3 days
**Priority**: **HIGHEST**

### 2. E2E Testing 🔴 **HIGH** - Add incrementally starting Sprint 3
**Impact**: Confidence in releases, catch regressions
**Effort**: 2-3 days per sprint to add E2E tests
**Priority**: **HIGH**

### 3. Rate Limiting ✅ **DONE** - Already implemented
**Status**: Backend has rate limiting on auth endpoints
**Action**: Add tests, extend to other endpoints

### 4. Error Boundaries 🟡 **MEDIUM** - Sprint 4
**Impact**: Better error UX, prevent white screens
**Effort**: 1 day
**Priority**: MEDIUM

---

## STRATEGIC RECOMMENDATIONS

### Top 3 Priorities (Next 30 Days)

1. **Complete Sprint 2: AI Task Insights** (7 days)
   - Backend 70% done, add tests
   - Build frontend widget
   - Ship unique feature fast

2. **Add Pagination** (3 days)
   - Critical for scale
   - Backend + frontend infinite scroll
   - Test thoroughly

3. **Fix Test Coverage Gaps** (2 days)
   - Add notification tests (Sprint 1)
   - Add analytics tests (Sprint 2)
   - Add auth test infrastructure fixes

### High-Value Features for Differentiation

1. **Creator Analytics Dashboard** (Sprint 7) - UNIQUE
2. **Smart Task Dependencies** (Sprint 7) - HIGH VALUE
3. **CLI Tool** (Sprint 8) - DEVELOPER APPEAL
4. **Real-time WebSocket** (Sprint 5) - MODERN EXPECTATION

### Features to Deprioritize

1. **Glassmorphism** (Sprint 3) - Low ROI
2. **Skeleton Loading** (Sprint 4) - Nice polish, not essential
3. **Voice Input** (Sprint 10) - Gimmick, low usage
4. **Habit Tracking** (Sprint 10) - Out of scope, niche

---

## UPDATED PRD IMPACT SUMMARY

### PRD Sections to Add

1. **2.9 Notifications System** (Sprint 1 - already implemented)
2. **2.10 Analytics & Insights** (Sprint 2 - partially implemented)
3. **2.11 User Preferences** (Sprint 2 - themes, layouts)
4. **2.12 Quick Actions** (Sprint 3 - command palette)
5. **2.13 Time Tracking** (Sprint 4)
6. **2.14 Activity Logs** (Sprint 5)
7. **2.15 Comments & Real-time** (Sprint 5)
8. **2.16 Custom Fields & Attachments** (Sprint 6)
9. **2.17 CLI Tool** (Sprint 8)
10. **2.18 Public API** (Sprint 8)
11. **2.19 Webhooks** (Sprint 8)
12. **2.20 Natural Language Input** (Sprint 9)

### PRD Sections to Update

1. **2.5.1 List Tasks** - Add pagination
2. **2.5.11 Recurring Tasks** (Sprint 3)
3. **2.5.12 Task Dependencies** (Sprint 7)

---

## FINAL VERDICT

### Overall Assessment: **EXCELLENT ROADMAP**

**Strengths**:
- Well-structured sprints with quick wins + substantial tasks
- Strong focus on differentiation (creator analytics, dependencies, CLI)
- Developer-first positioning is clear
- Balanced mix of table stakes and unique features

**Critical Gaps**:
- **Pagination missing** from roadmap (CRITICAL)
- **E2E testing** should start earlier (Sprint 3, not end)
- **WebSocket complexity** underestimated (15 days, not 10)

**Estimated Timeline**:
- **MVP (Sprints 2-4)**: 34-38 days (~6 weeks)
- **Differentiated Product (Sprints 2-7)**: 80-90 days (~3-4 months)
- **Full Roadmap (Sprints 2-10)**: 136 days (~6 months)

**Strategic Pivot Recommendation**:
Focus on **developer positioning** (CLI, API, webhooks, creator analytics) rather than competing head-to-head with Todoist/TickTick. This aligns with tech stack (TypeScript, API-first, self-hostable) and creates defensible differentiation.

---

**End of Evaluation Report**
