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

## Phase 4b — Calibration & the 70% tier (the intelligence go-live)
Once `OUTCOME_LEARNING_ENABLED` is on and real picks are settling, the calibration program is the
path to a *provable* 70% tier. It is instrumented and self-suppressing — watch and activate, don't
force it. Full detail + the audited order live in `docs/path-to-70.md` (§7).

1. **Watch the eligible sample fill.** Cockpit → Calibration → the "Path to a proven 70% tier" panel
   shows **learning-eligible** settled picks (the `eligibleForLearning` gate, set only while
   `OUTCOME_LEARNING_ENABLED` is on) vs the 100-pick activation floor. Picks that settled *before* you
   turned that flag on stay ineligible and do **not** count — turn the flag on first, or backfill
   eligibility, so the floor reflects admitted data. Until the floor is cleared the calibrator stays
   inactive (an identity passthrough, labeled uncalibrated).
2. **Validate out-of-sample, then activate (deliberate, audited `MODEL_VERSION` step).** The panel's
   ECE numbers are **in-sample and indicative only** — isotonic fitting will almost always look
   improved on the data it was fit on. Before the bump, run a held-out / offline calibration
   validation (train/test split or k-fold) and confirm the map improves ECE *out-of-sample*. Only
   then: bump `MODEL_VERSION` with an audit-trail entry (the `docs/calibration-proposals/FROZEN.md`
   rule), unpin `canApplyCalibrationAdjustments`, and wire the calibrated probability through. This is
   the only honest way to make "70%" mean 70%.
3. **Prove it.** Surface the reliability diagram (realized win rate per confidence bucket) + the CLV
   beat-rate + edge-significance. The conviction ("70%") tier then publishes only picks with a
   calibrated win probability ≥ 65% **and at or above the pick's price-specific break-even** (a −200
   favorite needs ~66.7%, so 65% is below break-even and must not qualify — `convictionTier()` already
   enforces `max(0.65, price break-even)`), an independent SPEAK edge, and a CLV beat-rate ≥ 50% over
   ≥ 20 graded picks. First-in-class is the *proof*, not the number.

Engine status (shipped, gated off): `conviction-tier.ts`, `calibration-apply.ts` (`buildCalibrator`),
and the cockpit readiness panel are built and tested. Nothing in live scoring consumes them yet —
they engage only at the audited step above.

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
changes can be visually verified). Intelligence: confidence-calibration loop is now built and
instrumented (`calibration-apply.ts` + cockpit readiness panel, governed by `model-freeze`) — see
Phase 4b + `docs/path-to-70.md`; it activates on settled data. SEO: per-route OG/canonical. See
`reports/claude/GALAXY_FULL_AUDIT_2026-05-29.md`.
