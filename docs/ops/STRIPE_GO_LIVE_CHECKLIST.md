# Stripe Go-Live Checklist — verified against the real account (2026-07-08)

**Account:** Galaxy Sports Network (`acct_1TPE9kQ2wPZMxx60`). Verified read-only via the Stripe
connector. Products + prices are configured **correctly and match the code's founding amounts
exactly** (`apps/web/lib/pricing/pricing-phases.ts` FOUNDING). This is the actual revenue gate.

## 1. Price IDs → env vars (paste into Vercel production env)

Verified from the live account; amounts match FOUNDING to the cent:

```
STRIPE_PRO_MONTHLY_PRICE_ID=price_1TdsqBQ2wPZMxx6094V2T9cY     # Pro Monthly  $14.99 (1499)
STRIPE_PRO_ANNUAL_PRICE_ID=price_1TdsqCQ2wPZMxx60z4GWzgu9      # Pro Annual   $99.00 (9900)
STRIPE_ELITE_MONTHLY_PRICE_ID=price_1TdsqLQ2wPZMxx60eKtNl1cZ   # Elite Monthly $24.99 (2499)
STRIPE_ELITE_ANNUAL_PRICE_ID=price_1TdsqLQ2wPZMxx60XVzOFPxd    # Elite Annual  $179.00 (17900)
```

(Price IDs are not secrets — they're safe in config. **Do not** put the secret key or webhook
secret in code; env only.)

## 2. Secrets (env only, live-mode)

```
STRIPE_SECRET_KEY=sk_live_…            # from the account's API keys page (LIVE, not test)
STRIPE_WEBHOOK_SECRET=whsec_…          # the signing secret of the webhook endpoint in step 3
```

## 3. Webhook endpoint (CRITICAL — without it, paid users never get access)

In the Stripe dashboard → Developers → Webhooks → add endpoint:

- **URL:** `https://<your-production-domain>/api/webhooks/stripe`
- **Events to send** (exactly what the handler processes — `apps/web/app/api/webhooks/stripe/route.ts`):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `invoice.payment_action_required`
- Copy the endpoint's **Signing secret** → `STRIPE_WEBHOOK_SECRET` (step 2).

## 4. Grandfathering rule (do this the day you advance a pricing phase)

When you move `PRICING_PHASE` to PROVEN/etc., Stripe Prices are immutable — you **create a new
Price** for the higher rate, then **PREPEND** its id to the matching `STRIPE_*_PRICE_ID`
(comma-separated), keeping the old id. The webhook recognizes historical ids so founding members
keep their rate for life (`apps/web/lib/billing/price-ids.ts`). Never just replace the id.

## 5. Not yet configured (optional / lower priority)

- **Fantasy tier** has no Stripe product/prices → Fantasy checkout returns a graceful 503 until
  you create a "Galaxy Sports Edge Fantasy" product with monthly ($4.99/499) + annual ($49/4900)
  prices and set `STRIPE_FANTASY_MONTHLY_PRICE_ID` / `STRIPE_FANTASY_ANNUAL_PRICE_ID`. Pro/Elite
  are the revenue tiers; Fantasy can wait.

## 6. Verify before opening the doors

- Staging: complete one real checkout in test mode → confirm the webhook fires, the Subscription
  row syncs to `tier=PRO/ELITE`, and `/dashboard?upgraded=true` shows the success banner.
- Confirm the code's billing hardening is live (it is, on this branch): grandfathering-safe tier
  recognition, double-billing 409 guard, duplicate-customer idempotency key, atomic dunning.

**Bottom line:** the Stripe catalog is correctly built and matches the code. Revenue is gated
only on setting the six env vars above + the webhook endpoint in production.
