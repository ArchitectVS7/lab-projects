# Railway Deployment Guide

Complete step-by-step guide to deploy TaskMan to Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Railway CLI installed (`npm install -g @railway/cli` or download from https://docs.railway.app/develop/cli)
- Project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Architecture

Railway will run 3 services:
1. **PostgreSQL Database** - Managed PostgreSQL instance
2. **Backend API** - Express + Prisma backend
3. **Frontend** - React + Vite frontend

## Step 1: Create Railway Project

### Option A: Via Railway Dashboard (Recommended)

1. Go to https://railway.app/new
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select the TaskMan repository
5. Railway will detect it's a monorepo

### Option B: Via Railway CLI

```bash
# Login to Railway
railway login

# Initialize project from current directory
railway init

# Link to your Railway project
railway link
```

## Step 2: Add PostgreSQL Database

1. In your Railway project dashboard, click "New Service"
2. Select "Database" → "PostgreSQL"
3. Railway will provision a PostgreSQL instance and automatically set the `DATABASE_URL` variable
4. Note: The database URL is automatically injected into services that need it

## Step 3: Configure Backend Service

### 3.1 Create Backend Service

1. Click "New Service" → "GitHub Repo"
2. Select your repository
3. Set **Root Directory**: `backend`
4. Railway will auto-detect the `Dockerfile`

### 3.2 Set Backend Environment Variables

In the Backend service settings, add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | (auto-set by Railway) | Injected from PostgreSQL service |
| `JWT_SECRET` | Generate strong secret | Use: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `7d` | Token expiration time |
| `CORS_ORIGIN` | Frontend URL | Get from frontend service after deployment |
| `NODE_ENV` | `production` | Production environment |
| `PORT` | `4000` | Railway injects $PORT, but explicit is safer |

**To generate JWT_SECRET:**
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

### 3.3 Configure Backend Build

Railway should auto-detect the Dockerfile, but verify:
- **Build Command**: (uses Dockerfile - no need to set)
- **Start Command**: (uses Dockerfile CMD - no need to set)

## Step 4: Configure Frontend Service

### 4.1 Create Frontend Service

1. Click "New Service" → "GitHub Repo"
2. Select your repository (same as backend)
3. Set **Root Directory**: `frontend`
4. Railway will auto-detect the `Dockerfile`

### 4.2 Set Frontend Environment Variables

In the Frontend service settings, add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Backend URL |

**To get the Backend URL:**
1. Go to Backend service → Settings → Networking
2. Click "Generate Domain"
3. Copy the generated URL (e.g., `https://taskman-backend-production.up.railway.app`)
4. Paste it as `VITE_API_URL` in Frontend service

### 4.3 Configure Frontend Build

Railway should auto-detect the Dockerfile. The Dockerfile handles:
- Building the Vite app with the `VITE_API_URL` build arg
- Serving the static files with `serve`

## Step 5: Update CORS_ORIGIN

After frontend deploys:

1. Go to Frontend service → Settings → Networking
2. Click "Generate Domain"
3. Copy the frontend URL (e.g., `https://taskman-frontend-production.up.railway.app`)
4. Go to Backend service → Variables
5. Update `CORS_ORIGIN` to the frontend URL
6. Backend will automatically redeploy

## Step 6: Deploy!

Railway automatically deploys on every git push to your main branch.

### Manual Deploy

If needed, you can manually trigger deployment:

```bash
# Deploy backend
railway up --service backend

# Deploy frontend
railway up --service frontend
```

## Step 7: Run Database Migrations

The backend Dockerfile automatically runs `prisma migrate deploy` on startup, so migrations run automatically.

To manually run migrations or seed data:

```bash
# Connect to backend service
railway run --service backend npx prisma migrate deploy

# Seed database (optional - creates test users)
railway run --service backend npx prisma db seed
```

## Verification Checklist

After deployment, verify these endpoints:

### Backend Health Check
```bash
curl https://your-backend-url.railway.app/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Frontend Access
Open `https://your-frontend-url.railway.app` in browser:
- [ ] Frontend loads without errors
- [ ] Can navigate to /login
- [ ] Can register a new user
- [ ] After registration, redirected to dashboard
- [ ] Can create a project
- [ ] Can create a task
- [ ] Can logout and login again
- [ ] Session persists after page refresh

## Environment Variables Reference

### Backend (.env template)
```env
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/dbname?schema=public
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend-url.railway.app
NODE_ENV=production
```

### Frontend (.env template)
```env
VITE_API_URL=https://your-backend-url.railway.app
```

## Headless Deployment with Railway CLI

If you're using Railway CLI for automation (CI/CD, scripts, etc.), use project tokens:

### 1. Generate Project Token

1. Go to Project Settings → Tokens
2. Click "Create Token"
3. Select your environment (production)
4. Copy the token (starts with `rw_production_...`)

### 2. Use Token in Commands

```bash
# Set token as environment variable
export RAILWAY_TOKEN='your-token-here'

# Check status
railway status

# Deploy backend
railway up --service backend

# Deploy frontend
railway up --service frontend

# Run migrations
railway run --service backend npx prisma migrate deploy
```

### 3. CI/CD Integration

For GitHub Actions or other CI/CD:

```yaml
- name: Deploy to Railway
  env:
    RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
  run: |
    railway up --service backend
    railway up --service frontend
```

## Troubleshooting

### Backend won't start
- Check logs: `railway logs --service backend`
- Verify DATABASE_URL is set correctly
- Ensure JWT_SECRET is set
- Check CORS_ORIGIN matches frontend URL

### Frontend can't connect to backend
- Verify VITE_API_URL is correct
- Check CORS_ORIGIN on backend includes frontend URL
- Both should use HTTPS in production

### Database connection errors
- Verify PostgreSQL service is running
- Check DATABASE_URL format in backend service
- Ensure migrations ran successfully

### Cookie/Authentication issues
- CORS_ORIGIN must match frontend URL exactly
- Both services should be on Railway domains (for cookie security)
- JWT_SECRET must be set and consistent

### Build failures
- Check Railway build logs
- Verify Dockerfile syntax
- Ensure package-lock.json is committed to repo

## Rolling Back

If a deployment breaks:

1. Go to Service → Deployments
2. Find the last working deployment
3. Click "Redeploy"

Or via CLI:
```bash
railway rollback --service backend
railway rollback --service frontend
```

## Monitoring

### View Logs
```bash
# Backend logs
railway logs --service backend

# Frontend logs
railway logs --service frontend

# Database logs
railway logs --service postgres
```

### Metrics

Railway provides metrics in the dashboard:
- CPU usage
- Memory usage
- Network traffic
- Request count

## Cost Optimization

Railway pricing is based on resource usage:

1. **Development**: Use Railway's free trial ($5 credit)
2. **Production**: Monitor usage in Settings → Usage
3. **Optimization tips**:
   - Scale down services during off-hours if needed
   - Use Railway's sleep feature for non-critical environments
   - Monitor database size and clean up test data

## Custom Domains (Optional)

To use your own domain:

1. Go to Service → Settings → Networking
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `taskman.yourdomain.com`)
4. Add the CNAME record to your DNS provider
5. Railway will auto-provision SSL certificates

## Next Steps

- Set up monitoring and alerts
- Configure backup strategy for PostgreSQL
- Set up staging environment (duplicate project)
- Configure CD pipeline for automatic deployments
- Add error tracking (Sentry, LogRocket, etc.)
- Enable Railway's built-in metrics and observability

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## Security Notes

- **Never commit secrets** to your repository
- Use Railway's secret management for sensitive values
- Rotate JWT_SECRET periodically
- Enable Railway's DDoS protection
- Review CORS settings regularly
- Keep dependencies updated
