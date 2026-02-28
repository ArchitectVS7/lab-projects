import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import prisma from '../lib/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { getStripeOrThrow, STRIPE_PRICES } from '../lib/stripe.js';
import { PLAN_LIMITS, getUsage, getCurrentPeriod } from '../lib/usage.js';
import { PlanTier } from '@prisma/client';

const router = Router();

// ─── Schemas ───────────────────────────────────────────
const createCheckoutSchema = z.object({
  priceId: z.string().min(1),
  seats: z.number().int().min(1).optional(),
  annual: z.boolean().optional(),
});

// ─── GET /api/billing/plans ── Public pricing info ─────
router.get('/plans', (_req: Request, res: Response) => {
  res.json({
    plans: [
      {
        tier: 'FREE',
        name: 'Solo',
        price: 0,
        features: [
          'Unlimited tasks & projects',
          'Domains & daily check-ins',
          'Focus mode & gamification',
          'Basic AI (Haiku-powered)',
          '1 collaborator (view-only)',
          '30-day activity logs',
        ],
        limits: PLAN_LIMITS.FREE,
      },
      {
        tier: 'PRO',
        name: 'Creator',
        monthlyPrice: 8,
        annualPrice: 72,
        features: [
          'Everything in Solo',
          'AI agent delegation (50/month)',
          'Unlimited collaborators with RBAC',
          'File attachments (100 MB/project)',
          'Webhooks & API keys',
          'Weekly recap emails',
          'Unlimited activity logs',
          'CSV/JSON export',
          'Priority email support',
        ],
        limits: PLAN_LIMITS.PRO,
        prices: {
          monthly: STRIPE_PRICES.PRO_MONTHLY,
          annual: STRIPE_PRICES.PRO_ANNUAL,
        },
      },
      {
        tier: 'TEAM',
        name: 'Team',
        monthlyPricePerSeat: 6,
        annualPricePerSeat: 60,
        minSeats: 3,
        features: [
          'Everything in Creator',
          'Creator dashboard per member',
          'Dependency graph & critical path',
          '200 AI delegations/month (shared)',
          '25 webhooks & API keys',
          'File attachments (500 MB/project)',
          'Admin controls & audit logs',
        ],
        limits: PLAN_LIMITS.TEAM,
        prices: {
          monthly: STRIPE_PRICES.TEAM_MONTHLY,
          annual: STRIPE_PRICES.TEAM_ANNUAL,
        },
      },
    ],
  });
});

// ─── GET /api/billing/status ── Current subscription ───
router.get('/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        plan: true,
        stripeCustomerId: true,
        subscription: true,
      },
    });

    if (!user) throw new AppError('User not found', 404);

    const period = await getCurrentPeriod(req.userId!);
    const aiUsage = await getUsage(req.userId!, 'ai_delegation');

    res.json({
      plan: user.plan,
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            planTier: user.subscription.planTier,
            seats: user.subscription.seats,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
          }
        : null,
      usage: {
        ai_delegation: {
          used: aiUsage,
          limit: PLAN_LIMITS[user.plan].ai_delegation,
          periodEnd: period.end,
        },
      },
    });
  } catch (error) { next(error); }
});

// ─── POST /api/billing/checkout ── Create Stripe checkout ───
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripeOrThrow();
    const { priceId, seats } = createCheckoutSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { email: true, stripeCustomerId: true, plan: true },
    });
    if (!user) throw new AppError('User not found', 404);

    if (user.plan !== 'FREE') {
      throw new AppError('You already have an active subscription. Use the billing portal to manage it.', 400);
    }

    // Get or create Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: req.userId! },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: req.userId! },
        data: { stripeCustomerId: customerId },
      });
    }

    // Determine if this is a team plan (needs quantity)
    const isTeamPrice = priceId === STRIPE_PRICES.TEAM_MONTHLY || priceId === STRIPE_PRICES.TEAM_ANNUAL;
    const quantity = isTeamPrice ? Math.max(seats ?? 3, 3) : 1;

    const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity }],
      success_url: `${frontendUrl}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing?canceled=true`,
      metadata: {
        userId: req.userId!,
        planTier: isTeamPrice ? 'TEAM' : 'PRO',
      },
      subscription_data: {
        metadata: {
          userId: req.userId!,
          planTier: isTeamPrice ? 'TEAM' : 'PRO',
        },
      },
    });

    res.json({ url: session.url });
  } catch (error) { next(error); }
});

// ─── POST /api/billing/portal ── Stripe billing portal ───
router.post('/portal', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const stripe = getStripeOrThrow();

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { stripeCustomerId: true },
    });
    if (!user?.stripeCustomerId) {
      throw new AppError('No billing account found. Subscribe to a plan first.', 400);
    }

    const frontendUrl = process.env.CORS_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:5173';

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${frontendUrl}/billing`,
    });

    res.json({ url: session.url });
  } catch (error) { next(error); }
});

// ─── POST /api/billing/webhook ── Stripe webhook handler ───
// NOTE: This route must be mounted BEFORE express.json() body parsing,
// or use express.raw() for this specific path. We handle raw body here.
router.post(
  '/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stripe = getStripeOrThrow();
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        throw new AppError('Stripe webhook secret not configured', 500);
      }

      const sig = req.headers['stripe-signature'] as string;
      if (!sig) {
        throw new AppError('Missing stripe-signature header', 400);
      }

      let event: Stripe.Event;
      try {
        // req.body should be raw buffer for webhook verification
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (err) {
        console.error('Webhook signature verification failed:', err);
        throw new AppError('Invalid webhook signature', 400);
      }

      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutCompleted(stripe, session);
          break;
        }
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdated(subscription);
          break;
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionDeleted(subscription);
          break;
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }
        default:
          // Unhandled event type — acknowledge receipt
          break;
      }

      res.json({ received: true });
    } catch (error) { next(error); }
  }
);

// ─── Webhook handlers ──────────────────────────────────

async function handleCheckoutCompleted(stripe: Stripe, session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId || !session.subscription) return;

  const planTier = (session.metadata?.planTier || 'PRO') as PlanTier;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription.id;

  // Fetch subscription details from Stripe
  const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
  const item = stripeSub.items.data[0];
  const priceId = item?.price.id ?? '';
  const seats = item?.quantity ?? 1;

  // Extract period dates (field location varies by Stripe API version)
  const subAny = stripeSub as unknown as Record<string, unknown>;
  const itemAny = item as unknown as Record<string, unknown>;
  const periodStart = (subAny.current_period_start ?? itemAny.current_period_start ?? Math.floor(Date.now() / 1000)) as number;
  const periodEnd = (subAny.current_period_end ?? itemAny.current_period_end ?? Math.floor(Date.now() / 1000) + 30 * 86400) as number;

  // Create subscription record and update user plan
  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        status: 'ACTIVE',
        planTier,
        seats,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
      },
      update: {
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        status: 'ACTIVE',
        planTier,
        seats,
        currentPeriodStart: new Date(periodStart * 1000),
        currentPeriodEnd: new Date(periodEnd * 1000),
      },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan: planTier },
    }),
  ]);

  console.log(`[Billing] User ${userId} upgraded to ${planTier}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!existing) return;

  const statusMap: Record<string, 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIALING' | 'UNPAID'> = {
    active: 'ACTIVE',
    past_due: 'PAST_DUE',
    canceled: 'CANCELED',
    trialing: 'TRIALING',
    unpaid: 'UNPAID',
  };

  const status = statusMap[subscription.status] || 'ACTIVE';
  const item = subscription.items.data[0];
  const seats = item?.quantity ?? existing.seats;

  // Extract period dates (field location varies by Stripe API version)
  const subAny = subscription as unknown as Record<string, unknown>;
  const itemAny = item as unknown as Record<string, unknown>;
  const periodStart = (subAny.current_period_start ?? itemAny.current_period_start) as number | undefined;
  const periodEnd = (subAny.current_period_end ?? itemAny.current_period_end) as number | undefined;

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status,
      seats,
      ...(periodStart && { currentPeriodStart: new Date(periodStart * 1000) }),
      ...(periodEnd && { currentPeriodEnd: new Date(periodEnd * 1000) }),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!existing) return;

  // Downgrade user to FREE
  await prisma.$transaction([
    prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: { status: 'CANCELED' },
    }),
    prisma.user.update({
      where: { id: existing.userId },
      data: { plan: 'FREE' },
    }),
  ]);

  console.log(`[Billing] User ${existing.userId} downgraded to FREE (subscription canceled)`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // Extract subscription ID (field location varies by Stripe API version)
  const invoiceAny = invoice as unknown as Record<string, unknown>;
  const subField = invoiceAny.subscription;
  if (!subField) return;

  const subId = typeof subField === 'string'
    ? subField
    : (subField as { id: string }).id;

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subId },
  });
  if (!existing) return;

  await prisma.subscription.update({
    where: { stripeSubscriptionId: subId },
    data: { status: 'PAST_DUE' },
  });

  console.log(`[Billing] Payment failed for user ${existing.userId}`);
}

export default router;
