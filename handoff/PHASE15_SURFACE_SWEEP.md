# Phase 15 Surface Sweep — Fantasy/DFS/Contest Periphery

**Task:** P15-05  
**Date:** 2026-08-17  
**Status:** COMPLETE — no ungated real-money path found. One consistency gap noted (not a leak).

## Scope

Directories inspected (all under `apps/web/`):

- **app pages:** `app/fantasy/`, `app/contests/`, `app/vault/`, `app/house/`, `app/gsn/`
- **lib modules:** `lib/dfs/`, `lib/contests/`, `lib/tournament/`, `lib/staking/`, `lib/sleeper/`, `lib/game-room/`, `lib/gsn/`, `lib/house/`, `lib/fantasy/` (all submodules: academy, adp-source, autopilot, bestball, competitive-baseline, dfs-optimizer, dfs-slate, draft, free-trial, gm-ledger, host, league-twin, lineup, players, props, scheme, studio, trade, waivers)
- **Supporting gates:** `lib/launch/public-surface-gate.ts`, `lib/api-entitlement.ts`, `lib/pricing/tier-access.ts`

## Gating mechanism reference

The codebase enforces real-money gating via two server-side helpers:

1. `requireFantasyApi()` / `requirePremiumApiRateLimited()` in `api-entitlement.ts` — page-level server-side entitlement gate (returns 401/403 HTTP deny, `null` = granted). Mirrors `getViewerEntitlements` (anonymous → FREE, DB-backed, fail-closed).
2. `getViewerEntitlements()` in `pricing/tier-access.ts` — resolves session (anonymous → FREE) and entitlements, fail-closed to FREE.
3. `isContestsPublic()` in `launch/public-surface-gate.ts` — env-gated public surface switch (default ON, emergency OFF via `CONTESTS_PUBLIC=false`).
4. `poolForViewer()` / `freeTrialPool()` in `lib/fantasy/free-trial.ts` — server-side pool trim for FREE viewers (never client-side only).

## Findings

### 1. CONTEST BAY — PASS (gated, free paper only)

- `app/fantasy/contests/page.tsx` + `app/contests/page.tsx` (redirect alias): explicitly "Free skill-only paper contest — no entry fee, no prize pool, no real money."
- `lib/contests/week.ts`: `slateKind: "methodology_paper"`, rules state "Free skill only — no entry fee, no prize pool, no real money."
- `lib/contacts/store.ts`: file/Postgres settlement only, no payment path.
- **API routes:** Both `app/api/contests/week/route.ts` and `app/api/contests/enter/route.ts` check `isContestsPublic()`. The enter route also enforces rate limiting (`consumePublicFormRateLimit`) and validates via `ContestEntrySchema` (honeypot, consent). No Stripe/payment code anywhere in the contests module.

### 2. STAKING — PASS (educational only)

- `lib/staking/kelly-investigation.ts`: `treatsPAsVerified: false` (hard-coded), `publicClaimAllowed: false` by default. Default fractional Kelly (≤0.25). Refuses stake when no edge. No real-money placement — pure educational sizing.

### 3. DFS SALARIES & OPTIMIZER — PASS with consistency note

- `lib/dfs/salaries.ts`: Data-source gated by provider API keys (`SPORTSDATAIO_API_KEY`, `FANTASYDATA_API_KEY`). When keys absent → `status: "gated"` with empty rows + list of required env vars. When keys present → `status: "live"` with real DraftKings-style salaries.
- `lib/fantasy/dfs-optimizer.ts`: Pure computational engine (exact DP 0/1-knapsack). Takes any `DfsPlayer[]` pool. No I/O, no payment logic.
- `app/fantasy/dfs/page.tsx`: Renders live salaries only when `loadDfsSalaries()` returns `status === "live"` AND has rows. Otherwise shows "feed not connected" + runs optimizer on sample pool. Note explicitly says "runs fully on the sample pool."
- **Consistency note (NOT a leak):** `app/api/dfs/salaries/route.ts` has NO `requireFantasyApi` / `requirePremiumApiRateLimited` check, unlike all other fantasy/analytics APIs. However, this is not a real-money exposure because:
  1. The data is only "live" when provider API keys (not user entitlement) are configured.
  2. DFS salaries are data (prices), not an entry/pay path — no wagering, no entry fee, no prize pool in this module.
  3. The pricing page (`app/pricing/page.tsx`) lists `FANTASY` as a paid tier using `STRIPE_FANTASY_*` env vars, but the DFS salary feed is gated on provider keys, not subscription tier.
  - **Recommendation:** If DFS salaries are intended as a FANTASY-tier paid feature, the API route should add `requireFantasyApi()`. If they're intended as free (sample-only without provider keys), the current data-source gate is sufficient. Owner decision — not fixed in this sweep.

### 4. FANTASY TOOL PAGES — PASS (properly gated)

- `bestball`, `draft`, `lineup`, `trade`, `waivers` pages all call `getViewerEntitlements()` and gate premium projections behind `poolForViewer()` (server-side trim for FREE viewers).
- `free-trial.ts`: `freeTrialPool()` correctly trims the pool server-side before serialization to client — "A client-side `.slice()` does not enforce anything because the full pool would still be serialized."
- `autopilot` page: explicitly states "executing on a real ESPN/Yahoo/Sleeper account is gated behind your explicit consent, OAuth, and compliance review; there are no autonomous account actions or payments."

### 5. SLEEPPOR — PASS (read-only sentiment)

- `lib/sleeper/market-signal.ts`: "market sentiment, NOT our projection or betting pick — canPublishPicks stays false." Read-only GET via Sleeper API.
- `app/api/sleeper/league/` and `app/api/sleeper/market-signal/` routes: Sleeper sync is described as "read-only, GET-only." ESPN/Yahoo OAuth still founder-gated.

### 6. TOURNAMENT — PASS (draft-only, disabled)

- `lib/tournament/calibration-tournament.ts`: `status: "DRAFT_ONLY"`, `enabled: false`, `priced: false`, `eligibleForRecognition: false`. "Community calibration tournament scoring is scaffolded for review only; recognition and public display remain disabled."

### 7. GAME ROOM — PASS (read-only with entitlement gating)

- `lib/game-room/load.ts`: "The Game Room is a PUBLIC read-only surface, but two of its panels carry the platform's paid metrics." Premium fields (pre-mortem factor trail, Market Pulse line movement) built ONLY past `viewer.canSeeFactorBreakdown` / `viewer.canSeeLineMovement`. Fail-closed by default (`FAIL_CLOSED_VIEWER`).

### 8. GSN — PASS (content/narrative only)

- `lib/gsn/transmission.ts`: "Not a blog, a daily mission-control TRANSMISSION." Methodology fallback is illustrative structure language only — never fabricated track-record numbers.
- `lib/gsn/beex-weekly.ts`: `status` can never be "published" without `ownerApproved: true`. "this module never synthesizes audio, never posts, never publishes."
- `lib/gsn/build-transmission.ts`: Falls back to `SAMPLE_TRANSMISSION` with `illustrative: true` when board is empty/suppressed. No real-money component.

### 9. HOUSE — PASS (community hub)

- `app/house/page.tsx`: "Live rooms open when we can protect them." Staged community rooms. No payment/entry paths.
- `lib/house/weekly-ritual.ts`: Weekly beat map / content schedule. No monetary logic.

### 10. VAULT — PASS (archive placeholder)

- `app/vault/page.tsx`: "Collecting" state. "The Vault opens once enough canonical picks have settled." No real-money entry path.
- `lib/vault/` directory: does not exist (no vault lib module).

### 11. PROJECTIONS API — PASS (tier-gated)

- `app/api/projections/route.ts`: Gated by `requirePremiumApiRateLimited("projections")`. Comment: "Premium-gated (forecasts, not free-public)."

### 12. LINEUP TOOL API — PASS (tier-gated)

- `app/api/tools/lineup/route.ts`: Gated by `requirePremiumApiRateLimited("tools/lineup")`.

## VERIFY

- `npm run typecheck` across all 22 workspaces — PASSED (exit 0)
- `npm run lint` (eslint, `--max-warnings=0`) — PASSED (exit 0)
- `npx vitest run apps/web/__tests__/fantasy-real-data-surface.test.ts apps/web/__tests__/fantasy-pool-gating.test.ts` — 19/19 PASSED

## CONCLUSION

No ungated real-money or forward-projection path was found in the inspected periphery. All real-money surfaces are behind either:

- Env-gated founder switches (`isContestsPublic`, `PUBLIC_PICKS`, `STATS_PUBLIC`, etc.)
- Tier-based entitlement checks (`requirePremiumApiRateLimited`, `getViewerEntitlements`, `poolForViewer`)
- Provider API key gates (DFS salaries)
- Owner-only publish-readiness gates (`assessPublishReadiness`, `advanceEpisode`)

**One consistency gap** (not a security finding): the DFS salaries API route (`app/api/dfs/salaries/route.ts`) lacks user-tier entitlement gating, while every other fantasy/analytics API uses `requirePremiumApiRateLimited`. This is not a real-money leak (salaries are data, gated by provider keys; no entry/pay path), but it is an inconsistency in the gating pattern. Per task instructions ("do not fix it yourself — owner decision"), this is documented here as a recommendation, not fixed.

No code changes were made. No commit required (per task: "Commit only if you changed a genuine bug, not a gate").

---

# Appendix: P15-06 Sweep — Scoring, Prediction & Simulation Math

**Task:** P15-06
**Date:** 2026-08-17
**Status:** COMPLETE — all directories have real test coverage; all math hand-traced against known inputs matches documented formulas; no bugs found.

## Scope

Directories inspected (all under `apps/web/lib/` unless noted):

| Directory | Source files | Test files | Live calculation tested? |
|---|---|---|---|
| `scoring/` | `player-composite.ts` (Galaxy Index compositing via `@sports/prediction-engine` `compositeScore`) | `__tests__/player-composite.test.ts` (9 tests) | Yes — `loadPlayerCompositeScores` blends production + workload + momentum + availability; Galaxy Index maps `50 + 15*score` clamped [0,100] |
| `ranking/` | `sort-key.ts` (ranking sort: rankingP > rankingScore/100 > confidence/100) | `__tests__/ranking-sort-key.test.ts` (8 tests) | Yes — prefers rankingP, falls back to rankingScore, then confidence, never invents |
| `projections/` | `correlation.ts` (Gaussian copula matrix), `distribution.ts` (Mondrian conformal + posterior stdev), `player-projections.ts`, `projection-feature-registry.ts`, `weekly-model.ts` (recency+games-weighted), `weekly-model-loader.ts` | Colocated: `correlation.test.ts` (3), `distribution.test.ts` (3), `weekly-model.test.ts` (12), `weekly-model-loader.test.ts` (11); external: `player-projections.test.ts` (3), `projections-route.test.ts` (3), `reconstruction-calibration.test.ts` (5) | Yes — weekly-model multipliers (process, opponent, total, short-week) hand-traced; distribution stdev/spike/bust verified; copula varianceLift verified |
| `sim/` | `score-distribution.ts` (Poisson margin distribution) | `__tests__/simulation-cloud.test.ts` (6 tests for `scoreDistribution`) | Yes — equal rates → symmetric; higher home rate tilts home; probabilities sum to 1 |
| `correlation/` | `evaluate.ts` (query evaluator + aggregates), `load-settled-picks.ts` (DB → row mapping), `query-schema.ts` (validation) | `__tests__/correlation-evaluate.test.ts` (3), `correlation-load-settled-picks.test.ts` (4), `correlation-query-schema.test.ts` (4) | Yes — WIN_RATE, AVG_CONFIDENCE, AVG_EDGE aggregates verified; filter operators (EQ, GT, BETWEEN, IN) validated |
| `parlay/` | `parlay.ts` (Parlay Genome / Portfolio Surgeon: EV, houseEdge, survivability, dependencyCoefficient) | Colocated: `parlay.test.ts` (8); external: `tools-parlay-calculator.test.tsx` (6) | Yes — EV = survivability*payout - 1; houseEdge = 1 - fairPayout/payout; dependencyCoefficient = boundLegs/totalLegs |
| `parlay-mri/` | Does not exist as a lib dir. The `/parlay-mri` app page (`app/parlay-mri/page.tsx`) is a UI shell that imports `ParlayGenome` → `parlay.ts` (`computeVitals`, already tested above). | N/A (no dedicated parlay-mri lib tests) | N/A — covered via parlay.ts tests |
| `optimizer/` | Does not exist as a lib dir. The `/optimizer` app page (`app/optimizer/page.tsx`) is a UI shell that imports `OptimizerWorkspace` → `apps/web/lib/fantasy/dfs-optimizer.ts`. | `__tests__/fantasy-pool-gating.test.ts` (15 — checks pool gating, not math); `lib/fantasy/dfs-optimizer.test.ts` (23 tests) | Yes — DFS optimizer math (lineup generation, exact DP solver, exposure control, determinism at 600-player scale) |
| `backtest/` | `artifact.ts` (file writer, best-effort, fail-open), `harness.ts` (Brier decomposition, calibration snapshot regression detection) | Colocated: `artifact.test.ts` (3), `harness.test.ts` (12) | Yes — Brier REL decomposition, regression detection vs baseline |
| `calibration-training/` | `claude.ts` (Claude API insight generation with policy guardrails), `insight-prompt.ts` (system/user prompt templates) | `__tests__/calibration-insight-claude.test.ts` (5) | Yes — policy blocks betting advice/CTA; budget enforcement; thin-week deterministic fallback |

### `@sports/prediction-engine` package (shared math)

All core math functions live in `packages/prediction-engine/src/` and are re-exported via `@sports/prediction-engine`:

| Function | File | Tests | Hand-trace |
|---|---|---|---|
| `compositeScore` | `composite-score.ts` | `__tests__/composite-score.test.ts` (7) | Weighted avg with confidence + freshness decay; NaN/Infinity guarded to 0 |
| `poissonPmf` | `poisson.ts` | `__tests__/poisson.test.ts` (37) | e^(-λ)·λ^k/k! verified |
| `brierDecomposition` | `brier-ogd-ensemble.ts` | Multiple (regression-detector, reconstruction-calibration) | RES + REL + UNC decomposition verified |
| `summarizeGaussianCopulaPortfolio` | `projections/correlation.ts` | `__tests__/correlation.test.ts` (3) | correlatedVar = independentVar + 2*Σ(rho_ij * σ_i * σ_j) verified |

## Hand-traces (all match documented formulas)

1. **Parlay computeVitals** (`parlay.ts`): SAMPLE_LEGS 5-leg ticket →
   - `survivability = Π(winPr) = 0.55*0.50*0.48*0.57*0.29 = 0.0218` ✓
   - `payoutDecimal = Π(odds) = 1.91*1.91*1.83*1.70*3.20 = 36.32` ✓
   - `ev = survivability*payout - 1 = -0.208` (< 0 ✓ — test expects negative EV)
   - `dependencyCoefficient = 2/5 = 0.4` (two Game-1 legs out of 5 ✓ — test expects toBeCloseTo(0.4))
   - `correlated.length = 1` (Game-1 stack ✓), `verdict = "Mutated"` (correlated + neg EV ✓)

2. **Projection distribution** (`distribution.ts`): posterior(conformal) + posteriorVariance=2.25, interval[8,24] @ alpha=0.2 →
   - `zForAlpha(0.2) = 1.282` (alpha ≤ 0.2 → 1.282 ✓)
   - `intervalStdev = (24-8)/(2*1.282) = 6.240` ✓
   - `posteriorStdev = sqrt(2.25) = 1.5` ✓
   - `stdev = max(6.240, 1.5, 3.08) = 6.240` ✓
   - `floor = max(0, 8) = 8` ✓, `ceiling = max(8, 24) = 24` ✓ (test expects 8 and 24)
   - `spikeProb = 1 - Φ((24-14)/6.24) > 0` ✓, `bustRisk = Φ((8-14)/6.24) > 0` ✓

3. **Gaussian copula** (`correlation.ts`): qb(21,5)+wr(15,6)+rb(14,4), qb→wr rho=0.35 →
   - `mean = 21+15+14 = 50` ✓
   - `independentVar = 25+36+16 = 77`, `independentStdDev = sqrt(77) = 8.775` ✓
   - `correlatedVar = 77 + 2*0.35*5*6 = 77+21 = 98`, `correlatedStdDev = sqrt(98) = 9.899` ✓
   - `varianceLift = 9.899/8.775 - 1 = 0.128 > 0` ✓ (test expects > 0)

4. **Score distribution** (`score-distribution.ts`): Poisson(2.4, 2.4) →
   - Home win prob = away win prob = 0.406 (symmetric ✓), tie = 0.188 (sum=1 via normalization ✓)
   - Higher home rate (3.4 vs 1.6) tilts home win prob up ✓

5. **Galaxy Index** (`player-composite.ts`): `50 + 15*compositeScore.score` → score=1→65, score=0→50, score=4→100, score=-4→0 ✓

6. **Availability signal** (`player-composite.ts`): Out+DNP+concussion → -2.5 (clamped); Limited → -2.0; Questionable → -0.5; No injury → 0 ✓

7. **DFS optimizer** (`fantasy/dfs-optimizer.ts`): exact DP solver, deterministic at 600-player scale, respects salary cap + positional requirements ✓

## VERIFY

- All colocated + external test files for P15-06 directories: `npx vitest run` from `apps/web/`
  - 18 test files, 118 tests — ALL PASSED (exit 0)
- `@sports/prediction-engine` package tests: `npx vitest run` from `packages/prediction-engine/`
  - 201 test files, 2328 tests — ALL PASSED (exit 0)
- DFS optimizer + pool gating tests: 38 tests — ALL PASSED (exit 0)
- Hand-traces: 7 calculation paths re-derived from source via `node -e` — all match documented formulas

## VERDICT

No mathematical bugs found. No directory has zero test coverage for its core calculation. The two "missing" lib directories (`parlay-mri/`, `optimizer/`) are actually UI shells — their math is tested through `parlay.ts` and `dfs-optimizer.ts` respectively. No code changes made. No commit required (no bugs to fix).

## COMMIT NOTE

P15-06 is a read-only sweep with no code changes — the findings are appended to this document only. Per task instructions ("write one narrow regression test for the highest-risk function" only applies when a directory has zero tests, which none do — so no new test files were needed).

---

# Appendix: P15-07 — Sweep: ops, monitoring & background jobs

**Task:** P15-07
**Status:** DONE (code fix committed in 38b82ec; journal + queue DONE-marking completed in this run)
**Directories swept:** `apps/web/lib/{ops,observability,synthetic-monitoring,health,cache,tasks,workers,cron,push}` + `apps/web/app/api/cron/**/route.ts` + `apps/web/app/api/health/route.ts`

## The bug found and fixed

The P15-07 task targets the silent-no-op failure class: a background job/cron that returns HTTP 200 + `ok: true` even when its core work has completely failed, so the platform scheduler treats a dead run as healthy.

**`apps/web/app/api/cron/free-spine-health/route.ts` (FIXED in commit 38b82ec)**

The route computed `probeFailed` (all sports failed to return games) and used it to decide the `ok` field on the `IngestionRun` record (line 105, `failed: probeFailed`), but the HTTP response was unconditionally `200 + ok: true`. This meant:
- The Vercel platform cron scheduler saw a 200 and treated the run as healthy.
- Any Sentry-less local deploy (no alerting wired) would see only a `FAILED` IngestionRun row + a `console.warn` in server logs — no visible HTTP-level signal.
- This is precisely the "silently no-ops instead of erroring loudly" pattern P15-07 targets.

**Fix applied (commit 38b82ec):** Added a guard before the success-path return (lines 163-184): when `probeFailed` is true, return HTTP 503 + `{ ok: false, status: "probe_failed", probeFailed: true, error: "...", live, summary }`. The full diagnostic body is preserved. The `boardFill` sub-failure stays best-effort (it already has `captureError`).

**Test added:** `apps/web/__tests__/free-spine-health-route.test.ts` (3 tests):
- 401 without bearer secret
- 200 + `ok: true` when the probe succeeds (games returned)
- 503 + `ok: false` + `probeFailed: true` when every sport fails to return games

**`npx vitest run __tests__/free-spine-health-route.test.ts` → 3 passed (3), 72ms.**

## Broader sweep of the ops cluster — other crons/workers checked

For each cron/worker in `apps/web/app/api/cron/` and each module under `apps/web/lib/{ops,observability,synthetic-monitoring,health,cache,tasks,workers,push}`, I checked whether the same silent-no-op pattern exists (returns 200 + ok:true unconditionally when core work fails):

| File | Pattern | Verdict |
|---|---|---|
| `apps/web/app/api/cron/settle-picks/route.ts:217` | `ok: okCount === results.length` — reflects actual success count | NOT silent no-op |
| `apps/web/app/api/cron/generate-drafts/route.ts:125` | `ok: true` but `generateDailyBrief` has no try/catch — a throw produces Next.js 500. Weekly/quiet-board failures caught+logged by design | NOT silent no-op |
| `apps/web/app/api/cron/health-alert/route.ts:166` | `ok: true` but always includes `unhealthy` + `decisionReason` in body; ok means "cron ran" not "system healthy" | NOT silent no-op |
| `apps/web/app/api/cron/prune-rate-limits/route.ts:48-55, 78-85` | Returns 503 on stub-mode DB and on store failure | WELL-DESIGNED |
| `apps/web/app/api/cron/backfill-*/route.ts` | Returns `{ status: 400 }` / `{ status: 500 }` on failure | WELL-DESIGNED |
| `apps/web/app/api/cron/calibration-metrics/route.ts:453` | Returns `{ ok: false }` on error with `{ status: 500 }` | WELL-DESIGNED |
| `apps/web/app/api/health/route.ts:61,69` | `ok: allOk` + HTTP 503 when checks fail | WELL-DESIGNED |
| `apps/web/lib/ops/scheduler-liveness.ts:100-172` | Never throws; always returns status string; distinguishes "scheduler dead" from "quiet board" (OP-003) | WELL-DESIGNED |
| `apps/web/lib/synthetic-monitoring/dashboard.ts:391-401` | `runnerStatusFromArtifact` returns "paused" (not "healthy") when artifact absent | WELL-DESIGNED (OP-003 fix in place) |
| `apps/web/lib/health/live-capability-probes.ts:108-231` | Every check branch sets `status: "ok"` or `status: "error"`; catch blocks set error with static detail | WELL-DESIGNED |
| `apps/web/lib/observability/sentry.ts` | No-op when SENTRY_DSN absent — by design, documented | BY DESIGN |
| `apps/web/lib/push/*` | Checked — no silent failure patterns | NO ISSUES |
| `apps/web/lib/tasks/*` | Checked — task runtime catches+logs errors, does not silence them | NO ISSUES |

## Conclusion

Only the free-spine-health route had the actual silent-no-op bug. No other cron/worker in the ops/monitoring/background-jobs cluster exhibits the same failure class. The fix is committed (38b82ec), tests pass, and the broader sweep confirms no additional silent-no-op patterns in this cluster.

**Files touched by this task:**
- `apps/web/app/api/cron/free-spine-health/route.ts` (fixed — probe failure -> 503)
- `apps/web/__tests__/free-spine-health-route.test.ts` (new — 3 tests)
