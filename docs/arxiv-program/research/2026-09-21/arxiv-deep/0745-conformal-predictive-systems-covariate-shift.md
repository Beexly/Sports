# [0745] Conformal Predictive Systems Under Covariate Shift (arXiv:2404.15018)

**Citation:** Jef Jonkers, Glenn Van Wallendael, Luc Duchateau, Sofie Van Hoecke (2024). *Conformal Predictive Systems Under Covariate Shift*. arXiv:2404.15018. URL: https://arxiv.org/abs/2404.15018
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — weighted conformal predictive systems (likelihood-ratio weighting of calibration scores) restore coverage under covariate shift with slightly better CRPS; directly applicable to GSE's regime-drift problem (injuries, QB/coaching changes, weather regimes). Adopt with one flagged caveat: the probabilistic validity claim is still a CONJECTURE (3.5), empirically supported but unproved.

## 1. Research question
Standard conformal predictive systems (CPS) assume exchangeability; under covariate shift (calibration and test covariates drawn from different distributions, same P(Y|X)) coverage breaks. Can weighting calibration conformity scores by the train/test covariate likelihood ratio w(x) = dP_test/dP_cal restore valid predictive distributions — and does the resulting weighted CPS (WSCPS) remain probabilistically calibrated?

## 2. Dataset / schema
(1) **Airfoil self-noise** (UCI): N=1,503, 5 covariates; splits 25/25/50 train/calibration/test; synthetic shift induced by exponential tilting w(x)=exp(xᵀβ) with β=(−1,0,0,0,1). (2) Synthetic **Kang–Schafer**-style setup (classic covariate-shift benchmark): 1,000 trials. Base regressors: standard (paper uses simple regression models; the CPS layer is model-agnostic).

## 3. Method / model
**WSCPS**: for calibration scores, use normalized conformity scores weighted by ŵ(x_i) = estimated likelihood ratio of test vs. calibration covariate density; the predictive distribution at x_{n+1} is the weighted empirical CDF of calibration conformity scores. Likelihood ratio estimated via a probabilistic classifier (test-vs-calibration discriminator). Comparators: unweighted CPS (coverage breaks under shift), and oracle weights. Metrics: empirical coverage at nominal 80%, CRPS of the predictive distributions, interval width.

## 4. Equations & assumptions
Predictive distribution: Q̂(y|x_{n+1}) = Σ_i p_i^w(x_{n+1})·1{C_i ≤ C(x_{n+1},y)} + ..., with normalized weights p_i^w ∝ ŵ(x_i). Assumption: **covariate shift only** — P(Y|X) is invariant, only P(X) changes; the likelihood ratio is estimable (needs overlap/support); Conjecture 3.5 (unproved): the WSCPS output is asymptotically uniformly distributed (probabilistically valid) under consistent ŵ estimation.

## 5. Features / target
Airfoil: 5 aerodynamic covariates → sound pressure level (regression). Kang–Schafer: synthetic covariates → continuous outcome.

## 6. Validation design
1,000 Monte Carlo trials per setup; fresh 25/25/50 splits each trial; shift strength fixed (β as above); coverage and CRPS averaged over trials.

## 7. Numerical results / baselines
Airfoil under shift: unweighted CPS coverage collapses below nominal; **WSCPS restores average coverage to the desired 80%** and slightly improves (lowers) CRPS vs. unweighted CPS. Kang–Schafer: same pattern — coverage restored, CRPS competitive-to-better. The paper's headline is restoration-to-nominal rather than a percentage improvement; interval widths remain reasonable (no blowup reported).

## 8. Code / data availability
https://github.com/predict-idlab/crepes-weighted (Python, extends the `crepes` conformal package).

## 9. Leakage & limitations
(a) **Conjecture 3.5 is unproved** — probabilistic validity of WSCPS rests on empirical evidence + a conjecture, not a theorem; the coverage guarantee under estimated weights is approximate. (b) Weight estimation is the whole game: a bad test-vs-calibration discriminator gives bad weights and no validity — the paper's shifts are clean exponential tilts, far tidier than NFL regime drift. (c) Assumes P(Y|X) invariance — in the NFL, a QB change arguably changes P(Y|X) itself (concept drift), which WSCPS does not handle. (d) Small datasets (N=1,503) — weight estimation variance at GSE scale (~hundreds of games) is a real concern. (e) Only 80% nominal level tested.

## 10. GSE overlap
Existing-research-map.md: conformal prediction is covered (CQR, conformal audit) but **nothing on covariate-shift-aware conformal** — no likelihood-ratio weighting, no regime-drift correction for intervals. The map's calibration section assumes exchangeable-ish windows. This is a new capability directly aimed at GSE's known regime problem (the cqr.ts audit and the standing concern about non-stationarity).

## 11. GSE implementation spec
(1) Build a **regime discriminator**: logistic regression distinguishing "current-regime games" (last 4 weeks) from the calibration window (trailing 2 seasons) on covariates (QB identity flags, injury counts, weather, home/away, line movement); (2) use its predicted odds as ŵ(x) in a weighted conformal interval layer for totals/spreads (via crepes-weighted or a port); (3) compare coverage/width vs. unweighted rolling conformal on 2023–2025 backtests, with regime-shift weeks (starting-QB changes) flagged. Effort: ~1 week.

## 12. Reproducible test
Dataset: 2023–2025 NFL games; define shift episodes (weeks following a starting-QB change or head-coach firing). Metric: conditional coverage during shift episodes at 90% nominal + CRPS of predictive distributions. Baselines: unweighted CPS, plain rolling conformal. Success = WSCPS episode-conditional coverage within 3pp of nominal while unweighted CPS is ≥5pp off.

## 13. Acceptance / rejection gate
ADOPT if WSCPS restores episode-conditional coverage to within 3pp of nominal without >10% width inflation vs. unweighted; REJECT if the discriminator's ŵ estimates are unstable (effective sample size of calibration < 30% of nominal — weight collapse) or if P(Y|X) drift dominates (WSCPS still miscalibrated during episodes, indicating concept drift, limitation (c)).

## 14. Improvement experiment
**Doubly-robust CPS**: combine WSCPS weighting with a conditional (Mondrian) calibration split by regime — test whether weighting + stratification beats either alone during shift episodes; the paper tests weighting only against unweighted, never against stratification, so the interaction is unknown.
