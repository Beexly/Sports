# [1493] Pangu-Weather: A 3D High-Resolution System for Fast and Accurate Global Weather Forecast (arXiv:2211.02556v1)

**Citation:** Kaifeng Bi, Lingxi Xie, Hengheng Zhang, Xin Chen, Xiaotao Gu, Qi Tian (Huawei Cloud, 2022). *Pangu-Weather: A 3D High-Resolution System for Fast and Accurate Global Weather Forecast*. Technical report. arXiv:2211.02556v1. URL: https://arxiv.org/abs/2211.02556
**Ledger completed:** 2026-09-21. **Read:** full text (PDF — abstract, intro, preliminaries 2.1–2.4, methodology 3.1–3.4, results 4.1 deterministic / 4.2 extremes / 4.3 ensemble, conclusions, references).
**Lane:** weather.
**Verdict:** ADAPT
GSE does not run its own NWP, so the 3DEST model itself does not transfer; adapt (a) hierarchical temporal aggregation as a design pattern for GSE's multi-horizon forecast chaining and (b) the RQE tail-calibration metric for weather-sensitive totals modeling.

## 1. Research question
Can a deep-learning system beat operational numerical weather prediction (NWP) on global medium-range forecast accuracy (latitude-weighted RMSE and ACC) across all variables and lead times, at 0.25°×0.25° resolution, with orders-of-magnitude faster inference?

## 2. Dataset / schema
ERA5 (ECMWF 5th-generation reanalysis), 43 years hourly 1979–2021: train 1979–2017 (39 years), validate 2019, test 2018/2020/2021. 13 pressure levels (50–1000 hPa) × 5 upper-air variables (geopotential, specific humidity, temperature, u/v wind) + surface level × 4 variables (T2M, U10, V10, MSLP) + 3 constant masks (topography, land-sea, soil type). Spatial grid 1440×721 per frame. Cyclone tracking evaluated on IBTrACS TC2018 (88 named tropical cyclones, 2018). Comparisons vs operational IFS (TIGGE archive) and FourCastNet.

## 3. Method / model
Two technical contributions: (1) 3D Earth-Specific Transformer (3DEST) — height (pressure levels) as a 3rd spatial dimension; upper-air cube 13×1440×721×5 and surface 1440×721×4, patch-embedded (2×4×4 / 4×4) and concatenated to 8×360×181×C; 8 encoder + 8 decoder Swin-style layers with windowed (2×12×6 tokens) shifted attention; Earth-specific positional bias B_ESP keyed on absolute (height, latitude) window coordinates rather than relative offsets (~527× more bias parameters than Swin's in block 1, no extra FLOPs). ~256M parameters total. (2) Hierarchical temporal aggregation — four separate models trained for lead times 1h, 3h, 6h, 24h; at test time a greedy algorithm composes them to minimize iteration count (e.g. 7-day forecast = 7 × 24h calls; 23h = 3×6h + 1×3h + 2×1h). Training: 100 epochs × ~16 days on 192 NVIDIA Tesla-V100, Adam, batch 192 (1/GPU), weight decay 3e-2... (weight decay and DropPath 0.2 stated), not fully converged at 100 epochs.

## 4. Equations & assumptions
Attention(Q,K,V) = SoftMax(QKᵀ/√D + B_ESP)V. Metrics: latitude-weighted RMSE (Eq. 2) with weights L(i) ∝ cos(latitude_i); latitude-weighted ACC vs 39-year climatology (Eq. 3). Relative Quantile Error RQE = Σ_d (Q̂_d − Q_d)/Q_d over D=50 log-spaced percentiles from 90% to 99.99% (Eq. 4); RQE<0 = underestimates extremes. Cyclone eye = local MSLP minimum satisfying vorticity/thickness/wind thresholds (following Magnusson/White conventions). Assumptions: (1) ERA5 reanalysis ≈ ground truth (except precipitation); (2) greedy lead-time composition is near-optimal for error accumulation; (3) Perlin-noise initial-state perturbations (σ=0.2) proxy real analysis uncertainty in ensembles.

## 5. Features / target
Features: full 3D atmospheric state A_t at initial time. Target: A_{t+Δt} for Δt ∈ {1,3,6,24}h.

## 6. Validation design
Held-out years 2018 (primary, with operational-IFS comparison), 2020/2021 (no competitor numbers). Test protocol: 2 initializations/day (00/12 UTC), hourly forecasts to 168h. Baselines: operational ECMWF IFS (control), FourCastNet (values read off paper plots — authors note small digitization error, negligible vs the gap), ECMWF-HRES for cyclone tracks. Monthly ACC breakdown for stability. No significance tests — gaps are large and consistent.

## 7. Numerical results / baselines
First AI system to beat operational IFS on all variables, all lead times 1h–7d. Z500 5-day RMSE: Pangu 296.7 vs IFS 333.7 vs FourCastNet 462.5 (m²/s²); 3-day 134.5 vs 152.8. T850 5-day: 1.79 vs 2.06 K. T2M 5-day: 1.53 vs 1.75 K. U10 5-day: 2.53 vs 2.90 m/s. "Forecast time gain" >12h on all variables, >24h for specific humidity, ~18h surface. Inference: 1,400ms on a single Tesla-V100 for 24h forecast — >10,000× faster than IFS, ~50% slower than FourCastNet after GPU normalization. Tropical cyclones: 3-day mean direct position error 120.29 km (Pangu) vs 162.28 km (ECMWF-HRES); 5-day 195.65 vs 272.10 km; correct Yutu-to-Philippines call 6 days out and 48h earlier than HRES; Michael landfall timing error 3h vs 18h. Caveat: cyclone intensity heavily underestimated (ERA5 training-data limitation; min pressure often 50 hPa too high). 100-member Perlin ensemble: slightly worse than deterministic at 1 day, significantly better beyond 5 days (7-day Z500 RMSE 500.3→450.6, U10 3.48→2.96); helps non-smooth variables most. Known artifact: accuracy oscillates with iteration count (71h forecast needs 8 calls vs 3 for 72h — visible in hourly plots).

## 8. Code / data availability
No code or weights released in the paper. Data: ERA5 via Copernicus CDS, TIGGE archive, IBTrACS. Reproducibility depends on the paper's architecture/equation detail — high, but retraining costs ~16 days × 192 V100 per model.

## 9. Leakage & limitations
Stated: Jan 1 2018 excluded (train overlap); Dec 2018 + Oct 2018 T850 missing (ECMWF server/download errors); MSLP comparison vs IFS unavailable (server outage — claim rests on cyclone tracking); FourCastNet numbers digitized from plots; training not converged; no design ablations on depth (8+8 layers chosen for memory); intensity underestimation inherited from ERA5. Added: a 2022 Huawei technical report — the "beats IFS" claim was on 2018 data with the IFS version of that era; subsequent IFS upgrades and newer AI models (GraphCast etc.) postdate it.

## 10. GSE overlap
The existing-research map shows weather-for-totals work in GSE's corpus (weather effects on totals), but no AI-weather-model research and no forecast-chaining methodology. No duplication. GSE consumes weather data rather than producing it, so the 3DEST architecture itself has no direct GSE home.

## 11. GSE implementation spec
Adapt two transferable components:
1. Hierarchical temporal aggregation as a design pattern for GSE's own multi-step forecast chaining. Wherever GSE chains predictions across horizons (e.g. weekly projections built from daily steps, or rolling in-season forecasts), train/maintain direct models at multiple lead times (short/medium/long) and greedily compose them to minimize the number of chained calls instead of iterating a single short-step model. The paper quantifies the cost of naive iteration: FourCastNet-style 28× chaining of a 6h model collapses accuracy super-linearly; Pangu's 7× chaining of a 24h model recovers >30% RMSE vs FourCastNet. GSE analogue: prefer direct 4-week-ahead / 8-week-ahead projection heads over iterating a 1-week model 8 times.
2. RQE tail metric for weather-sensitive totals modeling. Adopt the relative quantile error (Eq. 4, 90%→99.99% log-spaced percentiles) to audit whether GSE's weather inputs (wind especially — U10 is the paper's worst tail offender) systematically underestimate extremes. The paper's finding that all methods underestimate extremes, increasingly with lead time, is a direct calibration warning for totals in high-wind games: verify GSE's wind adjustments against the RQE of realized game-time conditions, and consider asymmetric (tail-aware) loss on the weather features in the totals head.

## 12. Reproducible test
Test 1 (aggregation pattern): on GSE's backtest, compare chained 1-week-step projections vs direct multi-week projection heads for season-long win-total/prop trajectories; pass if direct heads reduce cumulative error growth (measure error vs horizon slope). Test 2 (RQE audit): compute RQE of game-time wind/temperature forecasts vs realized conditions for the last 3 NFL seasons; pass if it documents the underestimation direction and magnitude, then re-fit the totals weather adjustment with tail-weighted loss and confirm out-of-sample totals Brier/RMSE improvement on high-wind games (≥15 mph).

## 13. Acceptance / rejection gate
ADAPT: the two transferable ideas (multi-lead-time greedy chaining; RQE tail auditing) are concrete, implementable, and map to real GSE subsystems (projection chaining, weather-adjusted totals). Not ADOPT: GSE will not train a weather model — the 3DEST architecture and ERA5 pipeline stay in the literature, not the repo.

## 14. Improvement experiment
Beyond the paper: apply the hierarchical temporal aggregation idea to GSE's own projection chaining as a controlled experiment the paper never runs — train direct multi-week-ahead projection heads for team points (1/2/4/8-week horizons) and greedily compose them, versus iterating a single 1-week model, on five seasons of nflverse backtests. The paper only quantifies the chaining cost for weather models; this tests whether the same super-linear error growth punishes naive projection iteration in football and whether the greedy-composition remedy transfers. Success = the greedy path cuts horizon-8 cumulative RMSE by a margin comparable to the paper's >30% weather recovery.
