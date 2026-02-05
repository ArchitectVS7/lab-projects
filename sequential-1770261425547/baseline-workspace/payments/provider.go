// Package payments provides a unified interface for payment processing.
package payments

import (
	"context"
	"time"
)

// PaymentProvider defines the interface for payment processors.
type PaymentProvider interface {
	// Provider info
	Name() string

	// Charges
	CreateCharge(ctx context.Context, req ChargeRequest) (*Charge, error)
	GetCharge(ctx context.Context, chargeID string) (*Charge, error)

	// Refunds
	CreateRefund(ctx context.Context, req RefundRequest) (*Refund, error)
	GetRefund(ctx context.Context, refundID string) (*Refund, error)

	// Customers
	CreateCustomer(ctx context.Context, req CreateCustomerRequest) (*Customer, error)
	GetCustomer(ctx context.Context, customerID string) (*Customer, error)
	UpdateCustomer(ctx context.Context, customerID string, req UpdateCustomerRequest) (*Customer, error)
	DeleteCustomer(ctx context.Context, customerID string) error

	// Payment Methods
	AttachPaymentMethod(ctx context.Context, customerID, paymentMethodID string) error
	DetachPaymentMethod(ctx context.Context, paymentMethodID string) error
	ListPaymentMethods(ctx context.Context, customerID string) ([]*PaymentMethod, error)

	// Subscriptions
	CreateSubscription(ctx context.Context, req CreateSubscriptionRequest) (*Subscription, error)
	GetSubscription(ctx context.Context, subscriptionID string) (*Subscription, error)
	UpdateSubscription(ctx context.Context, subscriptionID string, req UpdateSubscriptionRequest) (*Subscription, error)
	CancelSubscription(ctx context.Context, subscriptionID string, req CancelSubscriptionRequest) (*Subscription, error)
	ListSubscriptions(ctx context.Context, customerID string) ([]*Subscription, error)

	// Webhooks
	ParseWebhook(payload []byte, signature string) (*WebhookEvent, error)
}

// ============ Charge Types ============

type ChargeRequest struct {
	Amount          int64             // Amount in cents
	Currency        string            // ISO currency code (e.g., "usd")
	CustomerID      string            // Optional: charge a saved customer
	PaymentMethodID string            // Optional: specific payment method
	Description     string            // Appears on customer statement
	Metadata        map[string]string // Custom key-value data
	IdempotencyKey  string            // Prevent duplicate charges
}

type Charge struct {
	ID            string
	ProviderID    string       // Original ID from provider
	Provider      string       // "stripe", "paypal", etc.
	Amount        int64
	AmountRefunded int64
	Currency      string
	Status        ChargeStatus
	CustomerID    string
	PaymentMethodID string
	Description   string
	FailureCode   string
	FailureReason string
	Metadata      map[string]string
	CreatedAt     time.Time
}

type ChargeStatus string

const (
	ChargeStatusPending   ChargeStatus = "pending"
	ChargeStatusSucceeded ChargeStatus = "succeeded"
	ChargeStatusFailed    ChargeStatus = "failed"
	ChargeStatusRefunded  ChargeStatus = "refunded"
)

// ============ Refund Types ============

type RefundRequest struct {
	ChargeID       string
	Amount         int64  // Optional: partial refund amount (0 = full refund)
	Reason         string // Optional: reason for refund
	IdempotencyKey string
}

type Refund struct {
	ID         string
	ProviderID string
	Provider   string
	ChargeID   string
	Amount     int64
	Currency   string
	Status     RefundStatus
	Reason     string
	CreatedAt  time.Time
}

type RefundStatus string

const (
	RefundStatusPending   RefundStatus = "pending"
	RefundStatusSucceeded RefundStatus = "succeeded"
	RefundStatusFailed    RefundStatus = "failed"
)

// ============ Customer Types ============

type CreateCustomerRequest struct {
	Email    string
	Name     string
	Phone    string
	Metadata map[string]string
}

type UpdateCustomerRequest struct {
	Email    *string           // nil = no change
	Name     *string
	Phone    *string
	Metadata map[string]string // nil = no change, empty = clear
}

type Customer struct {
	ID         string
	ProviderID string
	Provider   string
	Email      string
	Name       string
	Phone      string
	Metadata   map[string]string
	CreatedAt  time.Time
}

// ============ Payment Method Types ============

type PaymentMethod struct {
	ID         string
	ProviderID string
	Provider   string
	Type       PaymentMethodType
	Card       *CardDetails // Populated if Type == PaymentMethodTypeCard
	IsDefault  bool
	CreatedAt  time.Time
}

type PaymentMethodType string

const (
	PaymentMethodTypeCard       PaymentMethodType = "card"
	PaymentMethodTypeBankAccount PaymentMethodType = "bank_account"
	PaymentMethodTypePayPal     PaymentMethodType = "paypal"
)

type CardDetails struct {
	Brand    string // "visa", "mastercard", etc.
	Last4    string // Last 4 digits
	ExpMonth int
	ExpYear  int
}

// ============ Subscription Types ============

type CreateSubscriptionRequest struct {
	CustomerID      string
	PriceID         string            // Provider's price/plan ID
	PaymentMethodID string            // Optional: specific payment method
	TrialDays       int               // Optional: trial period
	Metadata        map[string]string
	IdempotencyKey  string
}

type UpdateSubscriptionRequest struct {
	PriceID         *string           // Change plan
	PaymentMethodID *string           // Change payment method
	CancelAtPeriodEnd *bool           // Cancel at end of billing period
	Metadata        map[string]string
}

type CancelSubscriptionRequest struct {
	CancelAtPeriodEnd bool   // true = cancel at end of period, false = immediate
	Reason            string // Optional cancellation reason
}

type Subscription struct {
	ID                string
	ProviderID        string
	Provider          string
	CustomerID        string
	PriceID           string
	Status            SubscriptionStatus
	CurrentPeriodStart time.Time
	CurrentPeriodEnd   time.Time
	CancelAtPeriodEnd  bool
	CanceledAt         *time.Time
	TrialStart         *time.Time
	TrialEnd           *time.Time
	Metadata           map[string]string
	CreatedAt          time.Time
}

type SubscriptionStatus string

const (
	SubscriptionStatusTrialing       SubscriptionStatus = "trialing"
	SubscriptionStatusActive         SubscriptionStatus = "active"
	SubscriptionStatusPastDue        SubscriptionStatus = "past_due"
	SubscriptionStatusCanceled       SubscriptionStatus = "canceled"
	SubscriptionStatusUnpaid         SubscriptionStatus = "unpaid"
	SubscriptionStatusIncomplete     SubscriptionStatus = "incomplete"
)

// ============ Webhook Types ============

type WebhookEvent struct {
	ID        string
	Type      WebhookEventType
	Provider  string
	Data      interface{} // Type-specific payload
	CreatedAt time.Time
}

type WebhookEventType string

const (
	// Charge events
	WebhookEventChargeSucceeded WebhookEventType = "charge.succeeded"
	WebhookEventChargeFailed    WebhookEventType = "charge.failed"
	WebhookEventChargeRefunded  WebhookEventType = "charge.refunded"

	// Subscription events
	WebhookEventSubscriptionCreated  WebhookEventType = "subscription.created"
	WebhookEventSubscriptionUpdated  WebhookEventType = "subscription.updated"
	WebhookEventSubscriptionCanceled WebhookEventType = "subscription.canceled"
	WebhookEventSubscriptionTrialEnd WebhookEventType = "subscription.trial_ending"

	// Invoice events
	WebhookEventInvoicePaid          WebhookEventType = "invoice.paid"
	WebhookEventInvoicePaymentFailed WebhookEventType = "invoice.payment_failed"

	// Customer events
	WebhookEventCustomerDeleted WebhookEventType = "customer.deleted"
)
