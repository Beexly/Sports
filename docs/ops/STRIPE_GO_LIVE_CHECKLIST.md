# Stripe Go-Live Checklist — verified against the real account (2026-07-08)

**Account:** Galaxy Sports Network (`acct_1TPE9kQ2wPZMxx60`). Verified read-only via the Stripe
connector. Products + prices are configured **correctly and match the code's founding amounts
exactly** (`apps/web/lib/pricing/pricing-phases.ts` FOUNDING). This is the actual revenue gate.

## 1. Price IDs → env vars (paste into Vercel production env)

Verified from the live account; amounts match FOUNDING to the cent:

```
STRIPE_PRO_MONTHLY_PRICE_ID=price_1TdsqBQ2wPZMxx6094V2T9cY       # Pro Monthly   $14.99 (1499)
STRIPE_PRO_ANNUAL_PRICE_ID=price_1TdsqCQ2wPZMxx60z4GWzgu9        # Pro Annual    $99.00 (9900)
STRIPE_ELITE_MONTHLY_PRICE_ID=price_1TdsqLQ2wPZMxx60eKtNl1cZ     # Elite Monthly $24.99 (2499)
STRIPE_ELITE_ANNUAL_PRICE_ID=price_1TdsqLQ2wPZMxx60XVzOFPxd      # Elite Annual  $179.00 (17900)
STRIPE_FANTASY_MONTHLY_PRICE_ID=price_1TrOEIQ2wPZMxx60sgo6r9K5   # Fantasy Monthly $4.99 (499)
STRIPE_FANTASY_ANNUAL_PRICE_ID=price_1TrOESQ2wPZMxx603FyIWvOe    # Fantasy Annual  $49.00 (4900)
```

Also set `NEXT_PUBLIC_APP_URL=https://www.galaxysportsedge.com` — the apex 307-redirects
to www, so www is the canonical host (checkout success/cancel URLs + metadata base).

(Price IDs are not secrets — they're safe in config. **Do not** put the secret key or webhook
secret in code; env only.)

## 2. Secrets (env only, live-mode)

```
STRIPE_SECRET_KEY=sk_live_…            # from the account's API keys page (LIVE, not test)
STRIPE_WEBHOOK_SECRET=whsec_…          # the signing secret of the webhook endpoint in step 3
```

## 3. Webhook endpoint (CRITICAL — without it, paid users never get access)

In the Stripe dashboard → Developers → Webhooks → add endpoint:

- **URL:** `https://www.galaxysportsedge.com/api/webhooks/stripe` (www, NOT apex — the
  apex 307-redirects and Stripe does not follow redirects)
- **Events to send** (exactly what the handler processes — `apps/web/app/api/webhooks/stripe/route.ts`):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `invoice.payment_action_required`
- Copy the endpoint's **Signing secret** → `STRIPE_WEBHOOK_SECRET` (step 2).

### 3a. What the two failure status codes mean in the Stripe dashboard

The handler (`apps/web/app/api/webhooks/stripe/route.ts`) returns exactly two non-2xx codes, and
they mean different things when you see them under Developers → Webhooks → this endpoint →
**Recent deliveries**:

- **400** — missing or invalid `stripe-signature`. This almost always means
  `STRIPE_WEBHOOK_SECRET` in production doesn't match the signing secret shown on THIS specific
  endpoint (each endpoint has its own secret; pasting the wrong one, or one from staging, produces
  a persistent 400 on every delivery). A single stray 400 from an automated scanner hitting the
  URL is normal and not a signal — a *sustained run* of 400s on real Stripe deliveries means the
  secret is wrong.
- **503** — the durable database was unreachable when the event arrived, so nothing was written.
  This is deliberate fail-closed behavior, not a bug: acking with 200 while unable to persist would
  silently lose the entitlement forever, so the handler refuses instead. Stripe automatically
  retries a 503 with backoff (its own default retry schedule), which IS the recovery path — no
  manual replay needed for an isolated 503 during a brief DB blip. A *sustained run* of 503s means
  the production database is actually down and needs attention, not a webhook problem.

If Recent Deliveries shows anything other than occasional retried 503s, that is the signal to
investigate — not the presence of a 503 by itself.

## 4. Grandfathering rule (do this the day you advance a pricing phase)

When you move `PRICING_PHASE` to PROVEN/etc., Stripe Prices are immutable — you **create a new
Price** for the higher rate, then **PREPEND** its id to the matching `STRIPE_*_PRICE_ID`
(comma-separated), keeping the old id. The webhook recognizes historical ids so founding members
keep their rate for life (`apps/web/lib/billing/price-ids.ts`). Never just replace the id.

## 5. Fantasy tier — DONE (created 2026-07-09, live mode)

- Product `prod_Ur6RIZ0AzmKKiT` "Galaxy Sports Edge Fantasy" (metadata tier=FANTASY) with
  founding prices `price_1TrOEIQ2wPZMxx60sgo6r9K5` ($4.99/mo) and
  `price_1TrOESQ2wPZMxx603FyIWvOe` ($49/yr) — env mapping already in step 1.

## 6. Verify before opening the doors

- Staging: complete one real checkout in test mode → confirm the webhook fires, the Subscription
  row syncs to `tier=PRO/ELITE`, and `/dashboard?upgraded=true` shows the success banner.
- Confirm the code's billing hardening is live (it is, on this branch): grandfathering-safe tier
  recognition, double-billing 409 guard, duplicate-customer idempotency key, atomic dunning.

**Bottom line:** the Stripe catalog is correctly built and matches the code. Revenue is gated
only on setting the six env vars above + the webhook endpoint in production.
