import { Response, NextFunction } from 'express';
import { PlanTier } from '@prisma/client';
import prisma from '../lib/prisma.js';
import { AuthRequest } from './auth.js';
import { AppError } from './errorHandler.js';
import { PLAN_LIMITS, checkFeatureAccess } from '../lib/usage.js';

// Extend AuthRequest to include plan info
export interface PlanRequest extends AuthRequest {
  userPlan?: PlanTier;
}

/**
 * Middleware that loads the user's plan tier onto the request.
 * Must be used after `authenticate`.
 */
export const loadPlan = async (
  req: PlanRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.userId) {
    return next(new AppError('Authentication required', 401));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { plan: true },
    });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    req.userPlan = user.plan;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Factory: creates middleware that requires a minimum plan tier.
 * Usage: `requirePlan('PRO')` or `requirePlan('TEAM')`
 */
export const requirePlan = (...allowedPlans: PlanTier[]) => {
  return async (req: PlanRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      return next(new AppError('Authentication required', 401));
    }

    // Load plan if not already loaded
    if (!req.userPlan) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true },
      });
      if (!user) return next(new AppError('User not found', 404));
      req.userPlan = user.plan;
    }

    if (!allowedPlans.includes(req.userPlan)) {
      return next(
        new AppError(
          `This feature requires a ${allowedPlans.join(' or ')} plan. ` +
          `You are on the ${req.userPlan} plan.`,
          403
        )
      );
    }

    next();
  };
};

/**
 * Factory: creates middleware that checks a quota-based feature limit.
 * Does NOT increment — just checks. Increment after successful operation.
 */
export const requireQuota = (feature: keyof typeof PLAN_LIMITS.FREE) => {
  return async (req: PlanRequest, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.userId) {
      return next(new AppError('Authentication required', 401));
    }

    // Load plan if not already loaded
    if (!req.userPlan) {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { plan: true },
      });
      if (!user) return next(new AppError('User not found', 404));
      req.userPlan = user.plan;
    }

    const { allowed, current, limit } = await checkFeatureAccess(
      req.userId,
      feature,
      req.userPlan
    );

    if (!allowed) {
      const msg = limit === 0
        ? `AI agent delegation requires a Pro or Team plan.`
        : `You've reached your ${feature} limit (${current}/${limit} this period). Upgrade your plan for more.`;
      return next(new AppError(msg, 403));
    }

    next();
  };
};
