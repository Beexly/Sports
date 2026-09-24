# [1098] Benchmark Dataset for Precipitation Forecasting by Post-Processing the Numerical Weather Prediction (arXiv:2206.15241v2)

**Citation:** Kim, T., Ho, N., Kim, D., Yun, S.-Y. (2022). *Benchmark Dataset for Precipitation Forecasting by Post-Processing the Numerical Weather Prediction*. arXiv:2206.15241v2. URL: https://arxiv.org/abs/2206.15241
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the post-NWP optimization pipeline (leakage-safe temporal splitting, variable-selection ablations, class-imbalance sampling, window/hyperparameter sensitivity) is a transferable blueprint for calibrating weather-model outputs into game-day weather features for NFL totals/props.

## 1. Research question
Pure deep-learning precipitation forecasters beat physics-based NWP at short leads but degrade beyond ~6 hours and lack physical grounding. Can a hybrid NWP-DL workflow — feeding NWP model outputs into a neural net that post-processes them under supervision of ground-station observations — get the best of both? To catalyze this, the authors release KoMet, the most comprehensive public dataset for DL post-processing of NWP, plus baseline architectures and a full analysis of the challenges (sparse labels, class imbalance, variable selection, hyperparameter sensitivity).

## 2. Dataset / schema
**KoMet (Korea Meteorological Dataset), public:** GDAPS-KIM NWP predictions (Korean Meteorological Administration global model) for July 1–August 31, 2020 and 2021 (T=124 days), lead times 0–89 h (L=90), 122 atmospheric variables per grid cell (5 Pres variables × 22 isobaric surfaces = 110 + 12 Unis variables), spatial grid 65×50 at 12 km × 12 km covering [32.94°N, 39.06°N]×[124.00°E, 132.00°E]. Ground truth: 484 Automatic Weather Station (AWS) sites, hourly rainfall, h=3,120 hours, mapped onto the NWP grid (only 484 of 3,250 pixels have labels; many NaNs). Class distribution: no rain [0, 0.1) mm/h: 87.24%; rain [0.1, 10): 11.57%; heavy rain [10, ∞): 1.19%. Split: temporal — repeating ~4 days train / 2 days validation / 2 days test, split by simulation origin time (not valid time) to prevent leakage from overlapping lead-time windows of the same simulation. Access: https://github.com/osilab-kaist/KoMet-Benchmark-Dataset (Dropbox tarball, MIT-licensed code).

## 3. Method / model
Problem: `min_w L(w;D) = E_{(Xt,Yt)~D}[ℓ(Xt, Yt; w)]` — post-process the NWP output sequence Xt into precipitation class probabilities. Probabilistic forecast: `f(τ; Xt0, w, ws) = P(yτ | x(t,Δ−ws+1), …, x(t,Δ))` over classes {non-rain, rain, heavy rain}, with window size ws of lead times concatenated channel-wise. Baselines: U-Net, ConvLSTM, MetNet (encoder–temporal–spatial-aggregator). Training: Adam, lr 0.001, 20 epochs, best epoch by validation CSI, window size 3, lead times 6–87 h, 12 curated variables (2 Pres vars T/rh_liq at 500/700/850 hPa + 6 Unis vars: rain, q2m, rh2m, t2m, tsfc, ps). Class-imbalance fixes: (1) under-sampling "no rain" points, (2) balancing rain/no-rain ratio to 1:p. ~30 min per training run on RTX 3090 Ti.

## 4. Equations & assumptions
- Objective (1): `min_w E[ℓ(Xt, Yt; w)]`; forecast (2): `f(τ; Xt0, w, ws) = P(yτ|x(t,Δ−ws+1),…,x(t,Δ))`.
- Metrics: Accuracy; POD (recall) = TP_k/(TP_k+FN_k); CSI = TP_k/(TP_k+FN_k+FP_k); FAR = FP_k/(TP_k+FP_k); Bias = (TP_k+FP_k)/(TP_k+FN_k) (1 = perfect frequency).
- Assumptions: AWS point observations supervise grid cells adequately after linear interpolation of missing points; KMA's 0.1/10 mm/h rain/heavy-rain thresholds are the right discretization; a single model can handle all lead times 6–87 h; min-max normalization per variable suffices.

## 5. Features / target
Inputs: 12 curated NWP variables per grid cell per lead-time window (temperature & relative humidity at 3 pressure levels; surface rain, 2-m specific/relative humidity, 2-m/surface temperature, surface pressure). Target: per-pixel precipitation class (non-rain / rain / heavy rain) at each hour — a pointwise 3-class classification; regression variant supported but evaluation is on the classes.

## 6. Validation design
Temporal split by simulation origin (4d train / 2d val / 2d test repeating) — explicitly designed so predictions from the same NWP initial state can't leak across splits. Baselines: raw GDAPS-KIM, U-Net, ConvLSTM, MetNet. Metrics: Acc/POD/CSI/FAR/Bias per class, averaged over lead times 6–87 h; sampling-strategy ablations averaged over 10 seeds with 95% CIs; variable-selection ablations (Table 4); window-size and weight-decay sensitivity (Figure 6); learning-rate sensitivity.

## 7. Numerical results / baselines
Table 3 (12 variables, leads 6–87 h), Rain class — GDAPS-KIM: Acc 0.747, POD 0.633, CSI 0.263, FAR 0.690, Bias 2.042; U-Net: 0.840/0.441/0.282/0.562/1.007; ConvLSTM: 0.869/0.387/0.296/0.444/0.696; MetNet: 0.854/0.468/0.314/0.512/0.959. Heavy-rain class — GDAPS-KIM: Acc 0.985, POD 0.055, CSI 0.045, FAR 0.795, Bias 0.266; U-Net: 0.983/0.040/0.029/0.906/0.426; ConvLSTM: 0.986/0.007/0.006/0.889/0.059; MetNet: 0.986/0.013/0.012/0.838/0.079. Key finding: DL post-processing consistently improves "rain" over raw NWP (MetNet best), but *hurts* heavy-rain prediction — raw GDAPS-KIM beats all DL baselines on heavy rain (left as an open challenge). Table 4 ablations: removing tsfc improves rain CSI to 0.317 (from curated 0.282); removing rh2m → 0.301; fewer variables can beat more. Heavy rain is extremely window-size sensitive (Figure 6).

## 8. Code / data availability
Data + code: https://github.com/osilab-kaist/KoMet-Benchmark-Dataset (Dropbox tarball KoMet.v1.0.tar.gz, MIT license for code). Stated as maintained.

## 9. Leakage & limitations
Strong anti-leakage design (split by simulation origin time). Limitations: heavy-rain failure is unresolved — DL post-processing degrades the tail that matters most; only July–August (monsoon season) in Korea — no evidence of generalization to other regimes/seasons; linear interpolation to fill sparse AWS labels introduces synthetic supervision; single NWP model (GDAPS-KIM); a single model for all lead times may be suboptimal (authors note lead-time-specific models might help); no probabilistic calibration assessment (only categorical scores).

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 8: "Weather physics for totals — barometric-pressure benchmark exists; no papers on wind physics × stadium geometry × passing efficiency." No existing NWP post-processing lane. This paper fills the methodological gap for *how to turn raw weather-model grids into calibrated local forecasts* — the missing preprocessing step between "download NWS/NWP data" and "use weather in totals models." Complements (does not duplicate) the barometric-pressure benchmark.

## 11. GSE implementation spec
GSE application: game-day weather features for NFL totals and props (wind speed/direction at kickoff, precipitation probability, temperature). Pipeline: (1) pull NWS/NWP gridded forecasts (GFS/NAM) for stadium coordinates at relevant lead times; (2) supervise with METAR station observations at/near stadiums (the AWS analogue); (3) train a lightweight post-processor (start with gradient boosting on the 12-variable-style curated set, graduate to U-Net/ConvLSTM only if justified) to output calibrated per-stadium wind/precip/temperature distributions; (4) feed the calibrated weather features into the totals model. Reuse the paper's split-by-forecast-origin discipline and CSI/Bias-style categorical verification. Effort: 2–3 weeks for the data pipeline + baseline post-processor on 3+ seasons of stadium weather.

## 12. Reproducible test
Build the stadium-weather dataset (NWP forecasts + METAR observations) for all 30 NFL stadiums, 2022–2025 seasons, September–January. Train the post-processor with the paper's temporal split discipline. Metric: CSI and Bias for precipitation occurrence and MAE for wind speed vs raw NWP at 6–48 h leads. Pass = post-processor beats raw NWP on CSI (like the paper's rain result) without degrading the heavy-tail/windy-tail cases (the paper's failure mode — check explicitly).

## 13. Acceptance / rejection gate
ADAPT if the stadium-weather post-processor improves on raw NWP (CSI +≥0.02 on precipitation occurrence, wind-speed MAE −≥5%) on the held-out time window AND the calibrated weather features improve the totals model's log-loss/Brier on a backtest vs the same model with raw weather inputs. REJECT if post-processing adds no skill over raw NWP at stadium scale.

## 14. Improvement experiment
Fix the paper's open failure: heavy-tail degradation. Train a two-head model — a classifier for occurrence (where DL wins) plus a separate extreme-value head (e.g., a generalized Pareto tail or quantile regression forest) for the heavy-rain/high-wind tail — and blend by predicted intensity. Hypothesis: the occurrence head captures the paper's rain-class gains while the EVT tail head avoids the heavy-rain collapse, giving a strictly better full-distribution forecast.
