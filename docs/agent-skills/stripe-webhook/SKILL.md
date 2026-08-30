---
name: stripe-webhook
description: Stripe webhook handler — retries, idempotency, checkout.session.expired, status codes.
---

# Stripe webhook

## Purpose
Entitlements + CheckoutAttempt reconciliation. Fail-closed on DB; never invent secrets.

## Code
- Handler: `apps/web/app/api/webhooks/stripe/route.ts`
- CheckoutAttempt: `apps/web/lib/billing/checkout-attempt.ts`
- Session create stamps: `apps/web/lib/stripe.ts` metadata `checkoutAttemptId`
- Tests: `apps/web/__tests__/stripe-webhook-route.test.ts`

## Events (handler already implements)
- `checkout.session.completed` / `checkout.session.expired`
- `customer.subscription.created|updated|deleted`
- `invoice.payment_succeeded|failed|payment_action_required`

## Status codes (Dashboard Recent Deliveries)
| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK / idempotent replay | none |
| 400 | bad signature | match `STRIPE_WEBHOOK_SECRET` to endpoint `we_…` |
| 503/500 | DB fail-closed | Stripe retries; fix DB if sustained |

## Do-not-dos
- Do not remove retries or webhookEvent.stripeEventId idempotency
- Do not ack 200 when durable write failed
- Do not add Dashboard events in code — operator adds missing subscriptions
