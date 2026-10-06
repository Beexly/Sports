# [1553] Optimizing Forecast Combination Weights Using Exponentially Weighted Hit and Win Rate Losses (arXiv:2503.20082)

**Citation:** van Eijk, H. D. and Ghosh, S. K. (2025). *Optimizing Forecast Combination Weights Using Exponentially Weighted Hit and Win Rate Losses*. arXiv:2503.20082v1 [stat.ME]. URL: https://arxiv.org/abs/2503.20082
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 18 pages, all sections incl. Tables 1–6, Figures 1–2, Equations 1–12, refs).
**Verdict:** ADAPT — the "beat-the-consensus" framing (hit rate = correct beat/miss sign vs. consensus; win rate = closer to actual than consensus) is the exact GSE analogue of beat-the-closing-line, and the Cauchy-CDF surrogate for the 0-1 win-rate loss is a portable technique for training GSE's combiner on CLV-style objectives.

## 1. Research question
In revenue/earnings forecasting, squared-error loss is a poor training objective because what matters to practitioners is *directional* outperformance: (i) correctly calling whether the actual beats or misses the consensus (hit rate), and (ii) being closer to the actual than the consensus (win rate). The paper asks: how do you estimate optimal forecast-combination weights under these 0-1 losses — including exponential time-discounting and parameter constraints — when the losses are discontinuous and non-differentiable, and how do you handle missing analyst forecasts (some analysts skip quarters) in a principled Bayesian way?

## 2. Dataset / schema
- **I/B/E/S analyst forecasts via WRDS** (proprietary, subscription): top 25 tech companies by market cap (Yahoo Finance), 2 dropped for <9 years of history → **23 companies**. Quarterly revenues 2015–2023 (36 quarters) + all one-quarter-ahead analyst forecasts; only each analyst's most recent forecast per quarter used. In log scale: y_t = log(A_t), x_{t,j} = log(F_{t,j}).
- **Schema per company:** quarterly actual log-revenue y_t (t=1..36), m analyst log-forecasts x_{t,j}, analyst identity j, quarter index.
- Evaluation is per-ticker rolling-window CV (see §6); proprietary I/B/E/S data is not replicable by GSE, but the *method* is data-agnostic.

## 3. Method / model
Linear pool: ŷ_t(ω, ω₀) = ω₀ + Σⱼ ωⱼ x_{t,j}, with ω ∈ S_m = {ω ⪰ 0 : ω'1 = 1} (simplex), ω₀ ∈ ℝ free intercept. Three estimators:
- **(a) Quadratic programming** (§2.2.1): exponentially discounted weighted least squares on log scale (Eq. 5), min_{ω∈S_m, ω₀} Σ_t p_t(λ)·(y_t − ω₀ − ω'x_t)², solved via `solve.QP` (R quadprog) with nearPD-regularized D = X'WX; λ tuned over grid Λ = {0, 0.25, 0.5, 0.75, 1}. Missing forecasts imputed by row mean.
- **(b) Full hierarchical Bayesian** (§2.2.2, Eqs. 8–9): y_t ~ N(w₀ + Σⱼ x_{t,j}ωⱼ, σ²/p_t(λ)); ω ~ Dir(1,...,1); w₀ ~ N(0,1000); λ ~ U(0,1) (data-driven discount, no grid); σ² ~ InvGamma(0.1,0.1). Missing forecasts imputed via AR(1) state model X_{l+1,j}|X_{l,j} ~ N(γⱼ + φⱼ(x_{l,j}−γⱼ), σⱼ²) with φⱼ ~ U(−1,1), γⱼ ~ N(x̄ⱼ,100) — posterior-predictive imputation inside MCMC. Implemented in **rjags**, 2 chains × (10k burn-in + 20k samples) = 40,000 posterior draws; point forecast = posterior-predictive mean; intervals from predictive quantiles.
- **(c) Nonlinear programming** (§2.2.3): direct optimization of the hit/win losses. Hit-rate loss = constrained weighted logistic regression (Eq. 11): min Σ_t p_t(λ)·[−ỹ_t log p̂_t − (1−ỹ_t)log(1−p̂_t)], p̂_t = 1/(1+exp(−(ω₀+ω'x_t))). Win-rate loss is discontinuous (Eq. 4: I(|R_t|>1)); approximated by a **Cauchy CDF surrogate**: min (1/L)Σ_t p_t(λ)·[ (1/π)arctan((z_t−z₀)/γ̂) + 1/2 ], z_t = |R_t|−1, z₀ = 0. Scale γ̂ solved numerically via `uniroot` so the CDF's effective support [z_min, z_max] (empirical min/max of |R|−1 over B = L·m individual forecasts) covers 1−ϵ of mass (ϵ = 0.005; Cauchy preferred over logistic as a tighter indicator approximation — Figure 1). Solved with gradient-free **COBYLA** in R nloptr, init ω = 1/m, ω₀ = 0.

## 4. Equations & assumptions
- Lemma 1: for uncorrelated unbiased forecasters, inverse-variance weights w*_j = (1/σ²_j)/Σ_k(1/σ²_k) strictly beat equal weights when variances differ; correlated extension ω* = (1'Σ⁻¹1)⁻¹Σ⁻¹1 when Σ⁻¹1 ⪰ 0.
- Discount weights: p_t(λ) = e^{−λ(L−t)}(1−e^{−λ})/(1−e^{−λL}) (Eq. 1); λ = 0 ⟺ equal weighting.
- Hit target: ỹ_t = I(y_t > ŷ_t(ω̄)) (Eq. 2, beat/miss vs. equally-weighted consensus); hit-rate loss = Bernoulli NLL (Eq. 3).
- Relative bias: R_t(ω,ω₀) = (y_t − ŷ_t(ω,ω₀))/(y_t − ŷ_t(ω̄)); win rate = Pr(|R_t| < 1); win-rate loss = I(|R_t| − 1 > 0) (Eq. 4).
- Out-of-sample metrics (Eq. 12): HR̂ = (1/F)Σ_f I(R̂_f − 1 < 0) [sic — paper's notation conflates hit/win; both defined via R̂_f]; WR̂ = (1/F)Σ_f I(|R̂_f| − 1 < 0).
- **Assumptions:** log-scale homoscedasticity; analysts' forecasts linearly combinable on log scale (geometric mean on original scale); missing-at-random for Bayesian imputation; simplex weights + unconstrained intercept; AR(1) dynamics for each analyst's forecast series; U(0,1) prior bounds λ (discounting never negative or explosive); Cauchy surrogate with ϵ = 0.005 faithfully represents the 0-1 loss.

## 5. Features / target
- **Features:** m analyst log-forecasts x_{t,j} for the target quarter (analyst pool per ticker, filtered to those forecasting t+1 and present in ≥90% of the training window).
- **Targets:** (i) binary beat/miss vs. consensus ỹ_t (hit); (ii) win indicator I(|R_t|<1) (win); the combined point forecast ŷ_{L+1} on log scale.
- **Horizon:** H = 1 quarter ahead, one-step rolling.

## 6. Validation design
- **Rolling-window CV:** T = 36 quarters, window L = 12 → F = 24 folds (training D₁₂…D₃₅, each predicting the next quarter). Strictly time-ordered. λ grid {0, 0.25, 0.5, 0.75, 1} for QP/NLP; Bayesian λ learned.
- **Analyst filtering per fold:** must forecast t+1 AND appear in ≥90% of window quarters (limits missingness); row-mean imputation for QP/NLP, Bayesian AR(1) imputation.
- **Baselines:** equally weighted consensus ω̄; naïve (ŷ_{t+1} = y_t, hit 39.7% / win 17.0%); seasonal naïve (ŷ_{t+1} = y_{t−3}, hit 28.1% / win 6.7%). External: AKAnomics 66% hit rate; Fleder & Shah (2019) 57.2% win rate over 306 predictions.
- **Metrics:** out-of-sample hit rate and win rate (defined above), averaged over λ-grid, per ticker and overall mean.

## 7. Numerical results / baselines
- **Hit rates (Table 3, mean over λ):** QP 79.7%, NLP 79.2%, **Bayesian 82.4%**. Best single: NLP with λ=0 at 83.2%. Per-λ means: QP (79.7/80.6/79.7/79.7/78.8); NLP (83.2/82.2/79.7/75.5/75.2); Bayesian 82.4. Benchmarks: naïve 39.7%, seasonal naïve 28.1%, AKAnomics 66%. Standouts: ANET/CRM/KLAC at 100% (all methods); IBM 45.9–58.3% (worst).
- **Win rates (Table 4, mean over λ):** QP 61.2%, **NLP 68.7%**, Bayesian 62.7%. Best single: NLP λ=0 at 71.9%. Per-λ: QP (60.5/61.2/61.2/62.0/60.9); NLP (71.9/71.6/68.1/66.8/65.2); Bayesian 62.7. Benchmarks: naïve 17.0%, seasonal naïve 6.7%, Fleder & Shah 57.2% (over 306 predictions; this paper: 552 predictions per model).
- **Discounting finding:** weak evidence for λ > 0. Bayesian posterior mean λ ≈ 0.098–0.099 across tickers (Table 6), median ≈ 0.082, but posterior densities highly right-skewed with mode ≈ 0 (Figure 2, NVDA). NLP/QP perform best at λ = 0. Paper: "setting λ = 0 would possibly provide the best forecasts."
- **Weight structure (Table 5, CSCO fold 24):** QP weights sparse — 1.000 on one analyst at λ = 0 (winner-take-all); NLP (hit) and Bayesian weights ≈ uniform (~0.1 each); NLP (win) ≈ uniform. QP's sparsity "likely illustrates why quadratic programming did not outperform."
- All tests span the COVID-19 period (2015–2023), i.e., through market stress — a robustness plus vs. Fleder & Shah.

## 8. Code / data availability
"Our code (using R software) will be available on GitHub following the publication of our research." No URL given — effectively none stated. Data: I/B/E/S via WRDS (proprietary subscription). Software named: quadprog, Matrix (nearPD), rjags/JAGS, coda, nloptr.

## 9. Leakage & limitations
- **Consensus-relative targets:** hit/win are defined *against the equally weighted consensus*, which itself uses all analysts' forecasts at time t+1 — legitimate (available pre-release) but the consensus is a function of the same inputs being weighted; a degenerate constant shift could game the hit target. The win-rate metric is cleaner.
- **Adversarial:** hit rates of ~80% look spectacular vs. AKAnomics' 66%, but AKAnomics' company set is undisclosed and the comparison is uncontrolled (different universes, possibly different periods). The 23 large-cap tech stocks are a narrow, single-sector universe; authors admit performance on small caps/other sectors is untested (though they argue large caps are *harder* to forecast).
- **QP/NLP λ-grid results are research-setting**: in production you must commit to one λ; only the Bayesian variant (learned λ ≈ 0) reflects deployable performance.
- **Missing-data handling asymmetry:** row-mean imputation for QP/NLP vs. proper Bayesian imputation — part of the Bayesian edge may be imputation quality, not the loss.
- **Analyst filter (≥90% presence)** introduces mild survivorship bias toward established analysts.
- External validity to sports: revenue series are smooth and persistent; sports outcomes are adversarial with sharp regime changes. The λ≈0 (no discounting) finding may not transfer — in sports, recent-form discounting is usually valuable.
- The Cauchy surrogate's γ̂ is refit per window from empirical bounds; no analysis of its stability across folds.

## 10. GSE overlap
Existing-research map: no GSE work frames combination training around beat-the-consensus or beat-the-close objectives — GSE's engine optimizes absolute accuracy (per MEMORY, model v5.2.7 picks), and no ledger in the map uses 0-1 surrogate losses for combination weights. This is a **new capability**: a CLV-style training objective for the combiner. Connects to ledger [1549]'s expert-aggregation theory (regret bounds) but is applied and empirical, unlike [1549]. The Bayesian missing-data imputation is relevant if GSE ever combines third-party pick sources with patchy histories (currently engine-only, so lower priority).

## 11. GSE implementation spec
- **Data sources:** GSE engine sub-model game-level forecasts (point spreads/totals or win probabilities) for 2023–2025 NFL, closing lines from The Odds API (existing account, 20K credits/mo), actual outcomes from nflverse.
- **Objective translation:** define consensus = simple average of sub-model forecasts; win_t = I(|actual − combined| < |actual − consensus|) — the "beat-the-consensus" analogue of beat-the-close; hit_t = correct side vs. closing line (beat the close indicator). Train the combiner to maximize win rate directly.
- **Estimator:** replicate §2.2.3 — Cauchy-CDF surrogate of the 0-1 win loss, simplex constraints, COBYLA (or scipy SLSQP), exponential recency discount λ tuned on validation (expect λ > 0 in sports, contrary to the paper). Keep an intercept ω₀ for bias correction.
- **Effort:** ~1 engineer-week to prototype in Python (scipy.optimize + existing engine logs); the Bayesian/JAGS path is optional v2.

## 12. Reproducible test
2024–2025 NFL regular seasons (~550 games): baseline = simple-average sub-model consensus; challenger = win-rate-trained combiner (Cauchy surrogate, λ tuned on 2024, tested on 2025). Metrics: (a) win rate vs. consensus (must exceed 50% — systematic edge); (b) beat-the-close rate vs. closing spread; (c) Brier/log-loss sanity check that accuracy didn't collapse. Strictly time-ordered folds, one week ahead.

## 13. Acceptance / rejection gate
ADOPT if on the 2025 holdout the combiner achieves win rate vs. consensus ≥ 55% **and** beat-the-close rate ≥ 52.5% (the standard -110 breakeven is 52.38%) **and** Brier score no worse than +1% vs. simple average. REJECT if win rate ≤ 52% or beat-the-close < 52.38% — the directional objective must not sacrifice calibration for nothing.

## 14. Improvement experiment
**Asymmetric win-rate loss.** The paper's win loss is symmetric: being $1 closer counts the same as $10 closer. In betting, magnitude matters (CLV dollars, Kelly stakes). Replace I(|R_t|>1) with a *magnitude-weighted* surrogate: w_t·F_Cauchy(|R_t|−1) where w_t = |actual − consensus| (the dollars left on the table). Hypothesis: the combiner learns to concentrate weight where the edge is largest rather than maximizing the count of small wins — directly optimizing expected CLV instead of win frequency. Compare expected-CLV of symmetric vs. magnitude-weighted combiners on the 2025 holdout.
