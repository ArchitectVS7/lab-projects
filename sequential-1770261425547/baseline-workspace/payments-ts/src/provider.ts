import {
  Charge,
  ChargeRequest,
  Refund,
  RefundRequest,
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  PaymentMethod,
  Subscription,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  CancelSubscriptionRequest,
  WebhookEvent,
} from './types';

/**
 * PaymentProvider defines the interface for payment processors.
 * Implement this interface to add support for new payment providers.
 */
export interface PaymentProvider {
  /** Provider identifier (e.g., "stripe", "paypal") */
  readonly name: string;

  // ============ Charges ============

  /** Create a one-time charge */
  createCharge(request: ChargeRequest): Promise<Charge>;

  /** Retrieve a charge by ID */
  getCharge(chargeId: string): Promise<Charge>;

  // ============ Refunds ============

  /** Create a full or partial refund */
  createRefund(request: RefundRequest): Promise<Refund>;

  /** Retrieve a refund by ID */
  getRefund(refundId: string): Promise<Refund>;

  // ============ Customers ============

  /** Create a new customer */
  createCustomer(request: CreateCustomerRequest): Promise<Customer>;

  /** Retrieve a customer by ID */
  getCustomer(customerId: string): Promise<Customer>;

  /** Update customer details */
  updateCustomer(customerId: string, request: UpdateCustomerRequest): Promise<Customer>;

  /** Delete a customer */
  deleteCustomer(customerId: string): Promise<void>;

  // ============ Payment Methods ============

  /** Attach a payment method to a customer */
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>;

  /** Detach a payment method */
  detachPaymentMethod(paymentMethodId: string): Promise<void>;

  /** List all payment methods for a customer */
  listPaymentMethods(customerId: string): Promise<PaymentMethod[]>;

  // ============ Subscriptions ============

  /** Create a new subscription */
  createSubscription(request: CreateSubscriptionRequest): Promise<Subscription>;

  /** Retrieve a subscription by ID */
  getSubscription(subscriptionId: string): Promise<Subscription>;

  /** Update subscription (change plan, payment method, etc.) */
  updateSubscription(
    subscriptionId: string,
    request: UpdateSubscriptionRequest
  ): Promise<Subscription>;

  /** Cancel a subscription (immediately or at period end) */
  cancelSubscription(
    subscriptionId: string,
    request: CancelSubscriptionRequest
  ): Promise<Subscription>;

  /** List all subscriptions for a customer */
  listSubscriptions(customerId: string): Promise<Subscription[]>;

  // ============ Webhooks ============

  /** Parse and verify a webhook event */
  parseWebhook(payload: Buffer | string, signature: string): Promise<WebhookEvent>;
}
