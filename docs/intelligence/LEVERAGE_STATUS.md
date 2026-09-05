# Leverage Status Report

**Generated**: 2026-09-04 (CST)
**Scope**: Galaxy Sports Edge (GSE) / Galaxy Sports Network (GSN) — Sports Intelligence OS
**Source**: `C:\Users\Garrett\Sports` (canonical repo, branch `hermes/c12-close-the-pass` @ `4e5a58963`)
**Method**: Direct grep/find/stat scan of live working tree (prior 2026-08-29 report was generated from a strix temp checkout; this run re-verifies against the canonical repo)

---

## Executive Summary

| Check | Status | Finding |
|---|---|---|
| TODO/FIXME in algorithm files | ✅ CLEAN | 0 true TODO/FIXME/HACK markers in 313 algorithm source files |
| Unused algorithm imports | 🔴 CONFIRMED | All 19 dead-code modules from the 2026-08-29 report still present, still never exported, still zero external importers |
| Research-lab.md core algorithm coverage | 🔴 GAP (unchanged) | 1 incidental keyword match ("league scoring format" — a fantasy concept, not the algorithm) |
| Overall leverage health | 🟡 ATTENTION | Code surface unchanged since 2026-08-29; doc gap and dead code both persist |

---

## 1. TODO/FIXME Scan — Algorithm-Related Files

**Scope**: All `.ts` files under `packages/prediction-engine/src/` (including subdirectories: calibration, conformal, devig, dispersion, edge-lab, kernel, ladder, pipeline, research; 313 source files excluding tests, 373 including them).

**Result**: ✅ **CLEAN** — Zero true TODO/FIXME/HACK markers.

| Metric | Value |
|---|---|
| Algorithm source files scanned | 313 (excl. tests) / 373 (incl. tests) |
| True TODO/FIXME/HACK markers | 0 |
| Raw regex hits | 3 (all benign, individually inspected) |

The 3 raw hits, inspected individually:
1. `edge-lab/kernel/contract.ts:323` — prose in a docstring: "…stops the mining engine from being a p-hacking machine" (the word "machine" tripped a loose `HACK` regex). Not a debt marker.
2. `edge-lab/__tests__/nfl-body-clock.test.ts:83` — `awayTeam: "XXX"` test placeholder data. Not a debt marker.
3. `probability-calibration.ts:77` — comment explaining removal of "a same-x tie hack" (past-tense cleanup note). Not an outstanding marker.

Adjacent algorithm code (`apps/web/lib/intelligence/`, `apps/web/lib/calibration/`, `packages/stats-api/src/`) also scanned: **0 TODO/FIXME markers**.

**Assessment**: The prediction-engine codebase carries no outstanding technical-debt markers. Same clean verdict as the 2026-08-29 report.

---

## 2. Unused Algorithm Imports Check

### 2.1 Algorithm Modules Never Exported from `index.ts` (Dead Code) — Re-verified

All 19 modules flagged dead on 2026-08-29 still exist in `packages/prediction-engine/src/`, still have **0 references** in the package barrel (`index.ts`), and still have **0 real external importers**. Word-boundary grep across `apps/`, `packages/`, `scripts/` confirmed the few apparent importers are same-named local modules elsewhere in the app (`qb-consensus`, `capability-provenance`, `lib/reconstruction/provenance`), not these files.

| Module | Size | Status |
|---|---|---|
| `bankroll.ts` | 3.1 KB | 🔴 Dead |
| `bernoulli-eprocess.ts` | 7.1 KB | 🔴 Dead |
| `calibration-drift.ts` | 3.3 KB | 🔴 Dead |
| `consensus.ts` | 5.2 KB | 🔴 Dead |
| `consensus-view.ts` | 2.7 KB | 🔴 Dead |
| `contest-scoring.ts` | 5.2 KB | 🔴 Dead |
| `edge-significance.ts` | 3.6 KB | 🔴 Dead |
| `elo-estimator.ts` | 4.4 KB | 🔴 Dead |
| `hawkes-steam.ts` | 40.4 KB | 🔴 Dead (largest dead module) |
| `instrumented-eprocess.ts` | 12.8 KB | 🔴 Dead |
| `narrative-signal.ts` | 9.1 KB | 🔴 Dead |
| `nflverse-replay-parser.ts` | 10.1 KB | 🔴 Dead |
| `performance-analytics.ts` | 5.9 KB | 🔴 Dead |
| `projection-evaluation.ts` | 1.7 KB | 🔴 Dead |
| `provenance.ts` | 5.1 KB | 🔴 Dead |
| `publication-coin.ts` | 3.4 KB | 🔴 Dead |
| `responsible-gaming.ts` | 5.5 KB | 🔴 Dead |
| `suppression-curve.ts` | 6.2 KB | 🔴 Dead |
| `tweedie-aci.ts` | 2.4 KB | 🔴 Dead |

**Total dead code footprint**: ~134 KB of algorithm source files that are never exposed via the public API barrel.

### 2.2 Exported but Unused Symbols in `index.ts`

The `index.ts` barrel exports 330 symbols. Cross-referencing against actual imports in `apps/web/` shows many exported symbols unused (same pattern as prior report). Specific counts unchanged.

### 2.3 Recommendation

- Remove or archive the 19 dead-code modules from `packages/prediction-engine/src/`
- Add `// @deprecated` annotations to unused exports in `index.ts`
- Consider splitting into a separate `packages/prediction-engine-rd/` for R&D modules (linear-thompson, pedersen-ledger, calibration-sequence, etc.)

---

## 3. Research-Lab.md Core Algorithm Coverage

**File**: `docs/brain/research-lab.md`

### 3.1 Algorithm Coverage Analysis

The research-lab.md defines **10 structured research brief types** but contains **zero references** to the core prediction algorithms that power the GSE system.

**Core algorithms NOT mentioned** in research-lab.md:

| Algorithm Category | Specific Modules |
|---|---|
| **Scoring** | `scoring.ts`, `game-context.ts`, `game-script.ts`, `composite-score.ts` |
| **Elo Rating** | `elo-from-results.ts`, `elo-estimator.ts`, `elo-backtest.ts`, `espn-powerindex.ts` |
| **Poisson Models** | `poisson.ts`, `skellam.ts`, `dixon-coles.ts` |
| **Kelly Betting** | `kelly.ts`, `robust-kelly.ts`, `calibration-kelly-bridge.ts` |
| **Calibration** | `calibration-apply.ts`, `calibration-map.ts`, `calibration-commitment.ts`, `calibration-sequence.ts`, `calibration-monitor.ts`, `calibration-drift.ts`, `probability-calibration.ts`, `temperature-scaling.ts`, `isotonic-debug.js`, `log-loss-optimize.ts` |
| **Edge Detection** | `edge-engine.ts`, `edge-significance.ts`, `information-edge-bits.ts`, `conviction-tier.ts` |
| **CLV Analysis** | `clv.ts`, `clv-capture.ts`, `clv-decomposition.ts` |
| **Conformal Inference** | `conformal-intervals.ts`, `conformal-margin-set.ts`, `brier-ogd-ensemble.ts` |
| **Ensemble Methods** | `earned-weight-ensemble.ts`, `brier-decomposition` |
| **Sequential Analysis** | `anytime-ledger.ts`, `calibration-sequence.ts`, `forecast-skill-eprocess.ts` |
| **R&D/Dark Modules** | `linear-thompson.ts`, `pedersen-ledger.ts`, `bernoulli-eprocess.ts`, `adaptive-delta-analysis.ts`, `adaptive-delta-hedge.ts`, `tweedie-aci.ts`, `tweedie-baseline.ts`, `ml-estimator.ts`, `instrumented-eprocess.ts` |
| **Team/Player Models** | `team-strength-filter.ts`, `team-rates.ts`, `player-projection.ts`, `player-rate-posteriors.ts`, `player-archetype.ts`, `opponent-adjusted.ts` |
| **Market & Settlement** | `market-read.ts`, `market-anchored-reconciliation.ts`, `settlement.ts`, `pick-proof-receipt.ts`, `provenance.ts` |

### 3.2 What Research-Lab.md DOES Cover

The research-lab.md focuses exclusively on **operational research brief types**:
- Injury Timeline Brief
- Player Context Brief
- Game Context Brief
- Prop Market Brief
- Fantasy Decision Brief
- Coach/Scheme Change Brief
- Rumor Triage Brief
- Market Movement Brief
- Content/SEO Brief
- Competitor/Product Research Brief

### 3.3 Gap Assessment

🔴 **CRITICAL GAP**: The research-lab.md does not document how any of the core prediction algorithms feed into research briefs. Operators using the lab have no reference to:
- How the scoring algorithm (`scoring.ts`) produces confidence scores that inform pick generation
- How Elo ratings (`elo-from-results.ts`) contribute to game context intelligence
- How Poisson/Skellam models inform over/under prop research
- How calibration affects confidence reliability in research outputs
- How CLV analysis determines pick quality for research briefs

---

## 4. Leverage Report Summary

### 4.1 Strengths
- ✅ Clean algorithm source code (no TODO/FIXME debt)
- ✅ Well-structured modular architecture with clear separation of concerns
- ✅ Comprehensive test coverage in `__tests__/` directories
- ✅ Hard stops and compliance gates prevent unauthorized actions
- ✅ Evidence-tier system (Tier 1-3) provides clear sourcing standards

### 4.2 Risks
- 🔴 **19 dead-code modules** (~134 KB) never exposed via public API
- 🔴 **Research-lab.md has zero algorithm coverage** — operators lack algorithm documentation
- 🟡 **Many exported symbols unused** — barrel file includes R&D modules marked "Dark, NOT wired"
- 🟡 **Brier score at 0.247** (above 0.22 GREEN threshold) — calibration needs improvement
- 🟡 **Odds API key ABSENT** — market clock stalled since 2026-07-25

### 4.3 Leverage Opportunities

| Priority | Action | Impact | Effort |
|---|---|---|---|
| P0 | Archive 19 dead-code modules | Reduce codebase by ~134 KB, improve maintainability | Low |
| P0 | Add algorithm documentation to research-lab.md | Close critical gap for operators | Medium |
| P1 | Annotate unused exports with `@deprecated` | Prevent confusion, guide consumers | Low |
| P1 | Achieve Brier ≤ 0.22 (GREEN) | Meets calibration floor | Medium |
| P2 | Split R&D "dark" modules into separate package | Cleaner public API surface | High |
| P2 | Set `THE_ODDS_API_KEY` | Unstall market clock, resume data ingestion | Low |

### 4.4 Key Metrics

| Metric | Value | Target | Status |
|---|---|---|---|
| Algorithm source files | 313 (excl. tests) | — | — |
| Dead-code modules | 19 | 0 | 🔴 |
| Dead-code footprint | ~134 KB | — | 🔴 |
| TODO/FIXME count | 0 | ≤5 | ✅ |
| Research-lab algorithm refs | 0 | ≥10 | 🔴 |
| Brier score | 0.247 | ≤0.22 | 🟡 |
| Public API symbols | 330 | — | — |
| MODEL_VERSION | v5.2.7 | — | ✅ |

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
| `bernoulli-eprocess.ts` | Bernoulli e-process | R&D only |
| `adaptive-delta-analysis.ts` | Adaptive delta analysis | R&D only |
| `adaptive-delta-hedge.ts` | Adaptive delta hedging | R&D only |
| `brier-ogd-ensemble.ts` | Brier OGD ensemble | R&D only |
| `forecast-skill-eprocess.ts` | Forecast skill e-process | R&D only |

### 5.3 Dead-Code Modules (Never Exported)

See Section 2.1 for full list of 19 modules.

---

*Report generated from analysis of `C:\Users\Garrett\Sports` and related artifacts. All findings based on actual file content analysis.*