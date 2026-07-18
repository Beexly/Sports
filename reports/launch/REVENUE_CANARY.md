# Galaxy Sports Edge — Revenue Canary (LC-004)

**Generated:** 2026-07-18 23:50 UTC
**Boundary:** this session has zero Stripe credentials (`env | grep -i stripe` returns nothing) —
no live or test-mode Stripe API call was made. Everything below is either a static code-level
verification (provable without credentials) or an honest `NOT_TESTED` gap.

## What this pass did

1. A bounded, read-only code map of the entire Stripe billing implementation (checkout,
   webhook, entitlement sync, customer dedup, portal/cancellation, Terms consent, grandfathered
   pricing, refund/chargeback, rate limiting).
2. Found one real, live gap: **the webhook had zero handling for `charge.refunded` or
   `charge.dispute.created`** — a refunded or disputed customer would retain premium access
   indefinitely, with nothing to stop future billing either.
3. Fixed it, then had it independently red-teamed (billing + entitlements are protected zones).
   The first version of the fix had a real race — it cancelled "whatever subscription is on the
   customer's row right now" instead of verifying the refunded/disputed charge actually belongs
   to that subscription, which in a refund-of-an-old-subscription-after-resubscribing race could
   wrongly cancel a brand-new, legitimately paying subscription. Fixed and regression-tested.
   A follow-up gse-verifier pass independently confirmed the fix and re-ran the full suite.

## Static code review: 9-item inventory

| # | Item | Status | File:Line |
|---|---|---|---|
| 1 | Checkout session creation (env-var price-ID contract) | ✅ Implemented | `apps/web/lib/stripe.ts:107-159` |
| 2 | Webhook signature verification + idempotency | ✅ Implemented | `apps/web/app/api/webhooks/stripe/route.ts:20-68` |
| 3 | Entitlement grant/revoke (dual-path: webhook + reconcile backstop) | ✅ Implemented | `route.ts:99-128`, `apps/web/lib/billing/reconcile-entitlements.ts:480-600` |
| 4 | Customer/subscription dedup (idempotency key) | ✅ Implemented | `apps/web/lib/stripe.ts:56-102` |
| 5 | Portal + cancellation | ✅ Implemented | `apps/web/app/api/subscriptions/portal/route.ts`, `stripe.ts:164-172` |
| 6 | Terms/consent (point-of-sale, opt-in) | ✅ Implemented, matches CLAUDE.md's documented gate | `stripe.ts:146-156` |
| 7 | Grandfathered/founding pricing (historical price-id recognition) | ✅ Implemented | `apps/web/lib/billing/price-ids.ts:1-85` |
| 8 | Refund/chargeback → entitlement revocation | ❌ **Missing → fixed this pass** | `route.ts:186-291` (new) |
| 9 | Rate limiting (checkout/portal, in-memory) | ✅ Implemented (single-instance caveat, documented in code) | `apps/web/lib/api/rate-limit.ts:33-55` |

Full original scout inventory (evidence + exact reasoning for each item) is preserved in this
session's transcript; the table above is the durable summary.

## Item 8 in detail: the fix that landed this pass

`apps/web/app/api/webhooks/stripe/route.ts`:

- **`charge.refunded`**: only acts on a FULL refund (`charge.refunded === true` — verified
  against the `stripe` npm package's own type definitions: a partial refund can never set this
  true). Deliberately does **not** decide the platform's refund *policy* (unconditional vs.
  discretionary is LB-003, a separate still-open founder decision) — it only reacts to a refund
  that Stripe reports already happened, so the platform doesn't keep billing/serving a customer
  whose money was already returned.
- **`charge.dispute.created`**: re-retrieves the charge fresh (same "never trust an embedded
  snapshot" discipline the file already uses for subscription events) to resolve its customer.
- Both resolve the charge's **actual subscription** via `charge.invoice → stripe.invoices.retrieve()
  → invoice.subscription`, and only cancel when that matches what's currently on the customer's
  DB row — closing the resubscribe race the red-team found. A mismatch logs and no-ops rather
  than guessing.
- Deliberately does **not** write to the DB directly. `stripe.subscriptions.cancel()` fires the
  pre-existing `customer.subscription.deleted` event, which the already-tested handler (plus the
  `reconcileEntitlements()` scheduled backstop) converges to FREE/CANCELED — one entitlement-write
  path, not two.
- Fails closed: no try/catch swallows an error: any failure propagates to the outer handler's
  existing 500 response, so Stripe retries and the event is never marked processed on a failure.

**Verification:** 56/56 tests in `apps/web/__tests__/stripe-webhook-route.test.ts` (16 new,
including a direct regression test for the resubscribe race: refunded charge belongs to
`sub_OLD`, customer's row now has `sub_NEW` → asserts `stripe.subscriptions.cancel` is never
called). Full `apps/web` suite: 8266/8267 pass (the one failure is the same pre-existing,
already-tracked, unrelated `commercial-copy-scan` guardrail issue — see LB-001). Typecheck,
lint, `git diff --check`, and the full guardrail suite all clean.

## What's honestly NOT_TESTED

Nothing above proves the lifecycle actually WORKS against a live Stripe account — only that the
code is structurally correct and internally consistent. This session cannot run:

- checkout → real Checkout Session creation and completion
- webhook delivery from a real Stripe test-mode account (signature verification against a real
  signing secret, not a mocked one)
- customer portal round-trip
- an actual refund/dispute firing through Stripe's real event pipeline
- price ID / tier mapping against real Stripe Dashboard-configured test prices
- Terms consent collection against a real Dashboard Terms URL

## Owner action: the live test-mode canary

See `OWNER_ACTION_PACKET.md` in this directory for the exact, minimal steps to run the real
end-to-end Stripe test-mode lifecycle this session could not perform. Nothing in this pass
requires action before that packet is run — the code is ready to be exercised, not activated.
