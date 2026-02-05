# Task Management SaaS

A full-stack task management application built with React, Node.js, Express, and PostgreSQL.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript + Zod
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT with refresh tokens

## Database Schema

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    projects     │       │     tasks       │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id              │◄──────│ owner_id        │       │ id              │
│ email           │       │ id              │◄──────│ project_id      │
│ password_hash   │       │ name            │       │ title           │
│ name            │       │ description     │       │ description     │
│ avatar_url      │       │ color           │       │ assignee_id     │──►
│ created_at      │       │ created_at      │       │ status          │
└─────────────────┘       └─────────────────┘       │ priority        │
        │                         │                 │ due_date        │
        │                         │                 │ created_at      │
        │                         │                 │ updated_at      │
        │                         │                 └─────────────────┘
        │                         │
        │    ┌─────────────────┐  │
        └───►│ project_members │◄─┘
             ├─────────────────┤
             │ project_id (PK) │
             │ user_id (PK)    │
             │ role            │
             │ joined_at       │
             └─────────────────┘
```

### Enums

- **TaskStatus:** `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`
- **Priority:** `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **ProjectRole:** `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`

## Project Structure

```
task-management-saas/
├── frontend/          # React TypeScript application
├── backend/           # Express TypeScript API
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── migrations/      # SQL migrations
│   │   └── seed.ts          # Seed data
│   └── src/
│       ├── routes/          # API endpoints
│       ├── middleware/      # Auth & error handling
│       └── lib/             # Prisma client
├── docker-compose.yml
└── README.md
```

## Quick Start

### Docker (Recommended)

```bash
# Start all services
docker-compose up --build

# Run migrations & seed
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run prisma:seed
```

### Manual Setup

```bash
# 1. Start PostgreSQL
docker-compose up -d postgres

# 2. Backend
cd backend
npm install
cp .env.example .env
npx prisma migrate dev
npm run prisma:seed
npm run dev

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| Prisma Studio | http://localhost:5555 |

## Test Accounts

After seeding:

| Email | Password |
|-------|----------|
| alice@example.com | password123 |
| bob@example.com | password123 |

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List user's projects |
| GET | /api/projects/:id | Get project with tasks |
| POST | /api/projects | Create project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| POST | /api/projects/:id/members | Add member |
| DELETE | /api/projects/:id/members/:userId | Remove member |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/tasks | List tasks (filterable) |
| GET | /api/tasks/:id | Get task |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| PATCH | /api/tasks/bulk-status | Bulk update status |

### Query Parameters (GET /api/tasks)

- `projectId` - Filter by project
- `status` - Filter by status
- `priority` - Filter by priority
- `assigneeId` - Filter by assignee
- `sortBy` - Sort field (default: createdAt)
- `order` - Sort order: asc/desc (default: desc)

## Development

```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create migration
npx prisma migrate dev --name <migration_name>

# Reset database (drops all data)
npx prisma migrate reset

# Open Prisma Studio (database GUI)
npx prisma studio
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/taskdb"
PORT=3000
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
```

## License

MIT
