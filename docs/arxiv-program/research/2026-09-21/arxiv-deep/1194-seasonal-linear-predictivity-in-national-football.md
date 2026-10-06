# [1194] Seasonal Linear Predictivity in National Football Championships (arXiv:1511.06262v1)

**Citation:** Giuseppe Jurman (2015). *Seasonal Linear Predictivity in National Football Championships*. arXiv:1511.06262v1. URL: https://arxiv.org/abs/1511.06262v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 689-line extraction; all sections read).
**Verdict:** REJECT

A study showing that linear extrapolation of a soccer team's cumulative points predicts its final season points only marginally better than a random null (4.652 vs 4.993 mean absolute error), with no match-level forecasting, no calibration, and no market test; it offers GSE no usable prediction or methodology. To be replaced by a new full-paper read (ledger 1353, not yet selected/read at the time of this ledger).

## 1. Research question
Do the results of a football team over a long national-league season follow a linear trend predictable enough to be useful — i.e., can simple linear regression of cumulative points on rounds played, fit on the first n−ts rounds, accurately extrapolate a team's final points total?

## 2. Dataset / schema
- **7,768 team-season series**, **707 teams**, **425 championships**, **22 divisions**, **11 countries**, seasons 1993/94–2013/14.
- Schema: per team-season, cumulative points by round; final points total. No match-level features, no odds, no team-strength covariates. Source described as a football results database (no URL in extracted text); effectively unreplicable as stated.

## 3. Method / model
For each team-season, ordinary linear regression of cumulative points on round number is fit using the first n−ts rounds (ts = 1…20 held-out rounds) and extrapolated to predict the final points total. Compared against quadratic and cubic regression on the same task, and against a null of random sequences with matched marginals. Evaluation metric: mean absolute error of the final-points prediction; also final-table normalized displacement at ts=10. No hyperparameters beyond polynomial degree.

## 4. Equations & assumptions
- Linear model: cumulative_points(r) = α + β·r, fit on rounds 1…(n−ts), evaluated at round n. (Quadratic/cubic add β₂r², β₃r³ terms.)
- Assumptions: points accumulate approximately linearly (constant points-per-round rate); the held-out tail of the season continues the early trend; team-seasons are independent observations; no structural breaks (manager changes, transfers, motivation effects) modeled.

## 5. Features / target
Features: round number only. Target: final season points total (and implied final-table position). Prediction horizon: 1–20 rounds ahead within the same season.

## 6. Validation design
All 7,768 team-seasons pooled; for each, the last ts rounds are held out (ts = 1…20) and the model fit on earlier rounds predicts the final total — a within-season holdout, not a time-ordered cross-season backtest. Baselines: quadratic/cubic regression and a random-sequence null. Paired tests reported with p < 10⁻¹⁶ for linear vs higher-degree fits. No comparison against any real forecasting model (Elo, Dixon-Coles, market odds).

## 7. Numerical results / baselines
- Linear mean absolute error: **4.652**, 95% CI **(4.634, 4.672)**.
- Quadratic: **8.966 (8.913, 9.014)**; cubic: **27.760 (27.530, 28.011)** — higher-degree fits dramatically worse (overfit to early-season noise).
- Random-sequence null: **4.993 (4.666, 5.303)** — real sequences are only **slightly** more structured than random.
- At ts=10 (predicting final total with 10 rounds remaining): average error ≈ **4.4 points**; final-table normalized displacement **0.1874** ≈ **1.874 positions** in a 20-team league.
- One anecdote: EPL 2012/13, the linear model correctly identified QPR, Reading, and Wigan as relegated for all ts = 1…20 — a single-season illustration, not a backtest.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- **The effect is tiny**: 4.652 vs 4.993 MAE against the random null — the "predictivity" headline rests on a ~0.34-point edge with massive N (7,768), i.e., statistical significance without practical significance.
- **Wrong granularity for GSE**: it extrapolates season point totals, not match outcomes, spreads, totals, or player props — nothing GSE prices or bets.
- No calibration, no market/odds comparison, no proper scoring rule; no comparison with any serious forecasting baseline (even a naive "current points-per-game × remaining games" is not tested as a comparator, though linear regression through the origin would approximate it).
- Within-season holdout only; no demonstration that the fitted trend generalizes across seasons or leagues in a decision-relevant way. Soccer-only.

## 10. GSE overlap
GSE's rating/forecasting work (Elo, Dixon-Coles, state-space team strength per the map) operates at match level with market-relative evaluation. A season-standings extrapolation with a ~0.34-point edge over random adds no feature, model, or validation protocol. The one transferable caution — higher-degree polynomial fits overfit early-season noise (quadratic 8.97, cubic 27.76 MAE) — is elementary and already standard practice.

## 11. GSE implementation spec
Not applicable — rejection is at the problem level. Nothing in the paper maps to a GSE build (no match-level output, no probabilistic forecast, no market interface).

## 12. Reproducible test
Not applicable. A sanity reproduction would re-run round-on-cumulative-points regression on any multi-season league table dataset and recover linear MAE ≈ 4.6–5.0 with quadratic/cubic substantially worse — reproducing a descriptive regularity, not a forecast with decision value.

## 13. Acceptance / rejection gate
Reject: the demonstrated edge over a random null is negligible (0.34 points MAE), there is no match-level prediction, no calibration, and no market test. No gate satisfiable — the paper produces no probability forecast to evaluate.

## 14. Improvement experiment
None proposed — the problem (season-total extrapolation) has no GSE application. A useful version would predict match outcomes or season-long derivatives prices against market odds; the author does not attempt this.

**Verdict:** REJECT
