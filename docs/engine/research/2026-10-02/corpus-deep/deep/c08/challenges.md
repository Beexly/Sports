# c08 Deep Research — Challenges

**Date:** 2026-10-02. Contradictions, weak claims, and the REJECT/FAIL register. Every entry is either a tension between sources the adversary must resolve, a claim that does not survive scrutiny, or a guarded negative result the engine must keep citing.

---

## 1. Contradictions & tensions (with resolutions)

**C1. Calibration-honest vs edge-empty.** ECE 0.0044 / Brier 0.2556 (solved) vs R*≈−0.0057 / MI 0.0095 nats p=0.060 (empty). **Resolution:** not a contradiction — the slice's whole point. Maps rescale; they don't invent resolution. Adversary gates on resolution, never calibration alone.

**C2. Market consensus vs late steam.** High book-consensus games are where the engine underperforms most (36.3% on-ladder); late odds-path moves carry ~14× the return association of cross-sectional final odds. **Resolution:** consensus at rest is noise; the path near close is signal. But the 14× is JRA horse-racing ex-post — the transferable part is the feature-engineering idea (late-move velocity), not the number.

**C3. Transparency vs human-AI performance.** The instinct to show engine leans is contradicted by 1492 (showing uncertain predictions hurt: 57.8% vs 60.2%). **Resolution:** deferral-status-only messaging — but only after the internal replication passes; until then it is a hypothesis with a protocol (file marks "Not ADOPT" on magnitudes). Per-analyst replication, not pooled.

**C4. Sim-to-real.** ForecastBench-sim ρ=+0.43 (ρ²≈0.185 — a signal, not a certificate). **Resolution:** sim-resolved claims need a version-locked simulator (hash before comparison), the ±0.05 slope gate, SIM-RESOLVED labeling with rubric score; <4 inadmissible as pick evidence.

**C5. LOPO 0.91→0.38 collapse.** Within-individual 0.91 used early stopping on training R² — the gap is an upper bound, not a clean measure. **Resolution:** quote "0.38, comparison arm possibly inflated"; LOPO always beside pooled; regime-stratified (team changes confound player-generalization).

**C6. Isotonic: display-fine, staking-harmful.** Plateaus destroy Kelly ranking while RES≈0. **Resolution:** calibration and sizing are one joint decision — Kendall τ ≥ 0.95 rank-preservation or the sizing job fails closed.

**C7. 1482 smooth weights vs 1675 abrupt breaks.** Both true at different scales (gradual model decay + abrupt QB-injury events). **Resolution:** the engine needs both a smooth-weight combiner and a break detector; picking one theory drops real structure.

**C8. Fusion is variance technology, not information technology.** 0790/1482/1675 optimize combination of given sources; if all sources are edge-empty (MI 0.0095), fusion cannot invent resolution. Same lesson as isotonic/Kelly.

**C9. xFP/FPOE: "highest-ROI build" vs preregistered FAIL.** The 9/17 buildability verdict predates the 9/26 holdout FAIL (Δrho=−0.0165, CI [−0.0396, 0.0086], n=6022). **Resolution:** buildability ≠ performance. Surviving narrow theses (role denominator, luck layer, Clay-sign buy-low) need fresh preregistered tests.

**C10. Per-class gates on correlated classes.** 1776 assumes separately meaningful class constraints; spread/ML errors are correlated (same game). **Resolution:** measure inter-class error correlation; if high, the "separate caps" are one cap in disguise — and randomized tie-breaking becomes coin-flips on real money (every draw logged with seed; >10% draw-influenced share → cap-feasibility review).

**C11. 1776 count-loss vs sports unit-loss.** Minimizing abstention count subject to a loss-rate cap can still pick the highest-unit-loss feasible configuration. **Resolution:** re-derive the ambiguity objective in expected-unit terms (v2); count-loss is v1 with the discrepancy logged.

---

## 2. Weak / inflated claims (challenge and downgrade)

- **W1. Map finding 1 (LIVE CQR bug): STALE.** Repaired (`cqr.ts` unclamped rank, fail-closes +∞). Only the acceptance backtest is owed. Never quote as current.
- **W2. Map finding 20 (verifier "already landed"): WRONG.** Open draft PR #914, unmerged; `packages/verifier/` exists only on `hermes/port-verifier-harness`; 108/108 green came from a vitest shim, not CI.
- **W3. Ranking remedy "specified":** specified, committed default `current`, never built (commit "NOT BUILT"). The anti-predictive ordering is live.
- **W4. "70%+ variance cut"** belongs to 1482's boundary-reflection estimator, not group-SCAD.
- **W5. twCRPS "1.3–2.5%"** is average-to-max (1.3% mean, 2.5% max), single split, no multiplicity control.
- **W6. Skellam "Brier 0.58 vs 0.65"** is a soccer-paper result; NFL use is an unexecuted experiment.
- **W7. NOTEARS "within 0.002 at ≤60% features"** is a proposed adopt gate, not a measured result.
- **W8. "Pressure EPA = single most predictive split"** is chart-direction copy in a design brief (line 104) — asserted, never measured.
- **W9. "Per-class eligibility gates (0.275/0.112/0.002 → RED)"** — these are one live class's measured triple, not a per-class table.
- **W10. The no-bet governor "parliament consensus"** — actual state is `model_disagreement` → WATCH (explain, not consensus).
- **W11. Peak ages to two decimals** (24.53/25.33/26.67) — one modeler's spline-derivative zeros; author disavows causality. Priors only, caveat attached.
- **W12. "15% exposure miss swamps 2% rate miss"** — illustrative prior in a doc whose header says all magnitudes are priors.
- **W13. Ensemble modules "implement" 2209/1482** — scaffolding carrying paper names; the paper mechanisms are not implemented (ICI entirely absent).
- **W14. ARBY "ready-to-implement"** — only the 65/35×50/50 composition weights are open; ARBY itself is proprietary.
- **W15. "Airwave maps onto the player-signals intake"** — schema adopted, pipe to production UNVERIFIABLE; the table is still empty.

## 3. REJECT / FAIL register (guarded negative results — cite, don't work around)

| ID | Result | Guard | Source |
|---|---|---|---|
| R1 | xFP/FPOE as next-week rank feature: FAIL (Δrho=−0.0165, CI [−0.0396,0.0086], n=6022) | 12-test `verify-record.test.mjs` + CI | `RESCUE-2026-09-26-4-xfp-research.md` |
| R2 | 2609.23158 skin-radar hardware: REJECT (n=15, LOSO 91.55% ±14.39) | excluded from 750 count; replacement owed | `2609.23158-radar-second-pass.md` |
| R3 | Symbolic GP drive form: DIE (linear 0.6039 beats kink 0.5818, ~4σ) | report verdict | `REPORT_BOTTLENECK.md` |
| R4 | 0004 two-factor/rank-four: H2 p≈1; trace-norm 45.89% < naive | ledger | `0004-bradley-terry-elo-unification.md` |
| R5 | 1482 unpruned local-linear at p>T: loses to equal weights | ledger | `1482-time-varying-forecast-combination-for.md` |
| R6 | 1675 τ=0 (non-sparse) GL variant: among the worst | ledger | `1675-regime-dependent-factor-glasso.md` |
| R7 | 0746 pure-twCRPS training: REJECT if body degrades >1% | ledger | `0746-improving-probabilistic-forecasts-extreme-wind.md` |
| R8 | Pressure-EPA superlative: ASSERTED, soft-reject as stated | lane E | `DESIGN_BRIEF.md:104` |
| R9 | Product-ambiguity abstention: violates caps (Phoneme R0=0.0551) | 1776:36 | `1776-classification-abstention-class-conditional-error-constraints.md` |

**The REJECT-citation rule:** any new thesis contradicting a guarded negative must cite it by path and state why the new test differs. Silent re-wiring around a FAIL is a trust defect.
