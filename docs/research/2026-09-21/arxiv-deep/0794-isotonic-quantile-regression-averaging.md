# 0794 — Isotonic Quantile Regression Averaging for uncertainty quantification (2507.15079v1)

**Verdict:** ADAPT — ensembles / calibration lane.
**Source:** full text read in full (`/tmp/ledgers-read/2507.15079.txt`), 427 lines. Not from abstract.
**Authors:** Lipiecki & Uniejewski (Wrocław University of Science and Technology) — arXiv 2507.15079v1 (Jul 2025). Code in open-source Julia package `PostForecasts.jl` (github.com/lipiecki/PostForecasts.jl); neural-net forecasts + package allow reproduction.

## Citation / full-text source
- arXiv ID: `2507.15079v1`, "Isotonic Quantile Regression Averaging for uncertainty quantification of electricity price forecasts".
- Full text read from local wrapped cache `/tmp/ledgers-read/2507.15079.txt` (lines 1–427). Same group as 2404.02270 (IDR postprocessing) and 2308.15443 (CRPS learning) — builds directly on ledger 0792's findings.

## Question
Quantile Regression Averaging (QRA) is the standard way to turn a point-forecast ensemble into predictive quantiles, but it needs regularization (Lasso = hyperparameter search over a λ grid) to avoid overfitting. Can we instead regularize by imposing *stochastic order* — quantiles nondecreasing in the point forecasts — for a hyperparameter-free, cheaper, interpretable alternative?

## Dataset / schema
- German day-ahead electricity prices (BZN|DE-LU), 8 Jan 2015 – 31 Dec 2024; 25 NARX neural networks (5-hidden-neuron, tanh, Levenberg-Marquardt, Box-Cox λ=0.5 VST) as point-forecast ensemble; 1456-day rolling training window; exchangeable ensemble sorted ascending; 364-day calibration window; 1833-day (5-year) out-of-sample test from 1 Jan 2020, covering COVID and Ukraine invasion.

## Method
- iQRA: linear quantile regression on the sorted ensemble, Q̂(τ) = β₀ + βᵀp̂, β from pinball-loss LP — with **all slope coefficients constrained ≥ 0** (βᵢ = βᵢ⁺ − βᵢ⁻; simply delete the βᵢ⁻ variables from the LP). Isotonicity of the quantile function in the covariates ⇔ stochastic-order constraint of IDR (ledger 0792).
- LP complexity falls from Õ(2MT + T^2.5) to Õ(MT + T^2.5) — isotonicity *reduces* the search space, no penalty term, no λ tuning.
- Benchmarks: QRA (unconstrained), LQRA (Lasso; λ grid 20 values log-spaced 10⁻²–10¹, BIC selection), QRM (committee machine), IDR (linear pool of 25 individual IDRs), CP, Historical Simulation.

## Equations / assumptions
- LP formulation of quantile regression: min_{Ax=b, x≥0} cᵀx with each βᵢ split into βᵢ⁺ − βᵢ⁻; isotonicity = drop all βᵢ⁻ (except intercept).
- Pinball loss pinball(τ): (1[P < P̂^τ] − τ)(P̂^τ − P); PIPS(α) = ½PS(α/2) + ½PS(1−α/2); CRPS ≈ average PS over 99 percentiles.
- Reliability metrics: ACE(α) = empirical coverage − nominal coverage; TB = right-tail miss rate − left-tail miss rate.
- Assumptions: sorted exchangeable ensemble; stochastic-order (monotonic) relation between point forecasts and outcome; independent LP per quantile with post-hoc sorting to fix quantile crossing.

## Features / target
- Features: sorted 25-member NARX ensemble predictions (p̂^(1) ≤ … ≤ p̂^(25)).
- Target: 24 hourly day-ahead prices as 99 percentiles.

## Validation
- 5-year out-of-sample test; PIPS at 98/96/90/80% confidence levels, ACE + Tail Bias at the same levels, CRPS per year (2020–2024), CPA tests (Giacomini–White) vs iQRA.

## Exact results / baselines
- **PIPS** (lower better): iQRA best at 98% (0.781 vs LQRA 0.788); LQRA slightly better at 96/90/80% (1.266/2.416/3.853 vs iQRA 1.273/2.427/3.864) — iQRA–LQRA differences *insignificant* per CPA; iQRA significantly beats QRA, QRM, CP, HS, IDR at all levels (IDR worst at 98%: 1.180).
- **CRPS by year**: iQRA and LQRA lowest or near-lowest every year (2024: iQRA 7.482 vs LQRA 7.492 — iQRA significantly better; 2020: both 1.521). iQRA significantly beats HS, CP, QRA, QRM in most years.
- **Reliability** (ACE/TB plots): iQRA sits closest to top-center (low coverage error + minimal tail bias) at all confidence levels; CP/HS cover well but have large tail bias; IDR poor on both.
- **Compute per forecast day** (Julia, single thread, Apple M2 Pro): CP 1 ms, HS 1 ms, IDR 100 ms, QRM 10 s, iQRA 20 s, QRA 30 s, **LQRA 600 s** — iQRA is 30× faster than Lasso-QRA with statistically indistinguishable accuracy.
- **Variable selection**: iQRA selects 14.2% of regressors vs 12.3% for LQRA; ensemble *extremes* (min for low quantiles, max for high quantiles) are selected far more often than middle members.

## Code / data
- Lasso quantile regression + isotonic quantile regression added to `PostForecasts.jl` (Julia); neural-net forecasts provided for reproduction. Data: ENTSO-E + Investing.com (public).

## Leakage
- None evident: rolling 1456-day point-model training + 364-day postprocessing calibration, daily re-estimation, fully out-of-sample test. Exchangeability of the 25-member ensemble (only from training stochasticity) is a modeling assumption, stated explicitly.

## GSE overlap
- Checked against `~/workspace/arxiv-sweep/existing-research-map.md`: no QRA/LQRA/iQRA implementation documented. Ledger 0792 (IDR postprocessing) is the sibling paper; iQRA differs from IDR (linear isotonic quantile regression vs nonparametric isotonic CDF) — complementary, not duplicative.

## Implementation (GSE adaptation)
- **iQRA is the cheapest high-quality postprocessor for GSE's point forecasts**: replace any Lasso-tuned quantile postprocessing with nonnegative-constrained quantile regression on a sorted ensemble of point predictions — no λ grid, 30× faster, statistically as good as Lasso, with free variable selection.
- The variable-selection finding transfers directly: GSE should feed *sorted* point predictions (e.g., multiple model seeds or window variants of the engine) and let iQRA pick the extremes for the tails — the tail quantiles are what drive limit-order/bet-sizing decisions.
- If GSE ever tunes a Lasso quantile postprocessor, iQRA is the drop-in replacement that removes the hyperparameter.

## Reproducible test
- On GSE's picks: build iQRA distributions from (engine prob ensemble, outcome) pairs on a rolling 364-day window; compare vs LQRA and plain QRA on CRPS + ACE/TB at 80/90/96/98% intervals with CPA tests.
- Expectation per paper: iQRA ≈ LQRA on CRPS (insignificant difference), both significantly better than QRA; iQRA 30× faster.

## Numeric gate
- CPA: iQRA significantly outperforms unconstrained QRA at 1% on CRPS; ACE at 90% within ±1 pp of nominal (paper: iQRA best-centered); compute budget: < 1 minute per daily batch.

## Improvement experiment
- Combine iQRA with ledger 0792's vertical-average ensemble (IDR + QRA + iQRA): the paper's Shapley analysis showed IDR is the best *diversifier* while iQRA is the best *single* postprocessor — a three-way vertical average should beat either.

## Verdict
**ADAPT** — ensembles/calibration lane. The method is new, public-code, hyperparameter-free, and strictly better engineering than the standard Lasso-QRA: same accuracy, 30× faster, built-in selection of tail-relevant extreme members. Together with 0792's IDR, it gives GSE a complete nonparametric postprocessing stack for turning point predictions into calibrated distributions.
