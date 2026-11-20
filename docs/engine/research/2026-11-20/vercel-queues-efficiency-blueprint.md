# Vercel Queues & Operating-Efficiency Blueprint (Wave 6)

Date: 2026-11-20
Bucket: docs/engine/research/2026-11-20/
Status: ACTIVE ARCHITECTURE BLUEPRINT

## 1. Complete 40-Route Cron Surface Inventory (`apps/web/app/api/cron/`)

Audited all **40** route directories under `apps/web/app/api/cron/` alongside `apps/web/vercel.json` and the kernel allowlist (`apps/web/lib/autonomy/safe-cron-targets.ts`):

| Bucket | Cron Route Slugs | Dispatch Mode Recommendation |
|---|---|---|
| **Kernel Allowlisted (`AUTONOMY_SAFE_CRON_TARGETS`, max 4 actions/tick)** | `free-spine-health`, `settle-picks`, `refresh-odds`, `generate-drafts`, `calibration-metrics`, `compound-fabric-audit` | Keep synchronous HTTP trigger from `autonomy-cycle`, with per-entity fan-out offloaded to async Queue messages for heavy batches. |
| **Queue Fan-Out / Long-Running Backfill & Ingest Candidates (`16` routes)** | `backfill-historical-games`, `backfill-independent-trueprob`, `backfill-player-data`, `backfill-team-efficiency`, `backtest-calibration`, `feature-recipe-backtest`, `hydrate-cold-plane`, `ingest-player-stats`, `ngs-ingest`, `props-slate-shadow`, `board-fill`, `generate-signal-slate`, `drain-ai-telemetry-recovery`, `refresh-player-stats`, `refresh-wire`, `site-wide-workflows` | Strong candidates for bounded Vercel Queue topics (`topic -> consumer worker`) with idempotent dedupe keys, capped concurrency, and retry-after backoff so single Serverless invocations stay well under function duration ceilings. |
| **Orderly Financial / Ledger / Compliance Jobs (`5` routes)** | `repair-checkout-attempts`, `reconcile-entitlements`, `signal-ledger-census`, `signal-ledger-write`, `run-formal-receipt` | Keep strictly serial / idempotent (`CheckoutAttempt` lease & Stripe `Idempotency-Key` unchanged); never parallelize non-idempotent financial writes. `gamma` remains isolated per compliance hold. |
| **Lightweight Heartbeats, Monitors & Delivery (`13` routes)** | `arbiter-adjudication`, `autonomy-cycle`, `deliver-settlement-alerts`, `game-weather-capture`, `health-alert`, `jarvis-snapshot`, `microstructure-report`, `prediction-market-snapshot`, `prune-rate-limits`, `watch-scheduler`, `watch-warm`, `gamma`, (`+` 6 allowlisted above) | Retain direct scheduled Vercel Cron execution (sub-second / low-memory execution, zero Queue hop overhead). |

## 2. Wave 6 Implemented Efficiency & Security Hardening

1. **Hot-Path File-I/O & Parsing Elimination (TypeScript):**
   - `packages/prediction-engine/src/nfl/week7-live.ts`: module-level `Map<string, unknown>` cache in `load<T>` eliminates repeated synchronous disk JSON parses.
   - `packages/prediction-engine/src/nfl/situational-reality.ts`: memoizes `pfr_qb_pressure.json` in `cachedPressureTable`.
   - `packages/prediction-engine/src/reasoning/corpus-evaluator.ts`: `WeakMap<readonly CorpusRawItem[], readonly ParsePaperResult[]>` avoids re-parsing identical corpus arrays across calls.
   - `packages/prediction-engine/src/reasoning/mind-reasoning.ts`: caches default `loadCitableMindCorpus()` and uses a `WeakMap<readonly MindRecord[], ...>` for citable positive-magnitude filtering.
   - `packages/prediction-engine/src/verification/neuro-symbolic-z3-verifier.ts`: adds `/* webpackIgnore: true */` alongside `/* @vite-ignore */` on optional `z3-solver` dynamic import, clearing Next.js Webpack critical-dependency bundle bloat/warnings.
   - `apps/web/lib/data-sources/free-settlement-runner.ts`: replaces O(N^2) `pendingRows.find(...)` scans with O(1) `Map` lookups (`pendingById.get(o.pickId)`).
   - `apps/web/lib/intelligence-core/situational-trace.ts`: replaces unsafe `as unknown as TraceFamily` cast with an exhaustive `Record<WebSignalFamily, TraceFamily>` mapping all 10 web signal families plus canonical `TraceFamily` identity pass-through.

2. **Python Warning Hygiene & Odds API Pagination Cap:**
   - `intelligence/equations/honest_equation_executor.py`: raw docstrings `r"""` eliminate `SyntaxWarning` on `\d` / `\s`.
   - `src/gse_engine/tracking/wave46_*.py` & `wave48_*.py`: explicit `.astype("boolean").fillna(...)` eliminates pandas downcasting `FutureWarning`.
   - `scripts/ops/refresh_live_dk_odds_and_props.py`: enforces `MAX_PAGES = 25` pagination ceiling and bounded exponential backoff on HTTP 429/5xx retries.

3. **Optional Fail-Closed IAP Route Guard (`apps/web/lib/auth/iap-route-guard.ts`):**
   - Wraps `verifyIapJwtAssertion` for internal / GCP-fronted routes; remains completely inert (`enforced: false`) unless `GSE_IAP_ENFORCE === "true"`, and fails closed (`500` missing audience, `401` missing/invalid assertion) when enforced.
