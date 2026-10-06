# [1305] Multi Scale Graph Wavenet for Wind Speed Forecasting (arXiv:2109.15239v1)

**Citation:** Rathore, N., Rathore, P., Basak, A., Nistala, S. H., & Runkana, V. (2021). *Multi Scale Graph Wavenet for Wind Speed Forecasting*. arXiv:2109.15239v1 [cs.LG]. URL: https://arxiv.org/abs/2109.15239
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — spatiotemporal graph forecasting with a learned adjacency matrix that beats state-of-the-art wind-speed baselines by 4–5% across 6/12/18/24-hour horizons; the most directly production-relevant wind-forecasting method in this wave for GSE's stadium weather network. (Replacement for REJECT 1100.)

## 1. Research question
Can a graph-convolutional architecture with multi-scale temporal modeling and a learned spatial adjacency matrix outperform state-of-the-art wind-speed forecasting methods across multiple horizons?

## 2. Dataset / schema
Real wind-speed measurements from five Danish cities (Esbjerg, Aalborg, Aarhus, Odense, Roskilde), years 2000–2010. Multivariate time series: wind speed at each station, forecast at 6-, 12-, 18-, and 24-hour horizons.

## 3. Method / model
Multi-Scale Graph Wavenet: (a) temporal module — dilated causal convolutions with skip connections in an inception-style multi-scale stack (dilation up to 8), capturing short- and long-range temporal dependencies; (b) spatial module — graph convolution over stations with a single learnable adjacency matrix `A = Softmax(E·Eᵀ)` built from learned node embeddings, so the model discovers the effective spatial influence structure rather than relying on geographic distance; (c) stacked spatiotemporal layers with skip connections to the output layer.

## 4. Equations & assumptions
- Learnable adjacency: `A = Softmax(E·Eᵀ)`, where E are learned node embeddings (C-dimensional hyperparameter).
- Temporal: dilated 1-D convolutions with exponentially increasing dilation, residual + skip connections per layer.
- Assumptions: station-to-station influence is learnable from data and stable over the training window; multi-scale temporal patterns (gust fronts, diurnal cycles) factor through the dilated stack.

## 5. Features / target
Features: multivariate wind-speed histories at the five stations. Target: wind speed at each station at 6/12/18/24-hour horizons.

## 6. Validation design
Comparison against state-of-the-art baselines (including prior graph/temporal models) on all four horizons; the learned-adjacency variant ablated against fixed geographic adjacency.

## 7. Numerical results / baselines
- Outperforms the state-of-the-art methods on wind-speed forecasting for all four horizons by 4–5%.
- The single learnable adjacency matrix is credited with explaining the relative importance of neighboring stations better than fixed geographic graphs.

## 8. Code / data availability
Danish wind data (public meteorological records). Code: not stated in paper.

## 9. Leakage & limitations
Standard chronological train/test discipline implied. Limitations: only five stations in one small country (dense, flat terrain); hourly-scale data — gust extremes not modeled; no exogenous NWP features; learned adjacency may overfit small networks.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 8 (weather physics for totals) — this is the forecasting engine the lane needs: a method that learns inter-stadium wind influence from data rather than assuming it. Repo has no graph-based weather forecasting and no learned-adjacency work. Pairs with ledger 1302 (benchmark data) and 1301 (calibration). No duplicate.

## 11. GSE implementation spec
1. Reimplement Multi-Scale Graph Wavenet with NFL stadiums (or nearby mesonet stations) as graph nodes; initialize node embeddings from geographic/terrain features and let the adjacency learn.
2. Train on hourly wind speed/gust histories; forecast 6/12/18/24-hour horizons; score against persistence and a per-stadium AR baseline with the paper's 4–5% improvement as the bar.
3. Feed the 24-hour-ahead stadium wind distributions into the totals model's weather features, with the learned adjacency inspected for physically sensible structure (coastal vs inland clusters).

## 12. Reproducible test
Rebuild on the Danish five-city data (public DMI records 2000–2010): confirm the 4–5% margin over the reported baselines and that the learned adjacency recovers the geographic neighbor structure; then port to 10+ US stadium-adjacent stations and verify the margin holds before engine integration.

## 13. Acceptance / rejection gate
ADAPT: a learnable-adjacency spatiotemporal forecaster with a documented 4–5% SOTA margin is exactly the weather-forecasting asset GSE's totals lane is missing.

## 14. Improvement experiment
Add exogenous NWP grid features as node inputs; learn a time-varying adjacency (regime-dependent: frontal passage vs calm); extend the target to gust maxima and wind direction for kick-trajectory modeling.
