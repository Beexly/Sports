# [1581] Improvements to the post-processing of weather forecasts using machine learning and feature selection (arXiv:2604.19340)

**Citation:** Iwase, K. & Takenawa, T. (2026). *Improvements to the post-processing of weather forecasts using machine learning and feature selection*. arXiv:2604.19340. URL: https://arxiv.org/abs/2604.19340
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, Sections 1–4 + methods/results/discussion + references, ~1810 lines).
**Verdict:** ADAPT
ADAPT — one sentence: LightGBM with surrounding-grid context and correlation-based feature selection beat both raw NWP and the operational guidance product on temperature/wind/precipitation, giving GSE a cheap, well-validated tabular post-processing recipe, but it is deterministic (no uncertainty) and validated only on JMA's mesoscale model over Japan.

## 1. Research question
Can machine-learning post-processing of JMA's 5 km Mesoscale Model (MSM) be improved by (a) feeding in meteorological variables from grid points surrounding the target station, (b) correlation-based feature selection to control the resulting 5,702-feature space, and (c) Tweedie/event-weighted losses for the zero-inflated precipitation target?

## 2. Dataset / schema
- Input: JMA MSM gridded forecasts (surface 505×481 at 0.05°×0.0625°, pressure levels 253×241), 13 surface variables (temp, RH, hourly precip, wind speed, U/V components, surface/SLP pressure, solar radiation, cloud covers) × 3 time steps + 7 pressure-level variables (temp, RH@850/500, wind speed, U/V, vertical velocity, geopotential height) at 850/500/200 hPa + lead time, month, hour-of-day. Forecasts issued 8× daily, lead times 3–39 h.
- Targets: JMA station observations — 3 h accumulated precipitation, hourly temperature, wind speed — at 18 sites (plains, mountains, islands; Table 1 with lat/lon/altitude).
- Splits: train 2019–2021 (~113k samples/site), validation 2022 (~37.8k), test 2023 (~37.9k); 3,418,272 rows total. Missing observations dropped.
- Baselines: raw MSM, JMA operational MSMG guidance product (Kalman filter + frequency-bias correction + NNs).

## 3. Method / model
- Two input configs: 1grid (nearest grid cell only → 62 features = 13×3 + (6×3+2) + 3) vs "around" (11×11 surface + 7×7 pressure grids → 5,702 features = 13×3×11×11 + (6×3+2)×7×7 + 3).
- FS0: pairwise |Pearson| > τ = 0.9 left-to-right drop on surrounding-grid features only (dropped 239–869 features/site, Table 3); then FS1 (target correlation), FS2 (mutual information), FS3 (LightGBM importance) tested by sweeping k in steps of 10 — none helped beyond FS0.
- LightGBM regression per variable (MSE loss, early stopping patience 10), hyperparameters via Optuna LightGBMTuner on representative site Sekigahara, applied to all sites. Final model: "around all tune".
- NN baseline: Dense(1000)-Dense(500)-Dense(100)-Dense(3), ReLU, Adam 1e-3, batch 64, early stopping. CNN baseline (temperature only, Kudo 2022 reproduction): 64×64×7 input, Conv5×5(32)-Pool-BN-ReLU → Conv5×5(64)-Pool-BN-ReLU → Dense(4096)-BN-ReLU → Dense(1), per-sample min-max normalization.
- Weighted Tweedie precipitation model: Tweedie loss (Var(Y)=φμ^p, p tuned) + monotone piecewise-linear sample weights on observed precip (knots 0/5/10/15/20 mm, 1=w0≤w1≤…≤w4, clipped ≤10), Optuna-tuned on geometric-mean Threat Score across thresholds 1–20 mm minus bias penalties at 1/5/10/15 mm (γ=0.05).

## 4. Equations & assumptions
- MSE = (1/N)Σ(ŷᵢ−yᵢ)² (Eq. 1); RMSE = √MSE (Eq. 2); ME = (1/N)Σ(ŷᵢ−yᵢ).
- Event metrics: TS(τ) = H/(H+M+F); POD = H/(H+M); FAR = F/(H+F); Bias = (H+F)/(H+M).
- Tweedie: Var(Yᵢ) = φμᵢ^p; training loss ℒ = Σᵢ w(yᵢ)·ℓ_Tw(yᵢ, μᵢ); weight function w(y) monotone piecewise-linear, 1 ≤ w ≤ 10.
- Optuna score: S_total = S_geo − Σ γ_τ|log(max(Bias(τ), b_min))|, S_geo = exp((1/|𝒯|)Σ log max(TS(τ), ε)), ε=b_min=1e-6.
- Assumptions: per-site independent models; hyperparameter transfer from one representative site; temporal window (t, t−1, t−2) matched to 3-hourly cycle; no retraining on validation data before testing; paired t/Wilcoxon tests reported as supplementary only given N=682,305.

## 5. Features / target
Features: 5,702 → ~4,800–5,460 post-FS0 gridded NWP predictors + lead time/month/hour. Targets: 3 h precipitation (mm), hourly temperature (°C), wind speed (m/s) at 18 stations.

## 6. Validation design
Strictly time-ordered: train 2019–2021, validate 2022 (model selection + tuning), test 2023. Baselines: raw MSM, operational MSMG, NN, CNN. Metrics: RMSE, ME, paired t + Wilcoxon on absolute errors, precipitation event metrics (TS/POD/FAR/Bias at 1/5/10/15 mm). No leakage (validation never used for retraining).

## 7. Numerical results / baselines
- Test RMSE (Table 6): precipitation — MSM 2.759, MSMG 2.726, around-all-tune **2.344**; temperature — MSM 1.811, MSMG 1.394, CNN 1.501, around-all-tune **1.335**; wind — MSM 1.999, MSMG 1.237, around-all-tune **1.052**.
- Test MAE (Table 7, N=682,305): temperature main 0.9888 vs MSM 1.3964 vs MSMG 1.0275; wind main 0.7549 vs MSM 1.4186 vs MSMG 0.9035 (all p=0.000).
- Surrounding grids beat single grid everywhere (e.g., wind test RMSE 1.053 vs 1.075); FS1–FS3 added nothing over FS0 ("accuracy stabilizes when the number of features exceeds a certain threshold").
- Precipitation events (Table 8): weighted Tweedie raised TS at 10 mm from 0.1966 → **0.2520** and at 15 mm 0.1251 → **0.1883**, Bias at 10 mm from 0.4340 → 0.9771; still slightly below MSMG overall (TS 0.2485 at 10 mm) and site-dependent.
- Terrain breakdown (Table 9): largest wind RMSE reductions at island/coastal sites (Niijima, Oma) where raw MSM was worst.

## 8. Code / data availability
Code: https://github.com/ttakenawa/PostMSM. Data: MSM via RISH Kyoto (licensing restrictions); repo provides a synthetic/derived demo dataset "which may not exactly reproduce the paper results."

## 9. Leakage & limitations
- Deterministic point forecasts only — no calibrated uncertainty (unlike 1580's probabilistic approach); RMSE-optimal means precipitation is biased toward intermediate values, only partly fixed by the Tweedie variant.
- Hyperparameters tuned on one site (Sekigahara) then applied everywhere — transfer assumption untested per-site for tuning.
- MSMG (the operational baseline) still wins on precipitation events; Tweedie gains are site-dependent.
- Japan/MSM-specific; US GEFS/HRRR have different grids, cycles, and bias structure — the recipe transfers, the fitted models don't.
- Independent per-site models: no spatial pooling (contrast with 1580's joint model); 18 separate LightGBM trainings per variable.
- N=682k makes all significance tests trivially p≈0 — authors acknowledge, judge by effect sizes.
- Authors disclose ChatGPT use for code editing/proofreading.

## 10. GSE overlap
Complementary to 1580, same lane. Per the existing-research-map gap list, GSE has no weather-forecast post-processing capability; 1580 gives the probabilistic/neural recipe, this gives the cheap tabular/GBM recipe with feature-selection guidance and an operational baseline (MSMG) beaten on temperature and wind. Both feed the totals/spread model with calibrated game-day weather. New capability, not duplicate.

## 11. GSE implementation spec
- Build `weather/lgbm_postprocess.py` following this recipe on HRRR (3 km, US) instead of MSM: for each of 30 NFL stadiums, extract 11×11 surface + 7×7 pressure-level windows around the stadium at kickoff-relevant lead times; targets = station-observed temp, wind, precip from NOAA; FS0 τ=0.9; LightGBM per variable; Optuna tuning on one representative stadium.
- Use as the fast deterministic complement to the probabilistic ANET2 model (1580): LGBM point forecast + ANET2 distribution = mean + uncertainty.
- Add the weighted-Tweedie precipitation head for rain games (P(precip ≥ 5 mm) feature for totals).
- Effort: ~1 week (HRRR archive via AWS Open Data is the main plumbing cost).

## 12. Reproducible test
Dataset: HRRR 2020–2023 + NOAA ISD stadium observations, 30 NFL venues. Baseline: raw HRRR nearest-grid + operational NWS point forecast. Test: train 2020–2021, validate 2022, test 2023; metric RMSE on temperature, wind speed, 3 h precipitation at kickoff windows; plus precipitation TS at 5/10 mm thresholds. Gate below.

## 13. Acceptance / rejection gate
ADOPT if LightGBM beats raw HRRR by ≥ 10% RMSE on wind speed AND ≥ 5% on temperature on the 2023 holdout (matching the paper's margin scale), with the Tweedie variant improving TS at 10 mm vs plain MSE. REJECT if wind RMSE gain < 10% — then US operational forecasts are already good enough at stadium scale and the complexity isn't worth it.

## 14. Improvement experiment
Fuse the two recipes: use the ANET2 spline-flow distributional output (1580) as the prior and the LightGBM point forecast as a conditioning covariate, then test whether a stacked model beats either alone on wind-speed CRPS. Second: make the LightGBM model stadium-aware with bowl-openness and orientation features (the paper's own conclusion flags topography/site dependence as the open problem) and test whether one joint multi-stadium model beats 30 independent ones — resolving the paper's per-site vs joint tension against 1580's joint-model evidence.
