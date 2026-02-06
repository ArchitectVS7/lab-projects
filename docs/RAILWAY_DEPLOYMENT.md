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

## Step 1: Create Empty Railway Project

1. Go to https://railway.app/new
2. Click "New Project"
3. Click "Create Empty Project"
4. Give it a name (e.g., "TaskMan")

Then set up the CLI on your local machine:

```bash
# Login to Railway
railway login

# Link this directory to your Railway project
railway link

# Verify the link
railway status
```

You should see your project listed. You now have an empty Railway project ready to add services.

## Step 2: Add PostgreSQL Database

1. Go to your Railway project dashboard
2. Click "New Service" (or "+ Add Service")
3. Select "Database" → "PostgreSQL"
4. Railway will provision a PostgreSQL instance and automatically set the `DATABASE_URL` variable
5. The database URL will be automatically available to any service that needs it

## Step 3: Add Backend Service

### 3.1 Create Backend Service

1. In Railway dashboard, click "New Service" → "GitHub Repo"
2. Connect your GitHub account if not already connected
3. Select the **TaskMan** repository
4. Set **Root Directory**: `backend`
5. Railway will auto-detect the `Dockerfile` and deploy

### 3.2 Generate Backend URL (Important!)

After backend deploys:

1. Go to Backend service → "Settings" tab
2. Look for "Networking" section
3. Click "Generate Domain"
4. Copy the generated URL (e.g., `https://taskman-backend-production.up.railway.app`)
5. **Save this URL** - you'll need it for the frontend in Step 4

### 3.3 Set Backend Environment Variables

In the Backend service, go to "Variables" tab and add:

| Variable | Value | How to Get |
|----------|-------|-----------|
| `DATABASE_URL` | (auto-set) | Already injected from PostgreSQL service |
| `JWT_SECRET` | Generate strong secret | Run: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `7d` | Fixed value |
| `CORS_ORIGIN` | Frontend URL | **You'll add this in Step 5** (after frontend deploys) |
| `NODE_ENV` | `production` | Fixed value |
| `PORT` | `4000` | Fixed value |

**To generate JWT_SECRET:**
```bash
# On Mac/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

⚠️ **Note**: Leave `CORS_ORIGIN` empty for now. You'll update it after the frontend is deployed (Step 5).

## Step 4: Add Frontend Service

### 4.1 Create Frontend Service

1. In Railway dashboard, click "New Service" → "GitHub Repo"
2. Select the **TaskMan** repository
3. Set **Root Directory**: `frontend`
4. Railway will auto-detect the `Dockerfile` and deploy

### 4.2 Set Frontend Environment Variables

In the Frontend service, go to "Variables" tab and add:

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Paste the **backend URL from Step 3.2** |

**Example:** If your backend URL is `https://taskman-backend-production.up.railway.app`, then:
```
VITE_API_URL=https://taskman-backend-production.up.railway.app
```

After adding this variable, the frontend will automatically redeploy with the correct backend URL.

### 4.3 Generate Frontend URL

After frontend deploys:

1. Go to Frontend service → "Settings" tab
2. Look for "Networking" section
3. Click "Generate Domain"
4. Copy the generated URL (e.g., `https://taskman-frontend-production.up.railway.app`)
5. **Save this URL** - you'll need it for the backend in Step 5

## Step 5: Connect Frontend URL to Backend (URL Exchange)

Now that both services have their URLs, connect them:

### 5.1 Update Backend with Frontend URL

1. Go to Backend service → "Variables" tab
2. Find the `CORS_ORIGIN` variable (you left it empty)
3. Paste the **frontend URL from Step 4.3**
4. **Example:** If your frontend URL is `https://taskman-frontend-production.up.railway.app`, then:
   ```
   CORS_ORIGIN=https://taskman-frontend-production.up.railway.app
   ```
5. Click save - the backend will automatically redeploy with this setting

### 5.2 Verify Connection

After the backend redeploys:
- Frontend should now be able to communicate with the backend
- Cross-origin requests should work properly

## Step 6: Automatic Deployments

Railway automatically deploys whenever you push to your main branch.

If you need to manually trigger a deployment:

```bash
# Deploy backend
railway up --service backend

# Deploy frontend
railway up --service frontend

# Deploy both
railway up
```

## Step 7: Database Migrations

The backend Dockerfile automatically runs `prisma migrate deploy` on startup, so your database schema will be set up automatically when the backend first deploys.

If needed, you can manually run migrations:

```bash
# Manually run migrations
railway run --service backend npx prisma migrate deploy

# Seed database (optional - creates test data)
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
