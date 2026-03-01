/**
 * Billing webhook tests
 *
 * Tests the idempotency guard and raw-body validation of the Stripe webhook
 * handler in billing.ts.
 *
 * Uses jest.unstable_mockModule (ESM-safe) to mock the Stripe SDK so tests
 * run without real Stripe keys or network calls.
 */

import { jest } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── ESM-safe Stripe mock ──────────────────────────────────────────────────────
// Must be declared before any dynamic import of modules that depend on stripe.

const mockConstructEvent = jest.fn<() => object>();
const mockSubscriptionsRetrieve = jest.fn<() => Promise<object>>();

jest.unstable_mockModule('../src/lib/stripe.js', () => ({
  default: {
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  },
  getStripeOrThrow: () => ({
    webhooks: { constructEvent: mockConstructEvent },
    subscriptions: { retrieve: mockSubscriptionsRetrieve },
  }),
  STRIPE_PRICES: {
    PRO_MONTHLY: 'price_pro_monthly',
    PRO_ANNUAL: 'price_pro_annual',
    TEAM_MONTHLY: 'price_team_monthly',
    TEAM_ANNUAL: 'price_team_annual',
  },
}));

// Dynamic import AFTER mock is registered (required for ESM mocks)
const { default: app } = await import('../src/app.js');
import request from 'supertest';

// ── Prisma client pointing at the test database ───────────────────────────────
const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://taskapp:taskapp_secret@localhost:5432/taskapp_test',
    },
  },
});

// ── Fake-event factories ──────────────────────────────────────────────────────

function makeFakeCheckoutEvent(overrides: {
  id?: string;
  userId?: string;
  planTier?: string;
  subscriptionId?: string;
} = {}) {
  const {
    id = 'evt_test_checkout_001',
    userId = 'user-billing-wh-test',
    planTier = 'PRO',
    subscriptionId = 'sub_test_001',
  } = overrides;

  return {
    id,
    type: 'checkout.session.completed',
    data: {
      object: {
        metadata: { userId, planTier },
        subscription: subscriptionId,
      },
    },
  };
}

function makeStripeSub(subscriptionId = 'sub_test_001') {
  const now = Math.floor(Date.now() / 1000);
  return {
    id: subscriptionId,
    items: {
      data: [
        {
          price: { id: 'price_pro_monthly' },
          quantity: 1,
          current_period_start: now,
          current_period_end: now + 30 * 86400,
        },
      ],
    },
    current_period_start: now,
    current_period_end: now + 30 * 86400,
    status: 'active',
    cancel_at_period_end: false,
  };
}

// ── Setup / Teardown ──────────────────────────────────────────────────────────

const TEST_USER_ID = 'user-billing-wh-test';

beforeAll(async () => {
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';

  const passwordHash = await bcrypt.hash('Password1!', 10);
  await prisma.user.upsert({
    where: { id: TEST_USER_ID },
    update: {},
    create: {
      id: TEST_USER_ID,
      email: 'billing-webhook@example.com',
      passwordHash,
      name: 'Billing Test User',
    },
  });
});

afterAll(async () => {
  await prisma.subscription.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

beforeEach(async () => {
  await prisma.subscription.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.update({ where: { id: TEST_USER_ID }, data: { plan: 'FREE' } });
  mockConstructEvent.mockReset();
  mockSubscriptionsRetrieve.mockReset();
});

// ── Webhook request helper ────────────────────────────────────────────────────

async function sendWebhook(event: object): Promise<request.Response> {
  const rawBody = Buffer.from(JSON.stringify(event));
  // constructEvent receives raw buffer + sig + secret; return the event object
  mockConstructEvent.mockReturnValueOnce(event);

  return request(app)
    .post('/api/billing/webhook')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', 'sig_test_fake')
    .send(rawBody);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Billing webhook', () => {
  // ── Raw body validation ───────────────────────────────────────────────────

  describe('raw body validation', () => {
    it('returns 400 when body is not a Buffer or string', async () => {
      // Send with text/html so express.raw({ type: 'application/json' }) does NOT
      // parse it, and express.json() also ignores it — req.body will be a raw Buffer
      // but of the wrong type check case. Actually with text/html content-type,
      // none of the body parsers will run, so req.body is undefined (not Buffer/string).
      mockConstructEvent.mockReturnValueOnce(makeFakeCheckoutEvent());

      const res = await request(app)
        .post('/api/billing/webhook')
        .set('Content-Type', 'text/html')
        .set('stripe-signature', 'sig_test_fake')
        .send('<html></html>');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Webhook body must be raw');
    });
  });

  // ── Idempotency ───────────────────────────────────────────────────────────

  describe('idempotency (duplicate event guard)', () => {
    it('processes a checkout event and upgrades the user plan', async () => {
      const event = makeFakeCheckoutEvent({ id: 'evt_idem_001' });
      mockSubscriptionsRetrieve.mockResolvedValue(makeStripeSub());

      const res = await sendWebhook(event);

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);

      const user = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
      expect(user?.plan).toBe('PRO');

      const sub = await prisma.subscription.findFirst({ where: { userId: TEST_USER_ID } });
      expect(sub).not.toBeNull();
      expect(sub?.stripeEventId).toBe('evt_idem_001');
    });

    it('skips processing when the same event is delivered twice (user plan is only updated once)', async () => {
      const event = makeFakeCheckoutEvent({ id: 'evt_idem_002' });
      mockSubscriptionsRetrieve.mockResolvedValue(makeStripeSub());

      // First delivery — should upgrade user
      const res1 = await sendWebhook(event);
      expect(res1.status).toBe(200);

      const userAfterFirst = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
      expect(userAfterFirst?.plan).toBe('PRO');

      // Simulate a plan reset so we can detect if second delivery re-runs the update
      await prisma.user.update({ where: { id: TEST_USER_ID }, data: { plan: 'FREE' } });

      // Second delivery of the same event
      const res2 = await sendWebhook(event);
      expect(res2.status).toBe(200);
      expect(res2.body.received).toBe(true);

      // Plan must still be FREE — second delivery was a no-op
      const userAfterSecond = await prisma.user.findUnique({ where: { id: TEST_USER_ID } });
      expect(userAfterSecond?.plan).toBe('FREE');

      // stripe.subscriptions.retrieve must only have been called once (first delivery)
      expect(mockSubscriptionsRetrieve).toHaveBeenCalledTimes(1);
    });

    it('processes a new distinct event even if an earlier duplicate was skipped', async () => {
      const event1 = makeFakeCheckoutEvent({ id: 'evt_idem_003a', subscriptionId: 'sub_003a' });
      const event2 = makeFakeCheckoutEvent({ id: 'evt_idem_003b', subscriptionId: 'sub_003b' });
      mockSubscriptionsRetrieve.mockResolvedValue(makeStripeSub('sub_003a'));

      // First event processed
      await sendWebhook(event1);

      // Duplicate of first event — should be skipped
      await sendWebhook(event1);

      // Second distinct event — should be processed
      mockSubscriptionsRetrieve.mockResolvedValue(makeStripeSub('sub_003b'));
      const res = await sendWebhook(event2);

      expect(res.status).toBe(200);

      // retrieve was called for event1 and event2, but NOT for the duplicate
      expect(mockSubscriptionsRetrieve).toHaveBeenCalledTimes(2);

      // Subscription record updated with the latest event ID
      const sub = await prisma.subscription.findFirst({ where: { userId: TEST_USER_ID } });
      expect(sub?.stripeEventId).toBe('evt_idem_003b');
    });
  });
});
