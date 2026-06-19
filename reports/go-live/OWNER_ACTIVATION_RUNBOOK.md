# Owner Activation Runbook — the few inputs to a self-running system

**Audience:** the owner (you).
**Promise:** the platform is built to run itself. This runbook is the *complete* list
of the human inputs needed to go live. After these, the autonomous loops
(`/cockpit/autonomy`) run on their own and you only touch the few parked levers when
you choose to.
**Live status of every item here:** `/cockpit/go-live` (real, never-faked checks).

> Nothing in this runbook asks you to write code. Each step is an account, a secret,
> or a click. Secrets go in your host's environment variables — never in the repo.

---

## The whole list, at a glance

| # | Step | Why it's required | Time | Cost |
|---|---|---|---|---|
| 1 | **Database** | Persist real picks, members, signals | ~10 min | $0 (free tier) |
| 2 | **Auth** | Members can sign in | ~10 min | $0 |
| 3 | **Stripe** | Take real payments | ~20 min | $0 + % of revenue |
| 4 | **Deploy + crons** | Put it online; start the autonomous loops | ~15 min | $0 (free tier) |
| — | *Odds API* | *Already set.* Evidence capture is quota-governed. | done | $0 |
| — | *AI / LLM* | *Already on.* Free keyless pool, no key needed. | done | $0 |

Everything else (analytics keys, extra free LLM keys, email provider) is **optional**
and adds value when you want it — none of it blocks launch. See `ENV_VAR_MATRIX.md`.

---

## Step 1 — Database (required)

The app uses PostgreSQL via Prisma. Any managed Postgres with a free tier works
(Supabase, Neon, Railway).

1. Create a free Postgres database at your provider of choice.
2. Copy its connection string.
3. Set in your host's environment:
   - `DATABASE_URL` = the pooled connection string
   - `DIRECT_URL` = the direct (non-pooled) connection string (Prisma migrations)
4. Run migrations once: `npm run db:migrate` (or `prisma migrate deploy`), then `npm run db:seed` if you want the dev admin.

**Verifies:** `/cockpit/go-live` → Infrastructure → "Database reachable" turns **ready**
(it runs a live `SELECT 1`).

**Then, to start accumulating the win-rate record:** set `OUTCOME_LEARNING_ENABLED=true`
*only after* the DB is reachable and the Odds runner has produced ≥1 successful ingestion.
This is the one flag that begins the honest path to a calibrated, proven pick tier.

---

## Step 2 — Authentication (required)

1. Set `NEXTAUTH_SECRET` to a random 32+ char string (`openssl rand -base64 32`).
2. Set `NEXTAUTH_URL` to your production URL (e.g. `https://yourdomain.com`).
3. For Google sign-in: create an OAuth client at console.cloud.google.com →
   Credentials → OAuth 2.0, set `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`, and add
   `<your-url>/api/auth/callback/google` as an authorized redirect URI.
4. Set `ADMIN_EMAILS` to your email so you get the operator/cockpit role.

**Verifies:** Infrastructure → "NEXTAUTH_SECRET present" turns **ready**; you can sign
in and reach `/cockpit`.

---

## Step 3 — Stripe billing (required for revenue)

1. Create a Stripe account (stripe.com).
2. Dashboard → Developers → API keys → copy the secret key → set `STRIPE_SECRET_KEY`.
3. Dashboard → Products → create three recurring products and copy each price ID:
   - Founding Desk (~$9–19/mo) → `STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID`
   - Pro ($14.99/mo) → `STRIPE_PRO_MONTHLY_PRICE_ID`
   - Elite ($24.99/mo) → `STRIPE_ELITE_MONTHLY_PRICE_ID`
   - (Annual price IDs too, if you offer annual.)
4. Dashboard → Developers → Webhooks → add endpoint `<your-url>/api/webhooks/stripe`,
   subscribe to the subscription + invoice + checkout events, copy the signing secret →
   set `STRIPE_WEBHOOK_SECRET`.

**Verifies:** Billing group turns **ready**; `/founding-desk` shows a live checkout CTA
instead of the honest "opening soon" state.

**Guardrail:** founding-member rates are grandfathered. New price IDs are new-subscriber
only. Never cancel/migrate existing subscriptions without explicit intent.

---

## Step 4 — Deploy + schedule the loops (required)

1. Deploy to your host (Vercel recommended; the app is a standard Next.js 14 app).
2. Add every secret above to the host's Environment Variables (Production).
3. The cron schedule is already declared in `vercel.json`:
   - `/api/cron/refresh-odds` — daily (data + scoring)
   - `/api/cron/settle-picks` — daily (settlement + CLV)
   These start the autonomous loop the moment you deploy.
4. *(Optional, Vercel Pro)* add more frequent schedules for
   `/api/cron/jarvis-snapshot` (self-audit) and `/api/cron/stale-ingestion-check`
   (source-health tasking). Both are safe, read-only/self-queueing loops.

**Verifies:** the site is live; `/cockpit/autonomy` shows the recurring loops as
self-driving; `/cockpit/live` shows the system breathing.

---

## After activation — what you do (almost nothing)

Once the four steps are done, the system self-runs. The **only** things that wait for
you are the deliberately-parked levers in `/cockpit/autonomy`:

- **Model activation** — turning the calibrator on once ≥100 learning-eligible picks
  have settled. Founder-gated (MODEL_VERSION + audit). The cockpit will tell you when
  the sample is ready; it never flips itself.
- **Content publish** — drafted content waits for your OK. (`autoPublish` stays false.)
- **Paid spend** — the Spend Governor keeps you at $0 until a proof signal + your nod.
  See `reports/finance/SPEND_GOVERNOR_POLICY.md`.

That's the deal: you tweak the few levers; everything else runs itself.

---

*See also: `ENV_VAR_MATRIX.md` (every variable, required vs optional),
`LIVE_SMOKE_TEST_CHECKLIST.md` (prove it works after deploy),
`ROLLBACK_PLAN.md` (how to undo safely),
`SINGLE_SITTING_ACTIVATION_PLAN.md` (do it all in one ~60-min sitting).*
