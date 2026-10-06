# 0792 — Postprocessing point predictions for probabilistic forecasting: IDR beats DDNN (2404.02270v2)

**Verdict:** ADAPT — ensembles / calibration lane.
**Source:** full text read in full (`/tmp/ledgers-read/2404.02270.txt`), 459 lines. Not from abstract.
**Authors:** Lipiecki, Uniejewski, Weron (Wrocław University of Science and Technology) — arXiv 2404.02270v2 (Apr 2024), published in Energy Economics. Domain: electricity price forecasting, but the postprocessing + diversity result transfers directly to GSE's engine-uncertainty lane.

## Citation / full-text source
- arXiv ID: `2404.02270v2`, "Postprocessing of point predictions for probabilistic forecasting of day-ahead electricity prices: The benefits of using Isotonic Distributional Regression".
- Full text read from local wrapped cache `/tmp/ledgers-read/2404.02270.txt` (lines 1–459). Postprocessing code: Julia package `PostForecasts.jl` (github.com/lipiecki/PostForecasts.jl). Data: ENTSO-E + Investing.com (public).

## Question
Most forecasting models (like GSE's engine) produce only point predictions, while decisions need full predictive distributions. Which of three postprocessing schemes — Quantile Regression Averaging (QRA), Conformal Prediction (CP), Isotonic Distributional Regression (IDR) — best converts point forecasts into probabilistic ones, and does their ensemble beat state-of-the-art distributional deep neural networks?

## Dataset / schema
- German (BZN|DE-LU) and Spanish (BZN|ES) day-ahead electricity prices, 1 Jan 2015 – 31 Dec 2023; day-ahead load + onshore/offshore wind/solar forecasts (ENTSO-E); EUA carbon, TTF natural gas, Brent crude, API2 coal closing prices (Investing.com); DST preprocessing; asinh variance-stabilizing transformation of prices (median/MAD standardized).
- 4.5-year out-of-sample test (27 Jun 2019 – 31 Dec 2023), covering COVID and the Ukraine war/energy crisis. 24 hourly series modeled independently.
- German price crashed to −500 EUR/MWh (minimum admissible) on 02.07.2023 — extreme-tail regime included.

## Method
- Point models: LEAR (LASSO-estimated AR, parameter-rich: price lags 1,2,3,7 × 24h; load/RES lags 0,1,7; 4 macro vars at d−2; daily dummies; coordinate-descent LASSO + 7-fold CV, 5 runs averaged; training windows D = 56, 84, 1092, 1456) + similar-day naive benchmark.
- Postprocessing (per hour, retrained daily, calibration windows m ∈ {28, 56, 91, 182} days, final = vertical averaging over 4 windows):
  - **QRA**: `q̂(α|p̂) = [1, p̂^ave]·β_α`, β from pinball-loss minimization; most compute-intensive of the three.
  - **CP**: symmetric PIs from absolute-error nonconformity scores in calibration window; quantiles via `p̂ ± λ^{2α}`-type construction.
  - **IDR** (Henzi et al. 2021): nonparametric, minimizes CRPS under the isotonic constraint (CDF non-increasing / quantiles non-decreasing in the point forecast); solved by abridged pool-adjacent-violators algorithm (Henzi et al. 2022); interpolation for new forecasts (eq. 7); extrapolation clamps to endpoints.
  - **LEAR-Ave**: vertical average of the three predictive distributions.
- Benchmarks: Naive-1N, Naive-N, LEAR-N (Gaussian errors), DDNN-JSU (Johnson's SU distributional neural nets, hyperparameter-optimized).

## Equations / assumptions
- IDR: (F̂₁(z),…,F̂_m(z)) = argmin Σ(ηᵢ − 1{p_{i,h} ≤ z})² s.t. η₁ ≥ … ≥ η_m, ηᵢ ∈ [0,1]; conditional CDFs interpolated linearly between sorted point forecasts.
- CRPS approximated as sum of pinball scores over 99 percentiles; skill score SS^model_d = 1 − ΣCRPS^model/ΣCRPS^{LEAR-N} over rolling 182-day windows.
- CPA test (Giacomini–White 2006): Δ_d = φ′X_{d−1} + ε_d on loss-differential series with constant + lagged differentials.
- Shapley values (LossSHAP/SAGE style, Lipiecki & Weron 2024) decompose LEAR-Ave's CRPS improvement among QRA/CP/IDR.
- Assumption: isotonic stochastic-order relation between point forecast and outcome; CP assumes symmetric errors.

## Features / target
- Features: past prices (lags 1,2,3,7), load/RES day-ahead forecasts (lags 0,1,7), carbon/gas/oil/coal prices at d−2, day-of-week dummies.
- Target: 24 hourly day-ahead prices, output as 99 percentiles of predictive distribution.

## Validation
- 4.5-year out-of-sample test per market; metrics: CRPS (aggregate pinball, 99 percentiles), rolling 182-day skill scores, APS₂₀ (extreme 20 percentiles: 1–10, 90–99), CPA tests for all model pairs; results split into four subperiods (2020† = 554 days, 2021, 2022, 2023).

## Exact results / baselines
- **LEAR-Ave (QRA+CP+IDR) achieves the lowest CRPS across both markets and all four subperiods.** Germany CRPS: LEAR-Ave 1.310 / 3.970 / 10.199 / 4.215 (2020†/2021/2022/2023); Spain: 0.938 / 3.832 / 6.983 / 4.369. CPA test: LEAR-Ave significantly outperforms ALL models in both markets.
- Shapley values: **IDR contributes the most to LEAR-Ave** — in 2023 its contribution exceeds **75%** in both markets. CP contributes least. IDR has the most volatile behavior (best in calm-after-volatile periods: May–Sep 2021, Sep–Dec 2023; poor Dec 2019–Apr 2021) but is the most valuable *diversifier*.
- QRA is the best all-rounder (second only to the combination); CP is the most stable.
- **All LEAR-based models, even LEAR-N, significantly outperform DDNN-JSU** (much more complex + demanding): DDNN-JSU collapsed during the energy crisis (Germany 2022: 13.375 vs LEAR-Ave 10.199; Spain 2022: 8.299 vs 6.983). A tuned-deep-network vs tuned-simple-ensemble upset on out-of-sample crisis data.
- Tails (APS₂₀): LEAR-Ave best in all subperiods except first German subperiod (DDNN-JSU insignificantly better) and Spain 2023 (LEAR-IDR best).
- Compute: LEAR+postprocessing full pipeline ≈ 2:45–3:15 h on 64-core server vs DDNN-JSU 6:00–6:30 h; DDNN hyperparameter optimization would take weeks.

## Code / data
- `PostForecasts.jl` (Julia, github.com/lipiecki/PostForecasts.jl) — the postprocessing schemes. DDNN: github.com/gmarcjasz/distributionalnn. Data: ENTSO-E Transparency + Investing.com (public, replicable).

## Leakage
- None evident. Postprocessing calibrated on rolling m-day windows of past (forecast, realization) pairs; point-model CV randomness averaged over 5 runs. Honest disclosure: the authors' LEAR-QRM beat Marcjasz et al.'s reported 1.662 → 1.350 CRPS because of better asinh transformation + coordinate descent; Marcjasz's data used stale 2015–2017 ENTSO-E series (median deviation 372 MWh in RES forecasts) — a dataset-consistency bug they caught and reported.

## GSE overlap
- Checked against `~/workspace/arxiv-sweep/existing-research-map.md`: no IDR, CP-for-forecasts, or point→distribution postprocessing implementation documented; the conformal prediction audit (cqr.ts coverage bug) in the Drive deep reads is adjacent but is quantile-regression CQR, not IDR postprocessing. No overlap.

## Implementation (GSE adaptation)
- **This is the point-prediction → predictive-distribution recipe GSE needs**: GSE's engine emits point predictions (spreads/totals/probabilities); IDR and CP convert them into calibrated distributions using only recent (forecast, realization) pairs — no neural net, no hyperparameter search, retrainable daily.
- IDR is the recommended default postprocessor: nonparametric, CRPS-optimal under isotonicity, fastest (15–20 s) of the three, and empirically the top diversifier in the ensemble per Shapley values. Use the pool-adjacent-violators algorithm from `PostForecasts.jl` (port from Julia).
- Practical GSE design: postprocess each pick probability with IDR on a rolling m-day window of (engine prob, outcome) pairs; combine IDR + QRA + CP distributions vertically (vertical average was the winning ensemble form).

## Reproducible test
- On GSE's 3,411 `picks` records (neondb): for each market type (SPREAD/MONEYLINE/TOTAL), build IDR postprocessed distributions from engine probabilities vs outcomes; compare CRPS/log-loss of IDR vs Gaussian-N(0,σ̂) vs raw engine probs out-of-sample with a Giacomini–White CPA test.
- Expectation per paper: IDR ≤ raw on CRPS, and IDR+QRA vertical average beats every single postprocessor.

## Numeric gate
- CPA test: IDR-ensemble significantly outperforms Gaussian-error benchmark (LEAR-N analog) at 5% in both market-type subsets; Shapley contribution of IDR to the ensemble > 40% (paper: >75% in 2023).

## Improvement experiment
- Combine IDR with mAFTER-style adaptive weighting (ledger 0786) across multiple calibration windows instead of the simple vertical average — window selection is where IDR's volatility lives (the poor Dec-2019–Apr-2021 stretch); adaptively weighting windows should capture the upside while dampening the bad spells.

## Verdict
**ADAPT** — ensembles/calibration lane. Directly actionable: IDR is a fast, nonparametric, public-code method to turn GSE's point predictions into calibrated predictive distributions, and the paper's key finding — that the most *volatile* component (IDR) is the most valuable *diversifier* — is a design principle for GSE's uncertainty stack.

## Limitations

1. **IDR is the most *uneven* component (authors' own words):** "Among the three postprocessing schemes, IDR shows the most uneven performance. In Germany relatively poor for the 182-day windows ending between Dec 2019 and Apr 2021, between Dec 2021 and Apr 2022, and between Aug 2022 and Apr 2023..." It is a diversifier, not a standalone replacement for QRA.
2. **IDR shines only in calm-after-storm windows (authors' own assessment):** "It seems that LEAR-IDR excels in (relatively) calm periods that follow more volatile ones, but is not an all-rounder like LEAR-QRM." Regime dependence is a real weakness for GSE, where volatile stretches are exactly when calibration matters most.
3. **The DDNN comparison is under-tuned by the authors' own admission:** "it is beyond the scope of this study to examine whether frequent (extremely time-consuming) hyperparameter optimization would allow it to perform well during periods of extreme prices." The "LEA​R-Ave beats DDNN-JSU" claim is qualified; and "in the first 1.5-year subperiod in Germany the DDNN-JSU network excels."
4. **My observation — tail weakness:** IDR's value is documented on whole-period CRPS; "in the tails of the predictive distribution the situation is less straightforward." For GSE, tail calibration (extreme spreads/totals) is the high-value use case, and that is precisely where this paper's evidence is weakest.
