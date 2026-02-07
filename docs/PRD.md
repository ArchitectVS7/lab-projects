# Product Requirements Document (PRD): Unified Task Management Platform

## Status: Living Document (Updated with Sprint 2-10 Features)
## Date: 2026-02-06 (Last Updated)
## Version: 2.0
## Upstream Sources: task-management-saas-1 (TaskApp), task-management-saas-2 (TaskFlow)

---

## 1. Executive Summary

This document specifies the requirements for a unified task management platform that merges the strongest capabilities from two existing prototype systems (task-management-saas-1 and task-management-saas-2) into a single, production-grade application.

**saas-1** brought superior developer experience through Zustand state management, React Query data fetching with caching, a compact table-based task view with inline status editing, and task creator tracking. **saas-2** brought stronger security via HTTP-only cookie authentication with token refresh, a more complete API surface (user profiles, password management, team member management), Zod-based validation, a Kanban board view, bulk status operations, and explicit database indexes.

The unified system takes the best-in-class approach from each:

| Concern | Source | Rationale |
|---------|--------|-----------|
| Authentication | saas-2 | HTTP-only cookies, token refresh, logout endpoint |
| State management | saas-1 | Zustand is lighter and avoids Context re-render issues |
| Data fetching | saas-1 | React Query provides caching, deduplication, background refetch |
| Task views | Both | Table view (saas-1) + Kanban board (saas-2) with a toggle |
| User profiles | saas-2 | Profile update, avatar, password change |
| Team management | saas-2 | Role-based member add/remove |
| Validation | saas-2 | Zod for type-safe schema validation on the backend |
| Task creator tracking | saas-1 | creatorId on the Task model |
| Database indexes | saas-2 | Explicit indexes on status, projectId, assigneeId |
| Bulk operations | saas-2 | Bulk status update endpoint for drag-and-drop |

### Evolution from MVP to Full Platform

**Phase 0-4 (Implemented)**: Core foundation with authentication, projects, tasks, team management, and basic dashboard. **Status: ✅ Production-ready** with 95.8% test coverage (161/168 tests passing).

**Sprint 1 (Implemented)**: Dark mode, search & filtering, notifications system. **Status: ✅ Live** but needs test coverage.

**Sprint 2 (In Progress)**: Visual customization (color themes, layouts) and AI-powered task insights. **Status: 🔄 70% complete** - analytics backend implemented, needs frontend widget.

**Sprints 3-10 (Planned)**: Advanced features including recurring tasks, time tracking, real-time collaboration, custom fields, public API, webhooks, and natural language task creation. See detailed roadmap in sections 2.9-2.20.

### Strategic Positioning

TaskMan differentiates itself as **"The task manager for developers"** with unique features:
- **Creator Accountability Dashboard**: Identify bottlenecks and delegation patterns (no competitor has this)
- **Smart Task Dependencies**: Critical path visualization for project planning
- **CLI Tool**: Terminal-native task management for developer workflows
- **Public API + Webhooks**: Full automation and integration capabilities
- **AI-Powered Insights**: Productivity pattern analysis and recommendations


---

## 1.1 Strategic Positioning

### Product Identity

TaskMan positions itself as **"The task manager for developers"** with five core principles:

1. **Fast, Focused, No-Nonsense**
   - Anti-bloatware: No feature creep like Notion or Monday.com
   - Keyboard-first workflows for speed
   - Instant loading with aggressive caching strategies
   - Minimal clicks to complete common actions

2. **Developer-First Tooling**
   - Full REST API with API key authentication
   - Webhooks for automation and integrations
   - CLI tool for terminal-native task management
   - TypeScript end-to-end (frontend + backend)
   - Self-hostable via Docker

3. **Privacy-First, Self-Hostable**
   - Data ownership: users control their data
   - Docker deployment option for on-premise hosting
   - No third-party analytics tracking
   - Open-source roadmap consideration

4. **Beautiful AND Functional**
   - Design and engineering balance (not design-first or engineering-only)
   - Glassmorphism UI with micro-interactions
   - Smooth animations without sacrificing performance
   - Accessibility baked in (keyboard navigation, ARIA labels)

5. **Unique Accountability Features**
   - Creator analytics (no competitor has this)
   - Burnout prevention dashboard
   - Smart dependency management with critical path
   - AI-powered productivity insights

### Unique Selling Points

| Feature | Competitive Advantage |
|---------|----------------------|
| **Creator Accountability Dashboard** | Identify bottlenecks and delegation imbalances. Unique to TaskMan. Positioned as "anti-busywork" feature. |
| **Smart Task Dependencies** | Critical path visualization for project planning. Auto-adjust due dates when blockers shift. |
| **CLI Tool** | Terminal-native management for developers. Quick capture from command line. |
| **Public API + Webhooks** | Full automation capabilities. Position as "task manager for developers". |
| **AI-Powered Insights** | Productivity pattern analysis ("You're most productive on Tuesdays"). Task duration predictions. |
| **Focus Mode** | Deep work built-in. Distraction-free full-screen interface. |
| **Burnout Prevention** | Warn when team members are over-assigned. Workload balancing suggestions. Industry-first feature. |

### Competitive Differentiation

**vs. Todoist**: More developer-friendly (API, CLI), better team collaboration (real-time updates, comments)

**vs. TickTick**: Stronger project management (dependencies, critical path), more customizable UI

**vs. Notion**: Faster, more focused (no bloat), better task-specific features (recurring tasks, time tracking)

**vs. Asana/Monday.com**: Simpler to use, self-hostable, privacy-first, lower cost of ownership

**vs. Things 3**: Cross-platform (not Mac-only), team collaboration, public API

### Target Audience

- **Primary**: Software developers, engineering teams, technical project managers
- **Secondary**: Knowledge workers who value keyboard shortcuts and automation
- **Tertiary**: Privacy-conscious users seeking self-hosted alternatives to SaaS tools

### Marketing Messaging

- **Headline**: "The task manager built for developers who hate context-switching"
- **Subhead**: "CLI, API, webhooks, and a beautiful UI. Self-host or use our cloud."
- **CTA**: "Start for free. No credit card required. Deploy in 60 seconds."

---

## 2. Feature Specifications

### 2.1 Authentication & Session Management

**Source: saas-2 (auth model), saas-1 (state persistence pattern)**

#### 2.1.1 Registration
- **Endpoint**: `POST /api/auth/register`
- **Input validation**:
  - `email`: valid email format, normalized to lowercase
  - `password`: minimum 8 characters, must contain uppercase, lowercase, and a digit
  - `name`: trimmed, minimum 2 characters
- **Behavior**:
  - Check for duplicate email (return 409 if exists)
  - Hash password with bcryptjs (12 salt rounds)
  - Create user record
  - Generate JWT, set as HTTP-only cookie
  - Return user object (id, email, name, avatarUrl, createdAt) -- never return passwordHash
- **Cookie configuration**:
  - `httpOnly: true`
  - `secure: true` in production
  - `sameSite: 'none'` for cross-subdomain (Railway), `'strict'` for same-domain production
  - `maxAge: 7 days`

#### 2.1.2 Login
- **Endpoint**: `POST /api/auth/login`
- **Input**: email (validated), password (required)
- **Behavior**:
  - Find user by email
  - Compare password hash
  - On success: generate JWT, set HTTP-only cookie, return user object
  - On failure: generic "Invalid email or password" (401) -- no user enumeration

#### 2.1.3 Logout
- **Endpoint**: `POST /api/auth/logout`
- **Behavior**: Clear the auth cookie, return success message

#### 2.1.4 Session Refresh
- **Endpoint**: `POST /api/auth/refresh`
- **Requires**: Valid existing session (authenticate middleware)
- **Behavior**: Generate new JWT, replace cookie, return success

#### 2.1.5 Current User
- **Endpoint**: `GET /api/auth/me`
- **Requires**: Authentication
- **Returns**: User object (id, email, name, avatarUrl, createdAt)

#### 2.1.6 Frontend Auth State
- Zustand store with persistence middleware (persists user object only, not the token -- token lives in HTTP-only cookie)
- Persistence key: `'auth-storage'`
- On app load: call `GET /api/auth/me` to validate session
- On 401 from any API call: clear Zustand state, redirect to `/login`
- All API requests use `credentials: 'include'` for automatic cookie attachment

---

### 2.2 User Profile Management

**Source: saas-2**

#### 2.2.1 Update Profile
- **Endpoint**: `PUT /api/auth/profile`
- **Requires**: Authentication
- **Updatable fields**: `name` (min 2 chars), `avatarUrl` (valid URL)
- **Returns**: Updated user object

#### 2.2.2 Change Password
- **Endpoint**: `PUT /api/auth/password`
- **Requires**: Authentication
- **Input**:
  - `currentPassword`: required, verified against stored hash
  - `newPassword`: minimum 8 characters, must contain uppercase, lowercase, and a digit
- **Behavior**: Verify current password, hash new password, update record
- **Returns**: Success message

#### 2.2.3 Frontend Profile Page
- Accessible from user menu in the navigation bar
- Form fields: name, avatar URL
- Separate form/section for password change (current password + new password + confirm)
- Validation feedback inline

---

### 2.3 Project Management

**Source: saas-2 (API completeness, member management), saas-1 (data fetching patterns)**

#### 2.3.1 List Projects
- **Endpoint**: `GET /api/projects`
- **Requires**: Authentication
- **Returns**: Projects where user is owner OR member, including:
  - Owner info (id, name, avatarUrl)
  - Member list with roles
  - Task count (`_count.tasks`)
- **Ordering**: by `createdAt` descending
- **Frontend**: React Query with `['projects']` query key, automatic cache invalidation on mutations

#### 2.3.2 Get Project Detail
- **Endpoint**: `GET /api/projects/:id`
- **Requires**: Authentication + membership in project
- **Returns**: Project with all tasks (including assignee info and creator info), all members (including email), owner details, task count
- **Validation**: UUID format on `:id` param

#### 2.3.3 Create Project
- **Endpoint**: `POST /api/projects`
- **Input**:
  - `name`: required, 1-100 characters, trimmed
  - `description`: optional, max 500 characters
  - `color`: optional, hex format (`#RRGGBB`), default `#6366f1`
- **Behavior**:
  - Create project with authenticated user as owner
  - Auto-create ProjectMember record with role=OWNER
  - Return project with owner, members, task count

#### 2.3.4 Update Project
- **Endpoint**: `PUT /api/projects/:id`
- **Requires**: OWNER or ADMIN role on the project
- **Updatable fields**: name, description, color
- **Returns**: Updated project with full includes

#### 2.3.5 Delete Project
- **Endpoint**: `DELETE /api/projects/:id`
- **Requires**: OWNER role only
- **Behavior**: Cascade deletes all tasks and project members
- **Returns**: 204 No Content

#### 2.3.6 Frontend Projects Page
- Grid layout (responsive 1-3 columns)
- Project cards showing: color indicator, name, description preview, task count, member count
- Create/edit modal with color picker (predefined palette + hex input)
- Delete with confirmation dialog
- Click-through to project detail

---

### 2.4 Team / Member Management

**Source: saas-2**

#### 2.4.1 Add Member
- **Endpoint**: `POST /api/projects/:id/members`
- **Requires**: OWNER or ADMIN role on the project
- **Input**:
  - `email`: valid email of an existing user
  - `role`: optional, one of `ADMIN`, `MEMBER`, `VIEWER` (default: `MEMBER`)
- **Validation**:
  - Target user must exist (404 if not found)
  - Target user must not already be a member (409 if duplicate)
- **Returns**: Created membership with user info (201)

#### 2.4.2 Remove Member
- **Endpoint**: `DELETE /api/projects/:id/members/:userId`
- **Requires**: OWNER or ADMIN role
- **Constraints**: Cannot remove the project OWNER
- **Returns**: 204 No Content

#### 2.4.3 Role Definitions
| Role | Permissions |
|------|-------------|
| OWNER | Full control. Delete project. Add/remove any member. CRUD all tasks. |
| ADMIN | Update project. Add/remove members (except owner). CRUD all tasks. |
| MEMBER | Create tasks. Update/delete own tasks. |
| VIEWER | Read-only access to project and tasks. |

#### 2.4.4 Frontend Member Management
- Member list visible in project detail view
- Add member form (email input + role dropdown) -- OWNER/ADMIN only
- Remove member button with confirmation -- OWNER/ADMIN only
- Role badges displayed next to member names

---

### 2.5 Task Management

**Source: saas-1 (table view, creator tracking, React Query), saas-2 (Kanban, bulk status, Zod validation, filtering/sorting)**

#### 2.5.1 List Tasks
- **Endpoint**: `GET /api/tasks`
- **Requires**: Authentication
- **Scope**: Returns tasks from all projects where user is a member
- **Query parameters**:
  - `projectId`: filter by project (UUID)
  - `status`: filter by status enum
  - `priority`: filter by priority enum
  - `assigneeId`: filter by assignee (UUID)
  - `creatorId`: filter by creator (UUID)
  - `sortBy`: field to sort on (default: `createdAt`)
  - `order`: `asc` or `desc` (default: `desc`)
  - `cursor`: opaque cursor for pagination (UUID of last item)
  - `limit`: results per page (default: 50, max: 100)
- **Pagination**: Cursor-based pagination for scalability
  - Response: `{ tasks: Task[], nextCursor: string | null }`
  - When `nextCursor` is null, no more pages available
- **Includes**: project (id, name, color), assignee (id, name, avatarUrl), creator (id, name)
- **Frontend**: React Query with `['tasks']` query key, infinite scroll pattern, 5-minute stale time

#### 2.5.2 Get Task
- **Endpoint**: `GET /api/tasks/:id`
- **Requires**: Authentication + project membership
- **Returns**: Full task with project, assignee, and creator info

#### 2.5.3 Create Task
- **Endpoint**: `POST /api/tasks`
- **Validation (Zod)**:
  - `title`: string, 1-200 characters, required
  - `description`: string, max 2000 characters, optional
  - `projectId`: UUID, required
  - `assigneeId`: UUID, optional/nullable
  - `status`: enum (TODO, IN_PROGRESS, IN_REVIEW, DONE), optional (default: TODO)
  - `priority`: enum (LOW, MEDIUM, HIGH, URGENT), optional (default: MEDIUM)
  - `dueDate`: ISO 8601 datetime string, optional/nullable
- **Authorization**: User must be a member of the target project
- **Assignee check**: If assigneeId provided, verify they are a project member
- **Creator tracking**: Set `creatorId` to the authenticated user
- **Returns**: Created task with includes (201)

#### 2.5.4 Update Task
- **Endpoint**: `PUT /api/tasks/:id`
- **Validation**: Same as create, but all fields optional (partial update). `projectId` excluded from updates.
- **Authorization**:
  - User must be a member of the task's project
  - OWNER and ADMIN roles can update any task in the project
  - MEMBER role can only update tasks they created (where `creatorId` matches authenticated user)
  - VIEWER role cannot update tasks
- **Assignee check**: If changing assignee, verify new assignee is a project member
- **Returns**: Updated task with includes

#### 2.5.5 Delete Task
- **Endpoint**: `DELETE /api/tasks/:id`
- **Authorization**:
  - OWNER and ADMIN roles can delete any task in the project
  - MEMBER role can only delete tasks they created (where `creatorId` matches authenticated user)
  - VIEWER role cannot delete tasks
- **Returns**: 204 No Content

#### 2.5.6 Bulk Status Update
- **Endpoint**: `PATCH /api/tasks/bulk-status`
- **Input (Zod)**:
  - `taskIds`: array of UUIDs
  - `status`: TaskStatus enum value
- **Authorization**: Verify membership for each task's project
- **Returns**: `{ updated: <count> }`
- **Use case**: Drag-and-drop in Kanban view

#### 2.5.7 Frontend: Table View (from saas-1)
- Full-width table with columns: Task (title + description preview), Status, Priority, Project, Actions
- **Inline status editing**: dropdown selector directly in the table row, color-coded by status
- Priority badges: color-coded (red=URGENT, orange=HIGH, blue=MEDIUM, gray=LOW)
- Actions column: Edit (opens modal), Delete
- Empty state with CTA to create first task
- React Query mutations with cache invalidation on create/update/delete

#### 2.5.8 Frontend: Kanban Board View (from saas-2)
- 4-column layout: TODO, IN_PROGRESS, IN_REVIEW, DONE
- Column headers with status badge and task count
- Task cards showing: title, description (2-line clamp), priority indicator, due date, assignee avatar
- Minimum column height for visual consistency
- **Drag-and-drop**: Implement using `@dnd-kit/core` (modern, accessible, TypeScript-first)
- Dragging a card to a different column triggers bulk status update API call
- Visual feedback during drag (card elevation, drop zone highlighting)

#### 2.5.9 Frontend: View Toggle
- Toggle control in the task view header (Table / Kanban)
- User preference persisted (localStorage or Zustand)
- Both views share the same React Query cache and mutation logic

#### 2.5.10 Task Modal (Create/Edit)
- Modal overlay with form fields:
  - Title (text input, required)
  - Description (textarea, 3 rows)
  - Status (dropdown: TODO, IN_PROGRESS, IN_REVIEW, DONE)
  - Priority (dropdown: LOW, MEDIUM, HIGH, URGENT)
  - Project (dropdown populated from user's projects where role is OWNER, ADMIN, or MEMBER)
  - Assignee (dropdown populated from project members -- updates when project changes)
  - Due date (date picker)
- Submit creates or updates depending on context
- Close on backdrop click or Escape key

#### 2.5.11 Recurring Tasks

**Status**: 🔄 Planned (Sprint 3)

##### Overview
- **Purpose**: Automate creation of repeating tasks (daily standups, weekly reports, monthly bills)
- **Recurrence patterns**: Daily, Weekly, Monthly, Custom intervals
- **Generation**: Scheduled job creates next occurrence when current task is completed

##### Endpoints
- **Set recurrence**: `PUT /api/tasks/:id/recurrence`
  - **Requires**: Authentication + task modification permission (OWNER/ADMIN or task creator if MEMBER)
  - **Input (Zod)**:
    ```typescript
    {
      pattern: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM']);
      interval: z.number().min(1).optional();  // e.g., every 2 weeks
      daysOfWeek?: z.array(z.number().min(0).max(6));  // [1,3,5] for Mon/Wed/Fri
      dayOfMonth?: z.number().min(1).max(31);  // 15 for 15th of month
    }
    ```
  - **Returns**: Recurrence object with `nextOccurrence` date

- **Remove recurrence**: `DELETE /api/tasks/:id/recurrence`
  - **Requires**: Same authorization as setting recurrence
  - **Returns**: 204 No Content

- **Complete and create next**: `POST /api/tasks/:id/complete-recurring`
  - **Behavior**: Marks current task as DONE, creates next occurrence immediately
  - **Returns**: New task object (201)

##### Database Schema
```prisma
model Recurrence {
  id                String   @id @default(uuid())
  taskId            String   @unique
  task              Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  pattern           RecurrencePattern
  interval          Int      @default(1)
  daysOfWeek        Int[]    @default([])
  dayOfMonth        Int?
  nextOccurrence    DateTime
  createdAt         DateTime @default(now())
}

enum RecurrencePattern {
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM
}
```

##### Recurrence Calculation Rules
- **DAILY**: Next occurrence = current date + interval days
- **WEEKLY**: Next occurrence = next specified day of week (e.g., every Monday)
- **MONTHLY**: Next occurrence = same day next month (e.g., 15th of every month)
- **CUSTOM**: Complex rules (e.g., last Friday of every month) - future enhancement

##### Scheduled Job
- **Cron schedule**: Runs daily at midnight UTC
- **Logic**:
  1. Find all recurrences where `nextOccurrence <= today`
  2. For each recurrence, create new task instance (copy title, description, priority, etc.)
  3. Update `nextOccurrence` to next date based on pattern
  4. Link new task to recurrence for tracking
- **Technology**: `node-cron` or Railway scheduled task
- **Reliability**: Log all generation attempts, alert on failures

##### Frontend Features
- **Recurrence picker**: Dropdown in task modal
  - "Does not repeat" (default)
  - "Daily"
  - "Weekly on {day}"
  - "Monthly on day {n}"
  - "Custom..." (opens detailed picker)
- **Visual indicator**: Recurring task icon (↻) on task cards
- **Recurrence info**: Show pattern in task detail (e.g., "Repeats weekly on Monday")
- **Edit future occurrences**: Option to update all future tasks or just current

##### Authorization
- **Create/Update recurrence**: OWNER/ADMIN can set on any task, MEMBER can set on own tasks
- **View recurrence**: Anyone with task access
- **Delete recurrence**: Same as create/update

#### 2.5.12 Task Dependencies

**Status**: 🔄 Planned (Sprint 7)

##### Overview
- **Purpose**: Link tasks as blockers/dependencies for project planning
- **Use case**: Task B cannot start until Task A is complete
- **Visualization**: Gantt chart showing critical path
- **Auto-adjust**: Suggest new due dates when blocker due date shifts

##### Endpoints
- **Add dependency**: `POST /api/tasks/:id/dependencies`
  - **Requires**: Authentication + task modification permission
  - **Input**: `{ dependsOnId: string }` (UUID of blocking task)
  - **Validation**:
    - Blocking task must be in same project
    - Prevents circular dependencies (A → B → A)
  - **Returns**: Created dependency (201)

- **List dependencies**: `GET /api/tasks/:id/dependencies`
  - **Returns**:
    ```typescript
    {
      blockedBy: Task[];  // Tasks that must complete first
      blocking: Task[];   // Tasks waiting on this one
    }
    ```

- **Remove dependency**: `DELETE /api/tasks/:id/dependencies/:dependencyId`
  - **Requires**: Same authorization as adding
  - **Returns**: 204 No Content

- **Get critical path**: `GET /api/projects/:id/critical-path`
  - **Requires**: Project membership
  - **Returns**: Ordered sequence of tasks representing longest path
  - **Algorithm**: Topological sort + longest path calculation

##### Database Schema
```prisma
model TaskDependency {
  id            String   @id @default(uuid())
  taskId        String   // The dependent task
  task          Task     @relation("DependentOn", fields: [taskId], references: [id], onDelete: Cascade)
  dependsOnId   String   // The blocker task
  dependsOn     Task     @relation("Blocks", fields: [dependsOnId], references: [id], onDelete: Cascade)
  createdAt     DateTime @default(now())

  @@unique([taskId, dependsOnId])
}

model Task {
  // ... existing fields
  dependsOn    TaskDependency[] @relation("DependentOn")
  blocks       TaskDependency[] @relation("Blocks")
}
```

##### Circular Dependency Prevention
- **Validation**: Before creating dependency, check if adding would create cycle
- **Algorithm**: Depth-first search from new dependent task
  - If we can reach the blocking task, cycle would be created
  - Return 400 error: "Cannot create dependency: would create circular dependency"

##### Frontend Features
- **Dependency picker**: In task modal
  - Search tasks in same project
  - Show current blockers and blocked tasks
  - Visual warning icon if task has unresolved blockers
- **Gantt chart view**:
  - Timeline showing all project tasks
  - Dependency arrows connecting tasks
  - Critical path highlighted (longest chain)
  - Drag task to reschedule (suggests new dates for dependents)
- **"What's blocking me?"**: Filter to show only tasks with resolved blockers
- **Dependency indicators**:
  - Blocked task: Show blocker count badge, disable status change to IN_PROGRESS
  - Blocking task: Show count of dependent tasks

##### Auto-adjust Due Dates
- **Trigger**: When blocker's due date changes
- **Behavior**:
  1. Calculate slack time between blocker and dependent
  2. If blocker's new date pushes into slack, suggest adjustment
  3. Show notification: "Task B's due date may need adjustment (blocker moved)"
  4. User can accept/reject suggestion
- **Cascade**: If dependent is also blocking other tasks, cascade suggestion

##### Authorization
- **Add/Remove dependencies**: OWNER/ADMIN can modify any task dependencies, MEMBER can modify own task dependencies
- **View dependencies**: Anyone with project access can view dependency graph

##### Critical Path Calculation
- **Algorithm**:
  1. Build directed acyclic graph (DAG) of task dependencies
  2. Topological sort to get valid task ordering
  3. Calculate earliest start time (EST) for each task
  4. Calculate latest finish time (LFT) working backwards
  5. Tasks where EST = LFT are on critical path (no slack)
- **Performance**: O(V + E) where V = tasks, E = dependencies
- **Caching**: Cache critical path for 5 minutes, invalidate on dependency changes

---

### 2.6 Dashboard

**Source: saas-1 (statistics cards, recent tasks), saas-2 (project-centric overview)**

#### 2.6.1 Statistics Cards
- Total Tasks (count of all user-accessible tasks)
- Completed (count where status=DONE)
- In Progress (count where status=IN_PROGRESS)
- Urgent (count where priority=URGENT)

#### 2.6.2 Recent Tasks
- Grid of 5 most recent tasks
- Shows title, status badge, priority badge, project name

#### 2.6.3 Recent Projects
- List of 5 most recent projects
- Shows name, color indicator, task count

---

### 2.7 Navigation & Layout

**Source: saas-1 (sidebar layout), saas-2 (navbar with user menu)**

#### 2.7.1 Layout Structure
- Sidebar navigation with links: Dashboard, Tasks, Projects
- Active route highlighting
- User section showing avatar initial and name
- User menu: Profile settings, Logout

#### 2.7.2 Protected Routes
- All routes except `/login` and `/register` require authentication
- Unauthenticated users redirected to `/login`
- Authenticated users on `/login` or `/register` redirected to `/`

---

### 2.8 Health Check

- **Endpoint**: `GET /health`
- **Returns**: `{ status: 'ok', timestamp: <ISO string> }`
- **No authentication required**

---

### 2.9 Notifications System

**Status**: ✅ Implemented (Sprint 1)
**Backend**: `/api/notifications`

#### 2.9.1 List Notifications
- **Endpoint**: `GET /api/notifications`
- **Requires**: Authentication
- **Returns**: Array of notifications for the authenticated user
- **Scope**: User only sees their own notifications
- **Ordering**: Most recent first (`createdAt desc`)
- **Includes**: Related task/project information

#### 2.9.2 Notification Types
- **Task Assignment**: When user is assigned to a task
- **Task Status Change**: When a task user is involved in changes status
- **Project Invitation**: When user is added to a project
- **Comment Mention**: When user is @mentioned in a comment (future)
- **Due Date Reminder**: When task due date is approaching (future)

#### 2.9.3 Mark as Read
- **Endpoint**: `POST /api/notifications/mark-read/:id`
- **Requires**: Authentication + notification ownership
- **Behavior**: Updates notification read status
- **Returns**: Updated notification (200)

#### 2.9.4 Delete Notification
- **Endpoint**: `DELETE /api/notifications/:id`
- **Requires**: Authentication + notification ownership
- **Behavior**: Removes notification
- **Returns**: 204 No Content

#### 2.9.5 Frontend Integration
- Notification bell icon in navigation bar
- Unread count badge
- Dropdown list showing recent notifications
- Auto-refresh every 30 seconds (polling)
- Click notification navigates to related task/project

---

### 2.10 Analytics & Insights

**Status**: ✅ Partially Implemented (Sprint 2)
**Backend**: `/api/analytics`

#### 2.10.1 Productivity Insights
- **Endpoint**: `GET /api/analytics/insights`
- **Requires**: Authentication
- **Returns**: Velocity metrics, patterns, and contextual insights
- **Response Structure**:
  ```typescript
  {
    velocity: {
      thisWeek: number;        // Tasks completed in last 7 days
      lastWeek: number;        // Tasks completed in previous 7 days
      changePercent: number;   // % change week-over-week
    };
    patterns: {
      mostProductiveDay: string;  // Day of week (e.g., "Tuesday")
      tasksAnalyzed: number;      // Sample size for pattern detection
    };
    insight: string;  // Human-readable insight message
  }
  ```

#### 2.10.2 Insight Generation
- **Velocity-based insights**:
  - "+30% faster this week" (when changePercent >= 20)
  - "A bit slower this week" (when changePercent <= -20)
  - "Consistency is key" (stable velocity)
- **Pattern-based insights**:
  - "You're most productive on {day}s lately"
  - Calculated from last 2 weeks of completed tasks
- **Zero-state insight**:
  - "Complete some tasks to unlock insights!" (no completed tasks)

#### 2.10.3 Creator Accountability Dashboard
- **Endpoint**: `GET /api/analytics/creator-metrics`
- **Requires**: Authentication + OWNER or ADMIN role on at least one project
- **Returns**: Creator leaderboard and delegation metrics
- **Response Structure**:
  ```typescript
  {
    creators: Array<{
      user: { id, name, avatarUrl };
      tasksCreated: number;
      selfAssigned: number;
      delegated: number;
      delegationRatio: number;  // 0.0 to 1.0
    }>;
  }
  ```
- **Use case**: Identify bottlenecks, encourage delegation balance
- **Authorization**: Only managers (OWNER/ADMIN) can view team metrics
- **Frontend**: Dashboard page showing creator leaderboard with charts

#### 2.10.4 Future Analytics
- **Time-based patterns**: Morning vs. afternoon productivity
- **Completion time estimates**: Predict task duration based on history
- **Burnout risk detection**: Warn when user is over-assigned
- **Team velocity trends**: Track team performance over time

---

### 2.11 User Preferences

**Status**: ✅ Implemented (Sprint 2)

#### 2.11.1 Color Themes
- **Endpoint**: `PUT /api/auth/profile` (extend existing)
- **Supported Themes**:
  - **Indigo** (default): Primary blue-indigo (#6366f1)
  - **Purple**: Primary purple (#a855f7)
  - **Rose**: Primary pink-rose (#f43f5e)
  - **Emerald**: Primary green-emerald (#10b981)
  - **Amber**: Primary orange-amber (#f59e0b)
- **Implementation**:
  - CSS Variables: Each theme defines `--color-primary`, `--color-primary-dark`, `--color-primary-light`
  - Theme File: `frontend/src/lib/themes.ts` with theme definitions
  - Applied globally via CSS variable overrides on `:root`
- **Storage**: User model `theme` field (backend), localStorage (frontend fallback)
- **Frontend**: Theme picker dropdown in Profile settings page
- **Customization Power**: 5 themes × 5 layouts = 25 UI combinations
- **Validation (Zod)**:
  ```typescript
  theme: z.enum(['indigo', 'purple', 'rose', 'emerald', 'amber']).optional()
  ```

#### 2.11.2 Layout Preferences
- **Storage**: Frontend only (localStorage via Zustand store with persist middleware)
- **Supported Layouts**:
  1. **Compact**: Minimal padding, higher information density, more tasks visible per screen
  2. **Spacious**: Generous whitespace, comfortable reading, reduced cognitive load
  3. **Minimal**: Collapsed sidebar by default, focus on content, distraction-free
  4. **Split**: Side-by-side task list and detail pane (no modal for task editing)
  5. **Dashboard-First**: Dashboard as default landing page instead of tasks
- **Implementation**:
  - Zustand Store: `layout.ts` with `persist` middleware
  - CSS Classes: Applied to root element, affects all components
  - Layout Switcher: Dropdown in Profile settings page
- **Persistence Key**: `layout-preferences`
- **State**: `{ layout: 'compact' | 'spacious' | 'minimal' | 'split' | 'dashboard-first' }`

#### 2.11.3 Density Settings
- **Modes**:
  - **Comfortable**: Standard padding (default), `--spacing-scale: 1.0`
  - **Compact**: Reduced padding, `--spacing-scale: 0.75`, more items visible
  - **Spacious**: Increased padding, `--spacing-scale: 1.25`, easier reading
- **Implementation**:
  - CSS Custom Properties: `--spacing-scale`, `--font-size-base`, `--row-height`
  - Applied to document root, affects all components globally
  - Zustand Store: `density.ts` with localStorage persistence
- **Affects**: Global spacing, font sizes, task card heights, table row height, gap between elements
- **UI Component**: Gmail-style `DensityPicker` dropdown in Profile settings
- **Storage**: Frontend only (localStorage key: `density-setting`)

---

### 2.12 Quick Actions

**Status**: ✅ Implemented (Sprint 3)

#### 2.12.1 Command Palette

##### Overview
Keyboard-first command interface inspired by Linear, Notion, and VS Code for rapid navigation and actions.

##### Keyboard Shortcut
- **Mac**: `Cmd + K`
- **Windows/Linux**: `Ctrl + K`
- **Accessibility**: Focus trap when open, Escape to close

##### Features
- **Search Tasks**: Real-time fuzzy search across all user's tasks by title/description
- **Navigate Pages**: Dashboard, Tasks, Projects, Profile, Focus Mode
- **Quick Actions**: Create task, Create project, Open settings
- **Recent History**: Last 5 accessed tasks/projects
- **Keyboard Navigation**: Arrow keys, Enter to select, Tab between groups

##### Visual Design
- **Glassmorphism**: Frosted glass effect with backdrop blur
- **Framer Motion**: Smooth scale-in animation on open (0.95 → 1.0)
- **Command Groups**: Visual separation (Navigation | Tasks | Actions | Recent)
- **Highlighted Selection**: Active item highlighted with primary color

##### Search Behavior
- **Fuzzy Matching**: Tolerates typos (e.g., "tsk" matches "task")
- **Real-time Filtering**: Updates as user types with 150ms debounce
- **Auto-focus**: Input field auto-focused on palette open
- **Empty State**: Shows helpful message when no results found

##### Implementation
- **Component**: `CommandPalette.tsx`
- **Hook**: `useCommandPalette.ts` (global keyboard listener)
- **State**: Zustand store for open/close state and recent history
- **Library**: Custom implementation (no external `cmdk` dependency)
- **No backend changes**: Purely frontend feature using existing React Query cache

#### 2.12.2 Command Groups
- **Navigation**: Dashboard, Tasks, Projects, Profile, Focus Mode
- **Tasks**: Search all user's tasks, click to navigate to task detail
- **Actions**: Create task, Create project, Open settings, Open shortcuts guide
- **Recent**: Last 5 accessed tasks/projects (persisted in localStorage)

---

### 2.13 Time Tracking

**Status**: ✅ Implemented (Sprint 4)

#### 2.13.1 Manual Entry
- **Endpoints**:
  - `POST /api/time-entries` - Create entry (duration or start/end)
  - `PUT /api/time-entries/:id` - Update entry
  - `DELETE /api/time-entries/:id` - Delete entry
  - `GET /api/time-entries` - List entries (filters: task, date range)
  - `GET /api/time-entries/stats` - Aggregate stats
- **Fields**: `startTime`, `endTime`, `duration` (seconds), `description`

#### 2.13.2 Start/Stop Timer
- **Endpoints**:
  - `POST /api/time-entries/start` - Start timer for task
  - `GET /api/time-entries/active` - Get running timer
  - `POST /api/time-entries/:id/stop` - Stop timer
- **Constraints**: Only one active timer per user at a time on tasks

#### 2.13.2 Timer Workflow
1. User clicks "Start Timer" on task
2. Backend creates entry with `startTime = now`, `endTime = null`
3. User clicks "Stop Timer"
4. Backend updates entry with `endTime = now`, calculates `durationSeconds`
5. Frontend displays elapsed time

#### 2.13.3 Manual Time Entry
- **Use case**: Log time retroactively
- **Input**: Start time, end time (or duration)
- **Validation**: End time must be after start time

#### 2.13.4 Time Aggregation
- **Total time on task**: Sum of all `durationSeconds` for task
- **Time estimate**: New field `Task.estimatedHours` (optional)
- **Actual vs. estimate**: Display comparison in task detail

#### 2.13.5 Pomodoro Mode
- **Timer preset**: 25 minutes work, 5 minutes break
- **Auto-stop**: Timer stops after 25 minutes
- **Frontend**: Pomodoro toggle in timer widget

#### 2.13.6 Calendar View
- **Endpoint**: `GET /api/tasks?calendar=true&month=2026-02`
- **Returns**: Tasks with due dates, grouped by date
- **Frontend**:
  - Monthly calendar showing task due dates
  - Drag-and-drop to reschedule (updates `task.dueDate`)
  - Week view toggle
  - Uses `react-big-calendar` or custom implementation
- **Visual**: Color-coded by priority, click to open task modal

---

### 2.14 Activity Logs

**Status**: ✅ Implemented (Sprint 5)

#### 2.14.1 Endpoints
- `GET /api/tasks/:id/activity` - List activity history
  - Supports pagination via `cursor` or `limit`

#### 2.14.2 Tracked Events
- **Task**: Created, Status change, Priority change, Assignee change, Due date change
- **Comments**: Added, Edited, Deleted
- **Dependencies**: Added, Removed
- **Schema**:
```prisma
model ActivityLog {
  id        String   @id @default(uuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String   // "TASK_CREATED", "STATUS_CHANGED", etc.
  meta      Json?    // Store old/new values { old: "TODO", new: "DONE" }
  createdAt DateTime @default(now())
}
```

#### 2.14.3 Middleware Implementation
- **Activity logger middleware**: Intercepts PUT requests
- **Change detection**: Compare old vs. new values
- **Automatic logging**: Creates activity record on change
- **Applied to**: Task update, task assignment, comment creation

#### 2.14.4 Frontend Display
- **Activity timeline**: Chronological list in task detail modal
- **Relative timestamps**: "2 hours ago", "Yesterday"
- **User avatars**: Show who made each change
- **Grouping**: Collapse multiple changes by same user within 5 minutes

---

### 2.15 Comments & Real-time Collaboration

**Status**: ✅ Implemented (Sprint 5)

#### 2.5.11 Recurring Tasks
- **Status**: ✅ Implemented (Sprint 3)
- **Endpoints**:
  - `POST /api/recurring-tasks` - Create recurring task
  - `GET /api/recurring-tasks` - List recurring tasks
  - `GET /api/recurring-tasks/:id` - Get details
  - `DELETE /api/recurring-tasks/:id` - Delete recurring task
  - `POST /api/recurring-tasks/:id/generate` - Manually trigger generation
- **Logic**:
  - `cron` job (or external trigger) calls generic logic to create tasks based on schedule
  - Supports: Daily, Weekly, Monthly, Custom intervals
  - Copies: Title, description, project, priority from base task

#### 2.5.12 Task Dependencies
- **Status**: ✅ Implemented (Sprint 7)
- **Endpoints**:
  - `POST /api/tasks/:id/dependencies` - Add dependency
  - `GET /api/tasks/:id/dependencies` - List dependencies
  - `DELETE /api/tasks/:id/dependencies/:depId` - Remove dependency
- **Logic**:
  - **Blocking**: Task A blocks Task B (B cannot be started until A is done)
  - **Cycle Detection**: Prevent A -> B -> A loops
  - **Visuals**: Show blockers in task detail
  - **Graph**: Critical path calculation (future)

#### 2.15.1 Comments System
- **Endpoints**:
  - `POST /api/tasks/:id/comments` - Add comment
  - `GET /api/tasks/:id/comments` - List comments for task
  - `PUT /api/comments/:id` - Edit own comment
  - `DELETE /api/comments/:id` - Delete own comment (creator only)
- **Authorization**: Anyone with task access can comment
- **Features**:
  - @mentions (notify mentioned user)
  - Threaded replies (via `parentId`)
  - Edit/delete own comments only

#### 2.15.2 Comment Database Schema
```prisma
model Comment {
  id          String   @id @default(uuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  content     String
  parentId    String?  // For threaded replies
  parent      Comment? @relation("CommentReplies", fields: [parentId], references: [id])
  replies     Comment[] @relation("CommentReplies")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### 2.15.3 @Mentions
- **Parsing**: Detect `@username` in comment content
- **Notification**: Create notification for mentioned user
- **Frontend**: Autocomplete dropdown when typing `@`
- **Validation**: Only mention project members

#### 2.15.4 WebSocket Real-time Updates
- **WebSocket endpoint**: `ws://api.example.com/ws`
- **Authentication**: Token passed in upgrade request
- **Events**:
  - `task_updated`: Broadcast task changes to all subscribers
  - `comment_added`: Real-time comment notifications
  - `user_presence`: Show who's viewing this task
- **Backend**: WebSocket server using `ws` library
- **Frontend**: WebSocket client with auto-reconnect

#### 2.15.5 Real-time Event Flow
1. User A updates task status
2. Backend updates database
3. Backend broadcasts `task_updated` event via WebSocket
4. User B (viewing same task) receives event
5. User B's frontend invalidates React Query cache, refetches task
6. User B sees updated status without page refresh

#### 2.15.6 Presence Indicators
- **Show active viewers**: "Alice and Bob are viewing this task"
- **Typing indicators**: "Alice is typing..." in comments
- **Cursor tracking** (future): Show where collaborators are editing

#### 2.15.7 WebSocket Scalability
- **Single server**: Direct WebSocket connections
- **Multi-server**: Redis pub/sub for message broadcasting
- **Reconnection**: Exponential backoff, max 3 attempts
- **Fallback**: If WebSocket unavailable, fall back to 5-second polling

---

### 2.16 Custom Fields & Attachments

**Status**: ✅ Implemented (Sprint 6)

#### 2.16.1 Custom Fields
- **Admin/Owner only**: Define custom fields per project
- **Endpoints**:
  - `POST /api/custom-fields` - Create field definition
  - `GET /api/custom-fields` - List project fields
  - `PUT /api/custom-fields/:id` - Update field
  - `DELETE /api/custom-fields/:id` - Delete field
  - `GET /api/custom-fields/task/:taskId` - Get values for task
  - `PUT /api/custom-fields/task/:taskId` - Set values for task
- **Field types**:
  - **TEXT**: Single-line text input
  - **NUMBER**: Numeric input
  - **DATE**: Date picker
  - **DROPDOWN**: Single-select from options
- **Required fields**: Can be marked as required

#### 2.16.2 Custom Field Database Schema
```prisma
model CustomField {
  id          String     @id @default(uuid())
  projectId   String
  project     Project    @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String
  fieldType   FieldType
  options     Json?      // For DROPDOWN: ["Option 1", "Option 2"]
  required    Boolean    @default(false)
  createdAt   DateTime   @default(now())
}

model FieldValue {
  id       String      @id @default(uuid())
  taskId   String
  task     Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  fieldId  String
  field    CustomField @relation(fields: [fieldId], references: [id], onDelete: Cascade)
  value    Json        // Store any type of value
}
```

#### 2.16.3 Tags System
- **Global tags**: Project-scoped tags
- **Endpoints**:
  - `GET /api/tags?projectId=xxx` - List project tags
  - `POST /api/tags` - Create tag (name, color)
  - `PUT /api/tags/:id` - Update tag
  - `DELETE /api/tags/:id` - Delete tag
  - `POST /api/tags/task/:taskId` - Add tag to task
  - `DELETE /api/tags/task/:taskId/:tagId` - Remove tag from task
- **Multi-select**: Tasks can have multiple tags
- **Color-coded**: Each tag has a hex color

#### 2.16.4 File Attachments
- **Endpoints**:
  - `POST /api/attachments/task/:taskId` - Upload file (multipart/form-data)
  - `GET /api/attachments/task/:taskId` - List attachments
  - `GET /api/attachments/:id/download` - Download file
  - `DELETE /api/attachments/:id` - Delete file (uploader or admin only)
- **Storage**: AWS S3, Cloudinary, or local filesystem
- **Limits**:
  - Max file size: 10MB per file
  - Max files per task: 5 attachments
  - Allowed types: Images (jpg, png), PDFs, documents (docx, xlsx)
- **Validation**: File type whitelist, virus scanning (future)

#### 2.16.5 File Attachment Database Schema
```prisma
model Attachment {
  id          String   @id @default(uuid())
  taskId      String
  task        Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String   // Uploader
  user        User     @relation(fields: [userId], references: [id])
  filename    String
  mimeType    String
  size        Int      // bytes
  storageKey  String   // S3 key or local path
  uploadedAt  DateTime @default(now())
}
```

#### 2.16.6 Frontend Features
- **Dynamic form builder**: Render custom fields based on project config
- **File upload widget**: Drag-and-drop or click to upload
- **Image preview**: Inline preview for images
- **Download button**: Download attached files

---

### 2.17 CLI Tool

**Status**: ✅ Implemented (Sprint 8)

#### 2.17.1 Installation
- **Package**: `taskman-cli` in `cli/` directory
- **Global install**: `cd cli && npm install && npm run build && npm link`
- **Requirements**: Node.js 20+, TaskMan backend running, valid API key

#### 2.17.2 Authentication
- **Storage**: Config file at `~/.config/taskman-cli/config.json`
- **Login**: `taskman login` prompts for API URL and API key
- **Validation**: Tests credentials with `GET /api/auth/me`

#### 2.17.3 Commands Implemented
| Command | Description | Example |
|---------|-------------|---------|
| `taskman login` | Configure API credentials | `taskman login` |
| `taskman create <title>` | Create new task | `taskman create "Fix bug" --priority HIGH` |
| `taskman list` | List tasks with filters | `taskman list --status TODO` |
| `taskman show <id>` | Show task details | `taskman show abc12345` |
| `taskman update <id>` | Update task fields | `taskman update abc12345 --status DONE` |
| `taskman complete <id>` | Mark task as done | `taskman complete abc12345` |
| `taskman projects` | List all projects | `taskman projects` |

#### 2.17.4 Create Options
```bash
taskman create "Task title"
  -p, --project <id>          Project ID
  -d, --description <text>    Task description
  --priority <level>          LOW, MEDIUM, HIGH, URGENT (default: MEDIUM)
  --due <date>                Due date (YYYY-MM-DD, "tomorrow", "next week")
  -a, --assignee <id>         Assignee user ID
```

#### 2.17.5 List Filters
```bash
taskman list
  -p, --project <name>        Filter by project name
  -s, --status <status>       TODO, IN_PROGRESS, IN_REVIEW, DONE
  -a, --assignee <email>      Filter by assignee email
  --priority <priority>       LOW, MEDIUM, HIGH, URGENT
  --limit <number>            Limit results (default: 20)
```

#### 2.17.6 Output Formatting
- **Table format**: ASCII table using `cli-table3`
- **Color-coded**:
  - Status: ✓ DONE (green), ◐ IN_PROGRESS (cyan), ○ TODO (white)
  - Priority: URGENT (red), HIGH (yellow), MEDIUM (blue), LOW (gray)
- **Short IDs**: Display first 8 characters of UUID
- **Relative dates**: "2 days ago" using `date-fns`

#### 2.17.7 Shell Completion
- **Bash**: Source `cli/completions/taskman.bash` in `~/.bashrc`
- **Zsh**: Copy `cli/completions/taskman.zsh` to `~/.zsh/completions/_taskman`
- **Features**: Command completion, option completion, status/priority value completion

---

### 2.18 Public API

**Status**: ✅ Implemented (Sprint 8)

#### 2.18.1 API Key Authentication
- **Generate key**: `POST /api/auth/api-keys` (requires auth)
- **List keys**: `GET /api/auth/api-keys`
- **Revoke key**: `DELETE /api/auth/api-keys/:id`
- **Header format**: `X-API-Key: <api_key>`
- **Security**: Keys hashed in database (bcrypt), never stored plain text

#### 2.18.2 API Key Database Schema
```prisma
model ApiKey {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  name        String   // "Production", "Testing", "CI/CD"
  key         String   @unique  // bcrypt hashed
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

#### 2.18.3 Rate Limiting
- **Per API key**: 1000 requests/hour
- **Headers**:
  - `X-RateLimit-Limit: 1000`
  - `X-RateLimit-Remaining: 750`
  - `X-RateLimit-Reset: 1643673600` (Unix timestamp)
- **429 response**: When rate limit exceeded
- **Sliding window**: Redis-based rate limiting

#### 2.18.4 API Documentation
- **OpenAPI spec**: Auto-generated from route definitions
- **Documentation URL**: `/api/docs` (Swagger UI)
- **Postman collection**: Exportable collection for testing
- **TypeScript SDK**: Auto-generated client library

#### 2.18.5 Available Endpoints
- All existing endpoints available via API key auth
- Same authorization rules apply (project membership, role-based)
- No behavioral differences from cookie auth

---

### 2.19 Webhooks

**Status**: ✅ Implemented (Sprint 8)

#### 2.19.1 Webhook Configuration
- **Endpoints**:
  - `POST /api/webhooks` - Create webhook
  - `GET /api/webhooks` - List user's webhooks
  - `PUT /api/webhooks/:id` - Update webhook
  - `DELETE /api/webhooks/:id` - Delete webhook
- **Configuration**:
  - `url`: Target URL to POST events
  - `events`: Array of event types to subscribe
  - `active`: Boolean to enable/disable

#### 2.19.2 Webhook Events
| Event | Trigger |
|-------|---------|
| `task.created` | New task created |
| `task.updated` | Task fields updated |
| `task.completed` | Task status changed to DONE |
| `task.deleted` | Task deleted |
| `project.created` | New project created |
| `project.updated` | Project updated |
| `comment.added` | Comment added to task |

#### 2.19.3 Webhook Payload
```json
{
  "event": "task.created",
  "timestamp": "2026-02-06T12:00:00Z",
  "data": {
    "id": "uuid",
    "title": "Buy milk",
    "status": "TODO",
    "priority": "HIGH",
    "projectId": "uuid",
    "creatorId": "uuid"
  }
}
```

#### 2.19.4 HMAC Signature
- **Header**: `X-Webhook-Signature: sha256=<signature>`
- **Algorithm**: HMAC-SHA256
- **Key**: Webhook secret
- **Payload**: Raw JSON body
- **Verification**:
  ```typescript
  const signature = crypto
    .createHmac('sha256', webhook.secret)
    .update(rawBody)
    .digest('hex');
  ```

#### 2.19.5 Retry Logic
- **Attempts**: 3 retries with exponential backoff
- **Backoff**: 1s, 5s, 25s
- **Failure logging**: Store failed attempts in `webhook_logs` table
- **Disable on repeated failures**: Auto-disable after 10 consecutive failures

#### 2.19.6 Webhook Logs
- **Endpoint**: `GET /api/webhooks/:id/logs`
- **Returns**: Last 100 delivery attempts
- **Log fields**: `timestamp`, `event`, `responseCode`, `error`, `payload`
- **Use case**: Debug webhook delivery issues

---

### 2.20 Natural Language Task Creation

**Status**: 🔄 Planned (Sprint 9)

#### 2.20.1 Smart Quick-Add Bar
- **Frontend**: Prominent input bar at top of dashboard
- **Placeholder**: "Buy milk tomorrow at 3pm in Project X"
- **Parsing**: Extract structured data from natural language
- **Libraries**: `chrono-node` (dates), `compromise` (NLP)

#### 2.20.2 Parsing Examples
| Input | Parsed Output |
|-------|---------------|
| "Buy milk tomorrow" | title="Buy milk", dueDate=tomorrow |
| "Meeting at 3pm" | title="Meeting", dueDate=today 3pm |
| "urgent task in Project X" | title="task", priority=URGENT, project="Project X" |
| "Call client on Friday" | title="Call client", dueDate=Friday |
| "Fix bug #123 high priority" | title="Fix bug #123", priority=HIGH |

#### 2.20.3 Pattern Detection
- **Dates**: "tomorrow", "Friday", "in 3 days", "2026-02-15"
- **Times**: "at 3pm", "9:30am", "15:00"
- **Projects**: "in Project X", "#ProjectName"
- **Priority**: "urgent", "high", "low" (case-insensitive)
- **Assignee**: "@Alice", "assigned to Bob"

#### 2.20.4 Date Parsing Library (chrono-node)
```typescript
import * as chrono from 'chrono-node';

const results = chrono.parse("Meeting tomorrow at 3pm");
// results[0].start.date() => Date object for tomorrow 3pm
```

#### 2.20.5 NLP Library (compromise)
```typescript
import nlp from 'compromise';

const doc = nlp("urgent task");
const priority = doc.match('(urgent|high|low|medium)').text();
// priority => "urgent"
```

#### 2.20.6 Fallback Behavior
- **Unparseable input**: Create task with full input as title
- **Ambiguous dates**: Prompt user for clarification
- **Invalid project**: Show error, list available projects
- **Partial parsing**: Show preview, let user confirm before creating

#### 2.20.7 Frontend Preview
- **Real-time parsing**: Show extracted fields as user types
- **Visual feedback**: Highlight parsed entities (dates in blue, projects in green)
- **Edit before create**: Preview modal with parsed fields, allow editing
- **Keyboard shortcuts**: `Cmd+Enter` to create immediately

---

### 2.21 Focus Mode

**Status**: ✅ Implemented (Sprint 7)

#### 2.21.1 Overview
Full-screen, distraction-free task focus interface that helps users concentrate on high-priority work. Positioned as a "deep work" feature for single-task focus sessions.

#### 2.21.2 Frontend Implementation
- **Route**: `/focus`
- **Component**: `FocusPage.tsx`
- **Data Source**: Top 3 tasks sorted by priority (URGENT → HIGH → MEDIUM → LOW)
- **Filtering**: Excludes DONE tasks

#### 2.21.3 Behavior
- Displays top 3 tasks in large card format
- Mark-as-done with animation and confetti celebration
- Completion counter ("2 of 3 tasks completed")
- Back to dashboard navigation
- Empty state when all focus tasks completed ("Great job! All priority tasks done.")

#### 2.21.4 Visual Design
- Full-screen layout with minimal chrome (no sidebar)
- Large task cards showing title, description, priority badge, due date
- Framer Motion slide-in animations for card entrance
- Confetti animation on task completion via `canvas-confetti`
- Progress indicator at top

#### 2.21.5 Use Cases
- Deep work sessions without distractions
- Focus on critical tasks only
- Alternative view for overwhelmed users
- Morning ritual: tackle top 3 priorities

---

### 2.22 UI/UX Design System

**Status**: ✅ Implemented (Sprints 2-6)

#### 2.22.1 Glassmorphism
- **Description**: Frosted glass visual effect on modals, cards, and panels
- **Implementation**: 
  - CSS utility classes: `glass-card`, `glass-card-dark`
  - `backdrop-filter: blur(10px)` for blur effect
  - Semi-transparent backgrounds (`bg-white/80`, `bg-gray-900/80`)
  - Subtle borders with low opacity
- **Components Using Glass**: Modals, Command Palette, Notification Center, Task detail panels

#### 2.22.2 Micro-interactions
- **Button Hover**: 
  - Scale transform (`scale-105`) on hover
  - Shadow increase for depth perception
  - Smooth transition (200ms)
- **Task Completion**: 
  - Confetti animation via `canvas-confetti` library
  - Celebration trigger on status change to DONE
  - Optional sound effect (future enhancement)
- **Modal Animations**: 
  - Scale and fade-in on open (0.95 → 1.0 scale)
  - Fade-out on close
  - Backdrop fade (0 → 0.5 opacity)
- **Drag Indicators**: 
  - Pulse animation on draggable items
  - Visual feedback during drag (elevation, opacity)

#### 2.22.3 Framer Motion Integration
- **Library**: `framer-motion` for declarative animations
- **Page Transitions**: 
  - Fade + slide animations between routes
  - `AnimatePresence` component wrapping route changes
  - Exit animations before unmount
- **Modal Variants**:
  ```typescript
  modalOverlay: { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  modalContent: { hidden: { scale: 0.95, opacity: 0 }, visible: { scale: 1, opacity: 1 } }
  ```
- **Task Card Hover**: 
  - Translate Y (-4px) on hover
  - Shadow expansion
  - Smooth spring animation
- **Table Rows**: 
  - Fade-in with stagger effect
  - Each row delays by 50ms for cascading appearance

#### 2.22.4 Skeleton Loading States
- **Purpose**: Content placeholders while data loads, reducing perceived loading time
- **Components**: 
  - `DashboardSkeleton`: Grid of stat cards and task placeholders
  - `TableSkeleton`: Table structure with shimmer rows
  - `KanbanSkeleton`: Column structure with card placeholders
  - `ProjectCardSkeleton`: Project grid placeholders
- **Pattern**: 
  - Gray rectangles matching content dimensions
  - `animate-pulse` CSS animation for shimmer effect
  - Dark mode support (different gray shades)
- **View-Aware Loading**: Renders appropriate skeleton based on active view (table vs kanban)
- **Implementation**: `Skeletons.tsx` component library

#### 2.22.5 Empty States
- **Purpose**: Encourage first-time actions with friendly messaging and visuals
- **Components**: 
  - `EmptyTasksState`: No tasks illustration
  - `EmptyProjectsState`: No projects illustration
  - `EmptyCalendarState`: Empty calendar illustration
  - `EmptyTimeEntriesState`: No time entries illustration
- **Pattern**: 
  - Custom SVG illustration (simple, on-brand)
  - Encouraging message ("No tasks yet. Create your first one!")
  - Primary CTA button (e.g., "Create Task")
  - Framer Motion slide-up entrance animation
- **Tone**: Positive and action-oriented, not punishing
- **Implementation**: `EmptyStates.tsx` (specific states) + `EmptyState.tsx` (generic wrapper)

#### 2.22.6 Design Tokens (CSS Variables)
- **Spacing Scale**: Controlled via density settings
  - Comfortable: `--spacing-scale: 1.0` (default)
  - Compact: `--spacing-scale: 0.75`
  - Spacious: `--spacing-scale: 1.25`
- **Color Palette**: 5 themes with CSS variable overrides
  - `--color-primary`, `--color-primary-dark`, `--color-primary-light`
  - `--color-secondary`, `--color-accent`
- **Typography**: 
  - Font sizes: `--font-size-base` (adjusted per density)
  - Font families: System font stack for performance
- **Transitions**: 
  - `--transition-base: 200ms ease-in-out`
  - Consistent easing curves across components

---

### 2.23 Data Export

**Status**: ✅ Implemented (Sprint 9)

#### 2.23.1 Export Tasks Endpoint
- **Endpoint**: `GET /api/export/tasks`
- **Requires**: Authentication
- **Query Parameters**:
  - `format`: `csv` or `json` (required)
  - `projectId`: Filter by project UUID (optional)
- **Returns**: File download with appropriate Content-Disposition header

####2.23.2 CSV Export Format
- **Columns**: ID, Title, Description, Status, Priority, Project Name, Assignee Name, Creator Name, Due Date, Created At, Updated At
- **Escaping**: 
  - Commas escaped with quotes
  - Quotes escaped as double-quotes (`""`)
  - Newlines preserved in multi-line fields
- **Headers**: 
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="tasks-{date}.csv"`
- **Encoding**: UTF-8 with BOM for Excel compatibility

#### 2.23.3 JSON Export Format
- **Schema**: Array of task objects with full nested data
  ```json
  [
    {
      "id": "uuid",
      "title": "Task title",
      "description": "Description",
      "status": "TODO",
      "priority": "HIGH",
      "project": { "id": "uuid", "name": "Project Name" },
      "assignee": { "id": "uuid", "name": "John Doe" },
      "creator": { "id": "uuid", "name": "Jane Smith" },
      "dueDate": "2026-02-15T10:00:00Z",
      "createdAt": "2026-02-01T08:00:00Z"
    }
  ]
  ```
- **Headers**: 
  - `Content-Type: application/json`
  - `Content-Disposition: attachment; filename="tasks-{date}.json"`

#### 2.23.4 Frontend UI
- **Location**: TasksPage header, next to filter controls
- **Component**: Export dropdown with CSV/JSON options
- **Loading State**: Shows spinner during export generation
- **Error Handling**: Toast notification on export failure
- **Success Feedback**: Browser triggers file download

#### 2.23.5 Authorization
- Users can only export tasks from projects they are members of
- Export respects role-based permissions (VIEWER, MEMBER, ADMIN, OWNER)
- Project filtering validates user has access to specified project

#### 2.23.6 Performance Considerations
- **Pagination**: Large exports (>1000 tasks) streamed in chunks
- **Timeout**: 30-second request timeout for large datasets
- **Future Enhancement**: Background job for very large exports with email delivery

---

### 2.24 Keyboard Shortcuts System

**Status**: ✅ Implemented (Sprint 9)

#### 2.24.1 Shortcuts Guide Modal
- **Trigger**: `?` key from any page
- **Component**: `KeyboardShortcutsModal`
- **Layout**: Grouped shortcuts in card-based layout
- **Dismissal**: Escape key or click outside modal

#### 2.24.2 Shortcut Groups

##### General
- **Help**: `?` - Open shortcuts guide
- **Close**: `Escape` - Dismiss modal/popover

##### Navigation
- **Dashboard**: `g` then `d` - Navigate to dashboard
- **Tasks**: `g` then `t` - Navigate to tasks page
- **Projects**: `g` then `p` - Navigate to projects page
- **Profile**: `g` then `s` - Navigate to settings/profile

##### Command Palette
- **Open**: `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)

##### Tasks
- **New Task**: `n` - Open create task modal
- **Focus Mode**: `f` - Navigate to focus mode

#### 2.24.3 Platform Detection
- **Mac**: Shows `⌘` symbol for Cmd, `⌥` for Option
- **Windows/Linux**: Shows `Ctrl`, `Alt` text
- **Implementation**: User-agent detection in `useCommandPalette` hook
- **Future Enhancement**: Detect physical keyboard layout

#### 2.24.4 Global Registration
- **Event Listener**: Attached to `document` on app mount
- **Zustand Store**: Manages shortcut registry and modal state
- **Prevent Default**: Prevents browser shortcuts (e.g., `Cmd+K` search)
- **Scope Awareness**: Some shortcuts only active on specific pages

#### 2.24.5 Visual Design
- **Keyboard Key Badges**: 
  - Rounded corners (`rounded-md`)
  - Border for definition
  - Monospace font for key labels
  - Subtle background (`bg-gray-100` light, `bg-gray-800` dark)
- **Grouping**: Clear section headers with dividers
- **Typography**: Descriptive labels next to key badges
- **Accessibility**: Full keyboard navigation within modal

#### 2.24.6 Future Enhancements
- **Customization**: User-defined shortcuts
- **Search**: Filter shortcuts in guide modal
- **Hints**: Tooltip hints on first use
- **Cheat Sheet**: Printable PDF version

---

### 2.25 Pagination System

**Status**: ✅ Implemented (Sprint 8)

#### 2.25.1 Backend Implementation
- **Pattern**: Offset-based pagination using `skip`/`take`
- **Endpoints**: `GET /api/tasks`, `GET /api/projects`
- **Query Parameters**:
  - `page`: Page number (1-indexed, optional)
  - `limit`: Items per page (default: 20, max: 100)
- **Calculation**: 
  - `skip = (page - 1) * limit`
  - `take = limit`

#### 2.25.2 Backward Compatibility
- **Without `page` param**: Returns raw array (original behavior)
  ```json
  [ { task1 }, { task2 }, ... ]
  ```
- **With `page` param**: Returns envelope with pagination metadata
  ```json
  {
    "data": [ { task1 }, { task2 }, ... ],
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 87,
      "totalPages": 5
    }
  }
  ```

#### 2.25.3 Pagination Metadata
- **page**: Current page number
- **limit**: Items per page
- **total**: Total count of items matching filters
- **totalPages**: Calculated as `Math.ceil(total / limit)`

#### 2.25.4 Frontend Component
- **Component**: `Pagination.tsx`
- **Features**:
  - Page number buttons (max 7 visible)
  - Previous / Next navigation buttons
  - Ellipsis for large page counts (e.g., `1 ... 5 6 7 ... 20`)
  - "Showing X-Y of Z results" text
  - Disabled states for first page (no prev) and last page (no next)
- **Styling**: Matches existing button/badge design system

#### 2.25.5 Auto-Reset Behavior
- **On Filter Change**: Page resets to 1 when user changes filters
- **React Query**: Page stored in query params, synced with URL
- **User Experience**: Prevents empty pages after filtering

#### 2.25.6 Limit Clamping
- **Validation**: Backend clamps `limit` to range `[1, 100]`
- **Error Handling**: Returns 400 Bad Request if limit invalid
- **Frontend**: Dropdown with preset options (10, 20, 50, 100)

#### 2.25.7 Performance Considerations
- **Database Indexes**: Ensure indexed columns for sort fields to optimize `OFFSET` queries
- **Future Enhancement**: Cursor-based pagination for very large datasets
- **Count Query**: Separate count query for total (can be cached)

---

## 3. Data Model

### 3.1 Merged Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String   @map("password_hash")
  name         String
  avatarUrl    String?  @map("avatar_url")
  createdAt    DateTime @default(now()) @map("created_at")

  ownedProjects  Project[]       @relation("ProjectOwner")
  projectMembers ProjectMember[]
  assignedTasks  Task[]          @relation("TaskAssignee")
  createdTasks   Task[]          @relation("TaskCreator")

  @@map("users")
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  color       String   @default("#6366f1")
  ownerId     String   @map("owner_id")
  createdAt   DateTime @default(now()) @map("created_at")

  owner   User            @relation("ProjectOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members ProjectMember[]
  tasks   Task[]

  @@map("projects")
}

model Task {
  id          String     @id @default(uuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?  @map("due_date")
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @updatedAt @map("updated_at")

  projectId  String  @map("project_id")
  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  assigneeId String? @map("assignee_id")
  assignee   User?   @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)

  creatorId String @map("creator_id")
  creator   User   @relation("TaskCreator", fields: [creatorId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([assigneeId])
  @@index([status])
  @@index([creatorId])
  @@map("tasks")
}

model ProjectMember {
  projectId String      @map("project_id")
  userId    String      @map("user_id")
  role      ProjectRole @default(MEMBER)
  joinedAt  DateTime    @default(now()) @map("joined_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([projectId, userId])
  @@map("project_members")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  IN_REVIEW
  DONE
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum ProjectRole {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}
```

### 3.2 Key Schema Decisions

| Decision | Rationale |
|----------|-----------|
| `creatorId` on Task (from saas-1) | Accountability -- know who created each task |
| Explicit `@@index` directives (from saas-2) | Query performance on common filter columns |
| `onDelete: Cascade` on Project->Task | Deleting a project removes all its tasks |
| `onDelete: SetNull` on Task->assignee | Deleting a user unassigns their tasks rather than deleting them |
| `onDelete: Cascade` on Task->creator | If a user is deleted, their created tasks are removed |
| Composite PK on ProjectMember | Enforces one membership record per user-project pair |

---

## 4. API Summary

### 4.1 Core API Endpoints

| Method | Endpoint | Auth | Status | Sprint |
|--------|----------|------|--------|--------|
| **Authentication** |||||
| POST | /api/auth/register | No | ✅ Live | Phase 1 |
| POST | /api/auth/login | No | ✅ Live | Phase 1 |
| POST | /api/auth/logout | No | ✅ Live | Phase 1 |
| POST | /api/auth/refresh | Yes | ✅ Live | Phase 1 |
| GET | /api/auth/me | Yes | ✅ Live | Phase 1 |
| PUT | /api/auth/profile | Yes | ✅ Live | Phase 1 |
| PUT | /api/auth/password | Yes | ✅ Live | Phase 1 |
| POST | /api/auth/api-keys | Yes | ✅ Live | Sprint 8 |
| GET | /api/auth/api-keys | Yes | ✅ Live | Sprint 8 |
| DELETE | /api/auth/api-keys/:id | Yes | ✅ Live | Sprint 8 |
| **Projects** |||||
| GET | /api/projects | Yes | ✅ Live | Phase 2 |
| GET | /api/projects/:id | Yes | ✅ Live | Phase 2 |
| POST | /api/projects | Yes | ✅ Live | Phase 2 |
| PUT | /api/projects/:id | Yes | ✅ Live | Phase 2 |
| DELETE | /api/projects/:id | Yes | ✅ Live | Phase 2 |
| POST | /api/projects/:id/members | Yes | ✅ Live | Phase 2 |
| DELETE | /api/projects/:id/members/:userId | Yes | ✅ Live | Phase 2 |
| GET | /api/custom-fields | Yes | ✅ Live | Sprint 6 |
| POST | /api/custom-fields | Yes | ✅ Live | Sprint 6 |
| DELETE | /api/custom-fields/:id | Yes | ✅ Live | Sprint 6 |
| GET | /api/projects/:id/critical-path | Yes | 🔄 Planned | Sprint 7 |
| **Tasks** |||||
| GET | /api/tasks | Yes | ✅ Live | Phase 3 |
| GET | /api/tasks/:id | Yes | ✅ Live | Phase 3 |
| POST | /api/tasks | Yes | ✅ Live | Phase 3 |
| PUT | /api/tasks/:id | Yes | ✅ Live | Phase 3 |
| DELETE | /api/tasks/:id | Yes | ✅ Live | Phase 3 |
| PATCH | /api/tasks/bulk-status | Yes | ✅ Live | Phase 3 |
| POST | /api/recurring-tasks | Yes | ✅ Live | Sprint 3 |
| GET | /api/recurring-tasks | Yes | ✅ Live | Sprint 3 |
| DELETE | /api/recurring-tasks/:id | Yes | ✅ Live | Sprint 3 |
| GET | /api/tasks/:id/dependencies | Yes | ✅ Live | Sprint 7 |
| POST | /api/tasks/:id/dependencies | Yes | ✅ Live | Sprint 7 |
| DELETE | /api/tasks/:id/dependencies/:depId | Yes | ✅ Live | Sprint 7 |
| GET | /api/tasks/:id/activity | Yes | ✅ Live | Sprint 5 |
| GET | /api/tasks/:id/comments | Yes | ✅ Live | Sprint 5 |
| POST | /api/tasks/:id/comments | Yes | ✅ Live | Sprint 5 |
| GET | /api/time-entries | Yes | ✅ Live | Sprint 4 |
| POST | /api/time-entries | Yes | ✅ Live | Sprint 4 |
| POST | /api/attachments/task/:taskId | Yes | ✅ Live | Sprint 6 |
| PUT | /api/custom-fields/task/:taskId | Yes | ✅ Live | Sprint 6 |
| POST | /api/tags/task/:taskId | Yes | ✅ Live | Sprint 6 |
| **Comments** |||||
| PUT | /api/comments/:id | Yes | ✅ Live | Sprint 5 |
| DELETE | /api/comments/:id | Yes | ✅ Live | Sprint 5 |
| **Time Tracking** |||||
| DELETE | /api/time-entries/:id | Yes | ✅ Live | Sprint 4 |
| GET | /api/time-entries/stats | Yes | ✅ Live | Sprint 4 |
| **Attachments** |||||
| GET | /api/attachments/:id/download | Yes | ✅ Live | Sprint 6 |
| DELETE | /api/attachments/:id | Yes | ✅ Live | Sprint 6 |
| **Tags** |||||
| GET | /api/tags | Yes | ✅ Live | Sprint 6 |
| POST | /api/tags | Yes | ✅ Live | Sprint 6 |
| **Notifications** |||||
| GET | /api/notifications | Yes | ✅ Live | Sprint 1 |
| PATCH | /api/notifications/mark-read | Yes | ✅ Live | Sprint 1 |
| DELETE | /api/notifications/:id | Yes | ✅ Live | Sprint 1 |
| **Analytics** |||||
| GET | /api/analytics/insights | Yes | ✅ Live | Sprint 2 |
| GET | /api/analytics/creator-metrics | Yes | ✅ Live | Sprint 2 |
| **Webhooks** |||||
| GET | /api/webhooks | Yes | ✅ Live | Sprint 8 |
| POST | /api/webhooks | Yes | ✅ Live | Sprint 8 |
| PUT | /api/webhooks/:id | Yes | ✅ Live | Sprint 8 |
| DELETE | /api/webhooks/:id | Yes | ✅ Live | Sprint 8 |
| GET | /api/webhooks/:id/logs | Yes | ✅ Live | Sprint 8 |
| **Health** |||||
| GET | /health | No | ✅ Live | Phase 0 |

### 4.2 WebSocket Events

| Event | Direction | Status | Sprint |
|-------|-----------|--------|--------|
| task_updated | Server → Client | 🔄 Planned | Sprint 5 |
| comment_added | Server → Client | 🔄 Planned | Sprint 5 |
| user_presence | Bidirectional | 🔄 Planned | Sprint 5 |
| subscribe_task | Client → Server | 🔄 Planned | Sprint 5 |

---

## 5. Tech Stack

### 5.1 Frontend

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **React** | 18.x | UI framework | Shared by both upstream systems; mature ecosystem |
| **TypeScript** | 5.x | Type safety | Shared by both; catches errors at compile time |
| **Vite** | 5.x | Build tool / dev server | Shared by both; fast HMR, optimized production builds |
| **React Router DOM** | 6.x | Client-side routing | Shared by both; standard React routing solution |
| **Zustand** | 4.x | Client state management | From saas-1. Minimal boilerplate, no Context re-render issues, built-in persistence middleware |
| **TanStack React Query** | 5.x | Server state / data fetching | From saas-1. Automatic caching, background refetching, request deduplication, optimistic updates, built-in loading/error states |
| **Tailwind CSS** | 3.x | Styling | Shared by both; utility-first, consistent design |
| **Lucide React** | 0.358+ | Icons | Shared by both; lightweight, tree-shakeable |
| **clsx** | 2.x | Conditional class names | Shared by both |
| **date-fns** | 3.x | Date formatting | Shared by both; modular, tree-shakeable |

### 5.2 Backend

| Technology | Version | Purpose | Rationale |
|------------|---------|---------|-----------|
| **Node.js** | 20 LTS | Runtime | Shared by both; LTS for stability |
| **Express** | 4.x | HTTP framework | Shared by both; mature, widely supported |
| **TypeScript** | 5.x | Type safety | Shared by both |
| **Prisma** | 5.x | ORM / database client | Shared by both; type-safe queries, migrations, schema-as-code |
| **PostgreSQL** | 16 | Database | saas-2 version; latest stable with performance improvements |
| **Zod** | 3.x | Request validation | From saas-2. Type-safe schema validation with TypeScript inference; replaces express-validator for request body validation |
| **bcryptjs** | 2.x | Password hashing | Shared by both; 12 salt rounds |
| **jsonwebtoken** | 9.x | JWT generation/verification | Shared by both |
| **cookie-parser** | 1.x | Cookie parsing middleware | From saas-2; needed for HTTP-only cookie auth |
| **helmet** | 7.x | Security headers | Shared by both |
| **cors** | 2.x | Cross-origin configuration | Shared by both; configured with credentials support |
| **morgan** | 1.x | HTTP request logging | Shared by both |
| **tsx** | 4.x | TypeScript execution (dev) | Shared by both; fast dev server with watch mode |

### 5.3 Infrastructure

| Technology | Purpose | Rationale |
|------------|---------|-----------|
| **Docker** | Containerization | Multi-stage builds for optimized images; consistent dev/prod environments |
| **Docker Compose** | Local development orchestration | Single command to run full stack locally |
| **Railway** | Deployment platform | saas-1 is already deployed here successfully. Single platform for frontend, backend, and PostgreSQL. Auto SSL, GitHub integration, environment variable management. |

### 5.4 Stack Decisions Not Carried Forward

| Technology | Was In | Why Not |
|------------|--------|---------|
| React Context (auth state) | saas-2 | Replaced by Zustand -- avoids subtree re-renders, less boilerplate |
| Native fetch (API client) | saas-2 | Replaced by React Query + fetch/axios -- adds caching, deduplication, retries |
| express-validator (body validation) | Both | Replaced by Zod for request bodies -- better TypeScript inference. express-validator retained only for param validation (`:id` UUID checks) |
| localStorage JWT | saas-1 | Replaced by HTTP-only cookies -- prevents XSS token theft |
| Axios | saas-1 | Use native **fetch** with `credentials: 'include'` for all API requests. React Query abstracts the HTTP client, and fetch avoids an external dependency. |

---

## 6. Frontend Routes

| Path | Page | Auth Required |
|------|------|---------------|
| `/login` | Login | No (redirects to `/` if authenticated) |
| `/register` | Register | No (redirects to `/` if authenticated) |
| `/` | Dashboard | Yes |
| `/tasks` | Tasks (Table/Kanban toggle) | Yes |
| `/projects` | Projects list | Yes |
| `/projects/:id` | Project detail (Kanban + members) | Yes |
| `/profile` | User profile settings | Yes |

---

## 7. Non-Functional Requirements

### 7.1 Security
- Passwords hashed with bcryptjs (12 rounds)
- JWT tokens in HTTP-only cookies only -- never exposed to JavaScript
- CORS configured for specific allowed origin
- Helmet.js security headers on all responses
- No user enumeration on login failure
- Input validation on all endpoints (Zod for bodies, express-validator for URL params)

### 7.2 Performance
- React Query client-side caching (5-minute stale time)
- Database indexes on frequently-filtered columns (status, projectId, assigneeId, creatorId)
- Prisma selective field inclusion (never return passwordHash)

### 7.3 Developer Experience
- TypeScript end-to-end (frontend + backend)
- Zustand for minimal-boilerplate state management
- React Query for declarative server state
- Prisma for type-safe database access
- Hot module replacement via Vite in development
- Docker Compose for one-command local setup

---

## 8. Seed Data

For development and testing, the system should include a seed script that creates:

- **2 users**: alice@example.com (Password123), bob@example.com (Password123)
- **3 projects**: with varied ownership and membership between the two users
- **10 tasks**: distributed across projects with varied statuses, priorities, assignees, and due dates

**Implementation**: Create as `prisma/seed.ts` and execute via `npx prisma db seed` (configured in `package.json` with `"prisma": { "seed": "tsx prisma/seed.ts" }`). The seed script should be idempotent (safe to run multiple times) and clear existing data before seeding.

---

## 9. Open Questions

These items are deferred to the implementation planning phase:

1. **Notification system**: Neither upstream has notifications. Consider whether to add toast notifications for mutation success/error feedback.
2. **Pagination**: Neither upstream paginates task or project lists. May be needed at scale but is not required for MVP.
3. **Search**: Neither upstream has full-text search. Deferred.
4. **Activity log**: With creatorId tracking, an activity/audit log is possible but deferred.

---

*This PRD is the basis for implementation planning. The next phase will produce a detailed implementation plan with file-by-file specifications, build order, and migration strategy.*
