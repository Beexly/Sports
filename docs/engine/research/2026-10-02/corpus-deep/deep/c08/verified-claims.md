# c08 Deep Research — Verified Claims

**Slice:** c08 (294 files). **Date:** 2026-10-02. **Method:** Phase-2 critical re-verification — every major claim checked against the actual source file under `~/workspace/vendor/Sports/docs/` (read-only) plus live code/PR state. Five analyst lanes (A–E); lane files in this directory.

**Status labels:** CONFIRMED (matches source) / CORRECTED (source says something different — the correction is the claim) / UNVERIFIABLE (source not found). INFERENCE = analyst reasoning, not corpus fact.

**The headline of this slice:** the calibration honesty machinery is real and measured, but most of the headline remedies are NOT executed. Three "landed" items from the Phase-1 map are wrong: the CQR bug is repaired (not live), the verifier harness is an unmerged draft PR (not landed), the ranking remedy was never built. Details below.

---

## A. Calibration & ranking (lane A)

| # | Claim | Source | Verdict |
|---|---|---|---|
| A1 | conf ≥80 (n=235): claimed 0.8663, realized 0.5191, z=−10.7, Brier 0.3617 vs 0.25 | `docs/ops/hermes/BUILD-QUEUE-2026-09-18-ranking.md:16-17` | CONFIRMED |
| A2 | TOTAL path stamps `rankingP=confidence/100`, no independent total model | `packages/prediction-engine/src/scoring.ts:1051-1052` | CONFIRMED (live code) |
| A3 | `rankingSource` discriminator persisted (priced vs confidence rows) | `scoring.ts:806,1407` | CONFIRMED |
| A4 | rankingSource-tiered remedy specified but NOT built (commit literally titled "NOT BUILT") | repo absence + git `0573059f5` | CORRECTED — not executed |
| A5 | Leaf 6.5–9.5: n=576, 65.86%→57.12%, Δ=−8.74pp, z=−4.42, p=9.7e−06 | `docs/data/CALIBRATION_LEAF_DRIFT_6_5_9_5.md:24-31` | CONFIRMED (p is a lower-bound approx — source admits) |
| A6 | Cochran's Q=19.57, p=6.07e−04, I²=79.6% (drift concentrated, not uniform) | same `:43-60` | CONFIRMED |
| A7 | Leaf-collapse remedy "not applied", owner-gated | same `:202-209` | CONFIRMED (not executed) |
| A8 | MLB totals on-ladder 70/193=36.3% vs off-ladder 136/275=49.5% (~3.8σ) | `docs/ops/PLACEABILITY_AND_PERFORMANCE_2026-09-07.md:49-51` | CONFIRMED (ground truth self-reported corrupt — caveat) |
| A9 | On-ladder ≈ books agreed: the split measures market consensus, not placeability | same `:63` | CONFIRMED (source's own reading) |
| A10 | Late-steam β₂=−0.3386 (SE 0.0392, n=894,127, ~8.6σ, 14× at median odds 25.5) | `0887-final-market-prices-information-aggregation.md:6,28-29` | CONFIRMED — JRA horse racing, ex-post, NOT an NFL edge |
| A11 | ECE 0.0044, isotonic Brier 0.2556 (baseline 0.2815), UNC 0.2499, suppression spread 0.0017, DSC−MCB≈−0.0057 | `docs/ops/edge/2026-08-19-research-frontier-dossier.md:14,25` | CONFIRMED (DSC−MCB derived identity) |
| A12 | MI probe I(score;Y\|q_close)=0.0095 nats, p=0.060 → no measured info beyond close | `docs/ops/archive/root-museum/BUILD_LOG.md:125` | CONFIRMED |
| A13 | Verifier PR #914: 108/108 tests, kill-line gate, 28 factor specs | `RESCUE-2026-09-26-2-verifier-port.md` + GitHub API | CORRECTED — PR open/draft/unmerged; exists only on `hermes/port-verifier-harness` |
| A14 | CQR n−1 clamp bug | `apps/web/lib/calibration/cqr.ts:10-19` | CORRECTED — repaired (unclamped rank, fail-closes +∞); only the acceptance backtest is owed |

## B. Adversarial verification & abstention (lane B)

| # | Claim | Source | Verdict |
|---|---|---|---|
| B1 | 1492: showing uncertain predictions hurt human accuracy 57.8% vs 60.2% (p=0.003); deferral-only helped 61.9% vs 58.4% (p<0.001); wrong-prediction shown → 41.9% on model-wrong subset | `1492-human-ai-selective-prediction.md:28` | CONFIRMED (41.9% is subset-conditioned) |
| B2 | 1492 lab-artifact risk HIGH on magnitude / MODERATE on direction; file marks "Not ADOPT" on magnitudes | same `:34, :49` | CONFIRMED |
| B3 | 1776: per-class abstention, additive vs product ambiguity, randomized feasibility fix, R0/R1 ≤0.05 | `1776-classification-abstention-class-conditional-error-constraints.md:14,19-20,36,51` | CONFIRMED |
| B4 | Live-class RES 0.002 / Brier 0.275 / ECE ~0.11 → RED; "maps fix reliability, not ranking" | `docs/ops/ENGINE_RANKING_RES_NEAR_ZERO.md:4,8` | CONFIRMED (ECE ~0.11, not 0.112) |
| B5 | 0211 LOPO R² 0.38 vs within-individual 0.91 | `0211-crossindividual-generalizability-of-machine-learning-models.md:32-35` | CONFIRMED (0.91 arm likely inflated — file's own caveat `:43`) |
| B6 | ForecastBench-sim ρ=+0.43 (p=0.018, N=30); ρ²≈0.185 | `1472-forecastbench-sim-simulated-world-forecasting.md:27` | CONFIRMED |
| B7 | Isotonic plateaus destroy Kelly ranking while Res≈0; isotonic OFF | `docs/ops/ISOTONIC_EXPLORATION.md` | CONFIRMED |
| B8 | 1151: two-threshold conformal (q̂_predict/q̂_abstain), market-conditional β, three regimes | `1151-learning-conformal-abstention-policies.md:20-23,59,63,75` | CONFIRMED |

## C. Correlated sources, fusion, ensembles (lane C)

| # | Claim | Source | Verdict |
|---|---|---|---|
| C1 | ICI: median Sharpe PW 0.11 / CU 0.16 / CI 0.38 / ICI 0.48; global 0.10→0.34 | `0790-view-fusion-black-litterman.md:46-47` | CONFIRMED |
| C2 | PW (zero cross-covariance) is overconfident; ≥1% log-loss gate is the file's proposed GSE test, not a paper result | same `:49, :73` | CONFIRMED |
| C3 | RD-FGL: MSFE ratios ~0.31–0.44 (60–70% cut), recipe PCA→GL→Woodbury→Bates-Granger→Bai-Perron | `1675-regime-dependent-factor-glasso.md:21` | CONFIRMED (ECB macro data; NFL transfer untested) |
| C4 | gSCAD ASCFE 2.650×1000 best overall | `1482-time-varying-forecast-combination-for.md:40` | CONFIRMED |
| C5 | "70%+ variance cut" belongs to boundary-reflection, NOT group-SCAD | same `:17` | CORRECTED — map misattributes |
| C6 | No CRPS doctrine / no `crps.ts` / nothing wired (but `scrps.ts`, `crpsmod-loss.ts` exist unwired) | `1649-proper-scoring-rules-estimation-forecast-evaluation.md:41` | CONFIRMED with nuance |
| C7 | twCRPS + λ=0.6: ~1.3% avg / ~2.5% max at 90th percentile (mean-to-max, not a CI) | `0746-improving-probabilistic-forecasts-extreme-wind.md:26` | CONFIRMED |
| C8 | Skellam Brier 0.58 vs 0.65 climatology | `1790-skellam-regression-model-for-quantifying-positional.md:54` | CONFIRMED — soccer-domain paper result, NOT NFL |
| C9 | NOTEARS "within 0.002 at ≤60% features" | `1962-notears-continuous-optimization-structure-learning.md:58-61` | CORRECTED — proposed adopt gate, not a measured result |
| C10 | 0004: two-stage Élő beats online p=7.8×10⁻⁵; two-factor/rank-four H2 p≈1; trace-norm 45.89% < naive | `0004-bradley-terry-elo-unification.md:62,72` | CONFIRMED |
| C11 | Ensemble modules exist in `packages/prediction-engine/src/ensemble/` but are scaffolding (CI without ICI; 2209/1482 paper names on generic stacking/EWA blocks), all unwired, gates unevaluated | checkout `ensemble/` | CORRECTED — "math staged, mechanisms partially scaffolded" |

## D. Governance & honesty machinery (lane D)

| # | Claim | Source | Verdict |
|---|---|---|---|
| D1 | Airwave 15-value `claim_type` enum + EMPHATIC/LEAN/HEDGED + UNFALSIFIABLE→never pick evidence + injury corroboration | `docs/ai/airwave/AIRWAVE_OPERATOR_RUNBOOK.md:78-79,130,153-154` | CONFIRMED verbatim |
| D2 | No-bet governor reason codes | `docs/gse/NO_BET_GOVERNOR_METHODOLOGY.md:40-46` | CORRECTED — 7 codes, not 5 (adds `calibration_debt`→PASS, `responsible_gaming`→HARD_PASS) |
| D3 | Governor is "public-safe methodology examples, shadow-only" — posture, not engine brake | same `:5` | CONFIRMED |
| D4 | SHADOW_WOULD_REFUSE + Ed25519 signed receipts + append-only ledger; default SHADOW unless `SRQC_ENFORCE=1` | `docs/governance/COMPLIANCE_MATRIX.md:28-32` | CONFIRMED |
| D5 | RED = gates/maps OFF, no PROVEN copy, publish pause advisory | `docs/ops/MASTER_PROMPT_V2.md:11-14` | CONFIRMED (live-class numbers, not per-class) |
| D6 | `would_not_claim` output contract (4 items, fixture demo) | `docs/fable/demo/DEMO_REPRODUCTION.md:17` | CONFIRMED (tiny but real) |
| D7 | 30+ settled picks per model version before win-rate claims | `docs/intelligence/monetization-lanes.md:43` | CONFIRMED |
| D8 | Quote-precedence ladder: 6 tiers, `stale_higher_tier` divergence flags, non-book hard wall — wired code with tests | `packages/quote-plane/src/precedence.ts:16-23`, `situation-snapshot.ts:80-92` | CONFIRMED |
| D9 | NOVA five draft-state labels; "landed" retired | `docs/ai/phase0/NOVA_CONVERGENCE_FREEZE_HARDENING_ADDENDUM_2026-07-22.md:27-32` | CONFIRMED |
| D10 | JARVIS stub-mode honesty guard (`isStubMode()` short-circuit; fabricated recall forbidden) | `docs/ai/jarvis/JARVIS_MEMORY_PROTOCOL.md:97-99` | CONFIRMED |

## E. Feature families & signals (lane E)

| # | Claim | Source | Verdict |
|---|---|---|---|
| E1 | ARBY formula 65/35 seasons · 65/35 ARBY/YPC · 50/50 offense-defense | `docs/dfs/research/2026-09-26/full-tables/README.md:24` | CONFIRMED (weights replicable; ARBY itself proprietary) |
| E2 | Peak ages RB 24.53 / WR 25.33 / QB 26.67 (149,694 carries / 134,254 targets / 200,377 dropbacks) | `docs/arxiv-program/research/2026-09-21/notes/matt_barlowe.md:9,13,21` | CONFIRMED (one modeler's spline zeros; author disavows causality) |
| E3 | 2609.23158 radar paper REJECT (n=15, LOSO 91.55% ±14.39); the 5 load-proxy backtests are brief-author INFERENCE, unrun | `2609.23158-radar-second-pass.md` | CONFIRMED |
| E4 | Edge-sheet 10-metric set; "pressure EPA = single most predictive split" | `docs/predictions/research/2026-09-17/edge-sheet/DESIGN_BRIEF.md:104` | CONFIRMED list; superlative ASSERTED, not measured |
| E5 | "15% exposure miss swamps 2% rate miss" + Dirichlet-multinomial share core | `docs/data/EDGE_FACTORY_MASTERPLAN.md:158-183,~273` | CONFIRMED as documented priors (header: all magnitudes are priors) |
| E6 | xFP/FPOE preregistered FAIL: Δrho=−0.0165, CI [−0.0396, 0.0086], n=6022 (Unit 1); "highest-ROI build" was a buildability verdict predating the FAIL | `docs/research/2026-09-26/RESCUE-2026-09-26-4-xfp-research.md:15-22` | CONFIRMED — tension reconciled |
| E7 | Drive feature 0.2007·ydstogo − 0.0446·yardline_100, AUC 0.6039 beats GP kink 0.5818 (~4σ, n=11,271); GP form DIED, linear signal survived | `docs/engine/research/2026-09-13/symbolic-regression/REPORT_BOTTLENECK.md:30,47-48,81` | CONFIRMED |

**No claim in this file was marked UNVERIFIABLE** — every source was found where cited or located via search. Where the briefs pointed at moved lines, the mechanism was re-confirmed in live code.
