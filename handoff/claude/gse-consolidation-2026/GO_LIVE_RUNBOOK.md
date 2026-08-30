# Go-Live Runbook (owner-only)

Nothing in the repo auto-deploys. The code is ready; these are the steps only
you (Garrett) can do, because they involve secrets, money, and external
accounts. Do them in order.

## Demo vs Live — what's real today

| Surface | State without keys/gates | State when wired |
|---|---|---|
| Odds / lines / picks | Honest empty states or labeled fixtures | Real **The Odds API** data once `THE_ODDS_API_KEY` set + ingestion on |
| StatKing `/stats/*` | Snapshot/**fixture** data, labeled as such | Stays snapshot until a licensed/live feed is added (rights-gated) |
| Subscriptions | Checkout disabled | Live once Stripe keys + price IDs set |
| Jarvis memory / moderation | "not wired" (honest, never faked) | "wired" after prod DB migrations |
| Content / blog | Dark (no Anthropic runtime path) | On only if you flip `PUBLIC_BLOG_ENABLED` |

The site never presents simulated data as live — that invariant is enforced in
code and pinned by tests (demo cannot be labeled live).

## Step 1 — Set Vercel environment variables

Required (from `scripts/check-deploy-readiness.mjs`):

```
DATABASE_URL  DIRECT_URL
NEXTAUTH_SECRET  NEXTAUTH_URL
GOOGLE_CLIENT_ID  GOOGLE_CLIENT_SECRET
THE_ODDS_API_KEY  ANTHROPIC_API_KEY  REDIS_URL
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_MONTHLY_PRICE_ID  STRIPE_PRO_ANNUAL_PRICE_ID
STRIPE_ELITE_MONTHLY_PRICE_ID  STRIPE_ELITE_ANNUAL_PRICE_ID
NEXT_PUBLIC_APP_URL
ADMIN_EMAILS   (your admin email[s] — gates the /admin + /cockpit surfaces)
```

## Step 2 — Run production database migrations

Apply the schema (memory + moderation tables, council ledgers) against the
production `DATABASE_URL`:

```
npm run db:migrate
```

## Step 3 — Seed live Stripe products

Decide the pricing model first (see Step 7). Then, against the **live** key:

```
STRIPE_SECRET_KEY=sk_live_… node scripts/seed-stripe-prices.mjs
```

Copy the printed price IDs into the Vercel env (Step 1).

## Step 4 — Flip the readiness gates, in order

Each gate requires the previous one (enforced by the deploy-readiness check):

```
CANONICAL_HISTORY_ENABLED=true
  → DERIVED_MODEL_HISTORY_ENABLED=true
    → PUBLIC_PICKS_ENABLED=true
      → PERFORMANCE_STATS_ENABLED=true
      → PUBLIC_BLOG_ENABLED=true        (optional — turns on content)
        → OUTCOME_LEARNING_ENABLED=true (requires performance)
```

Never set `DEV_FAKE_ADMIN` or `DEMO_PICKS_ENABLED` in production (the check
fails the deploy if you do).

## Step 5 — Verify readiness

```
node scripts/check-deploy-readiness.mjs
```

Expect all green: env present, Postgres reachable, Odds API valid, Stripe key
+ price IDs resolve, Redis PINGs, crons present, gate sequencing sane.

## Step 6 — Deploy

Production deploys from your main-branch flow on Vercel. Merge
`claude/eloquent-goldberg-der80z` into `main` (your call), then let Vercel build
(`vercel.json` runs `db:generate` → `migrate-if-configured` → `build`). Crons
for odds refresh + pick settlement are already configured.

Post-deploy smoke: `npm run smoke:prod`.

## Step 7 — Decide the pricing model (PR #14 fork)

You have two costed options on the table:
- **Keep the monthly named ladder** (current source of truth) — do nothing.
- **Adopt PR #14's weekly billing + VIP tier** — a deliberate migration; have
  it re-based onto this launch line and re-verified before merging (its current
  base is stale and would revert the phase ladder).

## Optional owner-gated toggles

- `/house` primary-nav placement (funnel doctrine currently says "few doors")
- Lifting the fair-prob / model-vs-market gate on pick surfaces
- Higgsfield/Film-Room credit spend (visual generation stays blocked by default)
- Jeff Mans feed outreach (rights registry entry is `manual_research_only` /
  `vendor_candidate` — automation off until permission)
