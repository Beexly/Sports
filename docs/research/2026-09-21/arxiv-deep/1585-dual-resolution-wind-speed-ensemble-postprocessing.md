# [1585] Statistical post-processing of operational dual-resolution wind-speed ensemble forecasts (arXiv:2506.15578)

**Citation:** Baran, S. & Lakatos, M. (2025). *Statistical post-processing of operational dual-resolution wind-speed ensemble forecasts*. arXiv:2506.15578. URL: https://arxiv.org/abs/2506.15578
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, Sections 1–5 + references).
**Verdict**: ADAPT
ADAPT — one sentence: Truncated-normal EMOS calibration is the cheapest proven wind-speed forecaster available — local and semi-local EMOS beat raw ensembles on every metric and near-erase the gap between a 9 km and 36 km model — but EMOS post-processing makes dual-resolution mixtures nearly redundant, so GSE should calibrate one good wind ensemble rather than pay for two resolutions.

## 1. Research question
Do operational dual-resolution ECMWF wind-speed ensembles (50-member 9 km medium-range + 100-member 36 km extended-range, and mixtures) beat single-resolution ones, before and after statistical post-processing with truncated-normal EMOS — and how much high-resolution information is needed to lift a low-resolution base?

## 2. Dataset / schema
- ECMWF operational: 50-member medium-range at T_CO1279 (~9 km) + 100-member extended-range at T_CO319 (~36 km), 10-m wind speed, 8,726 SYNOP stations, 1 Jul 2023 – 31 May 2024, 00 UTC init, lead times 0–15 d.
- EMOS calibration: regional / local / semi-local (k-means, Lerch & Baran 2017 features: 12 climatology CDF quantiles + 12 ensemble-mean-error CDF quantiles; final config 90 clusters, 60-day window, chosen on 13 Oct 2023 – 31 May 2024 validation); verification 3 Sep 2023 – 31 May 2024 (262 days).
- Mixtures studied: (100,0), (0,50), (100,50), and (50, m_H) with m_H = 1, 2, 4, 8, 16, 32.

## 3. Method / model
- Truncated-normal EMOS (Thorarinsdottir & Gneiting 2010): predictive law N₀^∞(μ, σ²); dual-resolution location/scale link functions μ = a + b_H²f̄_H + b_L²f̄_L, σ² = c² + d²S² (S² = combined-ensemble variance); single-resolution by zeroing the other coefficient.
- Parameters estimated by minimum-mean-CRPS over training window (closed-form CRPS for truncated normal, Jordan et al. 2019); each lead time modeled independently.
- Spatial training selection: regional (one parameter set), local (per station), semi-local (k-means clusters refit per verification date).
- Metrics: CRPS/CRPSS, QS/QSS at percentiles, Brier/BSS at 5/10/15 m/s, MAE/MAES, RMSE/RMSES; significance via 95% CIs from 2,000 stationary-bootstrap block samples.

## 4. Equations & assumptions
- μ = a + b_H²f̄_H + b_L²f̄_L; σ² = c² + d²S² (Eq. 3.1); squared coefficients enforce nonnegativity of weights.
- Skill score: S = (S̄_ref − S̄_F)/(S̄_ref − S̄_perf) style (Murphy 1973, positively oriented).
- Assumptions: truncated normal adequate (fails at high-wind thresholds — heavier tails needed); SYNOP obs error ignored (station verification); exchangeability within resolution group; lead times independent.

## 5. Features / target
Features: ensemble group means f̄_H, f̄_L and combined variance S² per lead time and training strategy. Target: predictive distribution of 10-m wind speed at stations.

## 6. Validation design
Full 262-day verification window after 232-day configuration search; each mixture × (raw, EMOS-regional/local/semi-local) × lead day; 95% bootstrap CIs on all skill scores; reference configurations always the pure high-resolution (0,50) forecast.

## 7. Numerical results / baselines
- All EMOS post-processing beats raw on CRPS, QS, MAE, RMSE at nearly all lead days; local EMOS best for days 1–6, converging with semi-local thereafter; regional weakest but cheapest.
- Post-processing "considerably reduces the differences between the various configurations" (Baran et al. 2019 result replicated on operational data).
- Resolution beats size: raw (100,0) is far worst; adding high-res members to 50 low-res gives monotonic gains — (50,32) reaches ~10% CRPSS at day 1, (50,16) ~7%, (50,8) ~5%, even (50,1)/(50,2) slightly help; gains decay with lead time but stay significant.
- Raw dual-resolution (100,50) never beats pure high-res (0,50) significantly (MAES significantly negative at all horizons); post-processed dual-resolution only helps for days 1–2 at upper quantiles.
- High-wind Brier scores: EMOS advantage vanishes at 10/15 m/s thresholds — truncated normal lacks tail weight; log-normal or truncated GEV suggested.
- After day 7, the post-processed pure low-resolution forecast catches up to and then outperforms the dual-resolution mixture at low thresholds.

## 8. Code / data availability
No code link in the paper; ECMWF operational data (via ECMWF archive); SYNOP observations.

## 9. Leakage & limitations
- Properly time-separated windows; minimum-CRPS estimation is standard and sound.
- Truncated normal is inadequate for high wind thresholds — the tail finding is a real caveat for storm-game modeling.
- Station-only verification (no gridded analysis); 15-day lead cap.
- No ML/DRN comparison despite acknowledging it usually wins — deliberate "simple but powerful" scope choice.
- Single operational model (ECMWF IFS); mixtures are hand-constructed subsets of two operational products.

## 10. GSE overlap
This is the wind-speed leg of the stack — the variable GSE's totals lane needs most (wind × stadium geometry is the identified gap #8; this paper models the forecast side). It complements 1580 (probabilistic ANET2, temperature/precip) and 1582 (ENS-10 Gaussian recipe) by giving the exact parametric form (truncated normal) and the local-vs-semi-local training recipe for wind speed, plus the honest tail warning. Also confirms the practical lesson: don't pay for dual resolution — calibrate one resolution well.

## 11. GSE implementation spec
- Build `weather/emos_wind.py`: truncated-normal EMOS with affine links on ensemble mean and spread, fit per stadium on trailing 60-day windows (the paper's chosen window), minimum-CRPS estimation (closed form); local fits per stadium, semi-local k-means pooling over climatology+error features when a stadium's record is thin.
- Feed the EMOS predictive distribution into the 1583 conformal layer; replace truncated normal with log-normal/truncated-GEV for the high-wind tail games the paper flags.
- Run on GEFS or HRRR ensemble wind at stadium coordinates, 0–3 day lead only for kickoff decisions (gains concentrate there).

## 12. Reproducible test
Dataset: GEFS 30-member reforecast + METAR observations at 30 NFL stadiums, 2022–2024. Baselines: raw ensemble, EMOS-regional, EMOS-local, EMOS-semi-local (paper's three). Test: 2023–2024 holdout; metrics CRPS/CRPSS, Brier at 8/12/16 m/s (stadium-relevant), MAE of median. Gate below.

## 13. Acceptance / rejection gate
ADOPT if local/semi-local EMOS beats raw by ≥ 5% CRPSS on wind speed at 0–3 d leads on the 2023–2024 holdout, replicating the paper's margin scale. REJECT if the gain is < 5% on US data — then GEFS wind at stadiums is already calibrated enough and the ANET2 flow (1580) is the only wind model GSE needs.

## 14. Improvement experiment
The paper's tail weakness is the opportunity: fit a spliced truncated-normal/log-normal (or TGEV) EMOS with the same link structure and test Brier skill at 12+ m/s against the pure truncated-normal version — the paper names the fix but never runs it. Second: swap minimum-CRPS for minimum-EECRPS estimation (1582's metric) so the fit weights extreme-wind days, and test whether extreme-game calibration improves without hurting average CRPS — directly serving the wind-game totals lane.
