# Corrected Cross-Paper GSE Architecture — Seven-Paper Batch (2026-09-27)

**Problem with the first pass:** seven papers, seven standalone module specs, three of them proposing overlapping aggregation schemes, two of them specifying builds against engine interfaces that don't work the way the specs assumed. This document corrects the architecture: one pipeline, with each paper's contribution placed at its layer and the overlaps reconciled.

**Verified engine facts this architecture rests on** (all checked against remote tip `b3c0ea032`):
- `packages/prediction-engine/src/multi-market-ensemble.ts` — precision-weighted (`w ∝ 1/σ²`) fair-probability fusion; emits `fairProb`, `stdError`, `crossMarketDivergence`; drop-in for `edge-engine.assessEdge`.
- `packages/prediction-engine/src/calibration-ladder.ts` — Platt/sigmoid + Wilson-bounded binned-empirical + isotonic, method selected by held-out time-ordered ECE.
- `packages/prediction-engine/src/source-reliability.ts` — **STUB**, always `INSUFFICIENT_DATA`, blocked on the SignalLedgerEvent (feat/ledger) merge.
- `packages/prediction-engine/src/oos-split.ts` — time-based in-sample/OOS harness with immutable cohort boundary; group-out-capable.
- `packages/prediction-engine/src/edge-engine.ts` — `assessEdge(EdgeInput): EdgeAssessment`, consumes `IndependentEstimate[]`.
- `packages/prediction-engine/src/{pick-clv,synthetic-fade}.ts` — exist with tests.

---

## The pipeline

```
INGEST            STRENGTH              AGGREGATE                    CALIBRATE              LIVE
(2) SGER          (1) BT ratings        (4) LEAP math ──┐             (3) rate audit         (5) live WP
entity            + (R) BT source       (6) deliberative ├─> ensemble ┐  extends               updater
resolution        ranking               protocol outer  ┘            │  calibration-         shrunk rates
for props         ──────────           loop over existing           │  ladder.ts            + logit-stack
                    │                 multi-market-ensemble.ts       │    │                    │
                    └─ fair prices ──>│                             └──>│                    │
                        as prior π_0 ─┘   LOO audit ──> expert-        calibrated             │
                                          dominance detector         probabilities          │
                                          (BLOCKED_ON_LEDGER)                           │
                                                                                        │
CROSS-CUTTING (7, from REJECT): physiological-load prop hypothesis │ WST spike test │
order-contribution interpretability │ group-out validation (oos-split.ts)            │
```

### Layer 1 — Ingest: entity resolution (Paper 2, 2605.23597)
Deterministic, roster-anchored, fail-closed name matcher. Sits *below* the modeling stack: it decides which book quotes are even eligible to enter the ensemble for a given prop. Output: canonical entity IDs; ambiguous matches resolve to `UNRESOLVED` and the quote is dropped (fail-closed), never guessed. This is the prerequisite for everything props-shaped downstream — the rate audit (Paper 3, props-first), the physiological-load hypothesis (Paper 7), and any prop ensemble.

### Layer 2 — Strength: BT ratings + BT source ranking (Paper 1, 2601.14727 + Replacement R, 2606.09409)
Two BT applications, one estimator:
- **Team ratings** (`bt-team-ratings.ts`): async Newman FPI + EM-MAP gamma prior (strong early-season, decaying) + PlusDC home-field/rest covariates → fair moneyline prices. Enters the ensemble as a model family *and* as LEAP's prior `π_0`.
- **Source ranking** (from 2606.09409): pairwise BT over *sources* (which forecaster beat which, per event) with bias covariates — the robust alternative to ranking sources by thin-sample Brier. This is the future content of `source-reliability.ts` once the ledger lands: BT strengths with covariates instead of raw hit-rate rollups.

The two papers are one lane: 09409's covariate-BT (`p_ij = 1/(1+e^{θ_j−θ_i−wᵀx})`) is the estimator that implements 14727's PlusDC form.

### Layer 3 — Aggregate: deliberative protocol + LEAP math over the existing ensemble (Papers 4+6, 2609.01337 + 2609.22497)
**The reconciliation the first pass missed.** There is one aggregation upgrade, not three modules:
1. **Base (exists):** `multi-market-ensemble.ts` — precision-weighted fusion. This is round one.
2. **LEAP math (the revision rule):** add the prior term `π_0` (from Layer 2), reliability shrinkage, tempering `η`, dependency clustering (the operational form of the diversity gate: sources sharing a book family/vendor don't add in quadrature). These are upgrades *to* the existing module.
3. **Deliberative outer loop (the protocol):** `deliberative-ensemble.ts` — independent estimates → LEAP-revision rounds (≤5, tolerance-gated) → post-deliberation revision. Output adds what the current module lacks: `converged`, `finalSpread`, `dispersion` — and dispersion becomes a staking input (non-convergence damps Kelly).
4. **LOO contribution audit** (LEAP's): per-source `ΔfairProb` on removal, logged per event — feeds the expert-dominance detector.
5. **Expert-dominance detector** (Paper 6): per-market-type rolling Brier, best source vs. consensus, Wilcoxon p < 0.05 over ≥50 events → route around the ensemble. **Interface defined now; implementation `BLOCKED_ON_LEDGER`** — it needs the per-source outcome rollups that only exist after SignalLedgerEvent merges and `source-reliability.ts` stops being a stub.

The paper's headline dependency is honored in the build order: **the prior is load-bearing** (LEAP's ablation: no prior < monolithic baseline). The BT price from Layer 2 is not optional garnish; it's the term the ablation says carries the aggregation.

### Layer 4 — Calibrate: denoised rate audit (Paper 3, 2607.00164)
Not a new module — a delta to `calibration-ladder.ts`:
- Empirical-Bayes hierarchical shrinkage `(w + M·p̂_parent)/(n + M)` on the binned-empirical path (M=25 default, tunable; parent = coarser bin or market-implied rate).
- Denoised-rate audit metric: score calibration against shrunk state-conditioned rates `p̂(x)` alongside standard ECE — converges faster, the paper's real contribution.
- Props-first (densest outcomes), then spreads/totals, then live states.

### Layer 5 — Live: in-game win probability (Paper 5, 2609.07617)
Live NFL WP updater: pseudo-count shrinkage `θ̂ = (n·r + κ·π)/(n + κ)` with **clock-dependent κ(t)** (large early, decaying), structural + live models stacked in **logit space** by a gradient-boosted meta-learner. Design constraints from the second pass:
- Feature allowlist: only information available at the game clock (no ex-post totals — the paper's checkpoint leakage, banned by construction).
- Validation: leave-one-game-out via `oos-split.ts` (the correlated-states problem: many states, one outcome per game).
- **Acceptance gate: the Blown-Lead pathwise benchmark** (2601.18774, phase-1 ADAPT) — no departure from the sequential-calibration benchmark on a held-out NFL season, plus log-loss over the pregame prior alone.

### Cross-cutting disciplines (Paper 7's salvage, 2609.23158 — the REJECT that kept giving)
1. **Physiological-load signal class** (hypothesis): workload/rest/travel proxies for props. Next step is a historical study, not engine code. Layer: Ingest-adjacent (new prop features once validated).
2. **WST spike test** (specified, unexecuted): Kymatio 1D scattering on line-movement/EPA sequences vs. simple features; pass gate +0.02 OOS AUC concentrated in non-zeroth-order coefficients. Layer: feature engineering for Live/Aggregate.
3. **Order-contribution interpretability**: every model decomposes "where does your power come from" by scale/source — are your features just amplitude? Standing model-review checklist item, applied engine-wide.
4. **Group-out validation**: the 99.28%→91.55% random-CV→LOSO gap as the standing exhibit. Rule: props from the same game, states from the same game, player-games from the same player-season → group-out, never random splits. `oos-split.ts` is the enforcement point.

---

## Build order (sequenced by dependency, not by paper number)

| Phase | Work | Papers | Unblocks |
|---|---|---|---|
| 0 | Entity resolver (deterministic, fail-closed) | 2 | Prop ingestion for audit + load study |
| 1 | BT team ratings → fair prices + LEAP prior `π_0` | 1, 4 | Aggregation prior; moneyline baseline |
| 2 | LEAP upgrades to `multi-market-ensemble.ts` (prior, tempering `η`, clustering, LOO audit) | 4 | Honest ensemble with audit trail |
| 3 | Deliberative outer loop + diversity gate + dispersion output | 6 | Convergence-aware staking |
| 4 | Calibration-ladder delta (EB shrinkage, denoised-rate audit), props-first | 3 | Faster-converging calibration |
| 5 | Live WP updater (clock-κ, logit-stack, allowlisted features) | 5 | In-game probabilities |
| 6 | WST spike test; load-proxy historical study | 7 | Feature candidates |
| — | **BLOCKED_ON_LEDGER**: source-reliability fill-in, expert-dominance detector, BT source ranking | 6, R | Per-source reliability routing |

Phases 0–2 are buildable today against verified interfaces. Phase 3's detector half waits on the ledger. Phase 6 is research, not engineering.

## What the first-pass architecture got wrong (corrected here)
1. Seven standalone modules → one pipeline with a single aggregation upgrade path.
2. Specs against phantom interfaces → specs against `FETCH_HEAD`-verified modules.
3. `source-reliability` treated as working → explicitly sequenced behind the ledger merge.
4. LEAP vs. deliberative specified twice → outer loop + revision math, one module.
5. Live-WP acceptance invented from scratch → the program already owns the Blown-Lead diagnostic.
6. The REJECT's salvage left as footnotes → four cross-cutting disciplines wired into the pipeline's validation and review gates.

---

*Architecture corrected 2026-09-27. Supersedes the per-paper module specs in the first-pass ledgers where they conflict.*
