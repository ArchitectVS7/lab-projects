# TaskMan - Unified Task Management Application

A modern, full-stack task management application for organizing projects, tasks, and team collaboration.

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting, bcrypt for password hashing

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **State Management**: Zustand
- **Data Fetching**: TanStack React Query
- **Styling**: Tailwind CSS
- **Drag & Drop**: dnd-kit
- **Routing**: React Router v6

## Project Structure

```
TaskMan/
├── backend/                 # Express API server
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── middleware/     # Express middleware
│   │   ├── services/       # Business logic
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
│   │   ├── stores/         # Zustand stores
│   │   └── main.tsx        # Entry point
│   └── Dockerfile          # Docker configuration
├── docker-compose.yml      # Local development setup
├── RAILWAY_DEPLOYMENT.md   # Railway deployment guide
├── IMPLEMENTATION_PLAN.md  # Detailed implementation notes
└── PRD.md                  # Product requirements document
```

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd TaskMan
   ```

2. **Start with Docker Compose** (recommended)
   ```bash
   docker-compose up
   ```
   This starts:
   - PostgreSQL database (port 5432)
   - Backend API (port 4000)
   - Frontend dev server (port 5173)

3. **Or set up manually**

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

### Environment Variables

Backend (`.env`):
```env
PORT=4000
# IMPORTANT: When using Docker Compose, use 'postgres' (service name) not 'localhost'
DATABASE_URL=postgresql://user:password@postgres:5432/taskman?schema=public
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Frontend (`.env.local`):
```env
VITE_API_URL=http://localhost:4000
```

**Docker vs Local:**
- **Docker Compose**: Use `postgres` as the hostname (line 3 above) - services communicate using service names
- **Local PostgreSQL**: Use `localhost` instead of `postgres`

See `.env.example` for all available options.

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests (if configured)
cd frontend
npm test
```

### Database Management
```bash
# Run migrations
npm run prisma:migrate

# View database in Prisma Studio
npm run prisma:studio

# Seed test data
npm run prisma:seed
```

### Building for Production
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

## Deployment

### Railway
For comprehensive Railway deployment instructions, see [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md).

Quick summary:
1. Create empty Railway project
2. Add PostgreSQL database
3. Add backend service (from GitHub repo, root directory: `backend`)
4. Generate backend URL and add to frontend environment
5. Add frontend service (from GitHub repo, root directory: `frontend`)
6. Update backend CORS_ORIGIN with frontend URL
7. Services auto-deploy on git push to main

## Documentation

- **[RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)** - Complete deployment guide for Railway
- **[IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)** - Detailed implementation notes and architecture decisions
- **[PRD.md](PRD.md)** - Product requirements and feature specifications

## API Endpoints

### Authentication
- `POST /auth/register` - Create new account
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Projects
- `GET /projects` - List user's projects
- `POST /projects` - Create new project
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Tasks
- `GET /projects/:projectId/tasks` - List project tasks
- `POST /projects/:projectId/tasks` - Create task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task
- `PATCH /tasks/:id/status` - Update task status

### Health
- `GET /health` - Server health check

## Features

- ✅ User authentication with JWT
- ✅ Create and manage projects
- ✅ Create, update, and organize tasks
- ✅ Task status tracking
- ✅ Drag-and-drop task management
- ✅ Real-time API communication
- ✅ Responsive design
- ✅ Rate limiting and security headers
- ✅ Database persistence with PostgreSQL

## Performance & Robustness

- Automatic database migrations on startup
- Connection pooling for database efficiency
- Rate limiting on API endpoints
- CORS security configuration
- Password hashing with bcrypt
- JWT token expiration
- Comprehensive error handling

## Contributing

1. Create a feature branch from main
2. Make your changes
3. Test thoroughly
4. Commit with descriptive messages
5. Push and create a pull request

## License

[Add your license here]

## Support

For issues or questions:
1. Check existing documentation
2. Review implementation notes in IMPLEMENTATION_PLAN.md
3. Check deployment guide for common issues
4. Create an issue with detailed information
