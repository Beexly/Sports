# Account Setup Checklist — Pre-Launch

**Owner:** Garrett
**Goal:** every external account needed to run the platform in production is created, billed, and producing an env var you can paste into Vercel.
**Sequencing matters:** later items depend on earlier ones (e.g. Stripe webhooks need a domain).

Work top-to-bottom. Every item ends with the env var(s) it produces.

---

## Step 1 — Domain (~5 min, $10–15/yr)

You need a domain before Stripe webhooks, Google OAuth, and Vercel deploy URLs settle.

1. Go to a registrar: **Namecheap** or **Cloudflare Registrar** (Cloudflare is cheapest, no markup).
2. Search for a name you like.
3. Buy with WHOIS privacy enabled.
4. Don't set DNS yet — Vercel does that in Step 4.

**Produces:** the public hostname you'll use everywhere below. We'll call this `APP_HOSTNAME` (e.g. `helm.bet` or `getsharpie.com`).

---

## Step 2 — Hosting (Vercel) (~10 min, free tier)

1. Sign up at https://vercel.com using GitHub.
2. Create a new project, import this repo. **Don't deploy yet.**
3. In the project settings, leave the framework preset as Next.js. Root directory: `apps/web`. The monorepo defaults work.
4. Note the temporary `*.vercel.app` URL Vercel assigns. We'll add the real domain in Step 4.

**Produces:** Vercel project (no env var yet; we set them in Step 11).

---

## Step 3 — Managed Postgres (Neon or Supabase) (~10 min, free tier)

Pick one — both work, both have free tiers, both give you a connection string.

### Option A — Neon (recommended for serverless)
1. Sign up at https://neon.tech.
2. Create a project. Region: pick the one closest to Vercel's region (Vercel defaults to `iad1` Washington DC; pair with Neon `us-east-2`).
3. Copy the **pooled** connection string for `DATABASE_URL`.
4. Copy the **direct** connection string for `DIRECT_URL`. Prisma migrations need a direct connection.

### Option B — Supabase
1. Sign up at https://supabase.com.
2. Create a project, set a strong password.
3. In Project Settings → Database → Connection String, copy the **transaction** mode URL for `DATABASE_URL`.
4. Copy the **session** mode URL for `DIRECT_URL`.

**Produces:** `DATABASE_URL`, `DIRECT_URL`.

---

## Step 4 — Connect domain to Vercel (~5 min)

1. In the Vercel project, Settings → Domains → Add `<APP_HOSTNAME>`.
2. Vercel shows DNS records to add. Add them at your registrar.
3. Wait for the green check (usually a minute or two).
4. Set `https://<APP_HOSTNAME>` as the **production** domain (`vercel.app` becomes a preview alias).

**Produces:** `NEXT_PUBLIC_APP_URL=https://<APP_HOSTNAME>` and `NEXTAUTH_URL=https://<APP_HOSTNAME>`.

---

## Step 5 — Google OAuth credentials (~10 min, free)

1. Go to https://console.cloud.google.com.
2. Create a new project (name doesn't matter).
3. APIs & Services → OAuth consent screen → External → fill in app name, support email, and **add your domain to "Authorized domains"**.
4. APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.
5. Authorized JavaScript origins: `https://<APP_HOSTNAME>`.
6. Authorized redirect URIs: `https://<APP_HOSTNAME>/api/auth/callback/google`.
7. Copy the client ID and secret.

**Produces:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

---

## Step 6 — NextAuth secret (~30 seconds, free)

Run this in a terminal — you don't need an account:

```bash
openssl rand -base64 32
```

**Produces:** `NEXTAUTH_SECRET` (paste the base64 output).

---

## Step 7 — The Odds API key (~5 min, $30/mo for the 20k-request tier)

This is the hard-blocker for real picks.

1. Sign up at https://the-odds-api.com.
2. The free tier (500 requests/mo) is fine for testing the ingestion pipeline; the paid **$30/mo, 20k requests** tier is the minimum for a real public slate updated every 30 minutes.
3. Copy the API key.

**Produces:** `THE_ODDS_API_KEY`.

> The pipeline is built to back off gracefully if you exceed the quota. You won't get a surprise bill — usage is hard-capped by the plan.

---

## Step 8 — Anthropic API key (~5 min, pay-as-you-go ~$5 to start)

Used for blog/content generation only — picks are never AI-generated.

1. Sign up at https://console.anthropic.com.
2. Add billing (the platform uses Claude responsibly; expect <$20/mo for content at launch volume).
3. Settings → API Keys → Create key.

**Produces:** `ANTHROPIC_API_KEY`.

---

## Step 9 — Stripe account (~30 min, free until first charge)

You do **not** need this for the 30-day silent collection period — the paywall stays off until `PERFORMANCE_STATS_ENABLED=true`. But you should create the account now so checkout is ready when the gate opens.

1. Sign up at https://stripe.com. **Use your real business name** (sole prop or LLC — talk to your accountant).
2. Activate your account: provide tax info, bank details, identity verification. Stripe will prompt you through.
3. Stay in **Test mode** until you flip the paywall — Stripe's test mode dashboard has a toggle in the top-left.
4. In Test mode → Developers → API keys, grab:
   - Publishable key (`pk_test_*`)
   - Secret key (`sk_test_*`)
5. Create two products in Test mode: "Pro" and "Elite", with recurring monthly prices $19 and $49 respectively. The setup script in Step 12 can do this for you.
6. Set up the webhook endpoint at Dashboard → Developers → Webhooks → Add endpoint:
   - URL: `https://<APP_HOSTNAME>/api/webhooks/stripe`
   - Events to listen for: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy the signing secret (`whsec_*`)

**Produces:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_ELITE_PRICE_ID`.

> Switch to **Live mode** keys only after legal review is done and you're ready to charge real cards. The platform's gates will let you launch silently and flip checkout on later without touching code.

---

## Step 10 — Redis (Upstash, free tier) (~5 min)

Used for the BullMQ background worker queue.

1. Sign up at https://upstash.com.
2. Create a Redis database, free tier, same region as Vercel (us-east-1).
3. Copy the `REDIS_URL` connection string. Use the **TLS** version (`rediss://`).

**Produces:** `REDIS_URL`.

---

## Step 11 — Paste everything into Vercel (~10 min)

1. Vercel project → Settings → Environment Variables.
2. Add each of the env vars produced above. Set them for **all three environments** (Production, Preview, Development) unless noted.
3. For the launch progression gates, paste these defaults:

```
CANONICAL_HISTORY_ENABLED=true
DERIVED_MODEL_HISTORY_ENABLED=false
PUBLIC_PICKS_ENABLED=false
FEATURED_PICK_PROMOTION_ENABLED=false
PERFORMANCE_STATS_ENABLED=false
PUBLIC_BLOG_ENABLED=false
OUTCOME_LEARNING_ENABLED=false
CONFIDENCE_DISPLAY_MODE=labels
MIN_DATA_QUALITY_FOR_GAME_LOG=40
MIN_SETTLED_PICKS_FOR_LEARNING=100
NODE_ENV=production
```

The progression doc in `.env.example` explains when to flip each one. **Do not flip any of them yet.**

4. After all env vars are set, click **Redeploy** in the Deployments tab.

---

## Step 12 — Seed Stripe prices (~2 min)

From your local machine, with `STRIPE_SECRET_KEY` in your shell env:

```bash
node scripts/seed-stripe-prices.mjs
```

The script reads the keys from your env, creates the Pro and Elite products in your Stripe account if they don't exist, and prints the price IDs to paste back into Vercel.

---

## Step 13 — Run the deploy-readiness check (~30 seconds)

From your local machine:

```bash
npm run deploy:ready
```

Hits the Postgres connection, the Stripe API, The Odds API, and Anthropic. Prints a green check or a red ✗ next to each. If anything is red, fix it before launch.

---

## What you do NOT need yet

- A logo. The current monogram works fine for launch.
- A business entity (sole prop is fine in most US states for free / informational content).
- Sales tax registration. You'll need this once you charge subscriptions in revenue-tax states.
- A merchant account. Stripe handles everything.
- Custom email (transactional or marketing). Use Resend or Postmark when needed — we'll wire that as a follow-up.

---

## Estimated total time + monthly cost

| Step | Time | Monthly cost |
|---|---|---|
| Domain | 5 min | ~$1 |
| Vercel | 10 min | $0 (free tier handles launch volume) |
| Postgres (Neon free) | 10 min | $0 |
| Google OAuth | 10 min | $0 |
| NextAuth secret | 1 min | $0 |
| The Odds API | 5 min | $30 |
| Anthropic | 5 min | ~$10 |
| Stripe | 30 min | $0 until first charge |
| Upstash Redis | 5 min | $0 |
| Vercel env vars + deploy | 10 min | — |
| **Total** | **~1.5 hours** | **~$41/mo** |

That's your monthly burn until you flip the paywall. Plan accordingly.
