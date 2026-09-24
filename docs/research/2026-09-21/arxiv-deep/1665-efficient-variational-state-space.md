# 1665 Efficient variational approximations for state space models (arXiv:2210.11010)

**Citation:** (authors as listed on arXiv). *Efficient variational approximations for state space models*. arXiv:2210.11010 (2022). URL: https://arxiv.org/abs/2210.11010
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML converted to plain text; Sections 1–6 including the efficient-importance-sampling construction, stochastic-volatility simulation study, univariate/multivariate market applications, and the TVP-VAR-SV macroeconomic application read in full). Not an abstract-only read.
**Verdict:** ADAPT — the efficient-importance-sampling VB with periodic auxiliary recalibration is the most scalable inference recipe in this wave for GSE's nonlinear/non-Gaussian state-space models, but posterior variance underestimation and the missing public code require a calibration audit on NFL data before production use.

## 1. Research question

Can variational Bayes for general state-space models (closed-form measurement density, exponential-family transition) be made both fast and accurate by building the variational state approximation with efficient importance sampling conditioned directly on the data — beating Gaussian VB, Hybrid VB, and MCMC on speed while preserving state correlations?

## 2. Method/model

VB for state-space models where p(y_t|x_t) is closed-form and p(x_t|x_{t-1}) is exponential-family. Key device: the variational approximation to the latent states is constructed via efficient importance sampling (EIS) targeting the states conditional on the full data — an EIS regression calibrates auxiliary parameters of a tractable importance density. To control cost, auxiliary parameters are recalibrated only every 200 optimization steps. Compared against: MCMC (gold standard), Gaussian VB (fully factorized Gaussian), Hybrid VB. Evaluated on: (a) stochastic-volatility simulations, T ∈ {1,10,20,…,4000}, VB 10,000 iterations vs MCMC 10,000 burn-in + 10,000 inference; (b) market microstructure: WMT/KO/JPM/CAT 15-second NYSE price changes, June 8–12 2020, 5×1,559 = 7,795 time points per series/week; PMCMC with 1,000 particles, 15,000 burn-in + 15,000 inference vs VB 15,000 iterations; (c) TVP-VAR-SV with 8 macroeconomic variables.

## 3. Mathematics/equations/assumptions

- Model: y_t ~ p(y_t | x_t) (closed-form density); x_t | x_{t-1} ~ ExpFam(η(x_{t-1})).
- Variational: q(x_{1:T}) built from an EIS importance density g(x_{1:T}; a) with auxiliary parameters a fit by EIS regressions to log p(y|x)p(x); ELBO optimized by stochastic gradient with the EIS density as the sampling proposal.
- Recalibration schedule: re-fit a every 200 steps (cost/accuracy trade-off).
- Assumptions: measurement density available in closed form; exponential-family transitions; EIS regressions well-behaved (no extreme weight degeneracy); unimodal posteriors.

## 4. Dataset/schema

- Simulations: stochastic volatility, T from 1 to 4,000.
- Market: 15-second log price changes for WMT, KO, JPM, CAT, NYSE, June 8–12 2020; 7,795 observations per stock-week structure (5 days × 1,559).
- Macro: 8-variable TVP-VAR-SV (variables not enumerated in the read text).

## 5. Features and target

- SV simulation: recovery of latent log-volatility paths and parameters.
- Market: latent volatility + posterior correlations across the four stocks.
- TVP-VAR-SV: time-varying coefficients and volatilities.

## 6. Validation design

- Simulation: accuracy of state posterior means/correlations vs MCMC across T; runtime scaling.
- Market: posterior estimates vs PMCMC gold standard (point estimates and uncertainty); runtime head-to-head.
- No predictive holdout in the market application; TVP-VAR-SV is demonstrative.

## 7. Exact results and baselines with numbers

- SV simulation at T=4,000: Efficient VB >6× faster than MCMC, 3× faster than Hybrid VB, >2× faster than Gaussian VB, while approximating state correlations and posterior locations better than Gaussian VB.
- Univariate WMT: PMCMC 41 hours vs Gaussian VB 145 s vs Efficient VB 87 s — a ~1,700× speedup over PMCMC for the efficient method.
- Four-stock model: 18.2 minutes; posterior volatility correlations across stocks 0.579–0.712 (sensible market structure recovered).
- TVP-VAR-SV: method scales to the 8-variable macro model where MCMC is heavy.

## 8. Code/data availability

No public code link found in the paper text. Market data (NYSE TAQ-style 15-second bars) is commercial; SV simulation is replicable.

## 9. Leakage and limitations

- No code published — the EIS-VB implementation must be built from the paper's description.
- VB variance underestimation not quantified against MCMC in the read text — the classic VB failure mode is unaddressed numerically.
- Market application has no predictive validation; in-sample fit only.
- EIS weight degeneracy risk at long T or extreme observations not stress-tested.
- TVP-VAR-SV results are demonstrative, with limited numerical detail in the read.

## 10. GSE overlap

This is the scalability layer GSE's state-space stack is missing: Kalman/particle filters handle linear-Gaussian well, but GSE's nonlinear/non-Gaussian models (stochastic-volatility-like team strength, count-valued observables) currently face the MCMC-or-bust trade-off. Efficient EIS-VB offers MCMC-like state correlations at VB speed. Frame as the inference engine upgrade for GSE's nonlinear state-space models, complementing 1661/1664 (which cover the binary-probit special case).

## 11. Implementation specification

- Build `gse.statespace.EfficientVB`: EIS-calibrated variational state approximation; closed-form measurement densities (Poisson for counts, Gaussian for continuous); exponential-family transitions (Gaussian random walk, AR(1)); auxiliary recalibration every 200 steps (tunable).
- Target models: (a) dynamic team attack/defense strengths with Poisson score likelihoods (upgrade of ledger 1658's static strengths); (b) stochastic-volatility-style momentum in team efficiency.
- Calibration audit: always compare posterior SDs against short-chain MCMC on a subset; inflate/report underestimation factor.

## 12. Reproducible test

- nflverse 2000–2024: dynamic bivariate-Poisson team-strength model (attack/defense random walks, Poisson score likelihood).
- Train 2000–2019; test 2020–2024: predictive log-likelihood vs static-strength model and vs GSE's current score model; runtime vs MCMC on one season.
- Calibration: on 5 test seasons, compare Efficient-VB posterior SDs of strengths to MCMC SDs — report median underestimation ratio.

## 13. Numeric acceptance/rejection gate + improvement experiment

- **Gate (ADAPT→keep):** predictive log-likelihood beats static-strength baseline by ≥ 0.01 nats/game on 2020–2024 AND runtime ≤ 5% of MCMC per season AND median posterior-SD underestimation ≤ 20% (ratio ≥ 0.8). Fail any → REJECT for production (keep as research prototype).
- **Improvement experiment:** (i) recalibration-frequency sweep {50, 200, 500} — expect 200 near-optimal; (ii) add importance-weight diagnostics (ESS monitoring) to detect degeneracy — expect flags on <2% of fits; (iii) hierarchical extension across teams sharing volatility parameters — expect +0.005 nats/game.

**Verdict:** ADAPT — efficient EIS-based VB is the right scalability bet for GSE's nonlinear state-space models, but only after a calibration audit proves its posterior uncertainties are honest and the missing public code is faithfully reimplemented.
