# [1096] Assessing the Utility of Weather Data for Photovoltaic Power Prediction (arXiv:1802.03913v1)

**Citation:** Zafarani, R., Eftekharnejad, S., & Patel, U. (2018). *Assessing the Utility of Weather Data for Photovoltaic Power Prediction*. arXiv:1802.03913v1. URL: https://arxiv.org/abs/1802.03913
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — a small, methodologically weak solar-power regression study (random splits on time series, unclear units, no weather-value ablation); the domain is far from sports and the paper never answers its own title question.

## 1. Research question
Does adding weather data improve photovoltaic power prediction, and how much data / which features suffice? (The paper's title question is never cleanly answered — see §9.)

## 2. Dataset / schema
One Syracuse solar-panel installation, 2016-06-29 through 2017-02-25, 100+ parameters: weather data, meter/PV data, solar radiation data, plus 5-day-ahead predicted weather values. Sample counts and exact schema are loosely specified; units/scaling of the target are unclear.

## 3. Method / model
LASSO and ordinary linear regression to predict PV power output. LASSO tuned via 10-fold CV (α=0.1722); also tested α=0.001. Train/test via random 60/40 split (on time-ordered data — see leakage). A top-25-feature model is also tried.

## 4. Equations & assumptions
Standard LASSO/OLS; no equations of note. Assumptions: i.i.d. samples (violated — time series); linear relationship between weather features and power output; random-split validation estimates generalization.

## 5. Features / target
100+ features (weather, meter, radiation); target = PV power output (units unclear). Feature importance: instantaneous solar irradiance dominates. Claim: ~6 features suffice; ~5,000 samples (~2 months) stabilize error.

## 6. Validation design
Random 60/40 split and 10-fold CV on time-series data — invalid for a forecasting task (leakage via temporal autocorrelation). No time-ordered backtest. No baseline comparing "with weather" vs "without weather" — the paper never runs the ablation its title promises.

## 7. Numerical results / baselines
LASSO: default MSE 5.5436; 10-fold CV α=0.1722; 60%-train MSE 5.5045; α=0.001 → MSE 5.4459. OLS: full-data MSE 5.4248; 60/40 split MSE 5.4147. Top-25-feature model MSE 5.4968. (Units of MSE unstated; differences between models are tiny and likely noise.)

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Random splits on autocorrelated time series = train/test leakage; no time-ordered validation. Never tests the actual research question (no with/without-weather comparison). Unclear target units/scaling make MSE values uninterpretable. Single site, single 8-month winter-skewed window. Domain (rooftop solar) has no mechanism connecting to sports prediction; the "weather data value" lesson is asserted, not demonstrated.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. The weather-for-totals lane cares about wind/precipitation effects on scoring — a solar-irradiance regression offers no transferable method. Ledger 1098 (KoMet) covers weather-model post-processing rigorously. No overlap; no value.

## 11. GSE implementation spec
Not applicable — REJECT.

## 12. Reproducible test
Not applicable — REJECT.

## 13. Acceptance / rejection gate
REJECT: invalid validation, unanswered research question, uninterpretable metrics, no sports applicability. Replaced by ledger 1302.

## 14. Improvement experiment
Not applicable — see replacement ledger 1302 for the same-lane (weather/energy forecasting) substitute.
