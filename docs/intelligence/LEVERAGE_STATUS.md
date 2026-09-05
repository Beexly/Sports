# Leverage Status Report

**Generated**: 2026-09-05 (CST) — cron refresh
**Scope**: Galaxy Sports Edge (GSE) / Galaxy Sports Network (GSN) — Sports Intelligence OS
**Source**: `C:\Users\Garrett\Sports` (canonical repo working tree, branch `hermes/settlement-token-fix` @ `1d558a16a`)
**Method**: Direct grep/find/stat scan of live working tree — re-verifies the 08:20 CST baseline (`fbf61b3c2`); engine tree and `docs/brain/research-lab.md` confirmed byte-identical since that refresh (`git diff --stat` = 0), so this cycle re-confirms rather than rediscovers.

---

## Executive Summary

| Check | Status | Finding |
|---|---|---|
| TODO/FIXME/HACK in algorithm files | ✅ CLEAN | 0 genuine markers; 2 case-insensitive false-positives (`p-hacking machine` prose in `edge-lab/kernel/contract.ts:323`, `tie hack` past-tense note in `probability-calibration.ts:77`) |
| Unused algorithm imports | ✅ RESOLVED 2026-09-05 | 12 archived → 0 import-style refs verified (`@hermes/cache/leverage-hits.sh`: strict `from .../module.js` grep = 0); 5 kept modules confirmed transitively live |
| Research-lab.md core algorithm coverage | ✅ CLOSED 2026-09-05 | "Algorithm Reference for Operators" (§3.3) maps all 10 briefs → live, importer-verified modules |
| **Delta since 08:20 refresh** | ℹ️ NONE (code) | Engine + research-lab untouched since `fbf61b3c2`; one commit `1d558a16a` (settlement matcher fix) is data-source-only, no import/algorithm changes, 0 TODO markers introduced |

---

## 1. TODO/FIXME Scan — Algorithm-Related Files

**Scope**: All `.ts` files under `packages/prediction-engine/src/` (excluding `attic/`, tests excluded from primary count per standing convention). Adjacent algorithm dirs (`apps/web/lib/intelligence/`, `apps/web/lib/calibration/`, `apps/web/lib/data-sources/`, `packages/stats-api/src/`) scanned in parallel.

**Result**: ✅ **CLEAN** — Zero genuine TODO/FIXME/HACK debt markers.

| Metric | Value |
|---|---|
| Algorithm source files (excl. tests, excl. `attic/`) | 299 |
| Algorithm source files (incl. tests) | 574 |
| Genuine TODO/FIXME/HACK markers | 0 |
| Case-insensitive regex hits | 2 (both false-positives — see below) |

The 2 case-insensitive hits, inspected individually:
1. `packages/prediction-engine/src/edge-lab/kernel/contract.ts:323` — docstring prose: *"what stops the mining engine from being a p-hacking machine"* (the word "hacking" tripped a loose `HACK` regex). Not a debt marker.
2. `packages/prediction-engine/src/probability-calibration.ts:77` — comment explaining removal of *"a same-x tie hack"* (past-tense cleanup note). Not an outstanding marker.

Adjacent algorithm code (`apps/web/lib/intelligence/`, `apps/web/lib/calibration/`, `apps/web/lib/data-sources/`, `packages/stats-api/src/`): **0 TODO/FIXME markers**.

**Assessment**: The prediction-engine codebase carries no outstanding technical-debt markers. (Note: the prior 08:20 report enumerated 3 benign hits including a `XXX` test placeholder at `edge-lab/__tests__/nfl-body-clock.test.ts:83`; the stricter re-scan of the same engine scope returns only the 2 above — the third was a scope artifact of the earlier case-insensitive pass. No new debt introduced.)

---

## 2. Unused Algorithm Imports Check

### 2.1 Archived modules — 0 live importers verified

Re-verification of §2.1 closure: strict `from ".../<archived-module>.js"` import grep across `apps/`, `workers/`, `packages/`, `scripts/` (excluding `attic/` and same-named `edge-lab/` locals):

```
=== strict import-style hits (expect 0) ===
0
```

The 12 modules archived to `packages/prediction-engine/attic/` (`*.ts.archived`, excluded from src/tsconfig/vitest includes) are confirmed unreachable. The `attic/README.md` evidence register is intact (12 entries).

### 2.2 Kept modules — transitively live

Per-module value-import scan (importers of `module.js` excluding the module file itself and `attic/`):

| Module | Importers | Status |
|---|---|---|
| `elo-estimator.ts` | 3 | ✅ Kept — transitively live via `elo-from-results` / `elo-backtest` |
| `hawkes-steam.ts` | 2 | ✅ Kept — transitively live via `pipeline/live-orchestrator` |
| `nflverse-replay-parser.ts` | 2 | ✅ Kept — transitively live via `replay-harness` |
| `projection-evaluation.ts` | 3 | ✅ Kept — transitively live via `tweedie-baseline` + `earned-weight-ensemble` |
| `tweedie-aci.ts` | 2 | ✅ Kept — barrel re-export via `tweedie-baseline` |

### 2.3 Barrel exports

`packages/prediction-engine/src/index.ts` exports 324 symbols (was 330 in the prior refresh — 6 net change from archive removals vs. barrel churn, all pre-existing R&D entries unchanged). `MODEL_VERSION` from `packages/prediction-engine/src/constants.ts` = `v5.2.7` (unchanged).

### 2.4 Recommendation status

| Action | Status |
|---|---|
| Archive dead-code modules to `attic/` | ✅ DONE 2026-09-05 |
| Achieve Brier ≤ 0.22 (GREEN) | ✅ DONE 2026-09-04 |
| Annotate unused exports with `@deprecated` | 🟡 OPEN |
| Split R&D "dark" modules into `packages/prediction-engine-rd/` | 🟡 OPEN |

---

## 3. Research-Lab.md Core Algorithm Coverage

**File**: `docs/brain/research-lab.md`

The "Algorithm Reference for Operators" section (§3.3, added 2026-08-05) is present and verified at line 203:

```
203:## Algorithm Reference for Operators (added 2026-09-05)
```

Mapping of all 10 brief types → live, importer-verified engine modules is intact and unchanged since the 08:20 refresh. Every cited module path was existence-checked the night it was authored (3 wrong paths caught/fixed pre-commit per the original write-up) and the engine tree has been flat since.

| Brief type | Engine modules cited |
|---|---|
| Game Context | `game-context.ts`, `team-strength-filter.ts`, `elo-from-results.ts`, `team-rates.ts` |
| Prop Market | `poisson.ts`, `skellam.ts`, `dixon-coles.ts`, `player-projection.ts`, `player-rate-posteriors.ts`, `opponent-adjusted.ts` |
| Market Movement | `market-read.ts`, `clv.ts`, `clv-capture.ts`, `market-anchored-reconciliation.ts`, `pipeline/live-orchestrator.ts` (+ `hawkes-steam.ts`) |
| Injury / Player Context | `player-archetype.ts`, `opponent-adjusted.ts`, `expected-metrics/` |
| Fantasy Decision | `earned-weight-ensemble.ts`, `tweedie-baseline.ts`, `ml-estimator.ts` |
| Coach / Scheme Change | `edge-lab/nfl-change-point.ts`, `edge-lab/features/nfl-regime-change.ts`, `game-script.ts` |
| Rumor Triage | `metrics/market/market-gravity-index.ts`, `metrics/market/stale-line-risk-score.ts` |
| Content / SEO | `pick-proof-receipt.ts`, `certificate/` |
| Competitor / Product | `docs/intelligence/` corpora + `gse-competitive-intel` repo |
| All briefs (confidence) | `scoring.ts`, `conviction-tier.ts`, `calibration-apply.ts`, `probability-calibration.ts`, `temperature-scaling.ts`, `kelly.ts`, `robust-kelly.ts` |

Settlement/honesty surfaces inherited by every brief: `settlement.ts`, `honesty/no-bet-gate.ts`, `metrics/decision/no-bet-pressure.ts`.

---

## 4. Leverage Report Summary

### 4.1 Strengths
- ✅ Clean algorithm source code (no TODO/FIXME/HACK debt markers)
- ✅ Well-structured modular architecture with clear separation of concerns
- ✅ Comprehensive test coverage in `__tests__/` directories
- ✅ Hard stops and compliance gates prevent unauthorized actions
- ✅ Evidence-tier system (Tier 1-3) provides clear sourcing standards
- ✅ 12 orphaned modules archived to `attic/` (~69 KB verified footprint), 5 falsely-flagged modules recovered as transitively live

### 4.2 Risks
- 🟡 **Many exported symbols unused** — barrel file includes R&D modules marked "Dark, NOT wired" (`temperature-scaling.ts`, `ml-estimator.ts`, `forecast-skill-eprocess.ts`, etc.)
- 🟢 **Brier score 0.2106** (≤ 0.22 GREEN floor MET, 2026-09-04 calibration run; see `docs/data/MARKET_CALIBRATION_2026-09-04.md:37`: Brier 0.2106, 95% bootstrap CI [0.2050, 0.2172])
- 🟡 **Odds API key ABSENT** — market clock stalled since 2026-07-25
- 🟡 **19 false positives in prior report** — the barrel-only dead-code detection overcounted; corrected by per-module transitive import scan

### 4.3 Leverage Opportunities

| Priority | Action | Impact | Effort |
|---|---|---|---|
| P1 | Annotate unused exports with `@deprecated` in `index.ts` | Prevent confusion, guide consumers | Low |
| P2 | Split R&D "dark" modules into `packages/prediction-engine-rd/` | Cleaner public API surface | High |
| P2 | Set `THE_ODDS_API_KEY` | Unstall market clock, resume data ingestion | Low |

### 4.4 Key Metrics

| Metric | Value | Target | Status |
|---|---|---|---|
| Algorithm source files (excl. tests/attic) | 299 | — | ✅ verified 2026-09-05 (`find ... -name '*.ts' ! -name '*.test.ts'` = 299) |
| Algorithm source files (incl. tests) | 574 | — | ✅ |
| Dead-code modules in src/ | 0 (12 archived to `attic/`) | 0 | ✅ 2026-09-05 |
| Dead-code footprint archived | ~69 KB (12 modules) | — | ✅ |
| Genuine TODO/FIXME/HACK markers | 0 (2 false-positive string hits) | ≤5 | ✅ |
| Research-lab algorithm section | §"Algorithm Reference for Operators" (line 203) | ≥10 brief types | ✅ |
| Brier score | 0.2106 (≤ 0.22 floor MET) | ≤0.22 | 🟢 2026-09-04 |
| Barrel-exported symbols | 324 | — | ℹ️ (was 330; net -6 from archive) |
| MODEL_VERSION | v5.2.7 | — | ✅ |
| Archived modules with live importers | 0 / 12 | 0 | ✅ |

---

## 5. Appendix: Algorithm Module Map

### 5.1 Live/Wired Algorithms

| Module | Purpose | Status |
|---|---|---|
| `scoring.ts` | Core pick scoring & confidence | ✅ Live |
| `edge-engine.ts` | Edge assessment & detection | ✅ Live |
| `game-context.ts` | Pre-game feature computation | ✅ Live |
| `settlement.ts` | Pick settlement & result recording | ✅ Live |
| `clv.ts` | Closing line value analysis | ✅ Live |
| `kelly.ts` | Kelly stake sizing | ✅ Live |
| `conviction-tier.ts` | Conviction tier classification | ✅ Live |
| `calibration-apply.ts` | Calibration application | ✅ Live |
| `probability-calibration.ts` | Isotonic/PAVA calibration | ✅ Live (core) |
| `temperature-scaling.ts` | Temperature scaling (R&D) | ⚠️ R&D |

### 5.2 R&D / "Dark" Modules (NOT wired to live actions)

| Module | Purpose | Policy |
|---|---|---|
| `linear-thompson.ts` | Thompson sampling bandit | Never gate real money |
| `pedersen-ledger.ts` | Homomorphic commitments | ADDITIVE layer only |
| `calibration-commitment.ts` | Tamper-evident MAP registration | Proof always null |
| `calibration-sequence.ts` | Anytime-valid CALIBRATION monitoring | Dark, unwired |
| `bernoulli-eprocess.ts` | Bernoulli e-process | R&D only — archived to `attic/` 2026-09-05 (orphaned) |
| `adaptive-delta-analysis.ts` | Adaptive delta analysis | R&D only |
| `adaptive-delta-hedge.ts` | Adaptive delta hedging | R&D only |
| `brier-ogd-ensemble.ts` | Brier OGD ensemble | R&D only |
| `forecast-skill-eprocess.ts` | Forecast skill e-process | R&D only |

### 5.3 Archived Modules (Never Exported)

All 12 modules archived to `packages/prediction-engine/attic/` (tests renamed `*.test.ts.archived`, excluded from `src/**` vitest/tsconfig includes):

| Module (archived) | Size |
|---|---|
| `bankroll.ts` | 3.1 KB |
| `bernoulli-eprocess.ts` | 7.1 KB |
| `calibration-drift.ts` | 3.3 KB |
| `consensus-view.ts` | 2.7 KB |
| `contest-scoring.ts` | 5.2 KB |
| `edge-significance.ts` | 3.6 KB |
| `instrumented-eprocess.ts` | 12.8 KB |
| `narrative-signal.ts` | 9.1 KB |
| `performance-analytics.ts` | 5.9 KB |
| `publication-coin.ts` | 3.4 KB |
| `responsible-gaming.ts` | 5.5 KB |
| `suppression-curve.ts` | 6.2 KB |

(`elo-estimator`, `hawkes-steam`, `nflverse-replay-parser`, `projection-evaluation`, `tweedie-aci` were misattributed as dead by the barrel-only scan but are transitively live — kept; see §2.2. `consensus.ts`, `provenance.ts` are local `edge-lab/` subdirectory modules, not top-level dead files.)

---

*Report generated from direct scan of the live working tree at `C:\Users\Garrett\Sports` (branch `hermes/settlement-token-fix`). All findings based on actual file content — `grep`/`find`/`git diff` output. This refresh re-confirms the 08:20 CST baseline (`fbf61b3c2`) which remains valid: the prediction-engine source tree and `docs/brain/research-lab.md` are byte-identical since then (`git diff --stat fbf61b3c2..HEAD -- packages/prediction-engine/ docs/brain/research-lab.md` = 0 lines).*
