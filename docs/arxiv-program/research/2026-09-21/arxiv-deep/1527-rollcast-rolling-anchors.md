# [1527] Rollcast: Proper-Score Gated Rolling Anchors for Adaptive Probabilistic Time-Series Forecasting (arXiv:2609.05561)

**Citation:** Giancarlo Vercellino (2026). *Rollcast: Proper-Score Gated Rolling Anchors for Adaptive Probabilistic Time-Series Forecasting.* arXiv:2609.05561v1 [stat.ML]. URL: https://arxiv.org/abs/2609.05561
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via pdftotext; all 14 sections incl. benchmark tables, compute notes, discussion, references).
**Verdict:** ADAPT — the rolling-anchor dictionary + nearest-state residual archive + state-adaptive persistence gate is an interpretable, lightweight probabilistic engine GSE can mirror for team-efficiency time series; evaluation is synthetic-only, so ADOPT is not earned.

## 1. Research question
Can a compact dictionary of rolling statistical anchors (mean, median, extrema, regression endpoint, quantiles) combined through a state-dependent proper-score gate produce competitive probabilistic forecasts without any global model?

## 2. Dataset / schema
Synthetic Monte Carlo: 8 pre-specified DGPs (Gaussian AR(1), random walk, local trend, threshold AR, Markov switching, stochastic volatility, heavy-tail t5 AR, variance break), 250 independent replications each (2,000 fitted series), 300 training observations, horizons 1–6 (12,000 forecast targets). Oracle: 10,000 paths from the true DGP conditional on terminal state. CRAN rollcast 0.1.0, R 4.5.1, 1,000 particles, anchor-stratified resampling.

## 3. Method / model
Four layers: (1) rolling anchors A_tj with robust local scale s_t (MAD×1.4826) and relative state x_tj = (A_tj − y_t)/s_t; (2) causal anchor-specific residual distributions from K nearest earlier states (weights κ_tr × responsibility r_tj, Gaussian kernel jitter h_e); (3) multinomial-logit softmax gate trained by BFGS on penalized negative log predictive density of the full mixture (Eq. 14) — rewarded for density quality, not for predicting the ex-post best anchor; (4) state-adaptive persistence ρ_t = ρ_min + (ρ_max−ρ_min)exp(−δ_t/d_ρ) stabilizing the gate; recursive all-anchor particle propagation giving the horizon-h B×M-point weighted mixture (Eq. 20).

## 4. Equations & assumptions
- Anchors (Eq. 2): ȳ_t, med_t, min_t, max_t, regression endpoint ŷ^reg_{t+1} = ȳ_t + b̂_t((W+1)−k̄), quantiles Q_t(q).
- Soft responsibility r_tj = softmax(−(d_tj − min d)/τ) (Eq. 7); state similarity κ_tr = exp(−‖z_t−z_r‖²/M /(2h_x²)) (Eq. 8).
- One-step candidate: Y^{(j)}_{t+1} = A_tj + γ s_t ẽ_tj (Eq. 12); γ=0 → pure discrete anchor mixture.
- Assumptions: rolling functionals span plausible local hypotheses; similar standardized states have similar residual behavior; oracle DGPs as efficiency reference.

## 5. Features / target
Standardized relative anchor positions; standardized anchor errors e_tj = (y_{t+1} − A_tj)/s_t; state movement δ_t drives gate persistence.

## 6. Validation design
Causal by construction: nearest-state archives use only earlier rows; gate fitted on pre-validation origins; hyperparameter staged coordinate search (W, τ, λ, K, h_x, h_e, γ, ϵ, ρ_min/ρ_max, d_ρ) scored on common causal validation origins; final refit on all training history. Wilson/exact binomial cell diagnostics; CRPS, WIS, width, interval score vs. oracle.

## 7. Numerical results / baselines
- Overall vs. oracle: 90% coverage 0.862 (oracle 0.901); 95% coverage 0.915 (oracle 0.952); width 13.6% (90%) / 15.9% (95%) wider than oracle; normalized CRPS 1.144.
- Per-DGP (90% cov / width ratio / CRPS ratio): AR(1) 0.868/0.999/1.098; RW 0.877/1.284/1.196; local trend 0.865/1.659/1.461; TAR 0.845/1.002/1.100; Markov switching 0.861/1.098/1.287; SV 0.864/1.004/1.081; heavy-tail AR 0.859/1.027/1.088; variance break 0.855/1.012/1.109.
- Coverage decays with horizon: 0.898 (h=1) → 0.840 (h=6) at 90%.
- Adaptive search under variance break: γ=1 in 99.2% of fits, h_e=0.55 in 95.2%, W=30 in 54.8%.
- Persistence improved training log score in only 0.65% of fits (mean +0.035) — a smoothing regularizer, not an accuracy gain here.

## 8. Code / data availability
CRAN package rollcast (Rcpp); reproducibility bundle with protocol script and raw forecast rows.

## 9. Leakage & limitations
- No leakage (fully causal design). Evaluation is synthetic only; oracle is the true DGP, not a fitted competitor — no comparison against ARIMA/ETS/GARCH/ML methods, so comparative superiority is unestablished.
- Main weakness identified by author: multi-step conditional calibration; recursive compounding of one-step errors; wider intervals still under-cover (shape/location error, not just dispersion).
- Anchor dictionary omits seasonality, long memory, calendar/multivariate structure; local trend and Markov switching are the hard cases.
- Compute: nearest-state search ~quadratic in training states without an index; particle recursion is BM points per horizon — moderate univariate scale only.

## 10. GSE overlap
No prior ledger combines rolling-statistical anchors with nearest-state residual archives for team-level efficiency time series. The gate-on-proper-score idea generalizes ledger 1525's post-processing: instead of post-processing one model's errors, pool local "anchor" hypotheses with state-dependent weights. The persistence rule (Eqs. 15–17) is directly reusable for engine weight-stickiness.

## 11. GSE implementation spec
- Build a Rollcast analog over team offensive/defensive efficiency time series: anchors = rolling mean/median/extremes/regression endpoint of efficiency margin over windows W ∈ {6,10,16} games; state = standardized anchor displacements; residual archive = efficiency residuals from similar past states (same team, similar strength context).
- Gate: multinomial logit on standardized state, trained by negative log score of the mixture on causal backtest origins; persistence rule from Eq. 16 to keep weights sticky in stable stretches and responsive after shocks (injuries, regime breaks).
- Output: recursive multi-step predictive distributions for multi-week lookahead (playoff probability paths).
- Effort: 3–5 days (prototype on one team's series first).

## 12. Reproducible test
Dataset: team offensive/defensive efficiency (EPA-based) time series, 2021–2024, held-out 2025 season. Build the Rollcast analog; compare vs. engine's current predictive distributions on CRPS and 80/90% coverage over 1–6 week horizons. Expect competitive CRPS on stationary stretches; diagnose the paper's local-trend/regime failure modes on weeks with major injuries or QB changes.

## 13. Acceptance / rejection gate
ADAPT the anchor/persistence components if the prototype's CRPS is within 10% of the engine's current distributions on stable-team stretches AND the persistence rule demonstrably reacts faster to regime shocks (post-injury weeks) than a fixed-persistence baseline; full rollout only after a real-data comparison the paper lacks.

## 14. Improvement experiment
The paper's open wound is horizon-dependent undercoverage — implement the author's suggested horizon-aware residual calibration (γ(h) increasing with horizon) in the GSE prototype and test whether it flattens the 0.898→0.840 coverage decay, something the paper identifies but never tests. Also ablate the persistence rule (author's suggested ablation) to quantify its value on real sports regime shifts.
