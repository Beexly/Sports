---
name: stripe-webhook
description: Fail-closed Stripe webhook handler with stripeEventId idempotency and CheckoutAttempt reconciliation.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(npx vitest*), Bash(node scripts/*)
---

# Stripe webhook

## Code Touchpoints
- Handler: `apps/web/app/api/webhooks/stripe/route.ts`
- CheckoutAttempt: `apps/web/lib/billing/checkout-attempt.ts`
- Metadata stamp: `apps/web/lib/stripe.ts` (`checkoutAttemptId`)
- Tests: `apps/web/__tests__/stripe-webhook-route.test.ts`

## Supported Events & Status Codes
- Events: `checkout.session.completed`, `checkout.session.expired`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{succeeded,failed,payment_action_required}`.
- `200`: processed or idempotent duplicate replay (`webhookEvent.stripeEventId`).
- `400`: invalid signature (verify `STRIPE_WEBHOOK_SECRET` matches `we_...`).
- `500`/`503`: fail-closed DB error (forces Stripe retry; never return `200` if durable write failed).

## Guardrails & Completion Criteria
- Never drop `stripeEventId` idempotency, retries, or fail-closed DB errors.
- Verification: `npx vitest run --minWorkers=1 --maxWorkers=2 apps/web/__tests__/stripe-webhook-route.test.ts` and `npm run agent:eval` exit `0`.
