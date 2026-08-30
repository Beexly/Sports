---
name: checkout-attempt
description: Durable CheckoutAttempt + Stripe Idempotency-Key; repair cron exists.
---

# CheckoutAttempt

## Purpose
Exactly-once commercial intent for subscription checkout. Durable before Stripe session.

## Code
- Core: `apps/web/lib/billing/checkout-attempt.ts`
- Stripe stamp: `apps/web/lib/stripe.ts` — session + subscription metadata `checkoutAttemptId`
- Repair cron: `/api/cron/repair-checkout-attempts` (scheduled in vercel.json)
- Webhook reconcile: completed + expired handlers

## Failure modes
- Unknown attempt on webhook → warn, not 500 (subscription sync still runs)
- AMBIGUOUS / REQUEST_IN_FLIGHT → repair job backstop
- Live-mode guard tests: `checkout-live-mode-guard.test.ts`

## Do-not-dos
- Do not remove Idempotency-Key flow
- Do not regress EXPIRED over COMPLETED
- Do not client-Prisma checkout (server route only)
