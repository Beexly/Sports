# [0748] AIFS-CRPS: Ensemble Forecasting Using a Model Trained with a Loss Function Based on CRPS (arXiv:2412.15832)

**Citation:** Simon Lang, Mihai Alexe, Mariana C. A. Clare, Christopher Roberts, Rilwan Adewoyin, Zied Ben Bouallègue, Matthew Chantry, Jesper Dramsch, Peter D. Dueben, Sara Hahner, Pedro Maciel, Ana Prieto-Nemesio, Cathal O'Brien, Florian Pinault, Jan Polster, Baudouin Raoult, Steffen Tietsche, Martin Leutbecher (ECMWF) (2024). *AIFS-CRPS: Ensemble forecasting using a model trained with a loss function based on the Continuous Ranked Probability Score*. arXiv:2412.15832. URL: https://arxiv.org/abs/2412.15832
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — the core transferable result is training a probabilistic forecaster DIRECTLY on a proper-score loss (afCRPS, α=0.95, with the degeneracy fix and the positive-terms rearrangement for fp16 stability) instead of MSE: it preserves realistic variability where MSE training smooths it away, and beat the 9km physics-based IFS ensemble by 5–20% on most variables. For GSE: train distribution models on CRPS-family losses, not MSE/log-loss, and steal the afCRPS implementation details.

## 1. Research question
Can a machine-learned weather model (AIFS graph transformer) be turned into a skilful ENSEMBLE prediction system by training it with a proper-score objective (CRPS) rather than MSE — producing calibrated, sharp ensembles with realistic small-scale variability instead of the blurred fields MSE training yields?

## 2. Dataset / schema
**ERA5 reanalysis** (N320 native ~31km; O96 ~1°) for stages 1–3; **operational IFS analysis** for stage-4 fine-tuning. Verification: operational ECMWF analysis + radiosonde (geopotential, temperature, wind) + SYNOP (2m temperature, 10m wind, 24h precipitation). Evaluation period: forecasts initialized 00/12 UTC, **2024-02-01–2024-09-30**. Ensemble: 50 members, 15-day forecasts; initial conditions from operational IFS ensemble ICs.

## 3. Method / model
AIFS graph-transformer trained in **4 stages**: (1) 300,000 iterations, rollout=1 (single 6h step), lr 1e-3 cosine with 1000-step warmup; (2) 60,000 iterations, rollout=2, lr 1e-5 cosine, 100 warmup; (3) ~45,000 iterations, rollout 3→12 (18h–72h), constant lr; (4) fine-tune on operational IFS analysis, full rollout to step 12. Optimizer AdamW (β 0.9/0.95, weight decay 0.1), batch 16. **Loss: afCRPS with α=0.95** (Eq. 3–4). Ensemble members from perturbed initial conditions (model deterministic given ICs). Parallelism: data + model + ensemble-group sharding across GPUs, activation checkpointing.

## 4. Equations & assumptions
CRPS({x_j},y) = (1/M)Σ_j|x_j−y| − (1/2M²)Σ_{j,k}|x_j−x_k|. Fair CRPS replaces 1/2M² with 1/2M(M−1). **afCRPS_α = α·fCRPS + (1−α)·CRPS** = (1/M)Σ_j|x_j−y| − (1−ε)/(2M(M−1))Σ_{j,k}|x_j−x_k|, ε=(1−α)/M. Rearranged as a sum of positive terms (Eq. 4): afCRPS_α = (1/2M(M−1))Σ_{j}Σ_{k≠j}(|x_j−y|+|x_k−y|−(1−ε)|x_j−x_k|), non-negative per term by the triangle inequality for ε≥0 — this is the fp16-stability fix. Motivation: pure fCRPS has a **degeneracy** — if M−1 members equal the observation, the remaining member is unconstrained (zero gradient signal); the (1−α) CRPS admixture removes it. Per-variable loss scaling + pressure-dependent weighting w_pl = plev/1000 (min 0.2). Assumptions: analysis states are valid training targets (relies on ECMWF's physics NWP); ensemble spread comes only from IC perturbations.

## 5. Features / target
Features: full atmospheric state (multi-variable, multi-level) at initialization. Target: the verifying analysis state at each 6h rollout step, scored as an ensemble vs. the single analysis.

## 6. Validation design
50-member 15-day AIFS-CRPS vs. 50-member 9km IFS ensemble, both from the same ICs, verified against analysis + radiosonde + SYNOP over 2024-02-01–2024-09-30. Scorecards: relative CRPS, ensemble-mean RMSE, anomaly correlation, spread. Subseasonal (2–6 week) evaluation vs. operational IFS with ΔfCRPSS on raw weekly means and on anomalies.

## 7. Numerical results / baselines
Medium-range: AIFS-CRPS **beats the 9km IFS ensemble on most upper-air variables** (500 hPa geopotential, 250 hPa wind) and surface variables (2m temperature): lower CRPS and RMSE, higher anomaly correlation; improvements **5–20%**. Degraded at 100 hPa and above (worse with N320 linear-pressure scaling). Tropical 200 hPa temperature mean RMSE ~0.1 K lower than IFS. Spread: larger in extratropics early, smaller in tropics with markedly reduced RMSE. Subseasonal: improved vs. operational IFS, lower biases, better MJO skill. Inference: ~1 min (O96) / ~4 min (N320) per 15-day single-member forecast on an NVIDIA A100 40GB. Spectra: realistic variability maintained to long leads (with reference-field truncation; without it, spurious small-scale energy growth — Fig. 3–4).

## 8. Code / data availability
Model code not released in the paper; ERA5/IFS data via ECMWF/Copernicus. The afCRPS loss itself is fully specified (Eq. 3–4) and reimplementable in ~20 lines.

## 9. Leakage & limitations
(a) Depends entirely on ECMWF's physics-based analyses for training AND initialization — not a standalone system; the ML model distills NWP. (b) Degradation above 100 hPa shows the loss/weighting is not universally right. (c) Ensemble diversity comes only from IC perturbations — no model-form uncertainty. (d) Single 8-month verification window. (e) Compute is industrial (multi-GPU sharded training) — the training recipe does not transfer to GSE scale, only the loss function does. (f) Without reference-field truncation the model gains spurious energy — an ML-specific pathology worth remembering when training autoregressive sports models.

## 10. GSE overlap
Existing-research-map.md: CRPS is listed as a metric; **training on CRPS-family losses is not in the map** — GSE trains on MSE/log-loss. Ensemble forecasting topics exist but the proper-score-training paradigm and the afCRPS degeneracy fix are new. Directly adjacent to the weather keyword lane.

## 11. GSE implementation spec
(1) For GSE's probabilistic total/margin models, replace/augment the MSE (or log-loss) training objective with **afCRPS (α=0.95)** over a small ensemble of model seeds (M=8–16 members), implemented via the positive-terms rearrangement (Eq. 4) for numerical stability; (2) keep per-target scaling (the w_pl analogue: scale by target SD); (3) compare CRPS, sharpness, and tail behavior vs. the MSE-trained baseline on 2024–2025 holdout. Effort: ~1 week (loss swap + ensemble training harness).

## 12. Reproducible test
Dataset: 2015–2025 NFL games; target: game total (and margin). Train ≤2023 on afCRPS vs. MSE with identical architecture/seeds; test 2024–2025. Metrics: CRPS, 90% interval coverage/width, twCRPS at 90th percentile. Success = afCRPS-trained model improves CRPS ≥2% with no coverage degradation and visibly less "smoothing" of the predictive distribution (wider, more realistic tails).

## 13. Acceptance / rejection gate
ADOPT afCRPS training if it improves holdout CRPS ≥2% at equal-or-better calibration (PIT uniformity); REJECT if the ensemble collapses (spread → 0, the degeneracy the paper warns about — monitor effective ensemble variance during training) or if gains are <1% (not worth the training-cost increase).

## 14. Improvement experiment
**afCRPS + threshold weighting**: combine this paper's afCRPS with the twCRPS idea from [0746] — a threshold-weighted almost-fair CRPS that emphasizes tail outcomes while keeping the degeneracy fix; test whether the combination beats either alone on 90th-percentile total/margin events. Neither paper tries this.
