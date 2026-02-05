# Product Requirements Document: Unified Task Management Platform

## Status: Draft
## Date: 2026-02-05
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

The result is a single deployable system with enterprise-grade auth, efficient client-side state, flexible task visualization, and full team collaboration -- deployed to Railway as the target platform.

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
- **Includes**: project (id, name, color), assignee (id, name, avatarUrl), creator (id, name)
- **Frontend**: React Query with `['tasks']` query key, 5-minute stale time, 1 retry

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

| Method | Endpoint | Auth | Source |
|--------|----------|------|--------|
| POST | /api/auth/register | No | saas-2 |
| POST | /api/auth/login | No | saas-2 |
| POST | /api/auth/logout | No | saas-2 |
| POST | /api/auth/refresh | Yes | saas-2 |
| GET | /api/auth/me | Yes | saas-2 |
| PUT | /api/auth/profile | Yes | saas-2 |
| PUT | /api/auth/password | Yes | saas-2 |
| GET | /api/projects | Yes | Both |
| GET | /api/projects/:id | Yes | Both |
| POST | /api/projects | Yes | Both |
| PUT | /api/projects/:id | Yes | Both |
| DELETE | /api/projects/:id | Yes | Both |
| POST | /api/projects/:id/members | Yes | saas-2 |
| DELETE | /api/projects/:id/members/:userId | Yes | saas-2 |
| GET | /api/tasks | Yes | Both |
| GET | /api/tasks/:id | Yes | Both |
| POST | /api/tasks | Yes | Both |
| PUT | /api/tasks/:id | Yes | Both |
| DELETE | /api/tasks/:id | Yes | Both |
| PATCH | /api/tasks/bulk-status | Yes | saas-2 |
| GET | /health | No | Both |

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
