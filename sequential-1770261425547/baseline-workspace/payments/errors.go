package payments

import "fmt"

// PaymentError represents a payment processing error.
type PaymentError struct {
	Code       ErrorCode
	Message    string
	Provider   string
	ProviderCode string // Original error code from provider
	Retryable  bool
}

func (e *PaymentError) Error() string {
	return fmt.Sprintf("[%s] %s: %s", e.Provider, e.Code, e.Message)
}

// ErrorCode represents standardized payment error codes.
type ErrorCode string

const (
	// Card errors
	ErrCardDeclined        ErrorCode = "card_declined"
	ErrCardExpired         ErrorCode = "card_expired"
	ErrCardInvalid         ErrorCode = "card_invalid"
	ErrInsufficientFunds   ErrorCode = "insufficient_funds"
	ErrCardLimitExceeded   ErrorCode = "card_limit_exceeded"

	// Customer errors
	ErrCustomerNotFound    ErrorCode = "customer_not_found"
	ErrDuplicateCustomer   ErrorCode = "duplicate_customer"

	// Subscription errors
	ErrSubscriptionNotFound  ErrorCode = "subscription_not_found"
	ErrSubscriptionInactive  ErrorCode = "subscription_inactive"
	ErrInvalidPlan           ErrorCode = "invalid_plan"

	// General errors
	ErrChargeNotFound      ErrorCode = "charge_not_found"
	ErrRefundNotFound      ErrorCode = "refund_not_found"
	ErrInvalidAmount       ErrorCode = "invalid_amount"
	ErrInvalidCurrency     ErrorCode = "invalid_currency"
	ErrDuplicateRequest    ErrorCode = "duplicate_request"
	ErrRateLimited         ErrorCode = "rate_limited"
	ErrProviderUnavailable ErrorCode = "provider_unavailable"
	ErrInvalidWebhook      ErrorCode = "invalid_webhook"
	ErrUnknown             ErrorCode = "unknown_error"
)

// NewPaymentError creates a new PaymentError.
func NewPaymentError(code ErrorCode, message, provider string) *PaymentError {
	return &PaymentError{
		Code:     code,
		Message:  message,
		Provider: provider,
		Retryable: isRetryable(code),
	}
}

func isRetryable(code ErrorCode) bool {
	switch code {
	case ErrRateLimited, ErrProviderUnavailable:
		return true
	default:
		return false
	}
}

// IsDeclined returns true if the error is due to card decline.
func (e *PaymentError) IsDeclined() bool {
	switch e.Code {
	case ErrCardDeclined, ErrInsufficientFunds, ErrCardLimitExceeded:
		return true
	default:
		return false
	}
}
