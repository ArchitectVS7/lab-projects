# TaskMan - Unified Task Management Application

## Project Overview

TaskMan is a modern, full-stack task management application built with a Node.js/Express backend and React frontend. It provides a comprehensive solution for organizing projects, tasks, and team collaboration with features like drag-and-drop task management, real-time updates, and API integration.

### Architecture
- **Backend**: Node.js + TypeScript + Express.js with PostgreSQL database and Prisma ORM
- **Frontend**: React 18 + TypeScript + Zustand for state management
- **CLI**: Node.js-based command-line interface for managing tasks from terminal
- **Database**: PostgreSQL with Prisma ORM for database operations
- **Authentication**: JWT-based authentication system
- **Real-time**: Socket.IO for real-time updates

### Key Technologies
- **Backend**: Express.js, Prisma, PostgreSQL, JWT, bcrypt, Socket.IO
- **Frontend**: React 18, TypeScript, Zustand, React Query, Tailwind CSS, dnd-kit
- **DevOps**: Docker, Docker Compose, Playwright for E2E testing
- **Testing**: Jest for unit tests, Playwright for end-to-end tests

## Project Structure

```
TaskMan/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
│   │   ├── lib/            # Utilities and helpers
│   │   └── index.ts        # Server entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Database seeding
│   └── Dockerfile          # Docker configuration
├── frontend/               # React UI application
│   ├── src/
│   │   ├── pages/          # Route components
│   │   ├── components/     # Reusable components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── store/          # Zustand stores
│   │   └── main.tsx        # Entry point
│   └── Dockerfile          # Docker configuration
├── cli/                    # Command-line interface
│   ├── src/
│   │   ├── commands/       # CLI command implementations
│   │   ├── api/            # API client for CLI
│   │   └── config/         # Configuration utilities
│   └── package.json        # CLI dependencies
├── docker-compose.yml      # Local development setup
├── package.json            # Root package.json for e2e tests
└── docs/                   # Documentation files
```

## Building and Running

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git
- Docker and Docker Compose (for containerized setup)

### Local Development

#### Option 1: Docker Compose (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd TaskMan

# Start all services with Docker Compose
docker-compose up
```
This starts:
- PostgreSQL database (port 5432)
- Backend API (port 4000)
- Frontend dev server (port 3000)

#### Option 2: Manual Setup
Backend:
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:migrate
npm run dev
```

Frontend (in new terminal):
```bash
cd frontend
npm install
npm run dev
```

CLI (in new terminal):
```bash
cd cli
npm install
npm run build
npm link  # Makes taskman command available globally
```

### Environment Variables

Backend (`.env`):
```env
PORT=4000
DATABASE_URL=postgresql://user:password@postgres:5432/taskman?schema=public
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

Frontend (`.env.local`):
```env
VITE_API_URL=http://localhost:4000
```

CLI Configuration:
The CLI stores configuration in `~/.config/taskman-cli/config.json` and includes:
- API key
- Base URL
- Default project ID (optional)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Tasks
- `GET /api/projects/:projectId/tasks` - List project tasks
- `POST /api/projects/:projectId/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/status` - Update task status

### Additional Features
- Notifications: `/api/notifications`
- Analytics: `/api/analytics`
- Recurring tasks: `/api/recurring-tasks`
- Time entries: `/api/time-entries`
- Comments: `/api/comments`
- Export: `/api/export`
- Tags: `/api/tags`
- Custom fields: `/api/custom-fields`
- Attachments: `/api/attachments`
- Dependencies: `/api/dependencies`
- Webhooks: `/api/webhooks`

### Health Check
- `GET /health` - Server health check

## CLI Commands

The TaskMan CLI provides terminal access to task management functionality:

### Authentication
```bash
taskman login  # Configure API credentials
```

### Task Operations
```bash
# Create tasks
taskman create "Fix login bug" --priority HIGH --due tomorrow

# List tasks
taskman list
taskman list --status TODO
taskman list --project "My Project"

# Show task details
taskman show abc12345

# Update tasks
taskman update abc12345 --status IN_PROGRESS
taskman complete abc12345  # Mark as completed
```

### Project Operations
```bash
taskman projects  # List all projects
```

## Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Tests
```bash
cd frontend
npm test
```

### End-to-End Tests
```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npm run test:e2e:headed

# Open Playwright UI mode
npm run test:e2e:ui
```

## Building for Production

### Backend
```bash
cd backend
npm run build
```

### Frontend
```bash
cd frontend
npm run build
```

### CLI
```bash
cd cli
npm run build
```

## Deployment

### Railway
1. Create empty Railway project
2. Add PostgreSQL database
3. Add backend service (from GitHub repo, root directory: `backend`)
4. Generate backend URL and add to frontend environment
5. Add frontend service (from GitHub repo, root directory: `frontend`)
6. Update backend CORS_ORIGIN with frontend URL
7. Services auto-deploy on git push to main

### Docker Deployment
The project includes Dockerfiles for both backend and frontend services, making it easy to deploy in containerized environments.

## Development Conventions

### Code Style
- TypeScript is used throughout the codebase
- ESLint and Prettier for consistent code formatting
- Husky for pre-commit hooks
- Lint-staged for checking staged files

### Testing Practices
- Unit tests with Jest
- End-to-end tests with Playwright
- API testing with Supertest
- Component testing with React Testing Library (planned)

### Security Features
- Rate limiting on API endpoints
- CORS security configuration
- Helmet for HTTP header security
- Password hashing with bcrypt
- JWT token expiration
- Input validation with Zod

### State Management
- Frontend: Zustand for global state management
- Data fetching: TanStack React Query
- Backend: Express sessions and JWT tokens

## Features

- ✅ User authentication with JWT
- ✅ Create and manage projects
- ✅ Create, update, and organize tasks
- ✅ Task status tracking (TODO, IN_PROGRESS, IN_REVIEW, DONE)
- ✅ Drag-and-drop task management
- ✅ Real-time API communication with Socket.IO
- ✅ Responsive design with Tailwind CSS
- ✅ Rate limiting and security headers
- ✅ Database persistence with PostgreSQL
- ✅ Command-line interface for task management
- ✅ API keys and webhook support
- ✅ Time tracking capabilities
- ✅ Task dependencies and custom fields
- ✅ Export functionality
- ✅ Notification system
- ✅ Analytics dashboard
- ✅ Calendar integration
- ✅ Focus mode for deep work
- ✅ Recurring tasks
- ✅ File attachments
- ✅ Comment system

## Performance & Robustness

- Automatic database migrations on startup
- Connection pooling for database efficiency
- Rate limiting on API endpoints
- CORS security configuration
- Password hashing with bcrypt
- JWT token expiration
- Comprehensive error handling
- Health checks for monitoring
- Scheduled tasks with node-cron