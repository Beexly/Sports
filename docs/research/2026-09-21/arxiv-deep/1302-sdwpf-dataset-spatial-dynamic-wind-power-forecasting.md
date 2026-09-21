# [1302] SDWPF: A Dataset for Spatial Dynamic Wind Power Forecasting (arXiv:2208.04360v2)

**Citation:** Zhou, J., Lu, X., Xiao, Y., Su, J., Lyu, J., Ma, Y., & Dou, D. (2025). *SDWPF: A Dataset for Spatial Dynamic Wind Power Forecasting — Challenge at KDD Cup 2022*. arXiv:2208.04360v2 [cs.LG]. URL: https://arxiv.org/abs/2208.04360
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — a 4.7M-record, 134-turbine, 10-minute-resolution spatiotemporal wind benchmark with a 48-hour forecasting task; it is the training/benchmark substrate GSE's wind-forecasting lane needs, with documented data caveats (missing values, turbine status) that transfer to any real wind-data pipeline. (Replacement for REJECT 1096.)

## 1. Research question
What does a realistic, large-scale benchmark for spatial dynamic wind power forecasting look like — one that captures spatial turbine layout, dynamic weather context, and turbine operating status over long horizons?

## 2. Dataset / schema
245 days of 10-minute records from 134 wind turbines: 4,727,520 records × 13 columns. Columns include wind speed (Wspd, m/s, from the nacelle anemometer), environmental temperature (Etmp, °C), turbine internal temperature, nacelle direction, blade pitch angles, and turbine status/operating flags, plus the spatial coordinates of each turbine. Released for the Baidu KDD Cup 2022 challenge (additional months held back for evaluation). Task: predict the next 288 steps (48 hours) of wind power.

## 3. Method / model
Dataset paper rather than a modeling paper: the authors define the forecasting task, document the data schema and collection pipeline, enumerate caveats (missing values, abnormal readings, turbine downtime/status changes), and provide baseline results with modern long-horizon forecasters (Autoformer, Informer) plus their own baseline. Evaluation metric: a combined score from RMSE and MAE over K = 195 test predictions.

## 4. Equations & assumptions
- Task: given historical 10-minute turbine/atmospheric records, forecast 288 future power values per turbine.
- Baseline reported: RMSE 47.081286, MAE 37.558233, overall score 42.319760 over K = 195 predictions (evaluation time ~1129.7s).
- Assumptions: nacelle-measured wind speed proxies the inflow; turbine status flags explain zero-power intervals; spatial adjacency between turbines carries predictive information.

## 5. Features / target
Features: 10-minute multivariate turbine telemetry (wind speed, temperatures, pitch, yaw, status) + turbine spatial layout. Target: 288-step-ahead wind power per turbine.

## 6. Validation design
KDD Cup 2022 competition protocol: fixed public training window, held-back private months for scoring; RMSE/MAE combined score; baseline models (Autoformer, Informer) for reference.

## 7. Numerical results / baselines
- Scale: 4,727,520 records, 134 turbines, 245 days at 10-minute resolution — the largest public spatial wind-power forecasting dataset at release.
- Baseline: RMSE 47.08, MAE 37.56, combined score 42.32.
- Long-horizon transformer baselines (Autoformer, Informer) establish the reference performance level for 48-hour spatiotemporal forecasting.

## 8. Code / data availability
Dataset released publicly for KDD Cup 2022 (competition data). Data caveats are documented in the paper. Code: not stated in paper.

## 9. Leakage & limitations
Held-back months prevent leaderboard leakage. Limitations: single wind-farm region; nacelle measurements (not met-mast); missing/abnormal values require the documented cleaning steps; 48-hour horizon is longer than game-day needs but useful for stress testing.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 8 (weather physics for totals) — the repo has a barometric-pressure benchmark and "wind/weather" as an inventoried metric, but no spatiotemporal wind-forecasting benchmark data or method. This is the data substrate for building one. No duplicate.

## 11. GSE implementation spec
1. Use SDWPF as the training/benchmark set for GSE's wind-forecast model selection: reproduce the Autoformer/Informer baselines, then test graph-based (see ledger 1305) and EMOS-style (see ledger 1301) approaches on the same 48-hour task.
2. Port the winning architecture to a stadium-wind network: replace turbines with stadium locations, power with wind speed/gusts, and retrain on public mesonet data.
3. Adopt the paper's data-caveat checklist (missing values, status flags, abnormal readings) as the QA spec for any real wind-data pipeline feeding totals.

## 12. Reproducible test
Download the public SDWPF data; reproduce the reported baseline (RMSE ≈ 47.1, MAE ≈ 37.6 over K = 195); verify that a graph-wavenet variant beats the transformer baselines before committing it to the stadium-wind network.

## 13. Acceptance / rejection gate
ADAPT: the benchmark data and task definition are exactly what GSE needs to stand up a credible wind-forecasting lane — value as substrate, not just method.

## 14. Improvement experiment
Shorten the horizon to 6–24 hours (game-day relevant) and re-benchmark; add turbine-to-turbine attention learned from data vs fixed geographic adjacency; fuse the SDWPF-trained encoder as a pretrained backbone for stadium gust prediction with limited local data.
