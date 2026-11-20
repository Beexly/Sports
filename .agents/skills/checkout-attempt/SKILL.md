---
name: checkout-attempt
description: Durable CheckoutAttempt + Stripe Idempotency-Key + repair cron lifecycle.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(npx vitest*), Bash(node scripts/*)
---

# CheckoutAttempt

## Purpose
Guarantee durable commercial intent before Stripe session creation (`apps/web/lib/billing/checkout-attempt.ts`).

## Code Touchpoints
- State machine & idempotency: `apps/web/lib/billing/checkout-attempt.ts`
- Stripe stamp: `apps/web/lib/stripe.ts` (session + subscription metadata `checkoutAttemptId`)
- Repair cron: `apps/web/app/api/cron/repair-checkout-attempts/route.ts` (scheduled in `apps/web/vercel.json`)
- Webhook reconciliation: `apps/web/app/api/webhooks/stripe/route.ts` (`completed` + `expired`)
- Live-mode guard test: `apps/web/__tests__/checkout-live-mode-guard.test.ts`

## Failure Modes & Guardrails
- Unknown `checkoutAttemptId` on webhook: log warning, still sync subscription (do not 500).
- `AMBIGUOUS` / `REQUEST_IN_FLIGHT`: reconciled asynchronously by repair cron.
- Never remove `Idempotency-Key`, never overwrite `COMPLETED` with `EXPIRED`, never invoke Prisma from client components.

## Verification & Done
```powershell
npx vitest run --minWorkers=1 --maxWorkers=2 apps/web/__tests__/checkout-live-mode-guard.test.ts apps/web/__tests__/stripe-webhook-route.test.ts
```
Done when both test suites exit `0` and `npm run typecheck` passes cleanly.
