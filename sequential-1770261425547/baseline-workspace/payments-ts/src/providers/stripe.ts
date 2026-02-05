import Stripe from 'stripe';
import { PaymentProvider } from '../provider';
import { PaymentError, ErrorCode } from '../errors';
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
  ChargeStatus,
  RefundStatus,
  SubscriptionStatus,
  WebhookEventType,
} from '../types';

export interface StripeConfig {
  apiKey: string;
  webhookSecret: string;
}

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(config: StripeConfig) {
    this.stripe = new Stripe(config.apiKey);
    this.webhookSecret = config.webhookSecret;
  }

  // ============ Charges ============

  async createCharge(request: ChargeRequest): Promise<Charge> {
    try {
      const params: Stripe.ChargeCreateParams = {
        amount: request.amount,
        currency: request.currency,
        description: request.description,
        metadata: request.metadata,
      };

      if (request.customerId) params.customer = request.customerId;

      const options: Stripe.RequestOptions = {};
      if (request.idempotencyKey) options.idempotencyKey = request.idempotencyKey;

      const charge = await this.stripe.charges.create(params, options);
      return this.mapCharge(charge);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async getCharge(chargeId: string): Promise<Charge> {
    try {
      const charge = await this.stripe.charges.retrieve(chargeId);
      return this.mapCharge(charge);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  // ============ Refunds ============

  async createRefund(request: RefundRequest): Promise<Refund> {
    try {
      const params: Stripe.RefundCreateParams = {
        charge: request.chargeId,
      };

      if (request.amount) params.amount = request.amount;
      if (request.reason) params.reason = request.reason as Stripe.RefundCreateParams.Reason;

      const options: Stripe.RequestOptions = {};
      if (request.idempotencyKey) options.idempotencyKey = request.idempotencyKey;

      const refund = await this.stripe.refunds.create(params, options);
      return this.mapRefund(refund);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async getRefund(refundId: string): Promise<Refund> {
    try {
      const refund = await this.stripe.refunds.retrieve(refundId);
      return this.mapRefund(refund);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  // ============ Customers ============

  async createCustomer(request: CreateCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: request.email,
        name: request.name,
        phone: request.phone,
        metadata: request.metadata,
      });
      return this.mapCustomer(customer);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async getCustomer(customerId: string): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        throw new PaymentError('customer_not_found', 'Customer has been deleted', 'stripe');
      }
      return this.mapCustomer(customer as Stripe.Customer);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async updateCustomer(customerId: string, request: UpdateCustomerRequest): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        email: request.email,
        name: request.name,
        phone: request.phone,
        metadata: request.metadata,
      });
      return this.mapCustomer(customer);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async deleteCustomer(customerId: string): Promise<void> {
    try {
      await this.stripe.customers.del(customerId);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  // ============ Payment Methods ============

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const methods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });
      return methods.data.map((pm) => this.mapPaymentMethod(pm));
    } catch (err) {
      throw this.mapError(err);
    }
  }

  // ============ Subscriptions ============

  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    try {
      const params: Stripe.SubscriptionCreateParams = {
        customer: request.customerId,
        items: [{ price: request.priceId }],
        metadata: request.metadata,
      };

      if (request.paymentMethodId) {
        params.default_payment_method = request.paymentMethodId;
      }

      if (request.trialDays) {
        params.trial_period_days = request.trialDays;
      }

      const options: Stripe.RequestOptions = {};
      if (request.idempotencyKey) options.idempotencyKey = request.idempotencyKey;

      const subscription = await this.stripe.subscriptions.create(params, options);
      return this.mapSubscription(subscription);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
      return this.mapSubscription(subscription);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async updateSubscription(
    subscriptionId: string,
    request: UpdateSubscriptionRequest
  ): Promise<Subscription> {
    try {
      const params: Stripe.SubscriptionUpdateParams = {
        metadata: request.metadata,
      };

      if (request.paymentMethodId) {
        params.default_payment_method = request.paymentMethodId;
      }

      if (request.cancelAtPeriodEnd !== undefined) {
        params.cancel_at_period_end = request.cancelAtPeriodEnd;
      }

      // Plan change requires updating items
      if (request.priceId) {
        const current = await this.stripe.subscriptions.retrieve(subscriptionId);
        if (current.items.data.length > 0) {
          params.items = [
            {
              id: current.items.data[0].id,
              price: request.priceId,
            },
          ];
        }
      }

      const subscription = await this.stripe.subscriptions.update(subscriptionId, params);
      return this.mapSubscription(subscription);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    request: CancelSubscriptionRequest
  ): Promise<Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (request.cancelAtPeriodEnd) {
        subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      } else {
        subscription = await this.stripe.subscriptions.cancel(subscriptionId);
      }

      return this.mapSubscription(subscription);
    } catch (err) {
      throw this.mapError(err);
    }
  }

  async listSubscriptions(customerId: string): Promise<Subscription[]> {
    try {
      const subscriptions = await this.stripe.subscriptions.list({ customer: customerId });
      return subscriptions.data.map((sub) => this.mapSubscription(sub));
    } catch (err) {
      throw this.mapError(err);
    }
  }

  // ============ Webhooks ============

  async parseWebhook(payload: Buffer | string, signature: string): Promise<WebhookEvent> {
    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      return {
        id: event.id,
        type: this.mapEventType(event.type),
        provider: 'stripe',
        data: event.data.object,
        createdAt: new Date(event.created * 1000),
      };
    } catch {
      throw new PaymentError('invalid_webhook', 'Invalid webhook signature', 'stripe');
    }
  }

  // ============ Mappers ============

  private mapCharge(charge: Stripe.Charge): Charge {
    return {
      id: charge.id,
      providerId: charge.id,
      provider: 'stripe',
      amount: charge.amount,
      amountRefunded: charge.amount_refunded,
      currency: charge.currency,
      status: this.mapChargeStatus(charge.status),
      customerId: typeof charge.customer === 'string' ? charge.customer : charge.customer?.id,
      description: charge.description ?? undefined,
      failureCode: charge.failure_code ?? undefined,
      failureReason: charge.failure_message ?? undefined,
      metadata: charge.metadata ?? {},
      createdAt: new Date(charge.created * 1000),
    };
  }

  private mapChargeStatus(status: string): ChargeStatus {
    switch (status) {
      case 'succeeded': return 'succeeded';
      case 'pending': return 'pending';
      case 'failed': return 'failed';
      default: return status as ChargeStatus;
    }
  }

  private mapRefund(refund: Stripe.Refund): Refund {
    return {
      id: refund.id,
      providerId: refund.id,
      provider: 'stripe',
      chargeId: typeof refund.charge === 'string' ? refund.charge : refund.charge?.id ?? '',
      amount: refund.amount,
      currency: refund.currency,
      status: this.mapRefundStatus(refund.status),
      reason: refund.reason ?? undefined,
      createdAt: new Date(refund.created * 1000),
    };
  }

  private mapRefundStatus(status: string | null): RefundStatus {
    switch (status) {
      case 'succeeded': return 'succeeded';
      case 'pending': return 'pending';
      case 'failed': return 'failed';
      default: return 'pending';
    }
  }

  private mapCustomer(customer: Stripe.Customer): Customer {
    return {
      id: customer.id,
      providerId: customer.id,
      provider: 'stripe',
      email: customer.email ?? '',
      name: customer.name ?? undefined,
      phone: customer.phone ?? undefined,
      metadata: customer.metadata ?? {},
      createdAt: new Date(customer.created * 1000),
    };
  }

  private mapPaymentMethod(pm: Stripe.PaymentMethod): PaymentMethod {
    return {
      id: pm.id,
      providerId: pm.id,
      provider: 'stripe',
      type: 'card',
      card: pm.card
        ? {
            brand: pm.card.brand,
            last4: pm.card.last4,
            expMonth: pm.card.exp_month,
            expYear: pm.card.exp_year,
          }
        : undefined,
      isDefault: false,
      createdAt: new Date(pm.created * 1000),
    };
  }

  private mapSubscription(sub: Stripe.Subscription): Subscription {
    return {
      id: sub.id,
      providerId: sub.id,
      provider: 'stripe',
      customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      priceId: sub.items.data[0]?.price.id ?? '',
      status: this.mapSubscriptionStatus(sub.status),
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      metadata: sub.metadata ?? {},
      createdAt: new Date(sub.created * 1000),
    };
  }

  private mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'trialing': return 'trialing';
      case 'active': return 'active';
      case 'past_due': return 'past_due';
      case 'canceled': return 'canceled';
      case 'unpaid': return 'unpaid';
      case 'incomplete': return 'incomplete';
      default: return status as SubscriptionStatus;
    }
  }

  private mapEventType(type: string): WebhookEventType {
    const mapping: Record<string, WebhookEventType> = {
      'charge.succeeded': 'charge.succeeded',
      'charge.failed': 'charge.failed',
      'charge.refunded': 'charge.refunded',
      'customer.subscription.created': 'subscription.created',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.canceled',
      'customer.subscription.trial_will_end': 'subscription.trial_ending',
      'invoice.paid': 'invoice.paid',
      'invoice.payment_failed': 'invoice.payment_failed',
      'customer.deleted': 'customer.deleted',
    };
    return mapping[type] ?? (type as WebhookEventType);
  }

  private mapError(err: unknown): PaymentError {
    if (err instanceof PaymentError) return err;

    if (err instanceof Stripe.errors.StripeError) {
      const code = this.mapErrorCode(err.code);
      return new PaymentError(code, err.message, 'stripe', err.code);
    }

    return new PaymentError('unknown_error', String(err), 'stripe');
  }

  private mapErrorCode(code?: string): ErrorCode {
    switch (code) {
      case 'card_declined': return 'card_declined';
      case 'expired_card': return 'card_expired';
      case 'invalid_number': return 'card_invalid';
      case 'rate_limit': return 'rate_limited';
      default: return 'unknown_error';
    }
  }
}
