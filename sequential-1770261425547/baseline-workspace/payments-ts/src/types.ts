// ============ Charge Types ============

export interface ChargeRequest {
  amount: number;              // Amount in cents
  currency: string;            // ISO currency code (e.g., "usd")
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface Charge {
  id: string;
  providerId: string;
  provider: string;
  amount: number;
  amountRefunded: number;
  currency: string;
  status: ChargeStatus;
  customerId?: string;
  paymentMethodId?: string;
  description?: string;
  failureCode?: string;
  failureReason?: string;
  metadata: Record<string, string>;
  createdAt: Date;
}

export type ChargeStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

// ============ Refund Types ============

export interface RefundRequest {
  chargeId: string;
  amount?: number;             // Optional: partial refund (undefined = full)
  reason?: string;
  idempotencyKey?: string;
}

export interface Refund {
  id: string;
  providerId: string;
  provider: string;
  chargeId: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason?: string;
  createdAt: Date;
}

export type RefundStatus = 'pending' | 'succeeded' | 'failed';

// ============ Customer Types ============

export interface CreateCustomerRequest {
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerRequest {
  email?: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;
}

export interface Customer {
  id: string;
  providerId: string;
  provider: string;
  email: string;
  name?: string;
  phone?: string;
  metadata: Record<string, string>;
  createdAt: Date;
}

// ============ Payment Method Types ============

export interface PaymentMethod {
  id: string;
  providerId: string;
  provider: string;
  type: PaymentMethodType;
  card?: CardDetails;
  isDefault: boolean;
  createdAt: Date;
}

export type PaymentMethodType = 'card' | 'bank_account' | 'paypal';

export interface CardDetails {
  brand: string;               // "visa", "mastercard", etc.
  last4: string;
  expMonth: number;
  expYear: number;
}

// ============ Subscription Types ============

export interface CreateSubscriptionRequest {
  customerId: string;
  priceId: string;             // Provider's price/plan ID
  paymentMethodId?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface UpdateSubscriptionRequest {
  priceId?: string;
  paymentMethodId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

export interface CancelSubscriptionRequest {
  cancelAtPeriodEnd: boolean;  // true = end of period, false = immediate
  reason?: string;
}

export interface Subscription {
  id: string;
  providerId: string;
  provider: string;
  customerId: string;
  priceId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  metadata: Record<string, string>;
  createdAt: Date;
}

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete';

// ============ Webhook Types ============

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  provider: string;
  data: unknown;
  createdAt: Date;
}

export type WebhookEventType =
  // Charge events
  | 'charge.succeeded'
  | 'charge.failed'
  | 'charge.refunded'
  // Subscription events
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.trial_ending'
  // Invoice events
  | 'invoice.paid'
  | 'invoice.payment_failed'
  // Customer events
  | 'customer.deleted';
