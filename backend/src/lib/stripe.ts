import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY && process.env.NODE_ENV === 'production') {
  console.warn('WARNING: STRIPE_SECRET_KEY is not set. Billing features will not work.');
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion })
  : null;

export default stripe;

export const STRIPE_PRICES = {
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
  PRO_ANNUAL: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
  TEAM_MONTHLY: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',
  TEAM_ANNUAL: process.env.STRIPE_PRICE_TEAM_ANNUAL || '',
};

export function getStripeOrThrow(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY environment variable.');
  }
  return stripe;
}
