# [0742] Random Noise vs State-of-the-Art Probabilistic Forecasting Methods (arXiv:2201.08671)

**Citation:** Alireza Koochali, Peter Schichtel, Andreas Dengel, Sheraz Ahmed (2022). *Random Noise vs State-of-the-Art Probabilistic Forecasting Methods*. arXiv:2201.08671. URL: https://arxiv.org/abs/2201.08671
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — not a method but an evaluation guardrail with direct GSE force: never rank multivariate probabilistic forecasts with CRPS-Sum; use per-dimension CRPS + Energy Score, and adopt the paper's dummy-model discrimination protocol to validate any metric GSE uses. Cheap to implement, prevents a real class of bad decisions.

## 1. Research question
Are the standard multivariate probabilistic-forecast metrics actually discriminating good from bad forecasters? The paper demonstrates that **CRPS-Sum** — the community workhorse for multivariate forecasting — has a covariance-asymmetry flaw and can be gamed by degenerate forecasts, and asks which metrics survive a dummy-model stress test.

## 2. Dataset / schema
(1) Synthetic bivariate normal: true correlation ρ swept from −1 to 1, forecast correlation ϱ swept from −1 to 1; n = 2^14 samples, window w = 2^9. (2) Real: **Exchange-rate** dataset (standard multivariate forecasting benchmark, 8 currencies, daily). Baselines: GP-Copula (state-of-the-art at the time), a univariate dummy, and a multivariate dummy — including literal random-noise forecasts.

## 3. Method / model
No new forecaster is proposed. The contribution is diagnostic: (a) analytic + synthetic demonstration of CRPS-Sum's **covariance asymmetry** — CRPS-Sum sums over dimensions first, so cross-dimensional dependence structure (correlation sign/magnitude) is collapsed before scoring; (b) **dimension-collapsing failure**: degenerate forecasts (e.g., constant or noise forecasts with matched marginals) can score better than the true model; (c) a **dummy-model discrimination protocol**: any proposed metric must rank the true/ideal forecaster above trivial dummy forecasts, otherwise the metric — not the models — is at fault.

## 4. Equations & assumptions
CRPS-Sum: S = CRPS(Σ_d X_d, Σ_d y_d) — the sum over dimensions happens INSIDE the score, destroying dependence information. Proper alternatives: per-dimension CRPS averaged, and the **Energy Score** ES(F,y) = E‖X−y‖ − ½E‖X−X'‖. Assumption under test: that a "proper" score is sufficient for model selection — the paper shows propriety ≠ discrimination power in finite multivariate settings.

## 5. Features / target
Not applicable (evaluation paper). Synthetic: bivariate Gaussian with controlled ρ/ϱ. Real: 8-dimensional exchange-rate series.

## 6. Validation design
Full ρ×ϱ sweep on synthetic data; exchange-rate benchmark with GP-Copula vs. dummy forecasters under CRPS-Sum, CRPS, and Energy Score.

## 7. Numerical results / baselines
Exchange-rate results (paper's Table): GP-Copula — CRPS-Sum **0.0070**, CRPS 0.0092, ES 0.0043. Univariate dummy — CRPS-Sum **0.0049**, CRPS 0.4425, ES 0.2037. Multivariate dummy — CRPS-Sum **0.0048**, CRPS 0.0077, ES 0.0032. I.e., under CRPS-Sum the literal dummy models (0.0048–0.0049) BEAT the state-of-the-art GP-Copula (0.0070); under per-dimension CRPS and Energy Score the ranking is sane (GP-Copula best or near-best, univariate dummy catastrophically bad at 0.4425). Synthetic sweeps show CRPS-Sum is asymmetric in the forecast correlation ϱ — it rewards wrong-signed correlations.

## 8. Code / data availability
None stated; exchange-rate dataset is a public benchmark.

## 9. Leakage & limitations
Evaluation paper — no training, no leakage. Limitations: (a) the conclusion "avoid CRPS-Sum" is well-supported but the paper does not propose a single replacement — it recommends CRPS + Energy Score jointly; (b) Energy Score itself has known weak discrimination in high dimensions (not discussed); (c) exchange-rate is one dataset; (d) the dummy models are deliberately pathological — real-world misranking risk is smaller but nonzero.

## 10. GSE overlap
Existing-research-map.md lists CRPS among calibration metrics but contains **no guidance on multivariate scoring pitfalls** and no metric-validation protocol. GSE evaluates joint outcomes (e.g., spread + total, or multi-leg same-game parlays / correlated pick slates) — exactly the setting where a collapsed-sum metric can misrank models. New capability: a metric-selection guardrail.

## 11. GSE implementation spec
(1) **Ban CRPS-Sum** (and any sum-inside-score metric) from GSE model selection for joint forecasts (spread+total distributions, correlated slate evaluation); use mean per-dimension CRPS + Energy Score. (2) Implement the **dummy-model discrimination test** as a CI gate: whenever a new evaluation metric is introduced, it must rank a known-good forecaster above (a) a marginal-matched noise forecaster and (b) a constant forecaster on a backtest — if it cannot, the metric is rejected. (3) Document in the engine-benchmark lane (per the 2026-09-17 standing rule, metrics go in Sports AGENTS.md). Effort: ~1 day.

## 12. Reproducible test
Dataset: 2023–2025 NFL games; forecasters: GSE joint spread+total distribution vs. marginal-matched noise dummy vs. constant-at-median dummy. Metrics: CRPS-Sum (to reproduce the failure), mean per-dim CRPS, Energy Score. Success = CRPS-Sum misranks (dummy ≥ GSE) while per-dim CRPS and ES rank GSE first — reproducing the paper's diagnostic on sports data.

## 13. Acceptance / rejection gate
ADOPT the guardrail if the reproduction confirms CRPS-Sum can misrank on GSE's own joint forecasts (dummy beats or ties the real model under CRPS-Sum while losing under ES); if CRPS-Sum happens to rank correctly on GSE data, still ADOPT the ban as prophylaxis but downgrade the dummy-test to an advisory check.

## 14. Improvement experiment
Extend the discrimination protocol to **economic** metrics: test whether GSE's ROI-based model selection can be gamed by degenerate strategies (e.g., always-bet-the-favorite at fixed stake) the way CRPS-Sum is gamed by noise — i.e., require every backtest metric to pass a dummy-strategy discrimination test before it is used for promotion decisions.
