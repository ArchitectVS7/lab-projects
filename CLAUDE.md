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
# Or manually with env vars:
cross-env DATABASE_URL=postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test?schema=public JWT_SECRET=test-jwt-secret jest --runInBand --forceExit

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
- **Middleware**: Authentication, error handling, and rate limiting in `src/middleware/`
- **Database**: Prisma ORM with PostgreSQL, schema in `prisma/schema.prisma`

### Frontend Structure

- **State management**: Zustand stores in `src/store/` (auth, layout, timer, density, theme, socket, etc.)
- **Data fetching**: TanStack React Query with API client in `src/lib/api.ts`
- **Routing**: React Router v6
- **Real-time**: Socket.io client in `src/lib/socket.ts` with hooks in `src/hooks/`
- **Styling**: Tailwind CSS with theme system and density settings
- **Animations**: Framer Motion with performance optimizations

### Database Schema (18 models)

Key models:
- **User**: Authentication and profile
- **Project**: Container for tasks with team members
- **Task**: Core entity with status, priority, assignments, dependencies
- **ProjectMember**: Project membership with roles
- **RecurringTask**: Template for generating recurring tasks
- **TimeEntry**: Time tracking with start/end/duration
- **Comment**: Threaded comments on tasks with @mentions
- **ActivityLog**: Audit trail for task changes
- **Tag**: Project-scoped tags for tasks
- **CustomFieldDefinition/CustomFieldValue**: Extensible task metadata
- **Attachment**: File uploads linked to tasks
- **TaskDependency**: Task blocking relationships
- **Notification**: User notifications
- **ApiKey/Webhook**: API integration features
- **Achievement/UserAchievement**: Gamification

### Testing

- **Backend**: Jest with ts-jest, supertest for API testing, 265 tests across 14 suites
- **Test database**: `taskapp_test` at `postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test`
- **Test pattern**: `beforeAll` for setup, create users via API endpoints, `--runInBand --forceExit` flags
- **Windows note**: Set env vars separately (not inline Unix-style)
- **Coverage**: 61 endpoints tested across multiple phases (Auth, Projects, Tasks, Time tracking, Comments, etc.)

### WebSocket Architecture

- Socket.io server initialized in `src/index.ts` via `initializeSocket()`
- Authentication: JWT extracted from cookie on connection
- Rooms: User-specific (`user:<userId>`) and task-specific (`task:<taskId>`)
- Events: Real-time updates for tasks, comments, notifications
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

## Git Workflow

- Main branch: `main`
- Feature branches: `claude/[feature-name]-[hash]` prefix for PR branches
- When resolving conflicts between implementation and test PRs: prefer the implementation that was co-designed with tests
- Commits use descriptive messages, often include "Co-Authored-By: Claude Sonnet 4.5"

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
