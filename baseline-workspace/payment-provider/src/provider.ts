/**
 * Payment Provider Interface
 * 
 * Abstract interface for payment processing.
 * Implement this for each provider (Stripe, PayPal, Square, etc.)
 */

import {
  Transaction,
  Customer,
  PaymentMethod,
  Subscription,
  Refund,
  WebhookEvent,
  ChargeInput,
  RefundInput,
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  WebhookRequest,
} from './types';

export interface PaymentProvider {
  /**
   * Provider identifier (e.g., 'stripe', 'paypal')
   */
  readonly name: string;

  // ===========================================================================
  // Transactions
  // ===========================================================================

  /**
   * Create a one-time charge
   */
  charge(input: ChargeInput): Promise<Transaction>;

  /**
   * Refund a transaction (full or partial)
   */
  refund(input: RefundInput): Promise<Refund>;

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): Promise<Transaction | null>;

  // ===========================================================================
  // Customers
  // ===========================================================================

  /**
   * Create a new customer
   */
  createCustomer(input: CreateCustomerInput): Promise<Customer>;

  /**
   * Get customer by ID
   */
  getCustomer(id: string): Promise<Customer | null>;

  /**
   * Update customer details
   */
  updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer>;

  /**
   * Delete a customer (and their payment methods)
   */
  deleteCustomer(id: string): Promise<void>;

  // ===========================================================================
  // Payment Methods
  // ===========================================================================

  /**
   * Attach a payment method to a customer
   * @param customerId Customer ID
   * @param token Payment method token from client-side SDK
   */
  attachPaymentMethod(customerId: string, token: string): Promise<PaymentMethod>;

  /**
   * List all payment methods for a customer
   */
  listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  /**
   * Remove a payment method
   */
  detachPaymentMethod(paymentMethodId: string): Promise<void>;

  /**
   * Set the default payment method for a customer
   */
  setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  // ===========================================================================
  // Subscriptions
  // ===========================================================================

  /**
   * Create a new subscription
   */
  createSubscription(input: CreateSubscriptionInput): Promise<Subscription>;

  /**
   * Get subscription by ID
   */
  getSubscription(id: string): Promise<Subscription | null>;

  /**
   * Update a subscription (change plan, etc.)
   */
  updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Subscription>;

  /**
   * Cancel a subscription
   * @param immediately If true, cancel now. If false, cancel at period end.
   */
  cancelSubscription(id: string, immediately?: boolean): Promise<Subscription>;

  /**
   * Pause a subscription (if supported)
   */
  pauseSubscription(id: string): Promise<Subscription>;

  /**
   * Resume a paused subscription
   */
  resumeSubscription(id: string): Promise<Subscription>;

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  /**
   * Parse and validate an incoming webhook
   * @throws if signature is invalid
   */
  parseWebhook(request: WebhookRequest): Promise<WebhookEvent>;

  /**
   * Validate webhook signature without parsing
   */
  validateWebhookSignature(request: WebhookRequest): boolean;
}

// =============================================================================
// Errors
// =============================================================================

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly providerCode?: string,
    public readonly isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'PaymentError';
  }
}

export class CardDeclinedError extends PaymentError {
  constructor(message: string, providerCode?: string) {
    super(message, 'CARD_DECLINED', providerCode, false);
    this.name = 'CardDeclinedError';
  }
}

export class InvalidRequestError extends PaymentError {
  constructor(message: string, providerCode?: string) {
    super(message, 'INVALID_REQUEST', providerCode, false);
    this.name = 'InvalidRequestError';
  }
}

export class ProviderError extends PaymentError {
  constructor(message: string, providerCode?: string) {
    super(message, 'PROVIDER_ERROR', providerCode, true);
    this.name = 'ProviderError';
  }
}

export class WebhookSignatureError extends PaymentError {
  constructor(message: string = 'Invalid webhook signature') {
    super(message, 'INVALID_SIGNATURE', undefined, false);
    this.name = 'WebhookSignatureError';
  }
}
