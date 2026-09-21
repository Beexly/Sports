# [1466] Continuous Ensemble Weather Forecasting with Diffusion Models (arXiv:2410.05431v2)

**Citation:** Andrae, M., Landelius, T., Oskarsson, J., & Lindsten, F. (2025). *Continuous Ensemble Weather Forecasting with Diffusion Models*. Published as a conference paper at ICLR 2025. arXiv:2410.05431v2 [cs.LG]. URL: https://arxiv.org/abs/2410.05431. Code: https://github.com/martinandrae/Continuous-Ensemble-Forecasting
**Ledger completed:** 2026-09-21. **Read:** full text (PDF) plus architecture/training appendix.
**Verdict:** ADAPT — direct arbitrary-lead-time conditional diffusion with correlated/fixed noise yields temporally coherent ensemble trajectories; ARCI (autoregressive anchors + continuous interpolation) beats pure autoregression on 10-day skill and is 4× faster to sample. Transfer the coherent multi-horizon trajectory method to GSE's game-outcome ensembles, not the weather model.

## 1. Research question
Can a single diffusion model produce ensemble weather forecasts at arbitrary continuous lead times (not just fixed 6h/24h steps), with temporally coherent trajectories across lead times, and can it beat iterative autoregressive rollout on 10-day skill and sampling cost?

## 2. Dataset / schema
WeatherBench ERA5 reanalysis at 5.625° resolution. Variables: z500 (geopotential), t850 (temperature 850 hPa), t2m (2m temperature), u10/v10 (10m winds). Splits: train 1979–2015, validation 2016–2017, test 2018. Public via WeatherBench.

## 3. Method / model
- **Continuous diffusion forecaster:** a conditional diffusion model that takes (initial state, lead time t as a continuous conditioning input) and directly generates the state at lead t. 3.5M-parameter U-Net; 32 base filters; attention at 16×32 resolution; Fourier time/noise embeddings with 32 frequencies → 128-dimensional encoding.
- **Coherence trick:** using correlated or fixed noise across lead times makes the sampled trajectory coherent (the same ensemble member traces a plausible continuous path rather than independent draws per lead time).
- **ARCI:** hybrid — autoregressive 24-hour "anchor" forecasts, with continuous diffusion interpolation between anchors. ARCI-24/6h is the headline configuration.
- Training: AdamW, Xavier uniform init, cosine LR decay with peak LR 5e-4, weight decay 0.1, 1,000 warmup steps, 300 epochs, batch 256, dropout 0.1. ARCI-24/6h trained on an A100 40GB for ~2 days.
- Baselines: AR-6h (pure 6-hour autoregressive diffusion rollout), AR-24h, and deterministic references.

## 4. Equations & assumptions
Standard score-based diffusion with continuous lead-time conditioning (exact SDE/denoising-score-matching forms in Sec. 2 of the paper). Metrics: RMSE, CRPS, spread/skill ratio (SSR; 1.0 = perfectly calibrated spread). Assumptions: (1) ERA5 reanalysis as ground truth; (2) the learned score function generalizes across lead times from the training distribution of (state, lead) pairs; (3) fixed-noise sampling yields physically coherent paths (empirically validated, not proven).

## 5. Features / target
Inputs: initial atmospheric state (gridded fields) + continuous lead time. Target: full predictive distribution of the state at that lead time (ensemble members). Horizon: 10 days.

## 6. Validation design
Fixed time splits (1979–2015 / 2016–2017 / 2018). Metrics at multiple lead times out to day 10. Baselines are same-family autoregressive diffusion models, so the comparison isolates the continuous-vs-autoregressive design choice.

## 7. Numerical results / baselines
Day-10 scores (paper's tables): z500 — ARCI 765.6 RMSE / 355.2 CRPS / 0.93 SSR vs AR-6h 811.8 / 391.9 / 0.88. t850 — ARCI 3.29 / 1.63 / 0.95 vs AR-6h 3.39 / 1.69 / 0.92. Sampling cost for a ten-day 6-hourly ensemble member: AR-6h 32 s vs ARCI 8 s (4× faster). ARCI wins on RMSE/CRPS at long leads while improving (raising toward 1) the spread/skill ratio.

## 8. Code / data availability
Code: https://github.com/martinandrae/Continuous-Ensemble-Forecasting. Data: WeatherBench/ERA5 public.

## 9. Leakage & limitations
- ERA5 reanalysis is itself a model product; "ground truth" inherits assimilation-system biases.
- 5.625° is coarse; results may not transfer to convection-permitting resolutions.
- Coherence via fixed noise is a sampling heuristic; no guarantee the interpolated trajectory satisfies physical constraints between anchors.
- Single test year (2018); interannual variability untested.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's ensemble work covers model combination, and weather-for-totals is an existing research thread. No existing ledger covers continuous-lead-time coherent trajectory ensembles. This is an extension: GSE currently ensembles at fixed horizons (game-level outcomes); this paper's method generates coherent multi-horizon paths (e.g., in-game win-probability trajectories or season-long record distributions) from a single model.

## 11. GSE implementation spec
- Data: play-by-play sequences with game-state features (score diff, time, down/distance, team strengths) or season-simulation state vectors.
- Build: (a) train a small conditional diffusion/MLP model mapping (game state, continuous lead time τ ∈ [0, 60 min]) → distribution of score differential at τ; (b) sample ensemble members with fixed noise seeds across τ for coherent win-probability paths; (c) ARCI-style anchors at quarter boundaries with interpolation between them.
- Effort: ~2 weeks (data pipeline exists via nflverse; the diffusion model is the new piece, but a 3.5M-param U-Net analogue for tabular game-state is small).

## 12. Reproducible test
Dataset: 2022–2024 NFL play-by-play, predicting final score differential from states at each minute of game time. Metric: CRPS of the predictive distribution at lead times 5/15/30/60 min. Baseline: independent per-horizon quantile models. Window: train ≤2022, validate 2023, test 2024.

## 13. Acceptance / rejection gate
ADOPT the continuous-trajectory forecaster if, on 2024, its CRPS at 30- and 60-minute leads beats the per-horizon baselines by ≥5% AND sampled trajectories are monotone-coherent (no lead-time crossing artifacts in ≥95% of sampled members). Reject if coherence requires per-lead resampling anyway.

## 14. Improvement experiment
Condition the diffusion on the pregame spread/total as an additional input and test whether the in-game trajectory ensemble stays calibrated to the closing line (a market-consistency constraint) — if it does, the same model serves both live-betting WP and pregame pricing.
