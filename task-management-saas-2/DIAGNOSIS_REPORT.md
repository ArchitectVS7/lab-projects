# Deployment Diagnosis Report: taskapp-saas-2

**Date:** 2026-02-05  
**Services Analyzed:** adequate-abundance (frontend), lab-projects (backend)  
**Issue:** 502 Bad Gateway on frontend URL

## Investigation Summary (Attempt 1 of 5)

### Backend Service (lab-projects) ✅ WORKING
- **URL:** https://lab-projects-production-c7bd.up.railway.app
- **Status:** Healthy
- **Health Check:** Returns `{"status":"ok","timestamp":"...","environment":"production"}`
- **Logs:** Clean startup, Prisma migrations successful, server running on port 8080

### Frontend Service (adequate-abundance) ❌ FAILING
- **URL:** https://adequate-abundance-production-19bc.up.railway.app
- **Status:** 502 Bad Gateway
- **Error Response:** `{"status":"error","code":502,"message":"Application failed to respond"}`
- **Railway Headers:** `x-railway-fallback: true` indicates edge proxy cannot reach the service

### Build Analysis
- **Dockerfile:** Multi-stage build with node:20-alpine
- **Build Process:**
  1. Builder stage: `npm ci` → `npm run build` (tsc && vite build)
  2. Production stage: Install `serve` globally, copy /dist, expose port 3000
- **Build Status:** ✅ Completed successfully (5.22 seconds)
- **Logs:** No build errors detected

### Container Startup
- **Log Output:** `INFO  Accepting connections at http://0.0.0.0:8080`
- **Command:** `CMD serve -s dist -l tcp://0.0.0.0:$PORT`
- **PORT Variable:** Should be set to 8080 by Railway (overrides Dockerfile ENV PORT=3000)

### Environment Variables
- `VITE_API_URL`: ✅ Correctly set to backend URL
- `RAILWAY_PUBLIC_DOMAIN`: ✅ Points to correct domain
- No explicit PORT variable shown (Railway should inject this automatically)

## Root Cause Analysis

### Hypothesis 1: Serve Command Syntax Issue 🎯 LIKELY
The `serve` command in the Dockerfile uses:
```bash
CMD serve -s dist -l tcp://0.0.0.0:$PORT
```

**Potential Issue:** The `tcp://` prefix in the listen address may be incorrect syntax for the `serve` package. Standard serve syntax is usually:
```bash
serve -s dist -l $PORT
# OR
serve -s dist -p $PORT
```

**Evidence:**
- Container claims to be accepting connections, but Railway edge cannot reach it
- This suggests serve is either not listening properly or on the wrong port

### Hypothesis 2: Health Check Failure
Railway may be performing health checks that the serve command isn't responding to properly. Without a proper health endpoint, Railway might mark the service as unhealthy.

### Hypothesis 3: Missing Dist Directory
If the TypeScript compilation or Vite build step failed silently, the dist directory might be empty or missing critical files, causing serve to start but not serve anything.

## Recommended Fix (Attempt 1)

Update the Dockerfile CMD to use standard serve syntax:

**Current:**
```dockerfile
CMD serve -s dist -l tcp://0.0.0.0:$PORT
```

**Proposed:**
```dockerfile
CMD ["sh", "-c", "serve -s dist -l $PORT"]
```

OR simpler:

```dockerfile
CMD serve -s dist -p $PORT
```

The `-p` flag explicitly sets the port, and most versions of serve understand this format better than the `-l tcp://` syntax.

## Next Steps

1. Update Dockerfile CMD line
2. Commit and push changes to trigger Railway redeploy
3. Monitor build and deployment logs
4. Test frontend URL again
5. If still failing, check dist directory contents (Hypothesis 3)

## Iteration Tracker

### Attempt 1/5: Serve command syntax fix
- **Change:** Updated `serve -l tcp://0.0.0.0:$PORT` → `serve -l $PORT`
- **Result:** FAILED - serve crashed with "Unknown --listen endpoint scheme" error
- **Learning:** serve doesn't accept `tcp://` prefix

### Attempt 2/5: Explicit host binding
- **Change:** Updated to `serve -l 0.0.0.0:$PORT`
- **Result:** CRASHED - serve crashed with "Unknown --listen endpoint scheme: 0.0.0.0:"
- **Learning:** serve doesn't accept `host:port` format in -l flag

### Attempt 3/5: PORT-only approach
- **Change:** Used `serve -l $PORT` (no host prefix)
- **Result:** FAILED (502) - Container running but logs show `localhost:8080` binding
- **Root Cause CONFIRMED:** serve defaults to localhost binding, not 0.0.0.0
- **Learning:** Railway edge proxy can't connect to localhost-bound services

### Attempt 4/5: Replace serve with Express
- **Change:** Created custom Express server with explicit `app.listen(PORT, '0.0.0.0')`
- **First Try:** BUILD FAILED - npm ci lockfile mismatch (added express but didn't update package-lock.json)
- **Second Try:** Updated package-lock.json, deployment QUEUED for 3+ minutes (Railway queue stuck)
- **Status:** Deployment 6704cd96 stuck in QUEUED since 17:49:25 (currently 17:52+)
- **Expected Outcome:** Should work once deployment completes - Express explicitly binds to 0.0.0.0

### Attempt 5/5: Optimize Dockerfile, add health check, retrigger deploy
- **Change:** Optimized frontend Dockerfile to only install express (not all React deps) in production stage. Added /health endpoint to server.js. Fresh commit to retrigger Railway deployment.
- **Status:** IN PROGRESS

## Current Situation (Updated)

### Railway Platform Blocker
- **Deployment ID:** 6704cd96 stuck in QUEUED since 17:49:25
- **Railway Message:** "Deployment blocked by upstream GitHub issues"
- **Root Cause:** Railway experienced a GitHub rate-limiting incident starting Jan 28, 2026 (https://status.railway.com/cmkyc1kpj01iajcrmkwnczd5v). GitHub logins and deployments were timing out. Railway temporarily disabled GitHub logins to reduce load. If this incident is not fully resolved, it explains the stuck queue.
- **Alternative Cause:** If the Railway service was originally deployed from a template, it may still be linked to the template's "upstream" GitHub repo instead of ArchitectVS7/lab-projects. Fix: Eject from upstream repo in Railway dashboard Settings.

### Backend Logs Analysis
- Backend starts correctly: `Server running on http://0.0.0.0:8080`
- PostgreSQL `Connection reset by peer` errors appear just before SIGTERM
- This is Railway cycling/stopping the container as part of the stuck deployment — the DB errors are a symptom, not a cause

### Resolution Steps
1. **Dashboard:** Cancel stuck deployment 6704cd96 in Railway dashboard
2. **Dashboard:** Check Settings → Source for "Upstream Repo" — if present, click Eject
3. **Dashboard:** Reconnect GitHub repo if needed (disconnect + reconnect)
4. **Push:** Fresh commit pushed to trigger clean deployment
5. **Fallback:** If queue remains stuck, create a new Railway service pointing to same repo/Dockerfile
