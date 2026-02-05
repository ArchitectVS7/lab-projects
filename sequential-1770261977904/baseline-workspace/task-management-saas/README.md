# Task Management SaaS

A modern task management application built with React, Node.js, and PostgreSQL.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma

## Project Structure

```
task-management-saas/
├── frontend/          # React TypeScript app
├── backend/           # Express API server
├── docker-compose.yml # Local development setup
└── README.md
```

## Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

## Quick Start (Docker)

1. Clone and navigate to the project:
   ```bash
   cd task-management-saas
   ```

2. Start all services:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - PostgreSQL: localhost:5432

## Manual Setup

### Database

Start PostgreSQL (or use Docker):
```bash
docker-compose up -d postgres
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Environment Variables

### Backend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 4000 |
| DATABASE_URL | PostgreSQL connection string | - |
| JWT_SECRET | Secret for JWT tokens | - |
| JWT_EXPIRES_IN | Token expiration | 7d |
| CORS_ORIGIN | Allowed CORS origin | http://localhost:3000 |

### Frontend (.env)
| Variable | Description | Default |
|----------|-------------|---------|
| VITE_API_URL | Backend API URL | http://localhost:4000 |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/tasks | Get all tasks |
| POST | /api/tasks | Create task |
| GET | /api/tasks/:id | Get task by ID |
| PUT | /api/tasks/:id | Update task |
| DELETE | /api/tasks/:id | Delete task |
| GET | /api/projects | Get all projects |
| POST | /api/projects | Create project |

## License

MIT
