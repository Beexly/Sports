# [1473] Time Series Modeling for Dream Team in Fantasy Premier League (arXiv:1909.12938v1)

**Citation:** Gupta, A. (2017). *Time Series Modeling for Dream Team in Fantasy Premier League*. Presented at ICSE-2017 (International Conference on Sports Engineering), Jaipur. arXiv:1909.12938v1. URL: https://arxiv.org/abs/1909.12938
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — the forecast→integer-optimization architecture (per-player weekly ARIMA + LSTM blended forecasts feeding a budget- and formation-constrained binary LP) is a genuine, transferable DFS roster-construction pattern; but the paper's validation is thin (no held-out comparison, undisclosed LSTM architecture, blend weights tuned on sparse examples, zero-filled absences), so adopt the architecture only, under modern rolling-origin testing.

## 1. Research question
Can weekly Fantasy Premier League points be forecast per player with time-series models (ARIMA, LSTM/RNN), and can a linear program then assemble the optimal "dream team" under FPL's budget and formation constraints?

## 2. Dataset / schema
Official FPL data plus Kaggle cross-checks. Master data: 584 players × 5 fields; after removing new/dormant players ~326 remain. Three seasons 2013–14 through 2015–16; 114 weekly values per player. Missing appearances filled with zero. No public URL stated in the paper beyond "official FPL + Kaggle".

## 3. Method / model
- Per-player weekly points forecast with ARIMA and with an LSTM (architecture details not disclosed), then a linear blend of the two; a common 40% ARIMA / 60% LSTM blend was selected.
- Binary linear program: maximize Σ predicted points subject to £100m budget and exact roster constraints (2 GK, 5 DEF, 5 MID, 3 FWD).
- Example blend RMSEs reported: Vardy best shown 2.539 at 60/40; Sagna best shown 2.013 at 30/70 — i.e., the "common" 40/60 was not optimal per player.

## 4. Equations & assumptions
Standard ARIMA(p,d,q) per player; LSTM equations not stated. LP: max cᵀx s.t. budget and positional cardinality constraints, x binary. Assumptions: (1) weekly points are forecastable from own history alone (no opponent/form features); (2) zero = did-not-play is a valid observation (conflates absence with poor performance); (3) one global blend ratio suits all players (contradicted by the paper's own per-player RMSE table); (4) no transfer limits, captaincy, or ownership considered.

## 5. Features / target
Features: player's own past weekly FPL points (univariate). Target: next gameweek's points. Horizon: 38 gameweeks ahead (full season forecast, then weekly team selection).

## 6. Validation design
Weak: blend weights chosen on a few player examples; no rolling-origin backtest; no comparison against naive baselines (e.g., last-season average); final validation is a single season-long team aggregate ("total team overforecast by 87 points").

## 7. Numerical results / baselines
- Vardy blend RMSE: best shown 2.539 (60/40). Sagna: best shown 2.013 (30/70).
- Claimed "dream team" projection: 3,718 points for the season.
- Claimed season result: total team overforecast by 87 points.
- Player-season totals implied are unrealistically high (paper's own numbers suggest overforecasting); no per-week accuracy reported.

## 8. Code / data availability
None stated. FPL data obtainable from the official API/Kaggle.

## 9. Leakage & limitations
- Zero-filling absences biases both ARIMA and LSTM downward for rotation-risk players and upward for nailed-on starters — a data-construction flaw, not just a modeling choice.
- Blend weights tuned on sparse player examples, then applied globally despite per-player optima differing.
- LSTM architecture, hyperparameters, and training protocol undisclosed — irreproducible.
- No uncertainty: point forecasts into a deterministic LP means the optimizer chases noise; no probabilistic availability modeling.
- 3,718-point dream team is not credible against real FPL winning scores — suggests target leakage or overfit in the forecast stage.
- Ignores the actual FPL game (transfers, captain, chips, ownership).

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md` and the arxiv-deep corpus: ledgers 1090 (tournament payout structures), 1091 (DFS winners via integer programming), and 1092 (DFS baseball lineups via LP) already cover optimization-based DFS construction. This paper's distinct contribution is the per-player weekly time-series forecasting stage feeding the optimizer — none of 1090/1091/1092 forecast player trajectories; they optimize over expected values. Extension, not duplicate: the forecast→ILP pipeline with TS-modeled player points.

## 11. GSE implementation spec
- Data: weekly NFL player fantasy points (nflverse) 2018–2025.
- Build: (a) per-player weekly TS forecasts (modern: gradient-boosted TS or a small temporal model with opponent/situational features — not univariate ARIMA); (b) probabilistic availability (separate injury/scratch model); (c) ILP/ MILP lineup optimizer under DraftKings/FanDuel salary + positional constraints maximizing expected points with ownership-aware diversification for GPPs; (d) rolling-origin backtest.
- Effort: ~2 weeks (optimizer exists in 1091's lineage; the TS forecast stage is the new build).

## 12. Reproducible test
Dataset: 2022–2024 NFL DFS slates with actual salaries and outcomes. Metric: realized lineup points vs the salary-constrained optimum in hindsight; ROI in simulated contests. Baseline: optimizer fed with naive forecasts (trailing-4-week average). Window: train ≤2021, rolling test 2022–2024.

## 13. Acceptance / rejection gate
ADOPT the TS-forecast stage only if lineups built on TS forecasts beat lineups built on trailing-average forecasts by ≥5% realized points on 2022–2024 rolling slates. Reject if the gain is within noise (then keep the simpler baseline and spend the effort on the optimizer/diversification).

## 14. Improvement experiment
Replace point forecasts with full predictive distributions per player and optimize expected points under a risk/diversification penalty (maximize E[points] − λ·correlation with field ownership) — this fixes the paper's deterministic-LP flaw and directly targets GPP payout structures from ledger 1090.
