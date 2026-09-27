# [1467] Sparse Bayesian State-Space and Time-Varying Parameter Models (arXiv:2207.12147v1)

**Citation:** Frühwirth-Schnatter, S., & Knaus, P. (2022). *Sparse Bayesian State-Space and Time-Varying Parameter Models*. arXiv:2207.12147v1 [econ.EM] (book chapter). URL: https://arxiv.org/abs/2207.12147. R package: `shrinkTVP`.
**Ledger completed:** 2026-09-21. **Read:** full text (PDF) — univariate TVP models, non-centered parameterization, continuous shrinkage priors, discrete spike-and-slab, US inflation application, stochastic volatility, and multivariate extension (Sec. 5–6).
**Verdict:** ADAPT — the non-centered TVP parameterization converts process-variance selection into coefficient selection, and the shrinkage-prior machinery (triple gamma / horseshoe / spike-and-slab with the zero–fixed–dynamic classification) gives GSE a principled way to run time-varying team/player strength models that collapse to static coefficients when the data don't support drift.

## 1. Research question
In time-varying parameter (TVP) models, how can we decide — per coefficient — whether it is zero, constant, or genuinely time-varying, without overfitting? The chapter reviews Bayesian variance-selection machinery: the non-centered parameterization, continuous global-local shrinkage priors on the process variances, and discrete spike-and-slab priors with a three-way classification.

## 2. Dataset / schema
US inflation application: quarterly data 1964:Q1–2015:Q4; dependent variable inflation; 18 predictors + 3 inflation lags; stochastic volatility on the observation error. Public macro data (FRED-style series). Simulation studies with known sparse/dynamic truth.

## 3. Method / model
- State-space TVP: observation y_t = x_t β_t + ε_t; state β_t = β_{t-1} + w_t, w_t ~ N(0, diag(θ)).
- **Non-centered parameterization:** β_jt = β_j + √θ_j · β̃_jt with β̃_jt a standardized random walk. This converts "is θ_j = 0?" (variance selection, hard under the usual inverse-gamma prior which is bounded away from zero) into "is the coefficient √θ_j = 0?" (ordinary coefficient selection, amenable to shrinkage priors).
- Priors on √θ_j: ridge/gamma, Bayesian Lasso, normal-gamma, double gamma, triple gamma, horseshoe, and discrete spike-and-slab with hierarchical Student-t / Gaussian / fractional slabs.
- MCMC: FFBS (forward-filtering backward-sampling) / AWOL for the states; ASIS (ancillarity-sufficiency interweaving) between centered and non-centered parameterizations to fix poor mixing.
- Classification: each coefficient gets posterior P(zero), P(fixed), P(dynamic) from the MCMC indicators (δ_j, γ_j); continuous-shrinkage priors use thresholding (include if (1−ρ_j) > 0.5) with a hyperprior on the global shrinkage φ_ξ that induces a uniform prior on model dimension.

## 4. Equations & assumptions
- Centered: β_t = β_{t-1} + w_t, w_t ~ N(0, diag(θ_1…θ_p)); y_t = x_t′β_t + ε_t, ε_t ~ N(0, σ²_t) with SV.
- Non-centered: β_jt = β_j + √θ_j · β̃_jt, β̃_jt = β̃_{j,t-1} + ũ_jt, ũ_jt ~ N(0,1).
- Shrinkage hierarchy (triple gamma): √θ_j | … with global φ_ξ and local scales; horseshoe as the a_ξ = c_ξ = 0.5 special case; Lasso prior shown to over-shrink dynamic signals (all coefficients classified zero in the application).
- Spike-and-slab: β_j | δ_j with point mass at 0 vs slab; second indicator γ_j for fixed vs dynamic.
- Assumptions: (1) random-walk evolution of coefficients; (2) diagonal process covariance (no cross-coefficient drift correlation); (3) SV log-volatility follows its own AR(1).

## 5. Features / target
Features: 18 macro predictors + 3 lags (application-specific). General target: per-coefficient classification into {zero, fixed, dynamic} and the time-varying coefficient paths.

## 6. Validation design
Simulation studies with known truth (sparse/static/dynamic coefficients) measuring classification accuracy and MSE of recovered paths; real-data application judged by cumulative log predictive density scores (LPDS) over the last 100 quarters across six priors. MCMC: 100,000 iterations after 10,000 burn-in.

## 7. Numerical results / baselines
- MCMC mixing: hierarchical Student-t slab ≈20% move acceptance between fixed/dynamic; Gaussian and fractional slabs <5% fixed↔dynamic acceptance with visible chain dependence — slab choice materially affects inference, not just fit.
- Classification (Table 2, discrete spike-and-slab): treasury-bill coefficient clearly dynamic (P(dynamic|y) = 0.86); commodity-price index (napmpri) positive fixed (P(fixed|y) = 0.78); Dow Jones clearly insignificant (P(zero|y) = 0.61).
- Lasso prior classified every coefficient as zero (over-shrinkage failure); triple-gamma thresholding likewise returned all-zero on this dataset, while the discrete spike-and-slab discriminated — a caution that "best prior" is dataset-dependent.
- Cumulative LPDS (last 100 quarters, Fig. 7): horseshoe, double gamma, triple gamma all comparable; Lasso lags early then gains during 2007–2009 crisis.

## 8. Code / data availability
R package `shrinkTVP` stated. Data: public macro series. No standalone GitHub link stated in the chapter.

## 9. Leakage & limitations
- Random-walk state evolution is a strong assumption; abrupt regime changes (coaching changes, QB injuries) are better modeled with breaks, not smooth drift.
- Diagonal process covariance ignores correlated drift (e.g., all offensive coefficients shifting together after a scheme change).
- MCMC cost (100k iterations, ASIS interweaving) is heavy for weekly refits; variational alternatives not covered.
- Prior sensitivity is real: Lasso vs spike-and-slab gave qualitatively different answers on the same data — GSE must validate the classification, not trust a default prior.
- Chapter is a review; no single "proposed" estimator, so the GSE build must choose among reviewed options.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's ratings lane covers Elo/Glicko/TrueSkill-style team strength, which are fixed-form dynamic models (constant update rules, no per-coefficient drift selection). No existing ledger implements sparse Bayesian TVP with zero/fixed/dynamic classification. This is a new capability: data-driven choice of which team/player effects are static vs drifting, replacing hand-tuned update magnitudes.

## 11. GSE implementation spec
- Data: weekly team efficiency features (EPA/play, success rate, etc. from nflverse) 2015–2025, modeling spread or points as y_t with team-strength coefficients.
- Build: (a) non-centered TVP regression of margin on team dummies + situational features; (b) triple-gamma or horseshoe prior on √θ_j via `shrinkTVP` (prototype) then a Stan/PyMC port for production; (c) read off P(dynamic) per team — teams with high P(dynamic) get time-varying ratings, others static; (d) refit weekly with warm-started MCMC or Laplace approximation.
- Effort: ~2 weeks (prototype in R, port the chosen prior to Python).

## 12. Reproducible test
Dataset: 2019–2024 NFL games, predicting ATS margin. Metric: out-of-sample log-loss / RMSE on rolling-origin 1-week-ahead forecasts. Baseline: static team-strength regression + Elo with fixed K. Window: fit through 2021, rolling test 2022–2024.

## 13. Acceptance / rejection gate
ADOPT the sparse-TVP ratings if rolling 2022–2024 RMSE beats the Elo baseline by ≥3% AND the posterior classifies at least 20% of team coefficients as dynamic (i.e., the model actually uses its flexibility). Reject if the classification collapses to all-fixed (then a static model suffices) or if MCMC instability makes weekly refits unreliable.

## 14. Improvement experiment
Add a Markov-switching (break) component to the state equation for coaching/QB-change weeks and test whether P(dynamic) concentrates on true regime changes rather than smooth drift — this addresses the random-walk-only limitation and matches how NFL team quality actually evolves.
