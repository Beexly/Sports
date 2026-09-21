# [0765] Simulation-Augmented Multi-Step Split Conformal Prediction for Aggregated Forecasts (arXiv:2606.16356v1)

**Citation:** Andro Sabashvili (2026). *Simulation-Augmented Multi-Step Split Conformal Prediction for Aggregated Forecasts*. arXiv:2606.16356v1. URL: https://arxiv.org/abs/2606.16356
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache `/tmp/arxiv750-cache/fulltext/2606.16356.txt`; complete paper incl. tables and references, verified end-to-end).
**Verdict:** ADAPT — the block-bootstrap-over-CV-residuals recipe for building intervals on *aggregated* targets (season totals, remaining-season wins, YoY growth) fills a gap in GSE's existing CQR/pointwise-interval stack; the paper gives an explicit algorithm (Alg. 1) to port to weekly game projections.

## 1. Research question
How to quantify uncertainty for aggregated forecasting targets (annual totals, year-over-year growth rates) when aggregation induces dependence and nonlinear transformations, making it invalid to combine pointwise intervals? The paper proposes SA-MSCP: expanding-window cross-validation to collect residuals across forecast origins, block bootstrap over residual sequences to simulate future paths preserving local dependence, then empirical-quantile intervals on aggregated trajectories.

## 2. Dataset / schema
- **M4 monthly competition data** (monthly sales series; standard M4 set) — evaluated on monthly raw forecasts (Raw Sales), aggregated annual totals (Aggregated Sales), and year-over-year growth rates (Y-o-Y Sales Growth).
- **Proprietary dataset of 2,000 real monthly sales series** (not public; 12-month forecast horizon). Aggregation to annual totals yields a single forecast year; growth rates divide simulated annual sums by the same observed prior-year sum (monotone transform — aggregated and growth coverage values are identical on this dataset).
- Base forecaster: Auto-ARIMA via the R fable package (v0.4.0); future paths via a modified generate() with block-bootstrap innovations.

## 3. Method / model
- Expanding-window CV: initial calibration window of 10 observations; window grows by 1, next h points validate. Collect residuals ε̂_{k,h}=y_{k+h}−ŷ_{k+h} across origins k and horizons h.
- Centre each horizon-wise residual column; extract all valid consecutive blocks of length b (b=12 for M4 with 36-month horizon; b=3 for proprietary 12-month horizon).
- Simulate S=10,000 future paths per series: sample blocks with replacement, stitch to length H, add to point-forecast path.
- Aggregate each path: annual totals Ŷ_s=Σ_{m=1}^{12} ŷ_{s,m}; growth rates Ĝ_s=(Ŷ_{s,year}−Ŷ_{s,year−1})/Ŷ_{s,year−1}, with Ŷ_{s,year−1} initialised from last known annual value in training.
- Intervals = empirical quantiles across the S paths at 90/95/99% (reported as 10%/5%/1% miscoverage columns).
- Baseline: simulated-path approach (conditional simulation without CV-residual calibration, ref [4]). A direct split-conformal baseline on aggregated nonconformity scores is judged "less suitable" (too few aggregated calibration points per series).

## 4. Equations & assumptions
Algorithm 1 (verbatim steps): (0) inputs: training series y_{1:T}, test start T+1, expanding-window CV params, S, H, b, quantile levels Q. (1) Preprocess. (2) Fit algorithm to y_{1:T}. (3) Expanding-window CV residuals {ε̂_{k,h}}. (4) Centre horizon-wise residual columns; extract consecutive blocks of length b. (5–9) For s=1..S: sample blocks with replacement to length H, truncate, add to forecast path → ŷ_{s,T+1:T+H}; aggregate annual totals Ŷ_{s,year}=Σ_m ŷ_{s,(year,m)}; growth Ĝ_{s,year}=(Ŷ_{s,year}−Ŷ_{s,year−1})/Ŷ_{s,year−1}. (10–12) Empirical quantiles per target and q∈Q. (13) Return intervals + coverage/width summaries. No equations beyond these; the paper is algorithmic.
Assumptions: residual blocks are approximately exchangeable within horizon columns after centring (the author admits residuals "are not strictly exchangeable" and nominal levels are targets, not guarantees); block bootstrap preserves local cross-horizon dependence; CV residuals from expanding windows approximate the future residual distribution (stationarity assumption); S=10,000 paths is sufficient for tail quantiles (not justified).

## 5. Features / target
Features: the series' own history (univariate monthly sales). No exogenous features. Targets: (a) pointwise monthly values; (b) aggregated annual totals (sum of 12); (c) YoY growth rates (nonlinear transform of annual totals). Prediction horizon: 36 months (M4), 12 months (proprietary).

## 6. Validation design
Empirical coverage + interval width at nominal 90/95/99% across series and targets, vs simulated-path baseline. Statistical significance: Wilcoxon signed-rank tests on per-series coverage/width (p≪0.001 reported). "Coverage cost" = relative width increase per coverage gain. No train/test re-split of the method itself; it is an inference procedure applied to fixed forecasters. Both M4 and proprietary data serve as cross-dataset validation.

## 7. Numerical results / baselines
M4 coverage (Table 1; SA-MSCP vs Baseline at 10%/5%/1% miscoverage):
- Raw Sales: 88.8/91.4/93.9 vs 75.2/80.8/87.0
- Aggregated Sales: 83.1/85.8/88.9 vs 65.6/70.9/78.4
- Y-o-Y Growth: 89.9/92.0/94.4 vs 75.2/80.5/87.4
M4 widths (Table 2), e.g. Aggregated Sales: 5.5e4/6.4e4/7.5e4 vs 1.9e4/2.2e4/2.9e4.
Coverage deltas (Table 3): +6.9 to +17.5 pp (e.g., Aggregated 10%: +17.5pp, cost 10.8; Growth 1%: +7.1pp, cost 113.1 — the 99% growth interval is extremely expensive).
Proprietary (Table 4): Raw 92.7/94.5/96.1 vs 82.8/87.2/91.7; Aggregated 89.3/91.1/94.2 vs 75.3/80.4/86.8; Growth identical to Aggregated (monotone transform, 12-month horizon). Deltas +4.4 to +14.0pp (Table 6).
Key honesty: "both methods miss the target coverage level" — achieved coverage stays below nominal throughout; the author frames nominal levels as targets, not guarantees, and suggests post-hoc recalibration or online adaptation (conformal PID) as follow-ups.
Wilcoxon p≪0.001 for coverage and width across aggregated and growth targets at all levels.

## 8. Code / data availability
No paper code URL stated ("None stated"). Uses R fable package Auto-ARIMA (v0.4.0, O'Hara-Wild et al. 2024). M4 data public; proprietary 2,000-series dataset not public.

## 9. Leakage & limitations
Expanding-window CV is temporally honest (only past data used at each origin). Adversarial notes: (i) no finite-sample coverage guarantee — the author is explicit, but it means this is a heuristic dressed in conformal language; (ii) block size b is hand-tuned (12 vs 3) with a post-hoc justification; (iii) proprietary dataset unreplicable and its growth-rate coverage is a deterministic copy of aggregated coverage (Table 4 rows identical — the "growth" result adds nothing on that dataset); (iv) coverage cost explodes at 99% (113.1 for growth on M4) — the method buys coverage with very wide intervals; (v) S=10,000 paths per series is computationally heavy; (vi) no comparison against weighted/online conformal time-series methods (SPCI, conformal PID) that the author cites but doesn't benchmark; (vii) the baseline ([4]) is weak — conditional simulation without any residual calibration.

## 10. GSE overlap
Extension. Research map calibration stack covers CQR (conformalized quantile regression) and the conformal-prediction Drive audits, but those target pointwise quantiles. What is new: an explicit, implementable procedure for intervals on **aggregated** targets — exactly GSE's season-long markets (win totals, season points, remaining-schedule aggregates) where naive interval combination is invalid. The map has no block-bootstrap path-simulation method.

## 11. GSE implementation spec
- **Target use**: GSE season-total markets (team win totals, player season yards/TDs) and multi-week aggregate projections. Treat weekly game-level point forecasts as the "monthly" series; the season aggregate (sum of weekly win probabilities / projected points) as the "annual total."
- **Method**: (1) expanding-window backtest of the game-level model over 2020–2024, collecting per-horizon residuals (h = weeks ahead); (2) centre horizon-wise residual columns; (3) block bootstrap (b=4 weeks ≈ one month of games) to simulate S=10,000 remaining-season paths; (4) aggregate per path → empirical 90/95% intervals on season win totals and points.
- **Integration**: feeds the existing CQR work as a complementary interval source; compare interval width/coverage head-to-head.
- Effort: ~2–3 days (backtest residual collection + bootstrap simulator + aggregation layer).

## 12. Reproducible test
Dataset: GSE team-strength weekly win-probability model, 2021–2024 NFL seasons. Build expanding-window residuals (origin = each week, horizons 1–17), block-bootstrap b=4 remaining-season paths for 2023–2024, and compute 90% intervals on final season win totals. Metric: empirical coverage of realised win totals + mean interval width. Baseline: naive binomial-sum intervals from pointwise probabilities.

## 13. Acceptance / rejection gate
ADOPT SA-MSCP for season-total intervals if, on the 2023–2024 holdout, empirical coverage of realised win totals is ≥80% at nominal 90% AND mean interval width is no more than 1.5× the naive baseline width. Otherwise REJECT — keep CQR-only intervals.

## 14. Improvement experiment
Combine SA-MSCP paths with the conformal PID online adaptation (Angelopoulos et al. 2023, cited but not benchmarked): adapt the quantile levels online as the season progresses using realised weekly errors, targeting long-run coverage of the season-total interval. Test whether adaptive quantiles close the nominal-vs-achieved coverage gap the paper leaves open.
