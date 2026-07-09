# Gate-Opening Runbook — "All Gates Open, Learning Daily"

**Date:** 2026-07-09 · **Source of truth:** `packages/prediction-engine/src/platform-config.ts`
(+ `readiness.ts`). Every gate defaults to the safest option; opening is explicit env opt-in.
This runbook is the complete map: what each gate does, what opening it unlocks, and the
honest order — so the site runs at full capacity **and** the learning loop runs daily.

## The one-screen picture

The platform learns through this loop:

```
ingest odds (cron 10:00 UTC + worker) → score → publish picks → settle (cron 07:00 UTC)
   → canonical history (GATE 2) → snapshots marked eligible for learning (GATE 3)
   → calibration evidence accrues DAILY → (audited) calibration adjustments (GATE 7)
   → pricing ladder advances on proof (PRICING_PHASE)
```

Gates 2+3 are the ignition. Everything downstream of them opens **itself** as data accrues.

## Gate map (env → effect → recommendation)

| # | Env var | Default | What opening does | Open at launch? |
|---|---|---|---|---|
| 1 | `PUBLIC_PICKS_ENABLED` | false | /api/picks + daily-slate serve the public (503 until then) | **YES** — this is the product |
| 1b | `FORCE_NO_BET_IF_STALE` | false | Stale-ingestion kill switch on the public surface (CLAUDE.md rule #5 enforced at the read boundary) | **YES — open together with #1**; it's what makes #1 safe |
| 2 | `CANONICAL_HISTORY_ENABLED` | false | New picks/TeamGameLogs count as CANONICAL (isBootstrap=false). **Starts the track record + the learning substrate.** | **YES — the learning ignition.** Every day off = a day of record lost |
| 3 | `OUTCOME_LEARNING_ENABLED` | false | Settled canonical snapshots marked `eligibleForLearning` — outcome-anchored calibration DATA COLLECTION (never auto-adjusts weights) | **YES** — pure data collection, doctrine-safe |
| 4 | `PERFORMANCE_STATS_ENABLED` | false | /api/performance serves counts + rates; the route itself withholds win rates below `MIN_SETTLED_PICKS_FOR_LEARNING` (insufficientSample) | **YES** — honest by construction: shows factual counts, withholds thin rates automatically |
| 5 | `DERIVED_MODEL_HISTORY_ENABLED` | false | ATS/H2H/venue form feed scoring | **NOT YET — auto-later.** Doctrine: ≥50 canonical settled games/sport. Opens itself once #2 has run for weeks |
| 6 | `FEATURED_PICK_PROMOTION_ENABLED` | false | Auto-feature ELITE/STRONG grades | **NOT YET** — grades need calibration sample first; revisit with #5 |
| 7 | `CALIBRATION_ADJUSTMENTS_ENABLED` | false | Isotonic calibrator maps confidence → calibrated win probability | **NO — audited path only** (MODEL_VERSION sequence, docs/path-to-70.md §7). This is the "learning changes behavior" gate; it requires the evidence #2+#3 accumulate |
| 8 | `PUBLIC_BLOG_ENABLED` | false | Content publishing surface | **NO** — operator-reviewed publishing stays the doctrine (auto-publish is forbidden by the kill-switch worker + CI guardrail) |
| 9 | `CONFIDENCE_DISPLAY_MODE` | (safest) | How confidence renders publicly | Keep default until calibration sample matures |
| 10 | `DEMO_PICKS_ENABLED` | — | Sample picks with SAMPLE DATA banner | **OFF in production** (dev/preview only) |

**Infra prerequisites (same deploy):** real `DATABASE_URL`/`DIRECT_URL`, `THE_ODDS_API_KEY`,
`CRON_SECRET`, `NEXTAUTH_SECRET`/`NEXTAUTH_URL`/Google OAuth, `NEXT_PUBLIC_APP_URL`,
`ANTHROPIC_API_KEY`, the 6 Stripe vars + webhook (docs/ops/STRIPE_GO_LIVE_CHECKLIST.md),
`PRICING_PHASE=FOUNDING`.

## The launch set (paste into Vercel production env)

```
PUBLIC_PICKS_ENABLED=true
FORCE_NO_BET_IF_STALE=true
CANONICAL_HISTORY_ENABLED=true
OUTCOME_LEARNING_ENABLED=true
PERFORMANCE_STATS_ENABLED=true
PRICING_PHASE=FOUNDING
# leave unset (safe defaults): DERIVED_MODEL_HISTORY_ENABLED,
# FEATURED_PICK_PROMOTION_ENABLED, CALIBRATION_ADJUSTMENTS_ENABLED,
# PUBLIC_BLOG_ENABLED, DEMO_PICKS_ENABLED
```

## Why this IS "all gates open" (and not less)

- Every gate that can open honestly **today** opens. The remaining three are not "closed" —
  they are **armed**: #5/#6 open on data thresholds that #2 starts accumulating immediately,
  and #7 opens through the audited calibration sequence fed by #3. That's the design: the
  site **earns** its own gate openings from its own daily results — which is exactly the
  "learning, growing, understanding from itself" loop, with receipts.
- Forcing #5–#7 open on day one wouldn't make the site smarter — it would feed the engine
  empty/uncalibrated history (score=0 factors, un-audited calibration), i.e., noise dressed
  as learning, and would contradict the public honesty promise the brand sells.

## Auto-opening timeline (what the site unlocks by itself)

- **Day 1:** canonical record starts; snapshots accrue; calibration page begins filling.
- **~100 settled picks** (`MIN_SETTLED_PICKS_FOR_LEARNING` floor): public win rates unlock
  themselves on /api/performance; pricing ladder becomes eligible for PROVEN.
- **~50 canonical settled games/sport:** flip `DERIVED_MODEL_HISTORY_ENABLED=true`
  (+ consider #6) — the ATS/H2H learning tier.
- **Audited calibration sequence complete:** flip `CALIBRATION_ADJUSTMENTS_ENABLED=true`
  with a MODEL_VERSION bump — the model now *acts* on what it learned.
- **≥500 settled + CLV ≥52.4%:** ESTABLISHED pricing phase (create new Stripe Prices,
  PREPEND ids — grandfathering rule).

## Order of operations (one sitting, ~20 min)

1. Merge the PR (`claude/nfl-pbp-expected-metrics-xb069r` → main) once CI is green.
2. Set the infra env vars + the launch set above in Vercel production.
3. Add the Stripe webhook endpoint; run one test-mode checkout end-to-end.
4. Redeploy → verify `/api/health`, `/picks` (real picks, no SAMPLE banner), pricing
   checkout, and the first cron cycle (10:00 UTC) writes an ingestion run.
5. From that moment the record — and the learning loop — runs daily on its own.
