# Autonomous Browser Agent Runbook — Stripe Live Mode & OpenRouter Custom Provider (`stealth-skeleton`)
**Generated:** 2026-11-06 · **Target Domain:** `https://www.galaxysportsedge.com`

---

## 1. Automated Status (Already Wired in Code & CLI)

1. **Publishable Key (`pk_live_51TPE9k...00dacLIonk`) & Restricted Live Key (`rk_live_51TPE9k...00FIeisyHD`):**
   - Configured locally in gitignored `.env.local` and `apps/web/.env.local` via [`scripts/ops/rotate_stripe_live_to_vercel.py`](file:///C:/Users/Garrett/Sports/scripts/ops/rotate_stripe_live_to_vercel.py).
   - One-time Week 9 packs ([`apps/web/app/api/packages/checkout/route.ts`](file:///C:/Users/Garrett/Sports/apps/web/app/api/packages/checkout/route.ts)) use inline `price_data`, meaning any valid live secret/restricted key (`sk_live_...` or `rk_live_...` with Checkout Session write permission) switches all 10 active Week 9 packs from `cs_test_...` to `cs_live_...` immediately.
2. **Season Ledger of Record (`47-19-1 · +24.92u` / Base `38-13-1 · +22.85u`):**
   - Live on [`apps/web/lib/packages/catalog.ts`](file:///C:/Users/Garrett/Sports/apps/web/lib/packages/catalog.ts) and [`apps/web/app/packages/page.tsx`](file:///C:/Users/Garrett/Sports/apps/web/app/packages/page.tsx).

---

## 2. Copy-Paste Browser Agent Prompt (Vercel Env + Stripe Webhook Signing Secret + OpenRouter Provider)

Paste the prompt below into a browser-authenticated session (logged into **Stripe Dashboard**, **Vercel Dashboard**, and **OpenRouter**):

```text
You are executing a 3-step live production credential sync for Galaxy Sports Edge (https://www.galaxysportsedge.com):

STEP 1 — STRIPE LIVE WEBHOOK & CHECKOUT PERMISSIONS (https://dashboard.stripe.com)
1. Ensure "Test mode" toggle in the top bar is OFF (Live Mode active).
2. Go to Developers -> API keys:
   - Verify the Restricted Key `rk_live_51TPE9k...` has Write permissions for:
     * Checkout Sessions (Write)
     * Customers (Write)
     * Products (Write) & Prices (Write)
     * Subscriptions (Read/Write)
     * Webhook Endpoints (Write)
   - Or copy the full Standard Secret Key (`sk_live_51TPE9k...`).
3. Go to Developers -> Webhooks -> Add endpoint:
   - Endpoint URL: https://www.galaxysportsedge.com/api/webhooks/stripe
   - Events to listen to:
     * checkout.session.completed
     * checkout.session.expired
     * customer.subscription.created
     * customer.subscription.updated
     * customer.subscription.deleted
     * invoice.paid
     * invoice.payment_succeeded
     * invoice.payment_failed
     * invoice.payment_action_required
     * charge.refunded
   - Click "Add endpoint", then click "Reveal" under Signing secret and copy `whsec_...`.

STEP 2 — VERCEL PRODUCTION ENVIRONMENT VARIABLES (https://vercel.com)
1. Open the Galaxy Sports Edge production project (`apps/web` -> Settings -> Environment Variables).
2. For the **Production** environment, set/update:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_51TPE9kQ2wPZMxx60PIe0eojDl0SsXn7Q1dbnxaj6o0PKkGZmBSacGv1sVjhIeumn1UYEk6iXFow4J0hAQT48H5iY00dacLIonk`
   - `STRIPE_SECRET_KEY` = `<your sk_live_51TPE9k... or rk_live_51TPE9k... key>`
   - `STRIPE_WEBHOOK_SECRET` = `<the whsec_... signing secret from Step 1>`
   - `NEXT_PUBLIC_APP_URL` = `https://www.galaxysportsedge.com`
3. Trigger a Production Redeploy from Deployments -> Redeploy.
4. Verify by running POST https://www.galaxysportsedge.com/api/packages/checkout with `{"packageSlug":"sunday-nfl-5pct-slate"}` and confirming `sessionId` starts with `cs_live_`.

STEP 3 — OPENROUTER STEALTH-SKELETON PROVIDER REGISTRATION (https://openrouter.ai)
1. Open Settings -> Providers / Custom Endpoints.
2. Register the Cloudflare Worker endpoint for `workers/stealth-skeleton-provider`:
   - Model IDs: `gse/stealth-skeleton-v1`, `gse/skeleton-pro`, `gse/skeleton-flash`
   - Base URL: `https://stealth-skeleton-provider.<your-cloudflare-subdomain>.workers.dev/v1`
   - Auth Header: `Authorization: Bearer <STEALTH_SKELETON_PROVIDER_API_KEY>`
```
