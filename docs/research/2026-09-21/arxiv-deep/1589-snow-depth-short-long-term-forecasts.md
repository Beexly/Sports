# [1589] Statistical models for short and long term forecasts of snow depth (arXiv:1901.04695)

**Citation:** Hammer, H. L. (2019). *Statistical models for short and long term forecasts of snow depth*. arXiv:1901.04695. URL: https://arxiv.org/abs/1901.04695
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, ~612 lines, Sections 1–5 + references + Table 2).
**Verdict**: ADAPT
ADAPT — one sentence: The zero-inflated gamma regression with physically-grounded snowfall/melting nonlinearity is the only model in this wave (or the wave's existing gap list) that handles a derived, persistent, threshold-sensitive surface variable like snow depth — directly transferable to GSE's Buffalo/Green Bay/Foxboro snow-game totals, where the engine needs a probabilistic snow-depth-on-the-field model, not just a precipitation forecast, and no current engine component produces one.

## 1. Research question
Can a physics-guided statistical model produce useful short-term (5-day, given reliable T/R forecasts) and long-term (3-week, time-series-based) probabilistic forecasts of snow depth, filling a gap the author identifies as completely unmodeled in the statistical-forecast literature?

## 2. Dataset / schema
Three Norwegian locations (Oslo, Geilo, Tromsø) with different climates; daily D_t (snow depth), R_t (24-h precipitation), T_t (24-h mean temperature). Models fit per location; cross-validation = leave-one-year-out (fit Jul–Jun on all years but one, forecast Dec–Feb of the held-out year). Sources: seklima.met.no, plus NRK/yr.no scraping (2012–2018) with missing values imputed from seklima.

## 3. Method / model
- Short-term (Section 2): zero-inflated gamma regression. Physics-structured expectation:
  - Snowfall: R_t·β₀·logit⁻¹(β₁ + β₂T_t) — inverse-logit snow/rain partition around 0 °C; β₀ = estimated snow-water ratio (not fixed at 10).
  - Melting/aging: D_{t−1}·logit⁻¹(β₃ + (β₄ + β₅R_t)T_t) — temperature–rain index interaction (Scherrer et al. 2013 index method) embedded in logit to guarantee nonnegativity.
  - E(D_t | D_t > 0) = e^μ + snowfall + melting/aging; identity link to gamma.
- Variance model that REJECTS the standard gamma assumption: Var(D_t|D_t>0) = σ₁² + σ₂²·(E(D_t|D_t>0) − D_{t−1})² — uncertainty scales with the expected CHANGE, not the level ("if T < 0 °C and no precipitation, changes in snow depth are small and D_t is predictable from D_{t−1} even when D_{t−1} is high"); standard constant-CV fit was "very poor".
- P(D_t = 0) by logistic regression on E(D_t|D_t>0) alone (single covariate, works well).
- Parameter estimation: no R package fits the coupled nonlinear model; implemented a custom steepest-descent MLE.
- Long-term (Section 3): Model 1 — time-series models for T and R (seasonal m/q/s + AR structure, AIC forward stepwise), feed realizations into the short-term model; Model 2 — time-series model for D directly. Blending: first δ reliable-forecast days tracked by Monte Carlo on Section-2 model, then continue with time-series model. PIT goodness-of-fit histograms via the F_X(X) ~ U[0,1] procedure.

## 4. Equations & assumptions
- Zero-inflated gamma (1); snowfall (2): R_t β₀ logit⁻¹(β₁+β₂T_t); melt/aging (4): D_{t−1} logit⁻¹(β₃+(β₄+β₅R_t)T_t); expectation (5); variance (7): σ₁²+σ₂²(E−D_{t−1})²; gamma shape/scale (8); P(D_t=0) (9): logit⁻¹(β₆+β₇·E(D_t|D_t>0)).
- Rejected extensions (AIC did not improve): quadratic temperature in snowfall term; D_{t−1} inside melting logit; AR(2) lag D_{t−2} term.
- Assumptions: conditional independence of D_t given covariates (admits this is a simplification); β₀ free per location; "perfect" weather forecasts for the reliable-forecast window in evaluation.

## 5. Features / target
Features: R_t, T_t, D_{t−1} (+ seasonal periodic covariates and AR lags for long-term). Target: probabilistic snow depth D_t (zero-inflated gamma per day; Monte-Carlo-tracked forecast distributions).

## 6. Validation design
Leave-one-year-out cross-validation on winter months (Dec–Feb); metric = mean absolute forecast error; "perfect" forecasts assumed for reliable windows of 0/5/10 days; comparison vs periodic-covariates-only baseline; PIT histograms for goodness of fit.

## 7. Numerical results / baselines
- 5-day-ahead, given reliable T/R forecasts: mean absolute error 3–7 cm across the three locations.
- 3-week-ahead, given 5 days reliable forecasts: error 7–16 cm — "a little over half" of the seasonal-trend-only baseline error, which is the remarkable result (weather forecasts are season-dominated after a few days, yet snow depth remains predictable because the snowpack has memory).
- Reliable forecasts roughly HALVE the error vs no forecasts; Model 2 beats Model 1 on MAE, but Model 1 additionally yields simultaneous long-term scenarios of temperature + precipitation + snow depth jointly.
- PIT histograms: approximately uniform (well-calibrated).
- Relative to mean snow depth, errors largest at Oslo (shallow, intermittent pack) — the parameter most relevant to NFL stadium regimes (Chicago, Baltimore, not Tromsø).
- Table 2: estimated snow-water ratio β₀ ≈ 0.96 (Oslo), 0.72 (Geilo), 0.89 (Tromsø) — interestingly NOT the canonical 10, suggesting fitted ratio absorbs other effects.

## 8. Code / data availability
No code link; custom steepest-descent implementation not published. Data: seklima.met.no (public) and yr.no/NRK scraped (2012–2018).

## 9. Leakage & limitations
- "Perfect" weather forecasts assumed in the short-term evaluation — real-world errors will be larger; evaluation is conditional on forecast quality.
- Conditional-independence assumption ignores autocorrelation in residuals.
- AIC-rejected extensions show model is already near its complexity ceiling on these data.
- Cross-validation within 2012–2018 window; no out-of-climate generalization test.
- Model is per-location; the author explicitly suggests a spatio-temporal extension as future work (connects directly to 1587's GNN).

## 10. GSE overlap
Fills a genuine hole: no existing engine component models snow depth on the field — current benchmarks (1784-era per the gap map) cover barometric pressure but nothing about snow physics × totals/passing. Snow games (Buffalo, Green Bay, Foxboro, Chicago, Baltimore) are exactly where public totals and props misprice — the market's weather adjustment is qualitative ("snow game"). A calibrated probabilistic snow-depth model at kickoff, derived from forecast T/R through a physics-structured gamma model, gives GSE quantitative snow-game edges no competitor publishes. The change-scaled variance is also a general modeling trick worth stealing for any stateful variable (e.g., field-condition indices).

## 11. GSE implementation spec
- Build `weather/snow_depth.py`: fit zero-inflated gamma (equations 1–9, variance model 7) per cold-weather stadium using METAR/NOAA T/R/D climatology; β₀ free per stadium; Monte-Carlo tracking over 5-day HRRR/GEFS T/R forecasts to kickoff.
- Output: P(snow depth > thresholds: 0, 2, 5, 10 cm) at kickoff + expected depth; feed into totals engine as a snow-game interaction feature alongside 1581's precip post-processor.

## 12. Reproducible test
Dataset: NOAA daily T/R + station snow depth for Orchard Park NY, Green Bay WI, Foxboro MA, 2000–2024; GEFS reforecast T/R for retrospective days. Leave-one-season-out CV on Nov–Feb. Metrics: mean absolute error at 5-day and 21-day horizons, PIT histograms, Brier score at >0 cm and >5 cm thresholds. Baselines: climatology, raw GEFS precip-as-snow heuristic (10:1 ratio). Gate below.

## 13. Acceptance / rejection gate
ADOPT if the physics-structured model beats the 10:1-rule heuristic on Brier score at >0 cm by ≥ 10% across the three test stadiums — the paper's effect vs seasonal baseline is ~50% error reduction, so 10% over a strong heuristic is a fair transfer bar. REJECT if it doesn't — stadium microclimates may defeat a Norway-fitted structure, and GSE falls back to empirical snow-depth climatology.

## 14. Improvement experiment
Test the two extensions the author left open: (1) add wind as a covariate in the melt/aging term (wind accelerates sublimation/packing — relevant to Buffalo's lake-effect regime); (2) fit a multi-stadium joint model (1587's GraphSAGE over the three stadiums) instead of per-stadium fits, testing the author's spatio-temporal extension hypothesis directly.
