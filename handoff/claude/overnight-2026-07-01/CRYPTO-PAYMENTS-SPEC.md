# Crypto Subscription Payments — Build Spec (owner-approved 2026-07-02)

**Owner decision:** crypto is allowed as a PAYMENT METHOD for subscriptions.
**Scope line (unchanged doctrine):** payments yes; NFT/reward tokens, swap
infrastructure, arb agents, and anything gambling-mechanic-shaped stay out.
Selling a subscription for crypto is commerce; minting tradable tokens is a
different product with different regulators.

## Product shape (crypto ≠ Stripe, and the design must respect that)

Crypto has no card-style auto-renewal. The honest offering is a
**fixed-term pass**: pay once in crypto → Pro or Elite until `period end`,
no auto-renew, renewal reminder email near expiry. Annual (and maybe
6-month) only — monthly manual renewal is churn theater.

## Processor: Coinbase Commerce first

- Hosted checkout (no key custody, no wallet infra to secure)
- Webhook with shared-secret HMAC verification (mirrors the Stripe pattern
  the codebase already has)
- Settles to USDC (volatility handled by the processor, not us)
- Alternatives noted: BTCPay (self-hosted, no fees, but new infra to run);
  Strike/OpenNode (Lightning-first, KYB onboarding). Start hosted; revisit
  BTCPay when volume justifies running infra.

## Schema reality (found in review — this is why it needs a migration)

`Subscription.stripeCustomerId` is REQUIRED + UNIQUE; `stripeSubscriptionId`
optional. A crypto-only subscriber cannot exist today. Migration:

```prisma
model Subscription {
  // becomes optional; a subscriber has EITHER a Stripe identity or a crypto pass
  stripeCustomerId     String?  @unique
  // new provider-agnostic fields
  paymentProvider      PaymentProvider @default(STRIPE) // STRIPE | COINBASE_COMMERCE
  externalChargeId     String?  @unique   // Commerce charge code
}
```

Migration discipline per ops runbook: **migration deploys before the code
that needs it** (two PRs or a two-step deploy).

## File map (the REAL tree)

- `apps/web/lib/billing/crypto-pass.ts` — pass durations, price mapping from
  the existing PRICING_PHASE ladder (single price source of truth; never a
  second price list), grant/expiry logic (pure, tested)
- `apps/web/app/api/billing/crypto-checkout/route.ts` — authed POST: creates
  a Commerce charge for {tier, term}, returns hosted checkout URL
- `apps/web/app/api/webhooks/coinbase-commerce/route.ts` — HMAC-verify
  (X-CC-Webhook-Signature), on `charge:confirmed` → upsert Subscription
  (provider COINBASE_COMMERCE, tier, periodEnd = now + term, no auto-renew)
- Pricing page: a "pay with crypto" option on annual tiers, gated by
  `CRYPTO_PAYMENTS_ENABLED`
- Renewal reminder: piggyback the existing billing-notice banner pattern +
  (later) the alerts lane

## Env (names only, documented in .env.example when the branch lands)

```
CRYPTO_PAYMENTS_ENABLED="false"      # master gate, ships dark
COINBASE_COMMERCE_API_KEY=""
COINBASE_COMMERCE_WEBHOOK_SECRET=""
```

## Honesty + safety rails (non-negotiable in implementation)

1. Grant ONLY on `charge:confirmed` (never `charge:pending` — underpaid/
   dropped transactions must not grant access)
2. Idempotent webhook (replayed events cannot extend a pass twice)
3. Refund policy page must state the crypto terms explicitly (crypto refunds
   are manual + at-current-value; say so before anyone pays)
4. Prices come from the PRICING_PHASE ladder — one source of truth
5. Ships dark; before the LIVE flip, one counsel question on money-services
   posture in the operating state (a checkbox, not a blocker — hosted
   processors carry most of it, but ask once and file the answer)

## Sequencing

Build AFTER: Stripe's first verified test checkout (one payment rail proven
end-to-end before the second begins) and the four-branch morning merge.
Estimated size: 1 migration + ~4 files + tests; one focused session.
