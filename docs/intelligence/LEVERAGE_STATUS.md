# Leverage Status Report

**Generated**: 2026-09-05 (CST)
**Scope**: Galaxy Sports Edge (GSE) / Galaxy Sports Network (GSN) — Sports Intelligence OS
**Source**: `C:\Users\Garrett\Sports` (canonical repo working tree, branch `hermes/settlement-token-fix` @ `1a3f00d05`)
**Method**: Direct grep/find/stat scan of live working tree — re-verifies the 2026-09-04 baseline.

---

## Executive Summary

| Check | Status | Finding |
|---|---|---|
| TODO/FIXME in algorithm files | ✅ CLEAN | 0 true TODO/FIXME/HACK markers in 299 algorithm source files (12 dead modules now in `attic/`) |
| Unused algorithm imports | ✅ RESOLVED 2026-09-05 | 12 orphaned modules archived to `attic/`; 5 of the 19 flagged were transitively live and kept |
| Research-lab.md core algorithm coverage | ✅ CLOSED 2026-09-05 | "Algorithm Reference for Operators" maps all 10 brief types to live, importer-verified modules (§3.3) |
|| Overall leverage health | 🟢 IMPROVED | Dead-code + doc-gap closed; Brier ≤0.22 achieved (0.2106, 2026-09-04 run); odds-key stall remains |

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

### 2.1 Algorithm Modules Never Exported from `index.ts` (Dead Code) — CORRECTED 2026-09-05

> **Correction (2026-09-05, night wave on `hermes/night-2026-09-05`):** the
> table below checked the barrel only and missed transitive `from`-imports, so
> it overstated the dead set. Re-verified module-by-module against value
> `from ".../<module>.js"` imports across `apps/`, `workers/`, `packages/`,
> `scripts/` plus barrel refs: **5 of the 19 are reachable and were KEPT**
> (`elo-estimator` ← barrel-exported `elo-from-results`/`elo-backtest`;
> `hawkes-steam` ← barrel-exported `pipeline/live-orchestrator`;
> `nflverse-replay-parser` ← barrel-exported `replay-harness`;
> `projection-evaluation` ← barrel-exported `tweedie-baseline` +
> `earned-weight-ensemble`; `tweedie-aci` ← barrel re-export via
> `tweedie-baseline`). The 12 genuinely orphaned modules (zero barrel refs,
> zero non-test value-imports, prose mentions only) were archived to
> `packages/prediction-engine/attic/` with their tests
> (`*.test.ts.archived`, ignored by the `src/**` vitest/tsconfig includes) and
> an `attic/README.md` recording the evidence. `eprocess-property.test.ts` was
> narrowed to the live `forecast-skill-eprocess` properties.
> (`consensus.ts`, `provenance.ts` in the original table are local modules
> under `edge-lab/` subdirectories, not top-level dead files.)

The 2026-09-04 re-verification (canonical tree, `hermes/c12-close-the-pass` @
`4e5a58963`) confirmed all 19 were still present with 0 barrel refs and 0 real
external importers; word-boundary grep across `apps/`, `packages/`, `scripts/`
showed the few apparent importers are same-named local modules elsewhere
(`qb-consensus`, `capability-provenance`, `lib/reconstruction/provenance`).
The barrel-only method was the flaw — the per-module transitive check above
supersedes it. Disposition as of 2026-09-05:

| Module | Size | Status |
|---|---|---|
| `bankroll.ts` | 3.1 KB | 📦 Archived to `attic/` 2026-09-05 |
| `bernoulli-eprocess.ts` | 7.1 KB | 📦 Archived to `attic/` 2026-09-05 |
| `calibration-drift.ts` | 3.3 KB | 📦 Archived to `attic/` 2026-09-05 |
| `consensus.ts` | 5.2 KB | ℹ️ Not a top-level dead file (local `edge-lab/` module) |
| `consensus-view.ts` | 2.7 KB | 📦 Archived to `attic/` 2026-09-05 |
| `contest-scoring.ts` | 5.2 KB | 📦 Archived to `attic/` 2026-09-05 |
| `edge-significance.ts` | 3.6 KB | 📦 Archived to `attic/` 2026-09-05 |
| `elo-estimator.ts` | 4.4 KB | ✅ KEPT — transitively live via `elo-from-results`/`elo-backtest` |
| `hawkes-steam.ts` | 40.4 KB | ✅ KEPT — transitively live via `pipeline/live-orchestrator` |
| `instrumented-eprocess.ts` | 12.8 KB | 📦 Archived to `attic/` 2026-09-05 |
| `narrative-signal.ts` | 9.1 KB | 📦 Archived to `attic/` 2026-09-05 |
| `nflverse-replay-parser.ts` | 10.1 KB | ✅ KEPT — transitively live via `replay-harness` |
| `performance-analytics.ts` | 5.9 KB | 📦 Archived to `attic/` 2026-09-05 |
| `projection-evaluation.ts` | 1.7 KB | ✅ KEPT — transitively live via `tweedie-baseline`/`earned-weight-ensemble` |
| `provenance.ts` | 5.1 KB | ℹ️ Not a top-level dead file (local `edge-lab/` module) |
| `publication-coin.ts` | 3.4 KB | 📦 Archived to `attic/` 2026-09-05 |
| `responsible-gaming.ts` | 5.5 KB | 📦 Archived to `attic/` 2026-09-05 |
| `suppression-curve.ts` | 6.2 KB | 📦 Archived to `attic/` 2026-09-05 |
| `tweedie-aci.ts` | 2.4 KB | ✅ KEPT — barrel re-export via `tweedie-baseline` |

**Total dead code footprint**: ~134 KB claimed; verified 2026-09-05 at ~69 KB
(70,425 bytes, `du -b` across the 12 genuinely orphaned modules, now in
`attic/`). The other ~51 KB
(`elo-estimator`, `hawkes-steam`, `nflverse-replay-parser`,
`projection-evaluation`, `tweedie-aci`) is transitively reachable — see the
correction note under §2.1.

### 2.2 Exported but Unused Symbols in `index.ts`

The `index.ts` barrel exports 330 symbols. Cross-referencing against actual imports in `apps/web/` shows many exported symbols unused (same pattern as prior report). Specific counts unchanged.

### 2.3 Recommendation

- ~~Archive dead-code modules from `packages/prediction-engine/src/`~~ **DONE 2026-09-05** — 12 archived to `attic/`, 5 proven transitively live and kept, 2 misattributed local modules
- ~~Achieve Brier ≤ 0.22 (GREEN)~~ **DONE 2026-09-04** — Brier 0.2106 (market-calibration evidence)
- Add `// @deprecated` annotations to unused exports in `index.ts` (open)
- Consider splitting R&D "dark" modules into `packages/prediction-engine-rd/` (open)

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

### 3.3 Gap Assessment — CLOSED 2026-09-05

`docs/brain/research-lab.md` gained an "Algorithm Reference for Operators"
section mapping all 10 brief types to live, importer-verified engine modules
(confidence row: scoring → conviction-tier → calibration → quarter-Kelly;
settlement/honesty surfaces inherited by every brief). All cited paths were
existence-checked against the tree the same night (three wrong paths caught
and fixed before commit).

The original gap (§3.1) was that operators using the lab had no reference to:
- How the scoring algorithm (`scoring.ts`) produces confidence scores that inform pick generation
- How Elo ratings (`elo-from-results.ts`) contribute to game context intelligence
- How Poisson/Skellam models inform over/under prop research
- How calibration affects confidence reliability in research outputs
- How CLV analysis determines pick quality for research briefs

All five are now answered by the operator reference section.

---

## 4. Leverage Report Summary

### 4.1 Strengths
- ✅ Clean algorithm source code (no TODO/FIXME debt)
- ✅ Well-structured modular architecture with clear separation of concerns
- ✅ Comprehensive test coverage in `__tests__/` directories
- ✅ Hard stops and compliance gates prevent unauthorized actions
- ✅ Evidence-tier system (Tier 1-3) provides clear sourcing standards

### 4.2 Risks
- ~~🔴 **19 dead-code modules** (~134 KB) never exposed via public API~~ **CLOSED 2026-09-05** — 12 archived to `attic/` (~69 KB), 5 proven transitively live, 2 misattributed local modules
- ~~🔴 **Research-lab.md has zero algorithm coverage**~~ **CLOSED 2026-09-05** — operator algorithm reference added (§3.3)
- 🟡 **Many exported symbols unused** — barrel file includes R&D modules marked "Dark, NOT wired"
- 🟢 **Brier score 0.2106** (≤ 0.22 GREEN floor MET, 2026-09-04 calibration run; see `docs/data/MARKET_CALIBRATION_2026-09-04.md:37`)
- 🟡 **Odds API key ABSENT** — market clock stalled since 2026-07-25

### 4.3 Leverage Opportunities

| Priority | Action | Impact | Effort |
|---|---|---|---|
| ~~P0~~ | ~~Archive 19 dead-code modules~~ **DONE 2026-09-05** | 12 archived, 5 kept live | — |
| ~~P0~~ | ~~Add algorithm documentation to research-lab.md~~ **DONE 2026-09-05** | §3.3 operator reference | — |
| P1 | Annotate unused exports with `@deprecated` | Prevent confusion, guide consumers | Low |
| P1 | Achieve Brier ≤ 0.22 (GREEN) | Meets calibration floor | Medium |
| P2 | Split R&D "dark" modules into separate package | Cleaner public API surface | High |
| P2 | Set `THE_ODDS_API_KEY` | Unstall market clock, resume data ingestion | Low |

### 4.4 Key Metrics

| Metric | Value | Target | Status |
||---|---|---|---|
|| Algorithm source files | 299 in src/ (excl. tests) | — | ✅ verified 2026-09-05 (`find ... -name '*.ts' ! -name '*.test.ts'` = 299) |
|| Dead-code modules | 0 in src/ (12 archived to `attic/`) | 0 in src/ | ✅ 2026-09-05 |
|| Dead-code footprint archived | ~69 KB (12 modules) | — | ✅ |
|| TODO/FIXME/HACK markers | 0 (1 fence false-positive string-literal; see §1) | ≤5 | ✅ |
|| Research-lab algorithm section | §"Algorithm Reference for Operators" | ≥10 brief types | ✅ 2026-09-05 |
|| Brier score | 0.2106 (≤ 0.22 floor MET) | ≤0.22 | 🟢 2026-09-04 |
|| Public API symbols | 330 in barrel | — | — |
|| MODEL_VERSION | v5.2.7 | — | ✅ |

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

### 5.3 Dead-Code Modules (Never Exported)

See Section 2.1 for full list of 19 modules.

---

*Report generated from analysis of `C:\Users\Garrett\Sports` and related artifacts. All findings based on actual file content analysis.*