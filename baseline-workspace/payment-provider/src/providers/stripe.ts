/**
 * Stripe Payment Provider Implementation
 */

import Stripe from 'stripe';
import {
  PaymentProvider,
  PaymentError,
  CardDeclinedError,
  ProviderError,
  WebhookSignatureError,
} from '../provider';
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
  TransactionStatus,
  SubscriptionStatus,
  WebhookEventType,
} from '../types';

export interface StripeProviderConfig {
  secretKey: string;
  webhookSecret: string;
  apiVersion?: Stripe.LatestApiVersion;
}

export class StripeProvider implements PaymentProvider {
  readonly name = 'stripe';
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(config: StripeProviderConfig) {
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: config.apiVersion ?? '2023-10-16',
    });
    this.webhookSecret = config.webhookSecret;
  }

  // ===========================================================================
  // Transactions
  // ===========================================================================

  async charge(input: ChargeInput): Promise<Transaction> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: input.amount,
        currency: input.currency,
        payment_method: input.paymentMethodId,
        customer: input.customerId,
        description: input.description,
        metadata: input.metadata,
        confirm: true,
        return_url: 'https://example.com/return', // Required for some payment methods
      }, {
        idempotencyKey: input.idempotencyKey,
      });

      return this.mapTransaction(paymentIntent);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async refund(input: RefundInput): Promise<Refund> {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: input.transactionId,
        amount: input.amount,
        reason: input.reason,
      }, {
        idempotencyKey: input.idempotencyKey,
      });

      return this.mapRefund(refund);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getTransaction(id: string): Promise<Transaction | null> {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(id);
      return this.mapTransaction(paymentIntent);
    } catch (error) {
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        return null;
      }
      throw this.mapError(error);
    }
  }

  // ===========================================================================
  // Customers
  // ===========================================================================

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.create({
        email: input.email,
        name: input.name,
        metadata: input.metadata,
      });

      return this.mapCustomer(customer);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const customer = await this.stripe.customers.retrieve(id);
      if (customer.deleted) return null;
      return this.mapCustomer(customer as Stripe.Customer);
    } catch (error) {
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        return null;
      }
      throw this.mapError(error);
    }
  }

  async updateCustomer(id: string, input: UpdateCustomerInput): Promise<Customer> {
    try {
      const customer = await this.stripe.customers.update(id, {
        email: input.email,
        name: input.name,
        metadata: input.metadata,
      });

      return this.mapCustomer(customer);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    try {
      await this.stripe.customers.del(id);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  // ===========================================================================
  // Payment Methods
  // ===========================================================================

  async attachPaymentMethod(customerId: string, token: string): Promise<PaymentMethod> {
    try {
      const paymentMethod = await this.stripe.paymentMethods.attach(token, {
        customer: customerId,
      });

      return this.mapPaymentMethod(paymentMethod, customerId);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async listPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      const defaultPmId = (customer as Stripe.Customer).invoice_settings?.default_payment_method;

      const methods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return methods.data.map(pm => this.mapPaymentMethod(pm, customerId, pm.id === defaultPmId));
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.paymentMethods.detach(paymentMethodId);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      await this.stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    } catch (error) {
      throw this.mapError(error);
    }
  }

  // ===========================================================================
  // Subscriptions
  // ===========================================================================

  async createSubscription(input: CreateSubscriptionInput): Promise<Subscription> {
    try {
      const params: Stripe.SubscriptionCreateParams = {
        customer: input.customerId,
        items: [{ price: input.priceId }],
        metadata: input.metadata,
      };

      if (input.trialDays) {
        params.trial_period_days = input.trialDays;
      }

      const subscription = await this.stripe.subscriptions.create(params, {
        idempotencyKey: input.idempotencyKey,
      });

      return this.mapSubscription(subscription);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async getSubscription(id: string): Promise<Subscription | null> {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(id);
      return this.mapSubscription(subscription);
    } catch (error) {
      if ((error as Stripe.errors.StripeError).code === 'resource_missing') {
        return null;
      }
      throw this.mapError(error);
    }
  }

  async updateSubscription(id: string, input: UpdateSubscriptionInput): Promise<Subscription> {
    try {
      const params: Stripe.SubscriptionUpdateParams = {
        metadata: input.metadata,
        cancel_at_period_end: input.cancelAtPeriodEnd,
      };

      if (input.priceId) {
        const subscription = await this.stripe.subscriptions.retrieve(id);
        params.items = [{
          id: subscription.items.data[0].id,
          price: input.priceId,
        }];
      }

      const subscription = await this.stripe.subscriptions.update(id, params);
      return this.mapSubscription(subscription);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async cancelSubscription(id: string, immediately = false): Promise<Subscription> {
    try {
      let subscription: Stripe.Subscription;

      if (immediately) {
        subscription = await this.stripe.subscriptions.cancel(id);
      } else {
        subscription = await this.stripe.subscriptions.update(id, {
          cancel_at_period_end: true,
        });
      }

      return this.mapSubscription(subscription);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async pauseSubscription(id: string): Promise<Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(id, {
        pause_collection: { behavior: 'mark_uncollectible' },
      });
      return this.mapSubscription(subscription);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  async resumeSubscription(id: string): Promise<Subscription> {
    try {
      const subscription = await this.stripe.subscriptions.update(id, {
        pause_collection: '',
      });
      return this.mapSubscription(subscription);
    } catch (error) {
      throw this.mapError(error);
    }
  }

  // ===========================================================================
  // Webhooks
  // ===========================================================================

  async parseWebhook(request: WebhookRequest): Promise<WebhookEvent> {
    const signature = request.headers['stripe-signature'];
    if (!signature) {
      throw new WebhookSignatureError('Missing stripe-signature header');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        request.body,
        signature,
        this.webhookSecret
      );

      return this.mapWebhookEvent(event);
    } catch (error) {
      throw new WebhookSignatureError((error as Error).message);
    }
  }

  validateWebhookSignature(request: WebhookRequest): boolean {
    const signature = request.headers['stripe-signature'];
    if (!signature) return false;

    try {
      this.stripe.webhooks.constructEvent(
        request.body,
        signature,
        this.webhookSecret
      );
      return true;
    } catch {
      return false;
    }
  }

  // ===========================================================================
  // Mappers
  // ===========================================================================

  private mapTransaction(pi: Stripe.PaymentIntent): Transaction {
    return {
      id: pi.id,
      providerId: pi.id,
      amount: pi.amount,
      currency: pi.currency as Transaction['currency'],
      status: this.mapTransactionStatus(pi.status),
      customerId: pi.customer as string,
      paymentMethodId: pi.payment_method as string,
      description: pi.description ?? undefined,
      metadata: pi.metadata,
      createdAt: new Date(pi.created * 1000),
      updatedAt: new Date(),
    };
  }

  private mapTransactionStatus(status: Stripe.PaymentIntent.Status): TransactionStatus {
    const statusMap: Record<string, TransactionStatus> = {
      'succeeded': 'succeeded',
      'processing': 'pending',
      'requires_payment_method': 'failed',
      'requires_confirmation': 'pending',
      'requires_action': 'pending',
      'canceled': 'failed',
    };
    return statusMap[status] ?? 'pending';
  }

  private mapCustomer(c: Stripe.Customer): Customer {
    return {
      id: c.id,
      providerId: c.id,
      email: c.email!,
      name: c.name ?? undefined,
      defaultPaymentMethodId: c.invoice_settings?.default_payment_method as string | undefined,
      metadata: c.metadata,
      createdAt: new Date(c.created * 1000),
      updatedAt: new Date(),
    };
  }

  private mapPaymentMethod(pm: Stripe.PaymentMethod, customerId: string, isDefault = false): PaymentMethod {
    return {
      id: pm.id,
      providerId: pm.id,
      customerId,
      type: pm.type as PaymentMethod['type'],
      last4: pm.card?.last4 ?? '',
      expiryMonth: pm.card?.exp_month,
      expiryYear: pm.card?.exp_year,
      isDefault,
      createdAt: new Date(pm.created * 1000),
    };
  }

  private mapSubscription(sub: Stripe.Subscription): Subscription {
    return {
      id: sub.id,
      providerId: sub.id,
      customerId: sub.customer as string,
      priceId: sub.items.data[0].price.id,
      status: this.mapSubscriptionStatus(sub),
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      metadata: sub.metadata,
      createdAt: new Date(sub.created * 1000),
      updatedAt: new Date(),
    };
  }

  private mapSubscriptionStatus(sub: Stripe.Subscription): SubscriptionStatus {
    if (sub.pause_collection) return 'paused';
    
    const statusMap: Record<string, SubscriptionStatus> = {
      'active': 'active',
      'past_due': 'past_due',
      'canceled': 'canceled',
      'unpaid': 'unpaid',
      'trialing': 'trialing',
    };
    return statusMap[sub.status] ?? 'active';
  }

  private mapRefund(r: Stripe.Refund): Refund {
    return {
      id: r.id,
      providerId: r.id,
      transactionId: r.payment_intent as string,
      amount: r.amount,
      currency: r.currency as Refund['currency'],
      status: r.status === 'succeeded' ? 'succeeded' : r.status === 'failed' ? 'failed' : 'pending',
      reason: r.reason as Refund['reason'],
      createdAt: new Date(r.created * 1000),
    };
  }

  private mapWebhookEvent(event: Stripe.Event): WebhookEvent {
    const typeMap: Record<string, WebhookEventType> = {
      'payment_intent.succeeded': 'transaction.succeeded',
      'payment_intent.payment_failed': 'transaction.failed',
      'charge.refunded': 'refund.created',
      'customer.created': 'customer.created',
      'customer.updated': 'customer.updated',
      'customer.deleted': 'customer.deleted',
      'customer.subscription.created': 'subscription.created',
      'customer.subscription.updated': 'subscription.updated',
      'customer.subscription.deleted': 'subscription.canceled',
      'invoice.payment_failed': 'subscription.past_due',
      'payment_method.attached': 'payment_method.attached',
      'payment_method.detached': 'payment_method.detached',
    };

    return {
      id: event.id,
      type: typeMap[event.type] ?? event.type as WebhookEventType,
      providerId: (event.data.object as { id: string }).id,
      data: event.data.object as Record<string, unknown>,
      createdAt: new Date(event.created * 1000),
    };
  }

  private mapError(error: unknown): PaymentError {
    if (error instanceof Stripe.errors.StripeError) {
      if (error.type === 'StripeCardError') {
        return new CardDeclinedError(error.message, error.code);
      }
      if (error.type === 'StripeInvalidRequestError') {
        return new PaymentError(error.message, 'INVALID_REQUEST', error.code, false);
      }
      return new ProviderError(error.message, error.code);
    }
    return new PaymentError('Unknown error', 'UNKNOWN');
  }
}
