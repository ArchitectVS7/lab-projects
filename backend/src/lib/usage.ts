import prisma from './prisma.js';
import { PlanTier } from '@prisma/client';

// Plan limits for features
export const PLAN_LIMITS = {
  FREE: {
    ai_delegation: 0,
    collaborators: 1, // view-only
    api_keys: 0,
    webhooks: 0,
    attachment_mb_per_project: 0,
    activity_log_days: 30,
  },
  PRO: {
    ai_delegation: 50,
    collaborators: Infinity,
    api_keys: 5,
    webhooks: 5,
    attachment_mb_per_project: 100,
    activity_log_days: Infinity,
  },
  TEAM: {
    ai_delegation: 200, // shared pool per team
    collaborators: Infinity,
    api_keys: 25,
    webhooks: 25,
    attachment_mb_per_project: 500,
    activity_log_days: Infinity,
  },
} as const;

/**
 * Get the current billing period start/end for a user.
 * Uses the subscription period if available, otherwise calendar month.
 */
export async function getCurrentPeriod(userId: string): Promise<{ start: Date; end: Date }> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
  });

  if (subscription) {
    return {
      start: subscription.currentPeriodStart,
      end: subscription.currentPeriodEnd,
    };
  }

  // Free users: calendar month
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Increment usage for a feature in the current billing period.
 * Returns the new count.
 */
export async function incrementUsage(userId: string, feature: string): Promise<number> {
  const period = await getCurrentPeriod(userId);

  const record = await prisma.usageRecord.upsert({
    where: {
      userId_feature_periodStart: {
        userId,
        feature,
        periodStart: period.start,
      },
    },
    create: {
      userId,
      feature,
      count: 1,
      periodStart: period.start,
      periodEnd: period.end,
    },
    update: {
      count: { increment: 1 },
    },
  });

  return record.count;
}

/**
 * Get current usage for a feature in the current billing period.
 */
export async function getUsage(userId: string, feature: string): Promise<number> {
  const period = await getCurrentPeriod(userId);

  const record = await prisma.usageRecord.findUnique({
    where: {
      userId_feature_periodStart: {
        userId,
        feature,
        periodStart: period.start,
      },
    },
  });

  return record?.count ?? 0;
}

/**
 * Check if a user can use a feature based on their plan limits.
 * Returns { allowed, current, limit } for quota-based features.
 */
export async function checkFeatureAccess(
  userId: string,
  feature: keyof typeof PLAN_LIMITS.FREE,
  plan: PlanTier
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const limit = PLAN_LIMITS[plan][feature];

  if (limit === Infinity) {
    return { allowed: true, current: 0, limit: Infinity };
  }

  if (limit === 0) {
    return { allowed: false, current: 0, limit: 0 };
  }

  // For countable features, check usage
  const current = await getUsage(userId, feature);
  return {
    allowed: current < limit,
    current,
    limit,
  };
}
