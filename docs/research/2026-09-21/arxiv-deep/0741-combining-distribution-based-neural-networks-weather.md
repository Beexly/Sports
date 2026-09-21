# [0741] Combining Distribution-Based Neural Networks to Predict Weather Forecast Probabilities (arXiv:2103.14430)

**Citation:** Mariana C. A. Clare, Omar Jamil, Cyril Morcrette (2021). *Combining distribution-based neural networks to predict weather forecast probabilities*. arXiv:2103.14430. URL: https://arxiv.org/abs/2103.14430
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache).
**Verdict:** ADAPT — the *architectural pattern* (binned-softmax predictive-distribution heads + stacked combination of small per-input networks) transfers to GSE's probabilistic game-total/margin modeling; the weather application and the paper's own uncertainty quantification (which is statistically flawed) are not adopted. Calibrated, not core.

## 1. Research question
Can machine-learned models produce skilful probabilistic weather forecasts — full probability density functions of future atmospheric states — by training ResNets that output categorical distributions and stacking multiple such networks, as an alternative to physics-based ensemble NWP?

## 2. Dataset / schema
**WeatherBench / ERA5 reanalysis**, 1979–2018, 5.625° grid (32×64), variables Z500 (geopotential height) and T850 (temperature at 850 hPa), forecast horizons 3 and 5 days. Splits: 1979–2011 learner training, 2011 validation, 2012–2016 stacking training, 2017–2018 test. Baselines: Scher & Messori operational-style benchmarks, "dressed ERA" (dressed deterministic), operational IFS CRPS values from literature.

## 3. Method / model
Per-variable, per-horizon ResNets whose output layer is a **100-bin categorical distribution** (softmax over binned target values) — the network predicts a full PDF, not a point. Two training setups per variable: "Z500-only" and "Z500+T850" input variants (4 ResNets per variable pair). **Stacking**: a shallow network (two 36-unit ReLU layers + softmax) takes the concatenated 100-bin outputs of the member ResNets and outputs a combined 100-bin distribution. Each ResNet outputs 32 dropout-sampled distributions; the stack is trained on 2012–2016 data. CRPS is the primary metric (computed from the binned CDFs).

## 4. Equations & assumptions
Softmax binned PDF: p_k = exp(z_k)/Σ_j exp(z_j) over K=100 bins spanning the variable range. CRPS for binned forecasts: Σ over bins of (CDF_forecast − CDF_obs)² × bin width. Stacking minimizes CRPS of the combined distribution on the stack-training split. Assumptions: binning resolution (100 bins) is adequate; ERA5 reanalysis is ground truth; dropout samples approximate a Bayesian posterior.

## 5. Features / target
Features: gridded Z500/T850 fields at forecast initialization (global 32×64 maps). Target: the binned future value of the same variable at the grid point / horizon. Horizons: 3-day and 5-day.

## 6. Validation design
Fixed time splits (1979–2011 / 2011 / 2012–2016 / 2017–2018); CRPS vs. Scher/Messori, dressed-ERA, and operational IFS reference values; calibration-style check of "within 1σ/2σ" containment (see §9 — flawed).

## 7. Numerical results / baselines
Stacked-network CRPS (test 2017–2018): **Z500: 211 (3-day), 1500 (5-day)**; **T850: 1.22 (3-day), 1.69 (5-day)**. Scher & Messori Z500 benchmarks: 526 and 707 — the stacked model beats them substantially. T850 references: dressed ERA 1.44/1.18, operational IFS 0.98 — stacked model (1.22/1.69) is between dressed-ERA and IFS. Within-1σ containment: 64.7%, 71.2%, 67.3%, 71.2%; within-2σ: 93.6%, 94.0%, 94.0%, 94.2% — approximately Gaussian-consistent spread, modestly under-dispersed at 1σ. Compute: each ResNet ~12 hours; stacking network ~30 minutes on an RTX6000 (2 GPUs, 48GB).

## 8. Code / data availability
Code: https://github.com/mc4117/ResNet_Weather. Data: WeatherBench/ERA5 (public).

## 9. Leakage & limitations
**Critical statistical flaw**: the paper's "confidence interval" divides the distribution SD by √100 (the number of bins), yielding nominal 95%/99% intervals that contain only ~14–20% of outcomes — a misuse of the standard error of the mean formula on a predictive distribution. DO NOT import that calculation. Other limits: (a) fixed iid-style time splits on a trending climate series; (b) 100-bin discretization is arbitrary and coarse for extremes; (c) dropout-based uncertainty is ad hoc; (d) weather predictability ≠ sports predictability — the skill demonstrated does not transfer, only the architecture pattern.

## 10. GSE overlap
Existing-research-map.md: "weather" is a GSE keyword lane; ensemble/probabilistic forecasting topics are covered generally but the **binned-softmax predictive-distribution head + shallow CRPS-trained stacking** pattern is not in the map. GSE's probabilistic outputs are mostly point + interval; a full binned PDF head for game totals is a new capability.

## 11. GSE implementation spec
(1) For game totals (and optionally margins), add a **binned-softmax distribution head** to an existing tabular/NN model: e.g., 60 bins over total ∈ [20, 80]; train with cross-entropy or CRPS-on-CDF loss on 2015–2024 games. (2) Train 2–4 small variants on different feature subsets (e.g., market-implied features vs. pure stats) and combine with a **shallow stacking network** (2×36 ReLU + softmax) trained on a later season slice, minimizing CRPS. (3) Derive win/spread/total probabilities by integrating the binned PDF. Effort: ~1 week.

## 12. Reproducible test
Dataset: 2015–2024 NFL regular seasons; target: game total. Train ≤2022, stack-train 2023, test 2024. Metric: CRPS of the binned PDF vs. (a) Gaussian from GSE point forecast + residual SD, (b) market-implied total distribution. Success = binned+stacked CRPS ≥3% better than the Gaussian baseline on the 2024 test.

## 13. Acceptance / rejection gate
ADOPT the distribution-head pattern if it beats the Gaussian baseline on 2024 CRPS with no degradation in calibration (PIT histogram uniformity); REJECT if the binning produces worse CRPS than the simple Gaussian or if the stacking layer overfits the single stack-training season (check 2022-as-stack-train sensitivity).

## 14. Improvement experiment
**Bin-adaptive resolution**: replace fixed 100 (or 60) bins with quantile-spaced bins concentrated where betting value lives (near key numbers 41/44/47/51 for totals, 3/7/10 for spreads) and compare CRPS + betting-ROI — the paper's uniform binning wastes resolution on irrelevant tails; sports has known high-value regions.
