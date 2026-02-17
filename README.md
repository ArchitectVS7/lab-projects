```markdown
# TaskMan - Unified Task Management Application

A modern, full-stack task management application for organizing projects, tasks, and team collaboration. Built with Node.js and React, TaskMan provides real-time task synchronization, drag-and-drop interfaces, team collaboration features, and a gamification system to boost productivity. The application is designed for scalability with Docker support and comprehensive CI/CD integration.

## ⚠️ Project Status

**Note**: This project is currently in active development with high commit frequency (109 commits/30 days). Recent development cycles have focused on stabilizing CI/CD pipelines, fixing authentication flows, and implementing gamification features. The codebase is functional but may experience breaking changes. Refer to recent commits and issues for the latest status.

## Features

- **Task Management**: Create, organize, and track projects and tasks with real-time updates
- **Team Collaboration**: Add team members to projects, assign tasks, and track progress
- **Drag & Drop Interface**: Intuitive Kanban-style board for visual task organization
- **Gamification System**: Earn XP, unlock levels, and celebrate milestones (Phase 1 implemented)
- **Authentication**: Secure JWT-based authentication with password hashing
- **Responsive Design**: Mobile-friendly interface with cross-platform support
- **Notifications**: Real-time updates when users are added to projects or assigned tasks

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting, bcrypt for password hashing
- **Testing**: Playwright for end-to-end testing

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS
- **Drag & Drop**: dnd-kit
- **Routing**: React Router v6
- **Testing**: Playwright for end-to-end testing

## Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker and Docker Compose (optional, for containerized deployment)

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration from template:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your PostgreSQL connection string and other configuration:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/taskman"
   JWT_SECRET="your-secret-key"
   NODE_ENV="development"
   ```

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

6. Seed the database (optional):
   ```bash
   npx prisma db seed
   ```

7. Start the backend server:
   ```bash
   npm run dev
   ```

The backend will be available at `http://localhost:3000`.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment configuration from template:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your API endpoint:
   ```
   VITE_API_URL="http://localhost:3000"
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`.

## Usage

### Running Tests

Run end-to-end tests with Playwright:

```bash
npm run test:e2e
```

Run tests in UI mode for interactive debugging:

```bash
npm run test:e2e:ui
```

Run tests in headed mode (visible browser):

```bash
npm run test:e2e:headed
```

View test report:

```bash
npm run test:e2e:report
```

### Color Auditing

Verify color accessibility across the application:

```bash
npm run audit:colors
```

### Docker Deployment

Build and run both services with Docker Compose:

```bash
docker-compose up --build
```

This starts:
- Backend API on port 3000
- Frontend on port 5173
- PostgreSQL database on port 5432

## Project Structure

```
TaskMan/
├── backend/                      # Express API server
│   ├── src/
│   │   ├── routes/              # API endpoints for projects, tasks, users, gamification
│   │   ├── middleware/          # Authentication, error handling, validation
│   │   ├── services/            # Business logic, database operations, XP/level calculations
│   │   ├── index.ts             # Server entry point
│   │   └── types/               # TypeScript type definitions
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema (users, projects, tasks, XP, levels)
│   │   └── seed.ts              # Database seeding script
│   ├── .env.example             # Environment variables template
│   ├── Dockerfile               # Container configuration
│   └── package.json             # Dependencies and scripts
├── frontend/                     # React UI application
│   ├── src/
│   │   ├── pages/               # Route components (Dashboard, Projects, Settings)
│   │   ├── components/          # Reusable components (TaskCard, ProjectBoard, Login, Gamification)
│   │   ├── hooks/               # Custom React hooks (useAuth, useTasks, useGamification)
│   │   ├── stores/              # Zustand stores (authStore, tasksStore, gamificationStore)
│   │   ├── main.tsx             # Vite entry point
│   │   └── App.tsx              # Root component with routing
│   ├── .env.example             # Environment variables template
│   └── package.json             # Dependencies and scripts
├── package.json                 # Root workspace configuration
├── docker-compose.yml           # Multi-container orchestration
└── README.md                    # This file
```

## Known Issues & Development Notes

### Recent Fixes
- **Mobile Login Redirect**: Fixed cross-origin cookie issues causing login loops (commit e95fb1c)
- **CI/CD Pipeline**: Added TypeScript build step and removed broken CMS route (commits fb2d195, 49cd11c)
- **Project Notifications**: Implemented auto-refresh and user notifications when added to projects (commits c6dac8a, 18213a3)

### Active Development
The project is undergoing rapid iteration with focus on:
- Stabilizing authentication flows across mobile and desktop platforms
- Implementing and testing the gamification system (Phase 1 complete)
- Resolving CI/CD pipeline issues
- Improving documentation and test coverage

If you encounter issues, check recent commits and open GitHub issues before filing new ones.

## Contributing

This project uses Husky for git hooks and lint-staged for pre-commit checks. All commits are automatically validated.

```bash
npm run prepare
```

## License

See LICENSE file in the repository for details.
```