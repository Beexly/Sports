# [1301] Parametric Post-Processing of Dual-Resolution Precipitation Forecasts (arXiv:2212.12504v1)

**Citation:** Szabó, M., Gascón, E., & Baran, S. (2022). *Parametric Post-Processing of Dual-Resolution Precipitation Forecasts*. arXiv:2212.12504v1 [stat.AP]. URL: https://arxiv.org/abs/2212.12504
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — censored shifted gamma EMOS post-processing that fuses a 9 km deterministic forecast with a 51-member 18 km ensemble, with semi-local clustering that matches state-of-the-art quantile mapping without extra historical data; ports directly to GSE's forecast-calibration lane for weather-driven totals. (Replacement for REJECT 1095.)

## 1. Research question
Can dual-resolution ensemble precipitation forecasts (one 9 km deterministic run + a 51-member 18 km ensemble from the ECMWF IFS) be fused and statistically post-processed into calibrated probabilistic forecasts, and can clustering-based semi-local training match the skill of data-hungry quantile mapping?

## 2. Dataset / schema
ECMWF Integrated Forecast System precipitation forecasts: a single forecast at 9 km horizontal resolution plus a 51-member ensemble at 18 km resolution (TCo639), verified against station precipitation observations. Local, regional, and semi-local (clustered) training configurations are compared.

## 3. Method / model
Censored shifted gamma (CSG) EMOS: ensemble members are linked to the parameters of a gamma distribution that is shifted and left-censored at zero, producing a predictive distribution that handles the point mass at zero precipitation. Parameters are estimated by minimizing the mean continuous ranked probability score (CRPS) over a rolling training window. Three spatial training strategies: local (per station), regional (pooled), and semi-local (stations clustered by climatological/ensemble characteristics, parameters estimated per cluster).

## 4. Equations & assumptions
- CRPS: `CRPS(F, x) = ∫(F(y) − 1{y≥x})² dy`; parameters chosen to minimize mean CRPS.
- CSG predictive CDF: shifted gamma with censoring at zero for dry events.
- Assumptions: precipitation amounts follow a censored shifted gamma law conditional on the ensemble; semi-local clusters are homogeneous enough to share EMOS coefficients; rolling training windows capture non-stationarity.

## 5. Features / target
Features: dual-resolution ensemble statistics (member means/spreads from both resolutions). Target: calibrated predictive distribution of station precipitation.

## 6. Validation design
Out-of-sample verification period scored with CRPS, CRPSS (CRPS skill score vs raw ensemble), and Brier scores; dual-resolution combinations compared against single-resolution and raw baselines.

## 7. Numerical results / baselines
- Post-processing yields significant skill improvement over raw dual-resolution ensembles, and differences between dual-resolution combinations shrink to non-significant levels after post-processing.
- Semi-locally trained CSG EMOS fully catches up with state-of-the-art quantile mapping, without requiring the additional historical data that quantile mapping needs.
- Quantile mapping remains the skill ceiling, but semi-local CSG EMOS is an efficient alternative with far lower data requirements.

## 8. Code / data availability
ECMWF forecast data (licensed); methods are standard EMOS/CRPS implementations. Code: not stated in paper.

## 9. Leakage & limitations
Rolling-window training avoids look-ahead leakage. Limitations: precipitation-specific distribution (CSG); ECMWF-specific configuration; verification is European-domain; cluster definitions require care to stay homogeneous.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 8 (weather physics for totals) is directly served: this is the calibration half of a weather-for-totals pipeline. The repo calibration stack (CQR, temperature scaling, LRD, ECE-by-slice) has no EMOS/CRPS-fitted parametric post-processing and no censored-distribution treatment of zero-inflated outcomes; no dual-resolution fusion work exists. No duplicate.

## 11. GSE implementation spec
1. Build a GSE weather-for-totals calibration layer: take raw stadium precipitation/wind ensemble forecasts, fit CSG EMOS (or a censored Gaussian/logistic for wind) with CRPS-minimizing rolling windows.
2. Use semi-local clustering across NFL stadiums (cluster by climate regime and ensemble spread characteristics) to share parameters where single-stadium history is thin.
3. Feed the calibrated predictive distributions into the totals model as uncertainty-aware weather features, with CRPSS tracked per stadium as the calibration health metric.

## 12. Reproducible test
Replicate on public NOAA/GEFS precipitation ensembles for one region: confirm semi-local CSG EMOS matches a local-quantile-mapping baseline on CRPSS while using a shorter training history; then port the recipe to stadium wind forecasts and measure totals-model log-loss improvement.

## 13. Acceptance / rejection gate
ADAPT: CRPS-fitted censored EMOS with semi-local clustering is a production-grade calibration recipe that fills a documented hole in GSE's calibration stack and directly feeds weather-driven totals.

## 14. Improvement experiment
Replace the fixed gamma with a mixture (gamma + point mass) learned per cluster; test online CRPS-gradient updates for non-stationary regimes; extend the semi-local clustering to joint precipitation–wind–temperature post-processing for a full stadium weather state.
