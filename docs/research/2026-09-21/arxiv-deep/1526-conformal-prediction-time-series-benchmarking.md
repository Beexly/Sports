# [1526] Conformal Prediction Algorithms for Time Series Forecasting: Methods and Benchmarking (arXiv:2601.18509)

**Citation:** Andro Sabashvili (2026). *Conformal Prediction Algorithms for Time Series Forecasting: Methods and Benchmarking.* arXiv:2601.18509v1 [stat.AP]. URL: https://arxiv.org/abs/2601.18509
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv; all sections, methods survey, benchmark results, conclusions).
**Verdict:** ADAPT — a practitioner-oriented benchmark confirming horizon-specific split CP (MSCP) as the most efficient valid multi-horizon method; GSE can adopt its rolling horizon-specific calibration design for the engine's point-forecast intervals.

## 1. Research question
Which conformal prediction (CP) wrappers deliver valid *and* efficient (tight) multi-horizon prediction intervals for time series, where temporal dependence violates the exchangeability assumption?

## 2. Dataset / schema
Large-scale monthly sales data: >3,000 individual time series, multiple countries/industries (entertainment, fashion, restaurant, electronics); base forecaster AutoARIMA for all methods; horizon H=12 months.

## 3. Method / model
Surveys and benchmarks five CP families: (1) **MSCP** (Wang & Hyndman 2024/2026) — horizon-specific split CP via rolling residual matrix S ∈ R^{T×H}, quantile q_{h,1−α} per horizon; (2) **EnbPI** (Xu & Xie 2021) — ensemble bootstrap with LOO residuals under stationary strongly-mixing errors; (3) **SPCI** (Xu & Xie 2023) — quantile regression (QRF/CQR) on lagged residuals for adaptive residual-quantile intervals; (4) **Global-CP** (Stankeviciute et al. 2021 adapted) — whole series as exchangeable unit + Bonferroni α/H for joint H-step coverage; (5) **online controllers** — ACI (Gibbs & Candès 2021: α_{t+1} = α_t + γ(α − err_t)) and AcMCP (Wang & Hyndman: quantile update with MA(h−1) nonconformity forecast); baselines Parametric-PI (Gaussian ARIMA intervals) and Nixtla-CP.

## 4. Equations & assumptions
- SCP interval: Γ_α(x_new) = [ŷ_new − q_{1−α}, ŷ_new + q_{1−α}] with q = ⌈(1−α)(n_cal+1)⌉-th order statistic (finite-sample correction).
- Marginal coverage guarantee: P(Y ∈ Γ_α(X)) ≥ 1−α (under exchangeability); conditional coverage noted as generally unachievable.
- Winkler interval score: WIS_i = (u−ℓ) + 2/α·(miss distance) on miss; lower is better.
- Assumptions per method: EnbPI — stationary strongly-mixing errors; SPCI — consistent quantile estimation under dependence; Global-CP — exchangeable series + many independent trajectories; ACI/AcMCP — target long-run average coverage.

## 5. Features / target
Absolute residuals |y−ŷ| as nonconformity scores; lagged residuals as quantile-regression features; residual matrix columns per horizon.

## 6. Validation design
Target 90% coverage, H=12, AutoARIMA base; marginal coverage + joint coverage (Global-CP) + mean interval width + Winkler score, averaged across horizons then series; Friedman test + Conover post-hoc with critical-difference diagrams; small-sample CD diagram then expanded corpus to resolve top-3 ranking.

## 7. Numerical results / baselines
- Valid (≥90%): Global-CP, AcMCP, MSCP, ACI, Parametric-PI. Under-cover: Nixtla-CP, EnbPI, SPCI (SPCI most pronounced under-coverage).
- Winkler score CD ranking: MSCP best, then Parametric-PI, then ACI (no significant difference between the three initially; larger corpus resolves hierarchy).
- No significant difference among top three on small corpus; larger corpus: MSCP #1 statistically separated.

## 8. Code / data availability
Methods from statsforecast (Nixtla), forecast (Hyndman & Athanasopoulos), conformalForecast R package v0.1.1 (Wang & Hyndman 2026), SPCI-code (Xu & Xie), EnbPI implementations.

## 9. Leakage & limitations
- Sequential splits used to avoid leakage; fair. No leakage identified.
- Practitioner-oriented by design: neural base predictors excluded; compute-heavy methods omitted — generality beyond AutoARIMA unclear.
- ACI/AcMCP efficiency loss during distribution shifts acknowledged; SPCI/EnbPI under-coverage may be hyperparameter-specific (defaults used).
- Figure-level numbers (coverage rates, widths) not reported in text tables — ranking only.

## 10. GSE overlap
Existing research map has CQR (ledger 1518-era) and conformal-interval work. This benchmark directly complements: it ranks the CP-family wrappers around *any* point forecaster, validating horizon-specific calibration (MSCP) as the efficiency winner — exactly the structure GSE needs for multi-week-ahead game-outcome intervals. No prior ledger compared ACI vs MSCP vs EnbPI on the same base.

## 11. GSE implementation spec
- Implement MSCP as GSE's default multi-horizon interval wrapper: rolling residual matrix over engine point forecasts, horizon-specific quantiles with the ⌈(1−α)(n+1)⌉ finite-sample correction; ACI (α-adaptive controller) as fallback when monitoring detects coverage drift.
- Validate coverage on the engine's own backtest; per this benchmark expect MSCP to beat the parametric Gaussian and ACI on tightness at 90% coverage.
- Effort: 1–2 days (wrapper only; base engine unchanged).

## 12. Reproducible test
Dataset: engine point forecasts vs. outcomes, 2021–2024, horizon-analog of 1–12 weeks out. Build MSCP intervals vs. Gaussian benchmark vs. ACI; metrics: marginal coverage at 90%, mean width, Winkler score; Friedman+Conover across game-weeks. Expect MSCP ≥90% coverage with smallest WIS.

## 13. Acceptance / rejection gate
ADOPT MSCP as default interval layer if it achieves ≥90% empirical coverage with Winkler score ≥5% below the parametric Gaussian benchmark on the engine backtest; if ACI significantly beats MSCP (Conover test), adopt ACI instead (the paper's own contingency).

## 14. Improvement experiment
The paper's top-3 ranking was unresolved on the small corpus — rerun the comparison on GSE-scale data (multiple seasons) and add the ledger-1522 diversity-selected calibration window to MSCP's residual matrix to test whether efficient calibration sets preserve MSCP's efficiency ranking while cutting compute — a combination neither paper tests.
