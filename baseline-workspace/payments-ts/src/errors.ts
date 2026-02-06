export type ErrorCode =
  // Card errors
  | 'card_declined'
  | 'card_expired'
  | 'card_invalid'
  | 'insufficient_funds'
  | 'card_limit_exceeded'
  // Customer errors
  | 'customer_not_found'
  | 'duplicate_customer'
  // Subscription errors
  | 'subscription_not_found'
  | 'subscription_inactive'
  | 'invalid_plan'
  // General errors
  | 'charge_not_found'
  | 'refund_not_found'
  | 'invalid_amount'
  | 'invalid_currency'
  | 'duplicate_request'
  | 'rate_limited'
  | 'provider_unavailable'
  | 'invalid_webhook'
  | 'unknown_error';

export class PaymentError extends Error {
  readonly code: ErrorCode;
  readonly provider: string;
  readonly providerCode?: string;
  readonly retryable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    provider: string,
    providerCode?: string
  ) {
    super(`[${provider}] ${code}: ${message}`);
    this.name = 'PaymentError';
    this.code = code;
    this.provider = provider;
    this.providerCode = providerCode;
    this.retryable = this.isRetryable(code);
  }

  private isRetryable(code: ErrorCode): boolean {
    return code === 'rate_limited' || code === 'provider_unavailable';
  }

  isDeclined(): boolean {
    return ['card_declined', 'insufficient_funds', 'card_limit_exceeded'].includes(this.code);
  }
}
