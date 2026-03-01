# TaskMan

TaskMan is a task and project management app built for people who want to stay organized without drowning in their tools. It combines a clean task board with daily check-ins, a focus mode that cuts out the noise, AI-assisted delegation, and a gamification layer that makes finishing work feel like progress — because it is.

The hosted version is available at **[taskman.app](https://taskman.app)**. This repository is public for transparency and self-hosting. If you are an end user of the hosted service, you do not need anything here — head to the [User Manual](docs/USER_MANUAL.md) instead.

---

## Features at a Glance

- **Task & project management** with Kanban, table, calendar, and week views
- **Daily check-in** to set priorities, track energy, and log blockers
- **Focus mode** — one screen, your top three tasks, nothing else
- **AI agent delegation** — hand off research, writing, code, and outreach tasks to AI agents (Pro/Team)
- **Calendar sync** — subscribe to your tasks in Google Calendar, Outlook, or Apple Calendar via iCal
- **Gamification** — XP, levels, streaks, and achievements that reward consistent work
- **Team collaboration** — role-based access, shared projects, activity logs, and a creator dashboard
- **API & webhooks** — integrate with your own tools using personal API keys

---

## Self-Hosting

TaskMan is designed to run on any container platform. The quickest path is Docker Compose.

### Requirements

- Docker and Docker Compose
- A [Resend](https://resend.com) API key (for password reset emails)
- A [Stripe](https://stripe.com) account if you want billing features (optional for personal use)

### 1. Clone the repository

```bash
git clone https://github.com/your-org/taskman.git
cd taskman
```

### 2. Configure environment variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and set the required values:

```env
JWT_SECRET=         # generate with: openssl rand -base64 32
RESEND_API_KEY=     # from resend.com — required for password reset
CORS_ORIGIN=        # your frontend URL, e.g. http://localhost:3000
```

If you are not using billing features, you can leave the `STRIPE_*` variables empty. The app will run without them — the billing page simply will not function.

### 3. Start the application

```bash
docker-compose up --build
```

This starts three services:

| Service | Default port |
|---|---|
| Frontend | `http://localhost:3000` |
| Backend API | `http://localhost:4000` |
| PostgreSQL | `localhost:5432` |

Database migrations run automatically on first start. Open `http://localhost:3000` and create your account.

### 4. Optional: Enable calendar sync

If you want iCal feed URLs to point to a public domain rather than localhost, set:

```env
CALENDAR_PUBLIC_URL=https://your-backend-domain
```

### Updating

```bash
git pull
docker-compose up --build
```

Migrations are applied automatically during startup.

---

## Plans & Pricing

TaskMan is free to use for individuals. Paid plans unlock AI agent delegation, team collaboration features, and higher resource limits. See the full comparison at [taskman.app/billing](https://taskman.app/billing).

| | Free | Pro ($8/mo) | Team ($6/user/mo) |
|---|---|---|---|
| Tasks & projects | Unlimited | Unlimited | Unlimited |
| Collaborators | 1 (view-only) | Unlimited | Unlimited |
| AI agent delegations | — | 50 / month | 200 / month (shared) |
| API keys | — | 5 | 25 |
| Webhooks | — | 5 | 25 |
| File attachments | — | 100 MB / project | 500 MB / project |
| Activity log | 30 days | Unlimited | Unlimited |
| Creator dashboard | — | — | Included |

---

## Documentation

- [User Manual](docs/USER_MANUAL.md) — comprehensive guide for end users
- [Deployment Guide](docs/RAILWAY_DEPLOYMENT.md) — Railway-specific deployment walkthrough

---

## License

See [LICENSE](LICENSE) for details.
