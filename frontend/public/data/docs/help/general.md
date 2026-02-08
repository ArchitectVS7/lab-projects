# Help for general

In-app help content for general


#### 2.4.1 Add Member

#### 2.4.1 Add Member
- **Endpoint**: `POST /api/projects/:id/members`
- **Requires**: OWNER or ADMIN role on the project
- **Input**:
  - `email`: valid email of an existing user
  - `role`: optional, one of `ADMIN`, `MEMBER`, `VIEWER` (default: `MEMBER`)
- **Validation**:
  - Target user must exist (404 if not found)
  - Target user must not already be a member (409 if duplicate)
- **Notification**: Sends PROJECT_INVITE in-app notification to the added user via WebSocket (real-time)
- **Returns**: Created membership with user info (201)

<!-- Metadata: {"audience":["user","admin","developer"],"surface":["help"]} -->

#### 2.7.1 Layout Structure

#### 2.7.1 Layout Structure
- Sidebar navigation with links: Dashboard, Tasks, Projects, Calendar, Focus Mode, Creator Dashboard, Dependencies, API Keys, Webhooks
- Active route highlighting
- User section showing avatar initial and name
- User menu: Profile settings, Logout
- Help button for contextual documentation sidebar
- Notification center with unread count badge
- Connection status indicator (WebSocket online/offline)
- Onboarding modal on first login for new users

<!-- Metadata: {"audience":["user","developer"],"surface":["docs","help"]} -->

##### Search Behavior

##### Search Behavior
- **Fuzzy Matching**: Tolerates typos (e.g., "tsk" matches "task")
- **Real-time Filtering**: Updates as user types with 150ms debounce
- **Auto-focus**: Input field auto-focused on palette open
- **Empty State**: Shows helpful message when no results found

<!-- Metadata: {"audience":["user"],"surface":["help"]} -->

#### 2.21.1 Overview

#### 2.21.1 Overview
Full-screen, distraction-free task focus interface that helps users concentrate on high-priority work. Positioned as a "deep work" feature for single-task focus sessions.

<!-- Metadata: {"audience":["user"],"surface":["help"]} -->

### 2.24 In-App Help System

### 2.24 In-App Help System

**Status**: ✅ Implemented

<!-- Metadata: {"surface":["help"]} -->

#### 2.24.1 Help Page

#### 2.24.1 Help Page
- **Route**: `/help`
- **Features**: Full searchable documentation generated from PRD
- **Content**: Grouped by section, renders markdown with proper hierarchy
- **Search**: Full-text search across all documentation blocks

<!-- Metadata: {"surface":["docs","help"]} -->

#### 2.24.2 Contextual Help Sidebar

#### 2.24.2 Contextual Help Sidebar
- **Trigger**: Help button in navigation bar
- **Behavior**: Shows context-aware suggestions based on current route
- **Search**: Inline search within sidebar
- **Link**: Links to full `/help` page for comprehensive documentation

<!-- Metadata: {"surface":["docs","help"]} -->

#### 2.24.3 Documentation Pipeline

#### 2.24.3 Documentation Pipeline
- **Source**: `docs/PRD.md` parsed by `.docs-automation/parser.ts`
- **Build**: `npm run docs:build` in `.docs-automation/` directory
- **Output**: JSON content blocks in `frontend/public/data/docs/`
- **Consumption**: `HelpContext.tsx` loads blocks and provides route-based suggestions

---

<!-- Metadata: {"surface":["docs","help"]} -->

##### General

##### General
- **Help**: `?` - Open shortcuts guide
- **Close**: `Escape` - Dismiss modal/popover

<!-- Metadata: {"surface":["help"]} -->

#### 2.24.6 Future Enhancements

#### 2.24.6 Future Enhancements
- **Customization**: User-defined shortcuts
- **Search**: Filter shortcuts in guide modal
- **Hints**: Tooltip hints on first use
- **Cheat Sheet**: Printable PDF version

---

<!-- Metadata: {"audience":["user"],"surface":["help"]} -->

## 6. Frontend Routes

## 6. Frontend Routes

| Path | Page | Auth Required |
|------|------|---------------|
| `/login` | Login | No (redirects to `/` if authenticated) |
| `/register` | Register | No (redirects to `/` if authenticated) |
| `/` | Dashboard | Yes |
| `/tasks` | Tasks (Table/Kanban toggle) | Yes |
| `/focus` | Focus Mode | Yes |
| `/projects` | Projects list | Yes |
| `/projects/:id` | Project detail (Kanban + members) | Yes |
| `/calendar` | Calendar View | Yes |
| `/profile` | User profile settings | Yes |
| `/creator-dashboard` | Creator Analytics | Yes |
| `/dependencies` | Dependency Graph | Yes |
| `/api-keys` | API Key Management | Yes |
| `/webhooks` | Webhook Configuration | Yes |
| `/help` | Documentation / Help | Yes |

---

<!-- Metadata: {"audience":["user","developer"],"surface":["docs","help"]} -->

## 9. Resolved Questions

## 9. Resolved Questions

These items were originally open questions and have all been resolved:

1. **Notification system**: ✅ Implemented (Sprint 1) - In-app notifications with WebSocket real-time delivery, notification center UI, PROJECT_INVITE / TASK_ASSIGNED / TASK_STATUS_CHANGED types
2. **Pagination**: ✅ Implemented (Sprint 8) - Offset-based pagination with backward-compatible envelope format
3. **Search**: ✅ Implemented - Command Palette (Cmd+K) with fuzzy search across tasks, NLP smart task input with natural language parsing
4. **Activity log**: ✅ Implemented (Sprint 5) - Full activity timeline with change tracking, middleware-based automatic logging

---

*This PRD is the basis for implementation planning. The next phase will produce a detailed implementation plan with file-by-file specifications, build order, and migration strategy.*

<!-- Metadata: {"surface":["help"]} -->

## 10. Implementation Status

## 10. Implementation Status

**Version 3.1 (Current)** - 2026-02-08
- **Completed**: All Sprints 1-9 (100% feature complete) + Alpha Testing Fixes
- **Test Status**:
  - Backend: 371/373 tests passing (99.5%)
  - Frontend: 106/106 tests passing (100%)
  - CLI: 26/26 tests passing (100%)
  - Total: 503 passing tests across 36 test suites
- **Architecture**:
  - 67+ API endpoints across 14 route files
  - 18 Prisma models with proper relations and indexes
  - 13 frontend pages with full UI implementation
  - CLI tool with shell completions
  - WebSocket real-time updates with presence indicators
  - Natural language task parsing
  - Documentation automation pipeline (PRD → Help system)
- **Alpha Testing Ready**: Yes - multi-user collaboration tested and verified
- **Recent Fixes (v3.1)**:
  - Onboarding modal wired into Layout for new user guidance
  - Seed data endpoint made idempotent (no duplicates on repeat use)
  - Project invite notifications now sent via WebSocket when adding members
  - Projects list auto-refreshes when user is added to a project
  - Broken CMS admin route removed (help system is the working docs surface)
  - Backend CI pipeline now includes TypeScript compilation check
- **Remaining**: Sprint 10 features (Habit Tracking, Voice Input, Burnout Prevention, Collaborative Estimation) marked as future enhancements
- **Validation**: Comprehensive validation report available in `docs/VALIDATION-REPORT.md`

<!-- Metadata: {"audience":["user","admin","developer"],"surface":["docs","help"]} -->
