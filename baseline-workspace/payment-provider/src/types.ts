/**
 * Payment Provider Types
 */

// =============================================================================
// Core Types
// =============================================================================

export type Currency = 'usd' | 'eur' | 'gbp' | 'cad' | 'aud';

export type TransactionStatus = 'pending' | 'succeeded' | 'failed' | 'refunded';

export type SubscriptionStatus = 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid' 
  | 'paused'
  | 'trialing';

export type PaymentMethodType = 'card' | 'bank_account' | 'paypal';

export type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer';

// =============================================================================
// Data Models
// =============================================================================

export interface Transaction {
  id: string;
  providerId: string;  // ID from the payment provider
  amount: number;      // In cents
  currency: Currency;
  status: TransactionStatus;
  customerId: string;
  paymentMethodId: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  providerId: string;
  email: string;
  name?: string;
  defaultPaymentMethodId?: string;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  providerId: string;
  customerId: string;
  type: PaymentMethodType;
  last4: string;
  expiryMonth?: number;
  expiryYear?: number;
  isDefault: boolean;
  createdAt: Date;
}

export interface Subscription {
  id: string;
  providerId: string;
  customerId: string;
  priceId: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialEnd?: Date;
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Refund {
  id: string;
  providerId: string;
  transactionId: string;
  amount: number;
  currency: Currency;
  status: 'pending' | 'succeeded' | 'failed';
  reason?: RefundReason;
  createdAt: Date;
}

// =============================================================================
// Webhook Types
// =============================================================================

export type WebhookEventType =
  | 'transaction.succeeded'
  | 'transaction.failed'
  | 'refund.created'
  | 'customer.created'
  | 'customer.updated'
  | 'customer.deleted'
  | 'subscription.created'
  | 'subscription.updated'
  | 'subscription.canceled'
  | 'subscription.past_due'
  | 'payment_method.attached'
  | 'payment_method.detached';

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  providerId: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

// =============================================================================
// Input DTOs
// =============================================================================

export interface ChargeInput {
  amount: number;
  currency: Currency;
  paymentMethodId: string;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface RefundInput {
  transactionId: string;
  amount?: number;  // Partial refund, omit for full
  reason?: RefundReason;
  idempotencyKey?: string;
}

export interface CreateCustomerInput {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerInput {
  email?: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface CreateSubscriptionInput {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
  idempotencyKey?: string;
}

export interface UpdateSubscriptionInput {
  priceId?: string;
  cancelAtPeriodEnd?: boolean;
  metadata?: Record<string, string>;
}

// =============================================================================
// Webhook Request
// =============================================================================

export interface WebhookRequest {
  body: string | Buffer;
  headers: Record<string, string>;
}
