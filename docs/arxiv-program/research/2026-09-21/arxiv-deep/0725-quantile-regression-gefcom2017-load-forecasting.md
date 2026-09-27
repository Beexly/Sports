# [0725] Quantile Regression for Qualifying Match of GEFCom2017 Probabilistic Load Forecasting (arXiv:1809.03561v1)

**Citation:** Florian Ziel (2018). *Quantile Regression for Qualifying Match of GEFCom2017 Probabilistic Load Forecasting*. International Journal of Forecasting. arXiv:1809.03561v1. URL: https://arxiv.org/abs/1809.03561v1
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/1809.03561.txt (214 lines, full: abstract, §1–§5, results table, references).
**Verdict:** ADAPT — a competition-winning (2nd of ~100 teams, open track) quantile-regression framework for probabilistic forecasting: log-load decomposition into long-term trend + periodic remainder, 24 hourly quantile regressions with seasonal-interaction structure, evaluation by pinball loss. The architecture (decomposition + deterministic seasonal basis + pinball evaluation) ports to GSE's point-total and score-differential forecasting.

## 1. Research question
Can a deliberately simple quantile-regression model — log decomposition, annual moving-average trend, 24 hourly regressions with seasonal interactions — beat ~100 teams in GEFCom2017's probabilistic load-forecasting qualifying match?

## 2. Dataset / schema
Hourly electricity load for 10 ISO New England zones (TOTAL + ME, NH, VT, CT, RI, MA, MA.SE, MA.WC, MA.NE) + dry-bulb/dew-point temperature; ~10.25 years in-sample per task (365×10+92 days). 6 tasks, 1-month-ahead forecasting windows Jan–Apr 2017; quantiles Q={0.1,...,0.9}. Two tracks: defined-data (load + temperature only) and open-data (any data). Public competition data.

## 3. Method / model
1. Log-load L_t = log(ℓ_t); decompose L_t = trend_t + Y_t (2) for near-periodic stationarity.
2. **Trend:** annual smoothing moving average (K=8736 hours) of OLS residuals from regression (3)–(4) with hour-of-week dummies, Fourier-2 annual basis, periodic B-splines BS12, cubic temperature polynomials; trend uncertainty via sample quantiles of Δ_H trend̂.
3. **Remainder:** 24 hourly quantile regressions (5), 46 parameters each: day-of-week dummies (7) + annual Fourier-2 × day-of-week interactions (28) + annual B-spline BS12 (11). No autoregression (memory too weak at 1-month horizon), no temperature in the short-term component, holidays ignored.
4. Final quantiles: q̂_τ(L) = q̂_τ(Y) + q̂_τ(trend); q̂_τ(ℓ) = exp(q̂_τ(L)). Estimated via R package quantreg (asymmetric-Laplace MLE equivalence).

## 4. Equations & assumptions
- Pinball score: S_τ(y,q) = (y−q)(τ − 𝟙{y−q<0}) (1).
- Decomposition L_t = trend_t + Y_t (2).
- Trend regression (3)–(4): periodic dummies + temperature polynomials; trend_t = (1/K) Σ ε_{t−k} + e_t, K=8736.
- Quantile model (5): day-of-week + annual×weekly interactions + annual B-splines; estimator (6): β̂ = argmin Σ S_τ(Y, β′X).
- Assumptions: periodic stationarity after de-trending; quantile addition valid only under comonotonicity (acknowledged as "sloppy" but empirically helpful); hierarchy ignored (not penalized); no structural breaks.

## 5. Features / target
Inputs: deterministic calendar basis (hour-of-week dummies, annual Fourier, periodic B-splines), temperature polynomials for trend. Target: quantiles 0.1–0.9 of load.

## 6. Validation design
Competition: 6 real-time tasks, ~100 teams; pinball scores vs Vanilla benchmark (Hong et al. 2016), improvements in % across 10 zones × 6 tasks.

## 7. Numerical results / baselines
(quoted exactly)
- **2nd place open-data track, 4th place defined-data track** (of ~100 teams).
- Model beats Vanilla benchmark in **90% of zone×task cases**.
- Task 1 TOTAL: pinball 358.44 MW vs benchmark 402.68 MW (+10.99%); ME +36.87%; task 6 TOTAL +11.19%, ME +46.89%.
- In-sample 10–90% quantile range ≈0.1 (log scale) vs trend-component range <0.008 → uncertainty driven by quantile-regression component.
- Model has 24×9×10 = 2,160 quantile regressions; each 46 parameters.

## 8. Code / data availability
R package quantreg (Koenker, default inputs); GEFCom2017 data public via competition. No custom repo given.

## 9. Leakage & limitations
- Paper's own: ignored holidays, non-linear effects, structural changes (Massachusetts solar boom example — time-varying components needed); no neighboring-zone/hierarchy information; quantile summation only valid under comonotonicity; suggests quantile-lasso for dimensionality.
- Temperature ignored in the remainder — counterintuitive but justified at 1-month horizon where weather forecasts are poor; for GSE, weather matters at short horizons and should not be dropped blindly.

## 10. GSE overlap
The competition-proven probabilistic-forecasting template for GSE's **totals and score-differential lane**. Dedup: CQR (Drive research) covers quantile-regression *intervals*; this is the first pinball-evaluated, competition-winning quantile-*forecasting* method in the corpus, and it directly addresses map gap #7 (live spread/total probability surfaces are thin). NFL totals (and team totals) have the same structure the paper exploits: long-term trend (season scoring environment, rule changes — the "trend_t") + periodic remainder (weekly matchup effects, rest, weather bands). The key transferable insight: decompose into a slow-moving level component and a stationary remainder, then fit quantile regressions on a deterministic calendar/matchup basis evaluated by **pinball loss** — producing full predictive distributions, not point estimates, which is exactly what calibrated totals betting and Kelly sizing need. Complements 0723/0724 (calibration of probabilities) — this gives the distributions to calibrate.

## 11. GSE implementation spec
1. For NFL totals: model log(total) = trend_t + Y_t; trend = annual moving average of residuals (season scoring environment); Y via quantile regressions on deterministic basis: week-of-season B-splines, rest-differential dummies, weather-band interactions, divisional flags.
2. Fit quantiles 0.1–0.9 (quantreg-style pinball minimization); add trend-quantile uncertainty; exponentiate back.
3. Evaluate on pinball loss vs GSE's current totals model and the market line; use the distribution for Kelly-staked totals picks and for the abstention gates (0714–0720).
Effort: 1 week prototype (basis functions are simple; no custom optimizer needed — quantreg equivalent exists in Python).

## 12. Reproducible test
Dataset: 2018–2024 NFL game totals with weather/rest/schedule features. Fit the decomposition-quantile model on 2018–22; backtest pinball loss and ROI on 2023–24 totals vs market lines and vs GSE's current totals model. Pass if pinball loss is lower and Kelly-staked picks show positive ROI.

## 13. Acceptance / rejection gate
ADOPT if the quantile model beats GSE's current totals approach on pinball loss and produces positive backtest ROI. REJECT if the decomposition adds nothing — i.e., if NFL totals are sufficiently stationary that a single quantile regression without the trend component matches performance (simpler wins).

## 14. Improvement experiment
Fix the paper's two admitted weaknesses: (a) quantile-lasso (L1-penalized quantile regression) on an expanded feature set including weather forecasts and team-strength ratings — the paper flags this as future work; (b) make the trend component time-varying with structural-break detection (rule-change/season-boundary effects), since the paper's own error analysis points to time-varying components as the biggest prospective gain.
