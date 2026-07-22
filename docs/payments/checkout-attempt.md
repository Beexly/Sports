# Durable CheckoutAttempt — checkout idempotency contract

Status: IMPLEMENTED_ON_DRAFT_BRANCH (`payments/durable-checkout-attempt`, PR #160). NOT_MERGED.

The server-side source of truth for checkout idempotency. Component lifetime is
never the source of truth: reloads, other devices, double-clicks, and
unknown-network-outcome retries all converge on one DB row per (user, intent)
generation.

## State machine

```
CREATED ──claim──▶ REQUEST_IN_FLIGHT ──success──▶ SESSION_CREATED ──webhook──▶ COMPLETED
   ▲                     │                             │
   │  RETRIABLE_NO_      │ AMBIGUOUS_NETWORK_OUTCOME   │ checkout.session.expired
   └──REQUEST_SENT───────┼──────▶ AMBIGUOUS            ▼
                         │            │             EXPIRED (key released)
                         │            └─repair─▶ COMPLETED / SESSION_CREATED /
                         │                       EXPIRED / FAILED(proven absent)
                         └─ DEFINITIVE_REJECTION or CONFIGURATION_FAILURE
                                      ▼
                              FAILED (key released)
CANCELED: operator-cancelled generation (terminal, key released).
```

Invariants (DB-enforced by CHECK constraints in
`packages/db/prisma/migrations/20260722130000_add_checkout_attempt`):

- `originalClientIntentId` is immutable — written once, never cleared.
- `activeClientIntentId` is either equal to the original intent or NULL
  (released). The compound unique `(userId, activeClientIntentId)` arbitrates
  the create-or-retrieve race.
- Terminal FAILED/EXPIRED/CANCELED rows have released their active key;
  COMPLETED keeps it so the same intent 409s forever.
- COMPLETED requires `completedAt`.

## Hard preconditions (directive 5.2)

- `requireDurableWriteStore("stripe-checkout")` (from `@sports/db`) runs BEFORE
  any Stripe customer/session creation. Stub Prisma client or unknown DB
  durability → typed 503, zero Stripe side effects, ops incident line.
- The subscription lookup fails CLOSED: lookup error → 503, no Stripe call;
  live subscription → 409/portal; success + none → continue.
- Defense in depth: a create that does not echo the written row (stub no-op)
  throws `CheckoutAttemptPersistenceError` → 503.
- The webhook route asserts `requireDurableWriteStore("stripe-webhook-entitlement")`
  after signature verification and before any entitlement write: a non-durable
  store is a 503, so Stripe's delivery retry (not a silent ack) is the durable
  path.

## Outcome classification (directive 5.3)

`apps/web/lib/billing/stripe-outcome.ts` maps Stripe SDK error types to
`DEFINITIVE_REJECTION | AMBIGUOUS_NETWORK_OUTCOME | RETRIABLE_NO_REQUEST_SENT |
CONFIGURATION_FAILURE`. Only provable outcomes release the idempotency key.
Ambiguous outcomes keep the SAME attempt + SAME persisted
`stripeIdempotencyKey`; a fresh attempt is only minted after reconciliation
proves the original absent or expired.

## Fingerprint (directive 5.5)

`computeRequestFingerprint` hashes the canonical-JSON
(`apps/web/lib/billing/canonical-json.ts`) of the FULL commercial request:
user, tier, interval, price id, currency, quantity, trial terms, promotion
policy, tax behavior, commercial-terms version, consent requirement, origin
class, metadata version. Same intent + changed fingerprint → 409
`checkout_intent_conflict`. If `createCheckoutSession` gains a commercial knob,
add it to `currentCheckoutCommercialParams` in the same change.

## Reconciliation (directive 5.6)

- Webhook: `checkout.session.completed` marks COMPLETED (and repairs the
  session bind); `checkout.session.expired` marks EXPIRED + releases the key.
  Both never 500 the webhook — the repair job is the durable backstop.
- Repair job: `repairUnresolvedCheckoutAttempts`
  (`apps/web/lib/billing/checkout-attempt-repair.ts`) queries Stripe by the
  attempt id stamped into session metadata and converges stale
  REQUEST_IN_FLIGHT / AMBIGUOUS / drifted SESSION_CREATED rows. Entry point:
  `runCheckoutAttemptRepair()` in `apps/web/lib/stripe.ts` — callable
  server-side; cron wiring deliberately DORMANT.

## Retention (directive 5.7)

`checkout_attempts.userId` is a nullable FK with `ON DELETE SET NULL`;
`subjectUserId`/`subjectEmail` are immutable snapshots. Deleting a user never
deletes the financial audit record.

## Rollback

The migration is purely additive. Rollback order (nothing else references
these objects): drop table `checkout_attempts`, then types
`CheckoutOutcomeClass`, `CheckoutAttemptStatus`. Application code degrades to
the durable-write guard's 503 if the table is missing in production (the
attempt create fails before any Stripe call).

## Test evidence

- Unit/state machine: `apps/web/__tests__/checkout-attempt.test.ts`,
  `stripe-outcome.test.ts`, `canonical-json.test.ts`,
  `checkout-attempt-repair.test.ts`, `durable-write-store.test.ts`.
- Route/webhook behavior: `subscriptions-checkout-route.test.ts`,
  `stripe-webhook-route.test.ts`, `stripe-checkout-consent.test.ts`.
- Real Postgres (disposable, migration applied):
  `checkout-attempt-db.integration.test.ts` — gated by
  `CHECKOUT_ATTEMPT_DB_TEST_URL`; includes the 100-concurrent-one-attempt
  proof, CHECK-constraint enforcement, and SET NULL retention.
- Live-mode keys never in tests: `checkout-live-mode-guard.test.ts` plus the
  repo-wide `guard:secrets` scan.
