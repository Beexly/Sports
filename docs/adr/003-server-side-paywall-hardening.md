# ADR 003 — Server-Side Paywall Hardening: Board Confidence Redaction + PAST_DUE Grace Window

**Date:** 2026-06-11
**Status:** Accepted
**Author:** Autonomous loop (post-launch stabilization)

## Context

A post-launch enforcement audit of every premium surface found that 8 of
9 surfaces correctly gated premium data through `getUserEntitlements()`,
but `/api/board/state` returned the numeric `confidence` for every board
row to **unauthenticated** callers. The board page itself never renders
the number, so the leak was invisible in the UI — but the JSON API
exposed the platform's primary paid metric to anyone with `curl`,
violating non-negotiable rule #3: *no frontend-only paywalls —
enforcement is server-side only*.

The same audit found the billing pipeline structurally sound (signature
verification, idempotent webhook processing, all core lifecycle events)
but with two gaps:

1. **Zero test coverage** on the Stripe webhook, checkout, and
   entitlement-lookup paths — the code that decides who pays and who
   has access.
2. **Instant access cutoff on a single failed payment.** One
   `invoice.payment_failed` set the subscription to `PAST_DUE`, and
   `getUserEntitlements()` only honored `ACTIVE`/`TRIALING` — so a
   member with an expired card lost all premium access immediately,
   even while Stripe's dunning flow was still retrying the charge.

## Decision

### 1. Redact board confidence server-side

`redactBoardConfidence()` in `apps/web/lib/board/state.ts` nulls the
`confidence` field across all three board lanes. The route
(`/api/board/state`) resolves the session, checks
`entitlements.canSeeConfidence`, and serves the redacted payload to
anonymous and FREE viewers. Edge Index stays public by design
(`canSeeEdgeScore` is true for every tier). The redaction lives next to
the loader — not in the route — so any future consumer of board state
has the same single source of truth.

### 2. Bounded PAST_DUE grace window (7 days)

A new nullable `subscriptions.pastDueSince` column anchors the grace
window:

- Stamped **once** on the first `invoice.payment_failed` (the update is
  filtered on `pastDueSince: null`, so Stripe's retries cannot slide
  the window).
- Backfilled by `syncSubscription` if a subscription arrives already
  `past_due` without an anchor.
- Cleared on recovery (any sync where the status is no longer
  `PAST_DUE`).

`getUserEntitlements()` now honors `PAST_DUE` subscriptions whose
`pastDueSince` is within `PAST_DUE_GRACE_DAYS` (7). Outside the window
— or if the anchor is missing — access fails closed to FREE. The
operator chose 7 days to match Stripe's recommended dunning flow.

### 3. Behavioral test floor for billing

Three new suites pin the revenue paths:

- `stripe-webhook-route.test.ts` — signature verification, idempotency
  (including *no event record on handler failure*, so Stripe retries),
  every handled event, price→tier and status mappings, the
  userId-metadata upsert path, the legacy fallback, and the grace
  anchor lifecycle.
- `subscriptions-checkout-route.test.ts` — auth gate, tier/interval
  validation, unconfigured-price 503, session payload.
- `entitlements-enforcement.test.ts` — the production DB path, the
  grace-window query shape, the fail-closed `P1001` fallback, and
  `requireEntitlement` throwing `EntitlementError`.
- `board-state-confidence-gate.test.ts` — anonymous/FREE redaction,
  PRO passthrough, non-mutation of the loader payload.

## Consequences

- Confidence numbers can no longer be scraped from the public board
  API; the paywall around the platform's core paid metric is enforced
  at the only place it can be — the server.
- A member whose card expires keeps access for 7 days while Stripe
  retries, then loses it deterministically. No schema-less heuristics
  (`updatedAt`) decide revenue access.
- Any regression in webhook handling, tier mapping, or entitlement
  logic now fails CI instead of silently corrupting subscription state.
- Migration `20260611160000_add_subscription_past_due_since` must run
  before deploy (`ALTER TABLE "subscriptions" ADD COLUMN "pastDueSince"
  TIMESTAMP(3)` — additive, no backfill needed; existing PAST_DUE rows
  without an anchor fail closed, which is the strict-but-safe default).
