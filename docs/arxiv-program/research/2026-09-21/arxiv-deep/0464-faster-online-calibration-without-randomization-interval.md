# [0464] Faster Online Calibration Without Randomization: Interval Forecasts (arXiv:2204.13087v2)

**Citation:** Gupta, C., Ramdas, A. (2022). *Faster Online Calibration Without Randomization: Interval Forecasts*. arXiv:2204.13087v2. URL: https://arxiv.org/abs/2204.13087v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 11926 lines). Note: cached v2 revision is dated August 7, 2026; the arXiv ID year (2022) is used for citation.
**Verdict:** ADAPT — the deterministic O(1/T) interval-calibration protocol is a theoretically clean online re-calibration layer for GSE's streaming engine probabilities, but it is a proof-only result with no sports data, and its interval outputs need an operational mapping before they can touch published picks.

## 1. Research question
In the adversarial online binary-forecasting game, can a forecaster achieve calibration at rate o(1/√T) **without randomization**? Classical results say deterministic point forecasts are stuck at Θ(1) and randomized ones at Θ(1/√T). The paper shows that by forecasting a *set* of two adjacent grid points (an interval of width ≤ 2ε) instead of a single point — letting the realized outcome select which endpoint "counts" — deterministic forecasts achieve O(1/T) ε-calibration, with a matching Ω(1/√T) lower bound proving classical randomization cannot do better.

## 2. Dataset / schema
No empirical dataset. The setting is the fully adversarial online protocol: at each round t = 1…T, the forecaster outputs a forecast and the adversary outputs y_t ∈ {0,1} with full knowledge of the forecaster's strategy (but the forecaster's randomness, if any, is hidden). A Bernoulli-strategy appendix analyzes a stochastic adversary. There is no train/test split and no sports data of any kind.

## 3. Method / model
- **POTC-Cal algorithm (Almost-One-Step-Ahead / "Predict-Then-Choose"):** the forecaster maintains a 2ε-grid {M_1,…,M_m} ⊂ [0,1]. Each round it computes deficit/excess statistics per bin and checks two conditions (A and B, formalized in Lemmas 1, 2, 5); it then outputs either a single point (M_i, M_i) or the adjacent pair (M_i, M_{i+1}) — an interval of width at most 2ε. The realized y_t determines which endpoint is used in the calibration accounting.
- **Game-theoretic proof:** the calibration game is cast as a Blackwell approachability problem (Game-II); the "almost" one-step-ahead structure yields the fast rate.
- **Lower bound:** shows any classical (possibly randomized) point-forecasting strategy has expected ε-calibration error Ω(1/√T) — so POTC's O(1/T) is a genuine, provable improvement, not a constant-factor tweak.
- **Appendices:** full proofs, the PI-F99 probability inequality, a Bernoulli-adversary analysis showing E[ε-CE_T] ≤ O(poly log T / T), and an extension to bounded [0,1]-valued (non-binary) outcomes.

## 4. Equations & assumptions
Paper's core formalism: calibration error CE_T = Σ_i (N_i^T/T)·|M_i − p_i^T|, where N_i^T is the count of forecasts at grid point M_i and p_i^T the empirical outcome frequency there; ε-calibration error ε-CE_T = max(CE_T − ε, 0). **Theorem 1 (headline):** POTC-Cal guarantees ε-CE_T ≤ m/T for every T and every adversarial outcome sequence — a deterministic O(1/T) rate. **Theorem 3 (lower bound):** classical randomized point forecasting has E[ε-CE_T] = Ω(1/√T), proved via Blackwell approachability (Val, Val^p, Val* value functions). Supporting results: Lemmas 1, 2, 5 (deficit/excess conditions A/B); the PI-F99 inequality appendix; the Bernoulli analysis with epoch lengths K_k = ⌈(0.85 log T_k/ε)²·(log log(T_k/2) + 0.72 log(5.2 m T_k²))⌉ giving E[A^T] = T − O(poly log T) and Pr(G) = 1 − O(1/T). The paper notes Qiao & Valiant's Ω(T^−0.472) bound for context. Assumptions: binary (or bounded [0,1]) outcomes; a fixed finite grid of resolution 2ε; the adversary is oblivious to the forecaster's internal randomness only in the classical comparison — POTC itself needs no randomness at all.

## 5. Features / target
- **Input (per round):** the history of past forecasts and outcomes; the forecaster's current deficit/excess statistics per grid bin.
- **Target:** the next binary outcome y_t; the forecast is a grid point or adjacent pair, scored by the calibration-error accounting above.
- Horizon: indefinite online stream; guarantees hold for all T simultaneously.

## 6. Validation design
Proof-based, not empirical. Validation consists of: (a) the upper-bound proof (Theorem 1) that POTC-Cal achieves ε-CE_T ≤ m/T against *any* adversary; (b) the lower-bound proof (Theorem 3) that classical strategies cannot beat Ω(1/√T) in expectation; (c) the Bernoulli-adversary appendix giving E[ε-CE_T] ≤ O(poly log T /T) with explicit epoch schedule K_k; (d) the bounded-output extension. Open questions stated: a matching lower bound for POTC itself, more than two choices per round, and multidimensional analogues.

## 7. Numerical results / baselines
No empirical numbers — the "results" are rates: deterministic point forecasts Θ(1) (uncalibratable); classical randomized point forecasts Θ(1/√T) expected ε-calibration (with the paper's Ω(1/√T) lower bound); POTC interval forecasts O(1/T) deterministically (ε-CE_T ≤ m/T). Bernoulli appendix: E[ε-CE_T] ≤ O(poly log T / T); epoch schedule constant K_k as in §4; E[A^T] = T − O(poly log T); Pr(G) = 1 − O(1/T). Reference rate from prior work: Qiao & Valiant Ω(T^−0.472). All are theorems, not measurements.

## 8. Code / data availability
None stated in the extracted text (theory paper; the algorithm is fully specified in pseudocode/prose and is implementable from the paper).

## 9. Leakage & limitations
- **No data, no experiments:** the entire contribution is theorems; there is zero evidence about finite-sample behavior on real probability streams, let alone sports.
- **Adversarial ≠ NFL:** the guarantee holds against a worst-case adversary; NFL outcomes are stochastic but not adversarial, so the O(1/T) rate's practical advantage over a well-tuned online recalibrator (e.g., running Platt/isotonic) is unquantified.
- **Interval outputs are awkward:** GSE publishes point probabilities (cards, edge sheets, Kelly sizing all need a number). An interval of width 2ε must be collapsed to a point for any downstream use, and the paper gives no canonical collapse — the calibration guarantee technically applies to the interval protocol, not to an arbitrary midpoint.
- **Grid dependence:** the m/T bound scales with grid size m; fine grids (small ε) weaken the constant. Choosing ε is a real hyperparameter the theory doesn't resolve.
- **Stationarity of the guarantee:** the bound is worst-case over sequences, which is strong, but it says nothing about *sharpness* — a constant 0.5-forecaster can be perfectly calibrated. GSE needs calibration *and* resolution.
- Open problems (paper's own): POTC lower bound, >2 choices, multidimensional forecasts — the last being exactly what a multi-market engine needs.

## 10. GSE overlap
Per `existing-research-map.md`, GSE's calibration stack covers CQR, temperature/Platt/isotonic scaling, Venn-Abers, Mondrian/cross-conformal, Clopper-Pearson intervals, and ECE-by-slice dashboards — all *batch* methods. **Online** recalibration of a streaming engine (probabilities updated as games resolve through a season) is thin in the map: the 15-area ML brief lists "online learning" as a commissioned topic with results pending, and "conformal uncertainty" is batch. POTC is therefore an **extension** into genuinely uncovered territory (deterministic online calibration with rates), not a duplicate. It does not replace the batch stack.

## 11. GSE implementation spec
- **Data:** GSE engine's sequential probability stream — e.g., weekly moneyline/spread-cover probabilities vs realized outcomes across seasons, in chronological order.
- **Adaptation:** implement POTC-Cal as an online *recalibration layer*: maintain the 2ε-grid over [0,1] (start ε = 0.025), track per-bin deficit/excess as games resolve, and each week output the POTC interval; collapse to a point via the interval midpoint for downstream consumers (flagging this as the operational compromise), while logging the interval width as an uncertainty signal. Run it in parallel with (not replacing) the batch recalibrators.
- **Serving:** a lightweight stateful service (per-bin counts only — trivial compute); refit-free by construction.
- **Effort:** 1 engineer-week to implement from the paper's pseudocode + 1 week for the backtest harness.

## 12. Reproducible test
Chronological backtest on 2020–2025 NFL seasons: feed the engine's weekly spread-cover probabilities (raw, un-recalibrated) through POTC-Cal with ε = 0.025 in time order, and compute the realized ε-calibration error trajectory vs (a) the raw stream and (b) a running-Platt recalibrator refit each offseason. Also track Brier score and a sharpness metric (prediction SD) — the paper guarantees calibration, not sharpness, so the test must verify POTC doesn't achieve calibration by collapsing toward the base rate.

## 13. Acceptance / rejection gate
**Adopt** POTC as a parallel online recalibration signal iff, over the 6-season chronological backtest, its end-of-season ε-CE (ε=0.025) is ≤ 0.5× that of the running-Platt baseline AND its prediction SD stays ≥ 0.8× the raw engine's SD (no sharpness collapse) AND its Brier score is no worse than raw + 0.002. **Reject** (keep batch recalibration only) if it fails the calibration-speed bar or if the interval-midpoint collapse introduces a systematic bias vs the batch LRD dashboard — a pretty theorem with no empirical win stays in the library.

## 14. Improvement experiment
Go beyond the paper's open problem on multidimensional forecasts: run **one POTC instance per market** (spread, moneyline, total) with a *shared* ε tuned jointly, and test a "two-choice" extension the paper leaves open — outputting the interval but scoring the endpoint *closest to the batch-recalibrated probability* rather than letting y_t choose. Measure whether this hybrid beats both pure POTC and pure batch recalibration on walk-forward log loss; if it does, GSE gets a publishable synthesis the theory literature hasn't built.
