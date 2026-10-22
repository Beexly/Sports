# Galaxy Sports Edge — Go-Live & First-Revenue Runbook

**Audience:** owner. **Goal:** turn this codebase into a live, earning product **safely**.
**Author:** Claude (Opus 4.8), grounded in `scripts/check-deploy-readiness.mjs`,
`vercel.json`, and the readiness-gate logic. Everything here is an **owner action** —
the code is ready; these are the real-world accounts, secrets, and switches only you control.

> Guiding rule: **everything ships dark, then you open one gate at a time, in order.**
> `node scripts/check-deploy-readiness.mjs` enforces the order and blocks unsafe combinations
> (it already fails the deploy if `DEV_FAKE_ADMIN` or `DEMO_PICKS_ENABLED` are true in prod).

---

## Phase 0 — Accounts you need (most have free tiers; you're cost-sensitive)
| Service | Purpose | Free tier? |
|---|---|---|
| **Vercel** | Hosting + cron | Yes (Hobby) — note Hobby crons are daily; this repo uses an external GitHub-Actions cron every 30 min, so Hobby is fine |
| **Postgres** (Neon / Supabase) | Database (`DATABASE_URL`, `DIRECT_URL`) | Yes (Neon free) |
| **Redis** (Upstash) | Queue/cache (`REDIS_URL`) | Yes (Upstash free) |
| **The Odds API** | Real odds (`THE_ODDS_API_KEY`) | Yes (500 req/mo) — paid as volume grows |
| **Stripe** | Subscriptions | Pay-per-transaction only |
| **Google Cloud** | OAuth sign-in (`GOOGLE_CLIENT_ID/SECRET`) | Yes |
| **Anthropic** | Content engine (stays OFF at launch) | Pay-as-you-go |
| **Domain** | e.g. galaxysportsedge.com | ~$12/yr |

---

## Phase 1 — Provision + set env vars
Set these 15 required vars in Vercel (Production) — the readiness script checks every one:

```
DATABASE_URL  DIRECT_URL  NEXTAUTH_SECRET  NEXTAUTH_URL
GOOGLE_CLIENT_ID  GOOGLE_CLIENT_SECRET
THE_ODDS_API_KEY  ANTHROPIC_API_KEY  REDIS_URL
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_PRICE_ID  STRIPE_ELITE_PRICE_ID  NEXT_PUBLIC_APP_URL
```
Plus the **gate flags** (all start `false` — see Phase 4) and a strong **`CRON_SECRET`**
(the cron routes require `Authorization: Bearer <CRON_SECRET>` — verified enforced).

Then initialize the database:
```
npm run db:generate && npm run db:migrate    # or db:push for first stand-up
npm run db:seed                              # seeds bootstrap/demo scaffolding
```

## Phase 2 — Verify everything is reachable (before any deploy)
```
node scripts/check-deploy-readiness.mjs
```
Green = DB reachable, Odds/Stripe/Anthropic keys valid, Stripe price IDs resolve, Redis pings,
vercel.json crons + security headers present, gate sequencing sane. **Do not deploy on red.**

## Phase 3 — First deploy (still fully dark)
Deploy to Vercel with **all gate flags `false`**. The public site renders its honest
bootstrap/stub states (no public picks, no performance stats). Confirm: site loads, Google
sign-in works, `/api/health` is green, the GitHub-Actions cron hits `/api/cron/refresh-odds`
(odds ingest, written as `isBootstrap=true`).

## Phase 4 — Open the gates IN ORDER (the staged rollout)
Flip one, redeploy/restart, watch, then the next. The script enforces this dependency chain:
```
CANONICAL_HISTORY_ENABLED          ← root; must be on before anything downstream
  └─ DERIVED_MODEL_HISTORY_ENABLED
       └─ PUBLIC_PICKS_ENABLED      ← picks become public
            ├─ PERFORMANCE_STATS_ENABLED   ← track record / calibration visible
            │    └─ OUTCOME_LEARNING_ENABLED
            └─ PUBLIC_BLOG_ENABLED          ← only if you turn the content engine on
```
**Let real picks settle and accumulate before opening `PERFORMANCE_STATS_ENABLED`** — the
engine deliberately excludes bootstrap/seed picks, so stats stay honest. Never skip the order.
Keep `DEV_FAKE_ADMIN=false` and `DEMO_PICKS_ENABLED=false` in prod (the script blocks them).

## Phase 5 — Turn on payments (first revenue)
1. In Stripe: create **Pro ($19/mo)** and **Elite ($49/mo)** products → copy their price IDs into
   `STRIPE_PRO_PRICE_ID` / `STRIPE_ELITE_PRICE_ID`.
2. Add the webhook endpoint `https://<domain>/api/webhooks/stripe` → copy the signing secret into
   `STRIPE_WEBHOOK_SECRET`. (Signature verification + idempotency are already implemented.)
3. **Start in Stripe TEST mode**, run a full subscribe → entitlement → cancel cycle, then swap to
   **LIVE** keys. Re-run the readiness script — it reports TEST vs LIVE and validates the prices.
4. Entitlements gate server-side (Free 1 pick/day · Pro all+confidence · Elite +early/alerts) —
   no frontend-only paywall.

## Phase 6 — Keep live AI OFF until deliberately approved
The content/Studio engine is draft-only and dark. Leave `PUBLIC_BLOG_ENABLED=false` and don't
wire auto-posting. Rotate `ANTHROPIC_API_KEY` before ever enabling content.

---

## Pre-launch checklist (owner sign-off)
- [ ] `node scripts/check-deploy-readiness.mjs` → green
- [ ] `npm run typecheck && npm test && npm run guardrails && npm run build` → green
- [ ] Domain + `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` set; Google OAuth redirect URIs added
- [ ] `CRON_SECRET` set; GitHub-Actions cron secret matches; ingestion confirmed running
- [ ] Stripe TEST cycle passed; webhook verified; then LIVE keys
- [ ] Gates opened in order, with real settled picks before performance stats
- [ ] `DEV_FAKE_ADMIN` / `DEMO_PICKS_ENABLED` = false in prod
- [ ] Responsible-gaming + methodology reachable site-wide (already in the global footer)

## What's still owner-only (cannot be automated for you)
Repo privacy · production secrets · preview URL · Prisma ADR approval · data-rights/legal
posture · payment activation · live-AI activation · public-picks activation · the launch flip.

## Honest gaps to close for "best-of-2026" polish (tracked in the audit)
Visual: forbidden-color → token migration + mobile responsiveness (need a **preview URL** so
changes can be visually verified). Intelligence: confidence calibration loop (governed by
`model-freeze`). SEO: per-route OG/canonical. See `reports/claude/GALAXY_FULL_AUDIT_2026-05-29.md`.
