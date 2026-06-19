# DEPLOY TONIGHT — the exact path from "329 commits ahead" to "100% running"

**The situation in one line:** the branch `claude/compassionate-ramanujan-qqt5nb` is
**329 commits ahead of `main`** and fully green (tsc 0 · ~28k tests · trust-gate ·
model-freeze · `next build` OK). The deployed site is running `main`-era code, which is
why it looks read-only and missing features. **Nothing below is a code change — it is
deploy + credentials.** The live source of truth for all of it is `/cockpit/go-live`.

---

## Step 0 — Ship the branch (the one blocker that unlocks everything)
Merge `claude/compassionate-ramanujan-qqt5nb` → `main` (or point your deploy at the
branch) and deploy. The instant this lands, the deployed site gains: the **Live Command
Center** (speaking Jarvis), the **autonomous dispatch loop**, **keyless settlement**, the
4 analytics workbenches, the Signal Room, and everything else from this session.

---

## Step 1 — Infrastructure env (auth + DB + queue won't work without these)
Set in your host (e.g. Vercel → Settings → Environment Variables):

| Env var | Why | How |
|---|---|---|
| `DATABASE_URL` + `DIRECT_URL` | Postgres connection | Supabase / Neon / Railway connection string |
| `NEXTAUTH_SECRET` | Auth signing | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Auth callbacks | your deployed URL |
| `REDIS_URL` | BullMQ job queues | Upstash (free tier) |

→ Turns the Infrastructure group of `/cockpit/go-live` green (DB-reachable confirms live).

## Step 2 — Billing (only if you want checkout live tonight)
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the price IDs
`STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID`, `STRIPE_PRO_MONTHLY_PRICE_ID`,
`STRIPE_ELITE_MONTHLY_PRICE_ID`. Until set, those CTAs show an honest "opening soon" —
the site still runs.

## Step 3 — Data / the win-rate pillar (this is what grows calibration)
- `THE_ODDS_API_KEY` — already in the system per your note; ensure it's attached in the deploy env.
- `OUTCOME_LEARNING_ENABLED=true` — tags newly-settled picks as learning-eligible. **Data toggle only; changes no scoring, publishes nothing.**
- `FREE_DATA_PROVIDER_ENABLED=true` — turns on the **keyless settlement** shipped this session, so the ~201 pending picks can settle from free ESPN/nflverse scores and the eligible sample climbs 37 → 100 on its own.

→ With these on and the settle-picks cron running (already scheduled in `vercel.json` +
`external-cron.yml`), the calibration sample accrues automatically.

## Step 4 — AI / LLM — **already done, no action.**
Jarvis + content run on the free keyless pool (Pollinations). Any provider key is optional
extra capacity.

## Step 5 — Analytics (optional)
Set one `NEXT_PUBLIC_*` provider var (PostHog/GA4/Plausible/Segment/Mixpanel) and add ≤5
lines to `lib/analytics/events.ts`. The event taxonomy is already in place.

---

## What stays closed tonight — and why that's correct
- **`autoPublish` / `autoSend` / `automatedBetting` — ALWAYS BLOCKED.** These are hard
  safety stops, not features. They keep you legal and your members protected. They never open.
- **The calibration / 70% conviction tier.** It activates at **100 learning-eligible
  settled picks** and only if the fit improves calibration out-of-sample. You're at ~37.
  This cannot be coded to 100 without fabricating the exact proof that makes the product
  credible. Steps 3 above are the fastest honest route there; it then activates via a
  deliberate `MODEL_VERSION` step — never an automatic flip.

Everything else is green and ships the moment Step 0 deploys.
