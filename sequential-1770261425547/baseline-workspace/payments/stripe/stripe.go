// Package stripe implements PaymentProvider for Stripe.
package stripe

import (
	"context"
	"time"

	"github.com/stripe/stripe-go/v76"
	"github.com/stripe/stripe-go/v76/charge"
	"github.com/stripe/stripe-go/v76/customer"
	"github.com/stripe/stripe-go/v76/paymentmethod"
	"github.com/stripe/stripe-go/v76/refund"
	"github.com/stripe/stripe-go/v76/subscription"
	"github.com/stripe/stripe-go/v76/webhook"

	"payments"
)

// Provider implements payments.PaymentProvider for Stripe.
type Provider struct {
	apiKey        string
	webhookSecret string
}

// Config holds Stripe configuration.
type Config struct {
	APIKey        string
	WebhookSecret string
}

// New creates a new Stripe provider.
func New(cfg Config) *Provider {
	stripe.Key = cfg.APIKey
	return &Provider{
		apiKey:        cfg.APIKey,
		webhookSecret: cfg.WebhookSecret,
	}
}

func (p *Provider) Name() string {
	return "stripe"
}

// ============ Charges ============

func (p *Provider) CreateCharge(ctx context.Context, req payments.ChargeRequest) (*payments.Charge, error) {
	params := &stripe.ChargeParams{
		Amount:      stripe.Int64(req.Amount),
		Currency:    stripe.String(req.Currency),
		Description: stripe.String(req.Description),
	}

	if req.CustomerID != "" {
		params.Customer = stripe.String(req.CustomerID)
	}

	if req.IdempotencyKey != "" {
		params.SetIdempotencyKey(req.IdempotencyKey)
	}

	for k, v := range req.Metadata {
		params.AddMetadata(k, v)
	}

	ch, err := charge.New(params)
	if err != nil {
		return nil, mapStripeError(err)
	}

	return mapCharge(ch), nil
}

func (p *Provider) GetCharge(ctx context.Context, chargeID string) (*payments.Charge, error) {
	ch, err := charge.Get(chargeID, nil)
	if err != nil {
		return nil, mapStripeError(err)
	}
	return mapCharge(ch), nil
}

// ============ Refunds ============

func (p *Provider) CreateRefund(ctx context.Context, req payments.RefundRequest) (*payments.Refund, error) {
	params := &stripe.RefundParams{
		Charge: stripe.String(req.ChargeID),
	}

	if req.Amount > 0 {
		params.Amount = stripe.Int64(req.Amount)
	}

	if req.Reason != "" {
		params.Reason = stripe.String(req.Reason)
	}

	if req.IdempotencyKey != "" {
		params.SetIdempotencyKey(req.IdempotencyKey)
	}

	r, err := refund.New(params)
	if err != nil {
		return nil, mapStripeError(err)
	}

	return mapRefund(r), nil
}

func (p *Provider) GetRefund(ctx context.Context, refundID string) (*payments.Refund, error) {
	r, err := refund.Get(refundID, nil)
	if err != nil {
		return nil, mapStripeError(err)
	}
	return mapRefund(r), nil
}

// ============ Customers ============

func (p *Provider) CreateCustomer(ctx context.Context, req payments.CreateCustomerRequest) (*payments.Customer, error) {
	params := &stripe.CustomerParams{
		Email: stripe.String(req.Email),
		Name:  stripe.String(req.Name),
		Phone: stripe.String(req.Phone),
	}

	for k, v := range req.Metadata {
		params.AddMetadata(k, v)
	}

	c, err := customer.New(params)
	if err != nil {
		return nil, mapStripeError(err)
	}

	return mapCustomer(c), nil
}

func (p *Provider) GetCustomer(ctx context.Context, customerID string) (*payments.Customer, error) {
	c, err := customer.Get(customerID, nil)
	if err != nil {
		return nil, mapStripeError(err)
	}
	return mapCustomer(c), nil
}

func (p *Provider) UpdateCustomer(ctx context.Context, customerID string, req payments.UpdateCustomerRequest) (*payments.Customer, error) {
	params := &stripe.CustomerParams{}

	if req.Email != nil {
		params.Email = req.Email
	}
	if req.Name != nil {
		params.Name = req.Name
	}
	if req.Phone != nil {
		params.Phone = req.Phone
	}
	for k, v := range req.Metadata {
		params.AddMetadata(k, v)
	}

	c, err := customer.Update(customerID, params)
	if err != nil {
		return nil, mapStripeError(err)
	}

	return mapCustomer(c), nil
}

func (p *Provider) DeleteCustomer(ctx context.Context, customerID string) error {
	_, err := customer.Del(customerID, nil)
	return mapStripeError(err)
}

// ============ Payment Methods ============

func (p *Provider) AttachPaymentMethod(ctx context.Context, customerID, paymentMethodID string) error {
	_, err := paymentmethod.Attach(paymentMethodID, &stripe.PaymentMethodAttachParams{
		Customer: stripe.String(customerID),
	})
	return mapStripeError(err)
}

func (p *Provider) DetachPaymentMethod(ctx context.Context, paymentMethodID string) error {
	_, err := paymentmethod.Detach(paymentMethodID, nil)
	return mapStripeError(err)
}

func (p *Provider) ListPaymentMethods(ctx context.Context, customerID string) ([]*payments.PaymentMethod, error) {
	params := &stripe.PaymentMethodListParams{
		Customer: stripe.String(customerID),
		Type:     stripe.String("card"),
	}

	iter := paymentmethod.List(params)
	var methods []*payments.PaymentMethod

	for iter.Next() {
		methods = append(methods, mapPaymentMethod(iter.PaymentMethod()))
	}

	if err := iter.Err(); err != nil {
		return nil, mapStripeError(err)
	}

	return methods, nil
}

// ============ Subscriptions ============

func (p *Provider) CreateSubscription(ctx context.Context, req payments.CreateSubscriptionRequest) (*payments.Subscription, error) {
	params := &stripe.SubscriptionParams{
		Customer: stripe.String(req.CustomerID),
		Items: []*stripe.SubscriptionItemsParams{
			{Price: stripe.String(req.PriceID)},
		},
	}

	if req.PaymentMethodID != "" {
		params.DefaultPaymentMethod = stripe.String(req.PaymentMethodID)
	}

	if req.TrialDays > 0 {
		params.TrialPeriodDays = stripe.Int64(int64(req.TrialDays))
	}

	if req.IdempotencyKey != "" {
		params.SetIdempotencyKey(req.IdempotencyKey)
	}

	for k, v := range req.Metadata {
		params.AddMetadata(k, v)
	}

	sub, err := subscription.New(params)
	if err != nil {
		return nil, mapStripeError(err)
	}

	return mapSubscription(sub), nil
}

func (p *Provider) GetSubscription(ctx context.Context, subscriptionID string) (*payments.Subscription, error) {
	sub, err := subscription.Get(subscriptionID, nil)
	if err != nil {
		return nil, mapStripeError(err)
	}
	return mapSubscription(sub), nil
}

func (p *Provider) UpdateSubscription(ctx context.Context, subscriptionID string, req payments.UpdateSubscriptionRequest) (*payments.Subscription, error) {
	params := &stripe.SubscriptionParams{}

	if req.PaymentMethodID != nil {
		params.DefaultPaymentMethod = req.PaymentMethodID
	}

	if req.CancelAtPeriodEnd != nil {
		params.CancelAtPeriodEnd = req.CancelAtPeriodEnd
	}

	for k, v := range req.Metadata {
		params.AddMetadata(k, v)
	}

	// Plan change requires updating subscription items
	if req.PriceID != nil {
		sub, _ := subscription.Get(subscriptionID, nil)
		if sub != nil && len(sub.Items.Data) > 0 {
			params.Items = []*stripe.SubscriptionItemsParams{
				{
					ID:    stripe.String(sub.Items.Data[0].ID),
					Price: req.PriceID,
				},
			}
		}
	}

	sub, err := subscription.Update(subscriptionID, params)
	if err != nil {
		return nil, mapStripeError(err)
	}

	return mapSubscription(sub), nil
}

func (p *Provider) CancelSubscription(ctx context.Context, subscriptionID string, req payments.CancelSubscriptionRequest) (*payments.Subscription, error) {
	if req.CancelAtPeriodEnd {
		// Cancel at period end
		sub, err := subscription.Update(subscriptionID, &stripe.SubscriptionParams{
			CancelAtPeriodEnd: stripe.Bool(true),
		})
		if err != nil {
			return nil, mapStripeError(err)
		}
		return mapSubscription(sub), nil
	}

	// Immediate cancellation
	sub, err := subscription.Cancel(subscriptionID, nil)
	if err != nil {
		return nil, mapStripeError(err)
	}

	return mapSubscription(sub), nil
}

func (p *Provider) ListSubscriptions(ctx context.Context, customerID string) ([]*payments.Subscription, error) {
	params := &stripe.SubscriptionListParams{
		Customer: customerID,
	}

	iter := subscription.List(params)
	var subs []*payments.Subscription

	for iter.Next() {
		subs = append(subs, mapSubscription(iter.Subscription()))
	}

	if err := iter.Err(); err != nil {
		return nil, mapStripeError(err)
	}

	return subs, nil
}

// ============ Webhooks ============

func (p *Provider) ParseWebhook(payload []byte, signature string) (*payments.WebhookEvent, error) {
	event, err := webhook.ConstructEvent(payload, signature, p.webhookSecret)
	if err != nil {
		return nil, payments.NewPaymentError(
			payments.ErrInvalidWebhook,
			"Invalid webhook signature",
			"stripe",
		)
	}

	return &payments.WebhookEvent{
		ID:        event.ID,
		Type:      mapEventType(event.Type),
		Provider:  "stripe",
		Data:      event.Data.Object,
		CreatedAt: time.Unix(event.Created, 0),
	}, nil
}

// ============ Mappers ============

func mapCharge(ch *stripe.Charge) *payments.Charge {
	return &payments.Charge{
		ID:             ch.ID,
		ProviderID:     ch.ID,
		Provider:       "stripe",
		Amount:         ch.Amount,
		AmountRefunded: ch.AmountRefunded,
		Currency:       string(ch.Currency),
		Status:         mapChargeStatus(ch.Status),
		CustomerID:     ch.Customer.ID,
		Description:    ch.Description,
		FailureCode:    string(ch.FailureCode),
		FailureReason:  ch.FailureMessage,
		Metadata:       ch.Metadata,
		CreatedAt:      time.Unix(ch.Created, 0),
	}
}

func mapChargeStatus(status string) payments.ChargeStatus {
	switch status {
	case "succeeded":
		return payments.ChargeStatusSucceeded
	case "pending":
		return payments.ChargeStatusPending
	case "failed":
		return payments.ChargeStatusFailed
	default:
		return payments.ChargeStatus(status)
	}
}

func mapRefund(r *stripe.Refund) *payments.Refund {
	return &payments.Refund{
		ID:         r.ID,
		ProviderID: r.ID,
		Provider:   "stripe",
		ChargeID:   r.Charge.ID,
		Amount:     r.Amount,
		Currency:   string(r.Currency),
		Status:     mapRefundStatus(r.Status),
		Reason:     string(r.Reason),
		CreatedAt:  time.Unix(r.Created, 0),
	}
}

func mapRefundStatus(status stripe.RefundStatus) payments.RefundStatus {
	switch status {
	case stripe.RefundStatusSucceeded:
		return payments.RefundStatusSucceeded
	case stripe.RefundStatusPending:
		return payments.RefundStatusPending
	case stripe.RefundStatusFailed:
		return payments.RefundStatusFailed
	default:
		return payments.RefundStatus(status)
	}
}

func mapCustomer(c *stripe.Customer) *payments.Customer {
	return &payments.Customer{
		ID:         c.ID,
		ProviderID: c.ID,
		Provider:   "stripe",
		Email:      c.Email,
		Name:       c.Name,
		Phone:      c.Phone,
		Metadata:   c.Metadata,
		CreatedAt:  time.Unix(c.Created, 0),
	}
}

func mapPaymentMethod(pm *stripe.PaymentMethod) *payments.PaymentMethod {
	method := &payments.PaymentMethod{
		ID:         pm.ID,
		ProviderID: pm.ID,
		Provider:   "stripe",
		Type:       payments.PaymentMethodType(pm.Type),
		CreatedAt:  time.Unix(pm.Created, 0),
	}

	if pm.Card != nil {
		method.Card = &payments.CardDetails{
			Brand:    string(pm.Card.Brand),
			Last4:    pm.Card.Last4,
			ExpMonth: int(pm.Card.ExpMonth),
			ExpYear:  int(pm.Card.ExpYear),
		}
	}

	return method
}

func mapSubscription(sub *stripe.Subscription) *payments.Subscription {
	s := &payments.Subscription{
		ID:                 sub.ID,
		ProviderID:         sub.ID,
		Provider:           "stripe",
		CustomerID:         sub.Customer.ID,
		Status:             mapSubscriptionStatus(sub.Status),
		CurrentPeriodStart: time.Unix(sub.CurrentPeriodStart, 0),
		CurrentPeriodEnd:   time.Unix(sub.CurrentPeriodEnd, 0),
		CancelAtPeriodEnd:  sub.CancelAtPeriodEnd,
		Metadata:           sub.Metadata,
		CreatedAt:          time.Unix(sub.Created, 0),
	}

	if len(sub.Items.Data) > 0 {
		s.PriceID = sub.Items.Data[0].Price.ID
	}

	if sub.CanceledAt > 0 {
		t := time.Unix(sub.CanceledAt, 0)
		s.CanceledAt = &t
	}

	if sub.TrialStart > 0 {
		t := time.Unix(sub.TrialStart, 0)
		s.TrialStart = &t
	}

	if sub.TrialEnd > 0 {
		t := time.Unix(sub.TrialEnd, 0)
		s.TrialEnd = &t
	}

	return s
}

func mapSubscriptionStatus(status stripe.SubscriptionStatus) payments.SubscriptionStatus {
	switch status {
	case stripe.SubscriptionStatusTrialing:
		return payments.SubscriptionStatusTrialing
	case stripe.SubscriptionStatusActive:
		return payments.SubscriptionStatusActive
	case stripe.SubscriptionStatusPastDue:
		return payments.SubscriptionStatusPastDue
	case stripe.SubscriptionStatusCanceled:
		return payments.SubscriptionStatusCanceled
	case stripe.SubscriptionStatusUnpaid:
		return payments.SubscriptionStatusUnpaid
	case stripe.SubscriptionStatusIncomplete:
		return payments.SubscriptionStatusIncomplete
	default:
		return payments.SubscriptionStatus(status)
	}
}

func mapEventType(t string) payments.WebhookEventType {
	switch t {
	case "charge.succeeded":
		return payments.WebhookEventChargeSucceeded
	case "charge.failed":
		return payments.WebhookEventChargeFailed
	case "charge.refunded":
		return payments.WebhookEventChargeRefunded
	case "customer.subscription.created":
		return payments.WebhookEventSubscriptionCreated
	case "customer.subscription.updated":
		return payments.WebhookEventSubscriptionUpdated
	case "customer.subscription.deleted":
		return payments.WebhookEventSubscriptionCanceled
	case "customer.subscription.trial_will_end":
		return payments.WebhookEventSubscriptionTrialEnd
	case "invoice.paid":
		return payments.WebhookEventInvoicePaid
	case "invoice.payment_failed":
		return payments.WebhookEventInvoicePaymentFailed
	default:
		return payments.WebhookEventType(t)
	}
}

func mapStripeError(err error) error {
	if err == nil {
		return nil
	}

	stripeErr, ok := err.(*stripe.Error)
	if !ok {
		return payments.NewPaymentError(payments.ErrUnknown, err.Error(), "stripe")
	}

	var code payments.ErrorCode
	switch stripeErr.Code {
	case stripe.ErrorCodeCardDeclined:
		code = payments.ErrCardDeclined
	case stripe.ErrorCodeExpiredCard:
		code = payments.ErrCardExpired
	case stripe.ErrorCodeInvalidNumber:
		code = payments.ErrCardInvalid
	case stripe.ErrorCodeRateLimitExceeded:
		code = payments.ErrRateLimited
	default:
		code = payments.ErrUnknown
	}

	paymentErr := payments.NewPaymentError(code, stripeErr.Msg, "stripe")
	paymentErr.ProviderCode = string(stripeErr.Code)
	return paymentErr
}
