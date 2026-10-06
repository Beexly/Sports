# 1661 Variational Inference for the Smoothing Distribution in Dynamic Probit Models (arXiv:2104.07537)

**Citation:** Augusto Fasano, Giovanni Rebaudo, et al. *Variational Inference for the Smoothing Distribution in Dynamic Probit Models*. arXiv:2104.07537 (2021). Code: https://github.com/augustofasano/Dynamic-Probit-PFMVB
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; Sections 1–5 including the partially-factorized VB derivation, simulation study, CAC40 application, and runtime comparisons read in full). Not an abstract-only read.
**Verdict:** ADAPT — the partially-factorized VB that preserves state/augmentation dependence is the right fast-inference backend for GSE's dynamic binary-outcome models (in-play event probabilities, player availability), but it needs predictive-calibration validation beyond the paper's single financial series.

## 1. Research question

Can variational inference approximate the smoothing distribution of a dynamic probit model accurately and much faster than exact MCMC, by using a *partially factorized* mean-field approximation that keeps the dependence between latent states and augmented variables instead of factorizing everything?

## 2. Method/model

Dynamic probit: y_t ∈ {0,1}, P(y_t=1) = Φ(x_t'θ_t); θ_t = θ_{t-1} + η_t, η_t ~ N(0,W). Exact smoothing distribution is unified skew-normal (SUN) — tractable in principle but expensive. Two VB approximations: (a) full mean-field (MF-VB, everything factorized — baseline); (b) partially factorized (PFM-VB): factorize only the multivariate truncated-normal part into univariate factors while retaining the joint dependence between states θ_{1:T} and the augmented latent Gaussian variables z_t. Compared against 10,000 exact i.i.d. smoothing samples (Durante's SUN sampler).

## 3. Mathematics/equations/assumptions

- Augmented model: z_t = x_t'θ_t + ε_t, ε_t ~ N(0,1); y_t = 1(z_t > 0).
- State dynamics: θ_t = Gθ_{t-1} + η_t, η_t ~ N(0,W); prior θ_0 ~ N(m_0, P_0).
- Exact smoothing: p(θ_{1:T} | y_{1:T}) is SUN — closed form but with a T-dimensional truncated-normal CDF.
- PFM-VB: q(θ_{1:T}, z_{1:T}) = q(θ_{1:T} | z_{1:T}) Π_t q(z_t); the conditional q(θ|z) stays exact-Gaussian (Kalman smoother given z), only the truncated-normal marginals are factorized.
- ELBO optimized by coordinate ascent; univariate truncated-normal updates are closed-form.
- Assumptions: probit link (not logit); Gaussian state dynamics; W, P_0 fixed (no hyperparameter learning).

## 4. Dataset/schema

- CAC40 daily opening direction (up/down), 2018-01-04 to 2018-12-28, n=241 trading days; covariates: intercept + Nikkei 225 previous-day direction (p=2).
- Hyperparameters fixed: W = diag(0.01, 0.01), P_0 = diag(3,3).

## 5. Features and target

- Features: intercept, lagged Nikkei direction.
- Target: binary CAC40 opening direction. (Financial series used as a generic dynamic-binary testbed.)

## 6. Validation design

- Accuracy vs 10,000 exact i.i.d. smoothing draws: mean absolute error of posterior means and of log posterior SDs, per state component.
- Runtime comparison on the same machine.
- No out-of-sample predictive evaluation; no hyperparameter sensitivity analysis.

## 7. Exact results and baselines with numbers

- Posterior-mean MAE (vs exact): PFM-VB θ_1 0.003 vs MF-VB 0.009; θ_2 0.008 vs 0.031 — PFM roughly 3–4× more accurate than full MF.
- Average absolute error of log posterior SDs: PFM 0.04/0.05 (θ_1/θ_2) vs MF 0.14/0.16 — MF-VB visibly over-shrinks uncertainty; PFM preserves it.
- Runtime: PFM-VB 1.1 s vs exact sampler 115.4 s (~105× speedup).
- Qualitative: PFM smoothing trajectories track the exact SUN smoothing; MF-VB trajectories are over-smoothed.

## 8. Code/data availability

R code: https://github.com/augustofasano/Dynamic-Probit-PFMVB. CAC40/Nikkei data are public financial series.

## 9. Leakage and limitations

- Single short series (n=241) — no evidence the accuracy holds for longer T or higher p.
- W and P_0 fixed by hand; no learning of state-noise hyperparameters (critical in practice).
- No predictive evaluation — smoothing accuracy ≠ forecast calibration.
- Probit-only; logit or skewed links would need re-derivation.
- Financial series has no missing data or irregular spacing — sports event streams do.

## 10. GSE overlap

GSE's state-space work (Kalman filters, particle filters) handles Gaussian/continuous states; dynamic *binary* outcomes (in-play touchdown probability, drive success, player active/inactive) need exactly this machinery. The PFM-VB factorization trick — keep state|augmentation exact, factorize only the truncation — is new to GSE's toolbox. Pair with ledger 1664 (EP for the same model) as competing backends.

## 11. Implementation specification

- Build `gse.statespace.PFMVBProbit`: dynamic probit with Kalman-smoother-exact conditional and factorized truncated-normal updates; add hyperparameter learning for W via M-step (empirical Bayes) or a hierarchical prior.
- Use cases: (a) in-play binary event probabilities (next-play success, drive TD) with time-varying coefficients; (b) player availability/injury-status dynamics; (c) momentum-style binary regime indicators.
- Serve posterior means ± SDs at play cadence; monitor ELBO convergence.

## 12. Reproducible test

- nflverse 2015–2024: dynamic probit for drive-level TD probability with time-varying coefficients on {down, distance, yardline, score diff}; W learned.
- Train 2015–2021; test 2022–2024: compare PFM-VB vs exact SUN/MCMC smoothing on a subsample (accuracy of posterior means/SDs); compare predictive log-loss vs static probit and vs GSE's current drive model.
- Expect: PFM posterior-mean MAE < 0.01 vs exact; predictive log-loss improvement ≥ 0.003 over static probit.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** PFM-VB posterior means within 0.01 MAE of exact MCMC on NFL drive data AND predictive log-loss beats static probit by ≥ 0.003 on 2022–2024 holdout. Fail → REJECT (fall back to ledger 1664's EP backend).
- **Improvement experiment:** (i) M-step learning of W — expect better-calibrated uncertainty than fixed W; (ii) head-to-head vs EP (1664) on accuracy/runtime/calibration — pick the backend winner; (iii) extend to multinomial (drive outcome: TD/FG/punt/turnover) via multivariate probit.

**Verdict:** ADAPT — partially-factorized VB is the strongest fast-inference candidate for GSE's dynamic binary models, but it must earn its place against exact MCMC on NFL data with learned hyperparameters and genuine predictive validation.
