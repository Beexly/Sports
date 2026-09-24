# [1584] CNN-based Surface Temperature Forecasts with Ensemble Numerical Weather Prediction (arXiv:2507.18937)

**Citation:** Inoue, T. & Kawabata, T. (2026). *CNN-based Surface Temperature Forecasts with Ensemble Numerical Weather Prediction*. arXiv:2507.18937; published Mon. Wea. Rev. 154: 1527–1547. URL: https://arxiv.org/abs/2507.18937
**Ledger completed:** 2026-09-21. **Read:** full text (48-page PDF, v3, Sections 1–7 + appendices + references; note ar5iv has no HTML for this version so the PDF was read).
**Verdict:** ADAPT
ADAPT — one sentence: Member-wise CNN correction of coarse (40 km) ensemble members beats both Kalman-filter baselines and operational 5 km models on temperature while preserving ensemble information content rather than smoothing it away, giving GSE a validated bias-correction + downscaling recipe for temperature forecasts at stadium scale, but extremes remain limited by what the low-resolution inputs contain.

## 1. Research question
Three questions: (Q1) how effectively can a CNN reduce systematic and random errors in ensemble surface-temperature forecasts; (Q2) does the training member choice (CF vs PF vs ensemble mean) matter; (Q3) does the CNN's error reduction differ qualitatively from the smoothing of ensemble averaging (FI/NE decomposition)?

## 2. Dataset / schema
- JMA GEPS 51-member ensemble (CF + 50 PFs, 40 km), GSM 20 km, MSM 5 km; ground truth = 1.5-m EST (JMA gridded, 1 km → aggregated to 5 km, 900+ stations; bias ~0.01, RMSE ~1.19 K).
- Central Japan domain, lead times to 132 h (5.5 d); train 2017–2020, validation 2021, test 2022 (all 12-h cycles).
- Baselines: raw CF/GSM/MSM, KF post-processing (GSM–KF, MSM–KF — point-based KF then topographic interpolation), elevation lapse-rate correction (CF–Hcorr, −6 K/km).

## 3. Method / model
- Encoder–decoder CNN (Kudo 2022 / Inoue et al. 2024 design: conv/pool/FC, ReLU, batch norm, sigmoid output head), 7 NWP inputs (surface temp, T@975/925/850 hPa, MSLP, U/V surface wind), per-sample min–max normalization with ±3 K extension for temperature; land–sea mask restricts loss to land grid points.
- Two-phase framework: train CNN mapping 40 km CF fields → 5 km EST; apply member-wise to all 51 members → GEPS–CNN. Key assumption (tested in Q2): CF and PFs share model config except initial conditions, so learned error characteristics transfer to PFs.
- Q2 experiment: train on CF vs PF10 vs GEPS–EM — no significant difference, so train once on CF.

## 4. Equations & assumptions
- Ensemble mean f̄(t) = (1/M)Σfᵢ(t) (Eq. 1); RMSE (Eq. 2); CRPS ensemble form (Hersbach 2000); spread S(t) = √[Σ(fᵢ−f̄)²/(M−1)] (Eq. 3); SSR = spread/RMSE(mean); Energy Score and Variogram Score (p=1, w=1); FSS (Roberts & Lean 2008); rank histograms (conditional on elevation ≥200 m vs <200 m).
- FI–NE–ACC: ACC = p/(SDAF·SDAV), FI = p/SDAF², NE = SDAF√(1−ACC²), IE = |1−FI|·SDAV (BG25/FTZP24 framework).
- Assumptions: CF error characteristics transfer to PFs; terrain effects implicitly learnable from temperature fields (no explicit topography input); bias/RMSE verified against EST, which itself has ~1 K RMSE.

## 5. Features / target
Features: 7 NWP fields per member. Target: 5 km gridded surface temperature.

## 6. Validation design
Strictly time-ordered 2017–2020 train / 2021 val / 2022 test; 12-h initialization cycles; grid-point metrics (RMSE, ME, CRPS, SSR), spatial metrics (FSS, ES, VS), conditional rank histograms (elevation-stratified), information decomposition (FI/NE/ACC), two case studies (complex terrain 13 Jun 2022; South-Coast Cyclone 13 Feb 2022; extreme heat 30 Jun 2022). 95% CIs reported.

## 7. Numerical results / baselines
- Deterministic: CF–CNN −1.2 K RMSE (46%) vs raw CF; ME within ±0.05 K (vs KF's residual positive bias); GSM–CNN −0.99 K (39%); KF correction (GSM–KF) only −0.76 K (29%); CNN beats all operational deterministic NWP + KF references at all lead times.
- Probabilistic: CRPS reduced ~0.8 K (47%) vs original GEPS; SSR approaches 1.0 via RMSE reduction (spread only reduced 0.1–0.2 K); rank histograms flattened in both elevation strata, topography-dependent conditional biases (negative in mountains, positive in plains) mitigated.
- Multivariate: Energy Score reduced >50%; Variogram Score reduced ~75%.
- Q2: CF/PF10/GEPS–EM training — no statistically significant differences; train on CF only.
- Q3: CNN reduces NE while maintaining/increasing FI (ensemble averaging reduces both); error reduction is genuine, not smoothing.
- Extremes: 30 Jun 2022 heatwave (>39°C observed) — CRPS 3.19→2.62 K but max intensity underestimated; limited by low-res input information; Q–Q plot shows residual warm-tail bias.

## 8. Code / data availability
Code available upon request subject to collaborative agreement with MRI. JMA NWP outputs via JMBSC; some datasets via agreement with MRI/JMA.

## 9. Leakage & limitations
- No future data in training (properly time-split); instance-specific normalization uses per-sample min/max — legitimate but note for deployment parity.
- Only temperature; wind/precipitation not tested here.
- Extreme events remain under-predicted — the CNN cannot invent information absent from 40 km inputs.
- Japan/central-Japan domain only; transferability elsewhere needs retraining.
- Probabilistic output is just the corrected ensemble — no distributional post-processing (authors cite Rasp & Lerch 2018, Sønderby et al. 2020 as future work), which is exactly what 1580/1582/1583 supply.

## 10. GSE overlap
The temperature leg of the weather stack. GSE's totals lane needs temperature as a covariate; 1581 gives the tabular/GBM recipe, 1582/1583 the distributional wrapper, and this paper gives the spatial-CNN recipe for bias correction + downscaling — the cheapest way to turn coarse global ensemble temperature into stadium-resolution fields. The FI/NE analysis is the intellectual bridge: it proves member-wise correction adds real information rather than smoothing, which matters when small temperature errors near freezing flip rain to snow (the paper's own cyclone case). No existing GSE research cites it.

## 11. GSE implementation spec
- Build `weather/cnn_temp_downscale.py`: per the paper, 7 input channels (surface temp, T@975/925/850, MSLP, U10m, V10m) from GEFS 0.25° (or HRRR), train against a high-resolution reference temperature analysis (NOAA RTMA ~2.5 km) over NFL stadium neighborhoods; apply member-wise to all 31 GEFS members; combine with the 1583 conformal layer for coverage guarantees.
- Follow the Q2 finding: train on the control member only, apply to all — halves training cost.
- Effort: ~3–5 days (RTMA download is the long pole).

## 12. Reproducible test
Dataset: GEFS 0.25° 2021–2023 + NOAA RTMA 2.5 km analysis over 30 NFL stadiums. Baselines: raw GEFS, naive lapse-rate elevation correction, simple bias-corrected ensemble. Test: train 2021–2022, test 2023; metrics RMSE, CRPS, SSR, elevation-stratified rank histograms at kickoff windows. Gate below.

## 13. Acceptance / rejection gate
ADOPT if the CNN beats the lapse-rate baseline by ≥ 20% RMSE on 2023 stadium data AND the Fi/NE check confirms FI is maintained (not a smoothing trick). REJECT if gain < 20% — then GSE skips the CNN and relies on the 1581 LGBM recipe for temperature.

## 14. Improvement experiment
Pair this CNN's member-wise corrected ensemble with the 1580 spline-flow distributional head instead of plain ensemble statistics: CNN handles bias + downscaling (its proven strength), the flow handles non-Gaussian distributional shape (this paper's weakness), the 1583 conformal layer guarantees coverage. Test the full stack against GEFS raw on the temperature leg of the totals model — the three-paper composite should beat any single component. Second: add explicit stadium-microclimate inputs (bowl orientation, elevation, nearby water) to the CNN input channels and test whether the topography-dependent bias correction improves on the paper's implicit-learning approach at stadium point scale.
