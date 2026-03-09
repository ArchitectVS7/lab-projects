# What's Needed to Go Live

## Open Items Checklist

### 1. Stripe Dashboard (~30 min)
- [ ] Create PRO and TEAM products with monthly/annual prices
- [ ] Copy the four price IDs into Railway env vars (see below)
- [ ] Register webhook endpoint in Stripe Dashboard:
      `https://your-domain/api/billing/webhook`
- [ ] Set webhook to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`

### 2. Railway Environment Variables
Set the following in the Railway backend service:

```
JWT_SECRET              # generate: openssl rand -base64 32
RESEND_API_KEY          # from resend.com dashboard
CORS_ORIGIN             # https://your-frontend-domain
CALENDAR_PUBLIC_URL     # https://your-backend-domain (used for iCal feed URLs)

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL
STRIPE_PRICE_TEAM_MONTHLY
STRIPE_PRICE_TEAM_ANNUAL
```

Note: `DATABASE_URL` is auto-injected by Railway when a Postgres service is linked.

### 3. Domain Registration (business decision)
- [ ] Register domain (e.g. taskman.app)
- [ ] Point frontend and backend to Railway services
- [ ] Update `CORS_ORIGIN` and `CALENDAR_PUBLIC_URL` in Railway once domain is live

### 4. Database Migrations
Automatic — `start.sh` runs `prisma migrate deploy` on every Railway deploy.
Verify success in Railway build logs after first deploy.

### 5. UAT the Two Alpha Features
Both UAT docs are in `docs/alpha-testing/`:
- [ ] Calendar sync — 13 test cases in `uat-calendar-sync.md`
- [ ] Milestone import — 16 test cases in `uat-milestone-import.md`

### 6. Deployment Reference
Full step-by-step Railway setup: `docs/RAILWAY_DEPLOYMENT.md`
