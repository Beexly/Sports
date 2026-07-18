# Owner Action Packet — Stripe Test-Mode Revenue Canary (LC-004)

**Why founder authority is required:** this session has no Stripe credentials of any kind. Every
step below requires either a Stripe test-mode API key, dashboard access, or a real (test-mode)
payment method — none of which an autonomous agent session can or should hold. This packet is
the exact, minimal, reversible sequence to prove the revenue lifecycle end-to-end; nothing here
mutates anything live.

## Prerequisites (test mode only — never live)

1. A Stripe account in **test mode** (toggle in the Dashboard, top-right).
2. Test-mode versions of: `STRIPE_SECRET_KEY` (starts `sk_test_`), `STRIPE_WEBHOOK_SECRET`
   (from a test-mode webhook endpoint or the Stripe CLI's `stripe listen`), and test-mode price
   IDs for each tier × interval (`STRIPE_PRO_MONTHLY_PRICE_ID`, etc. — see CLAUDE.md's env table).
3. A deployed preview environment (e.g. a Vercel preview URL) or a local `next dev` instance with
   those test-mode env vars set — **never** the production environment.

## Exact steps

1. **Checkout.** Visit `/pricing` on the test environment, select a tier, complete Checkout using
   Stripe's documented test card (`4242 4242 4242 4242`, any future expiry, any CVC).
   **Expect:** redirect to the success URL; `checkout.session.completed` webhook fires.
2. **Entitlement grant.** Confirm the account immediately shows the paid tier's features (no
   manual refresh required). **Expect:** `db.subscription` row shows the correct `tier`/`status`.
3. **Customer reuse.** Log out, log back in, attempt checkout again from the same account.
   **Expect:** the SAME Stripe customer id is reused (`getOrCreateStripeCustomer`'s idempotency
   key), not a duplicate.
4. **Webhook delivery.** In the Stripe Dashboard (test mode) → Developers → Webhooks → your
   endpoint → confirm recent deliveries show `200` responses with no retries queued.
5. **Portal.** From the account/billing page, open the Stripe customer portal. **Expect:** plan,
   payment method, and invoice history are visible and correct.
6. **Cancellation.** Cancel via the portal. **Expect:** `customer.subscription.deleted` fires;
   account downgrades to FREE; `canceledAt` is stamped.
7. **Refund (this pass's fix).** Issue a full refund on the completed charge from the Stripe
   Dashboard (test mode → Payments → the charge → Refund → full amount). **Expect:**
   `charge.refunded` fires; if the account had re-subscribed since, verify it does **NOT** get
   cancelled (only a still-matching subscription should be affected) — this is exactly the race
   this session's fix closes; a live test-mode run is the strongest possible confirmation of it.
8. **Dispute (optional, requires Stripe's test dispute simulation).** Trigger a test dispute per
   Stripe's test-mode dispute documentation. **Expect:** `charge.dispute.created` fires; the
   matching subscription is cancelled.
9. **Reconciliation backstop.** Manually cancel a subscription directly in the Stripe Dashboard
   (bypassing the webhook path entirely) and confirm `reconcileEntitlements()`'s next scheduled
   run converges the DB to match, even without a webhook ever firing.
10. **Grandfathered pricing (if a phase advance has happened).** Confirm a subscriber created
    under an older price id still renews at their original price and is still recognized by the
    webhook (`tierForPriceId` in `apps/web/lib/billing/price-ids.ts`).

## Verification

Each step's "Expect" line is the pass condition. Any deviation is a real finding — file it the
same way this session filed LB-008, with exact evidence, not a guess.

## Rollback

Nothing here is destructive. Test-mode Stripe objects (customers, subscriptions, charges) can be
deleted freely from the Dashboard's test-mode data with zero effect on production. No code
changes are required to run this packet — it exercises what's already shipped.

## Re-entry condition

None — this can be run at any time a test-mode Stripe environment is available. It is not
blocked on any other Launch Convergence item.
