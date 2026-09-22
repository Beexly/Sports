# [2129] ProbFM: Probabilistic Time Series Foundation Model with Uncertainty Decomposition (arXiv:2601.10591v1)

**Citation:** ProbFM authors (2026). *ProbFM: Probabilistic Time Series Foundation Model with Uncertainty Decomposition*. arXiv:2601.10591v1. URL: https://arxiv.org/abs/2601.10591
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — single-pass epistemic/aleatoric decomposition is exactly the uncertainty taxonomy GSE needs (model uncertainty vs. inherent game randomness), but the paper's empirical validation is LSTM-scale comparisons, not a true TSFM-scale demonstration; adopt the evidential head design, verify calibration independently.

## 1. Research question
Can a time-series foundation model emit calibrated predictive uncertainty — decomposed into aleatoric (data noise) and epistemic (model ignorance) components — in a single forward pass, without sampling?

## 2. Dataset / schema
- **Method validation:** controlled experiments on standard time-series benchmarks with an LSTM backbone comparing uncertainty methods (DER, Gaussian NLL, Student-t NLL, quantile loss, conformal prediction).
- **Applied experiment:** cryptocurrency trading-style evaluation (return forecasting with position sizing), reporting risk-adjusted metrics.
- Public benchmark series + crypto market data.

## 3. Method / model
- **Head:** Normal-Inverse-Gamma (NIG) Deep Evidential Regression head on top of a sequence encoder; one forward pass outputs (μ, λ, α, β) — the parameters of a NIG prior over the Gaussian likelihood's (mean, variance).
- **Decomposition:** aleatoric uncertainty = β/(α−1); epistemic uncertainty = β/((α−1)·λ); total predictive variance = β/(α−1)·(1 + 1/λ).
- **Loss:** evidential NLL + evidence regularizer (penalizes evidence on errors) + coverage-loss term encouraging calibrated intervals; evidence annealing schedule proposed.
- **Use:** prediction μ with decomposed uncertainty bars; downstream abstention/position-sizing from epistemic uncertainty.

## 4. Equations & assumptions
- NIG prior: p(μ,σ²|m,λ,α,β) = N(μ|m,σ²/λ)·InvGamma(σ²|α,β); network outputs (m,λ,α,β), λ,α,β > 0 via softplus.
- Aleatoric: E[σ²] = β/(α−1); Epistemic: Var[μ] = β/((α−1)λ).
- Loss: L = L_NLL^evidential + λ_reg·L_R (evidence regularization) + λ_cov·L_coverage.
- Assumptions: Gaussian likelihood (misspecified for skewed sports outcomes); NIG conjugacy is a modeling convenience, not a truth claim; single-pass uncertainty is only as good as the encoder's representation; evidence annealing hyperparameters need tuning.

## 5. Features / target
Input: time-series context (encoder-agnostic). Target: (μ, aleatoric, epistemic) per forecast step — point prediction plus decomposed uncertainty, no sampling.

## 6. Validation design
Controlled comparison on an LSTM backbone across uncertainty methods (DER vs. Gaussian NLL vs. Student-t NLL vs. quantile loss vs. conformal) on standard benchmarks; crypto trading experiment with risk-adjusted metrics (Sharpe, Sortino, Calmar, win rate) comparing DER-driven sizing vs. MSE baseline.

## 7. Numerical results / baselines
- Crypto experiment: DER-based strategy Sharpe **1.33** vs. MSE **0.90**; Sortino **2.27** vs. 1.52; Calmar **3.04**; win rate **0.52**.
- Headline claim: decomposing uncertainty and sizing on epistemic (not just total) variance improves risk-adjusted returns.
- (Benchmark-metric tables for the LSTM comparison are in the paper; the consistent finding is DER competitive on accuracy with better-calibrated uncertainty than Gaussian NLL.)

## 8. Code / data availability
Paper references code release (verify at implementation). Crypto data from public exchanges; benchmark series public.

## 9. Leakage & limitations
- **Scale gap:** experiments are LSTM-scale; there is no demonstration on a 100M+ parameter TSFM — the "foundation model" in the title outruns the evidence. GSE must validate the head on a real TSFM backbone.
- Gaussian likelihood assumption vs. heavy-tailed/discrete sports outcomes (key numbers, blowout skew).
- Crypto trading metrics don't transfer to sports betting directly (different market microstructure, limits, vig).
- Evidence regularization/annealing adds fragile hyperparameters; miscalibrated epistemic uncertainty is worse than none for abstention (cf. 2132's base-rate lesson).
- Single-pass uncertainty can be overconfident out-of-distribution — needs the same domain-holdout testing as 2133.

## 10. GSE overlap
No evidential/decomposition-based uncertainty in the GSE corpus; Mimo's CQR lane gives total prediction intervals without the aleatoric/epistemic split. The decomposition is the new capability: epistemic uncertainty → abstain/resize (model doesn't know), aleatoric → price the vig (game is inherently random). Directly serves the Kelly/sizing lane and the pick-selection/abstention problem.

## 11. GSE implementation spec
1. **Head swap:** attach the NIG evidential head to the sports TSFM backbone (2122/2126) in place of (or alongside) the quantile/mixture head; train with evidential NLL + regularizer + coverage loss on the sports pile.
2. **Decomposition use:** epistemic uncertainty → pick abstention threshold and stake sizing (high epistemic = pass or min-stake); aleatoric → fair-price width (high aleatoric = wider no-bet zone around the line).
3. **Calibration:** validate decomposition quality — epistemic should rise on regime shifts (new QB/coach) and fall with more same-regime data; aleatoric should track historical game-to-game variance. Independent calibration audit before any sizing use.
4. **Serving:** single-pass — cheaper than Chronos-style sampling; can run per-game in real time.
Effort: 2–3 engineer-weeks (head + loss + calibration harness).

## 12. Reproducible test
Dataset: NFL 2015–2024 margins/totals. Test: 2022–2024 walk-forward. Metrics: (a) CRPS of μ-head vs. quantile-head baseline (must not lose accuracy); (b) calibration: 80% intervals from total variance within ±4 pts of nominal; (c) abstention value: stake-weighted return of epistemic-gated picks vs. ungated (paper's crypto analog, translated to CLV/stake-weighted yield). Baselines: Gaussian NLL head, quantile head, no-abstention. Leakage audit: standard seasonal ordering.

## 13. Acceptance / rejection gate
ADOPT the evidential head if (a) CRPS within 1% of the quantile-head baseline (no accuracy cost), (b) interval calibration within ±4 pts, AND (c) epistemic-gated staking beats ungated on stake-weighted yield over 2022–2024; ADAPT further (annealing/hyperparameter search) if (a)–(b) pass but (c) fails; REJECT for sizing use if (b) fails — miscalibrated uncertainty must never touch stake sizing. Hard reject if epistemic uncertainty does not rise on held-out regime-shift games (decomposition is then decorative).

## 14. Improvement experiment
Regime-shift stress test: construct a synthetic sports corpus (cf. 2131) with known coaching/QB change points and measure whether epistemic uncertainty spikes at change points while aleatoric stays flat — the decomposition's core promise. Compare against ensemble-disagreement as the epistemic estimator. Hypothesis: evidential epistemic reacts faster than ensembles at 1/10th the compute, making it the right abstention signal for mid-season regime changes.
