# DigitalOcean Deployment Assessment and Guide

## Feasibility Assessment (No Code Changes)

**Short answer: Yes, deployment is feasible without additional code changes.**

This repository already includes:

- A multi-service Docker Compose setup (`postgres`, `backend`, `frontend`).
- Production-capable Dockerfiles for both backend and frontend.
- Backend migration-on-start behavior.
- Runtime configuration via environment variables.

### Important caveats to handle at deployment time

1. **Set production environment variables explicitly.**
   - You must override defaults for `JWT_SECRET`, `CORS_ORIGIN`, and API URLs.
2. **Frontend API URL is build-time.**
   - `VITE_API_URL` is compiled into frontend assets during image build.
3. **Backend CORS must include your public frontend origin.**
   - Set `CORS_ORIGIN=https://your-domain.com` (or comma-separated list).
4. **Migration startup behavior exists.**
   - Backend runs `prisma migrate deploy` at startup; ensure DB credentials and migration history are correct before first production run.
5. **Use a reverse proxy + TLS in front of services.**
   - Expose only 80/443 publicly and proxy to frontend/backend containers.

---

## Architecture Recommendation for a Droplet

- **Droplet**: Ubuntu 22.04+.
- **Services**: Docker Compose stack from repo.
- **Reverse proxy**: Nginx on host (or Caddy) for TLS termination.
- **Domain**: `app.example.com` for frontend and either:
  - path-based API (`https://app.example.com/api`), or
  - subdomain API (`https://api.example.com`).
- **Database**:
  - Option A: Compose PostgreSQL container (simple/single-host).
  - Option B: Managed PostgreSQL (more resilient, recommended for production).

---

## Step-by-Step Deployment (Docker Compose on Droplet)

## 1) Prepare DigitalOcean

1. Create a droplet (Ubuntu 22.04+), assign static IP.
2. Add DNS records:
   - `A app.example.com -> <droplet-ip>`
   - Optional `A api.example.com -> <droplet-ip>`
3. SSH into droplet as sudo user.

## 2) Install Docker Engine + Compose plugin

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

## 3) Clone repo and prepare deployment files

```bash
git clone <your-repo-url> TaskMan
cd TaskMan
```

Create a production override file (do not edit base compose if you want to keep local defaults).

`docker-compose.prod.yml`:

```yaml
services:
  backend:
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgresql://taskapp:${POSTGRES_PASSWORD}@postgres:5432/taskapp?schema=public
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRES_IN: 7d
      CORS_ORIGIN: https://app.example.com
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_URL: https://app.example.com
    environment:
      PORT: 3000
    restart: unless-stopped

  postgres:
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    restart: unless-stopped
```

Create `.env.prod`:

```dotenv
POSTGRES_PASSWORD=<strong-random-password>
JWT_SECRET=<long-random-secret>
```

## 4) Start stack

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

Check health/logs:

```bash
docker compose ps
docker compose logs backend --tail=200
docker compose logs frontend --tail=200
```

Backend health endpoint:

```bash
curl -f http://127.0.0.1:4000/health
```

## 5) Install and configure Nginx with Let's Encrypt

Install:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

Example Nginx server block for `app.example.com` (`/etc/nginx/sites-available/taskman`):

```nginx
server {
    listen 80;
    server_name app.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and test:

```bash
sudo ln -s /etc/nginx/sites-available/taskman /etc/nginx/sites-enabled/taskman
sudo nginx -t
sudo systemctl reload nginx
```

Issue TLS cert:

```bash
sudo certbot --nginx -d app.example.com
```

## 6) Lock down public exposure

- Allow only `22`, `80`, `443` in cloud firewall / UFW.
- Keep `3000`, `4000`, `5432` closed publicly.

Example with UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 7) Validate production behavior

1. Open `https://app.example.com`.
2. Register/login flow works.
3. Task CRUD works.
4. Realtime updates (socket) work.
5. Backend docs/health reachable through proxy path if intended.

## 8) Updates / redeploy

```bash
cd ~/TaskMan
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

---

## Operational Checklist

- [ ] Strong secrets in `.env.prod`.
- [ ] Correct frontend URL compiled (`VITE_API_URL`).
- [ ] `CORS_ORIGIN` matches public frontend origin(s).
- [ ] Backups configured (DB volume snapshots or managed DB backups).
- [ ] HTTPS enabled and auto-renew working (`systemctl status certbot.timer`).
- [ ] Container restart policy enabled.
- [ ] Logs monitored (`docker compose logs -f`).

---

## Feasibility Conclusion

Deploying this codebase to a DigitalOcean droplet is **feasible today without code changes**, provided you supply production env values, run with Docker Compose overrides, and place Nginx + TLS in front of the containers.
