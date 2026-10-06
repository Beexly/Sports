# [0312] Data Science Approach to predict the winning Fantasy Cricket Team Dream 11 Fantasy Sports (arXiv:2209.06999v1)

**Citation:** Sachin Kumar S, Prithvi H V, C. Nandini (2022). *Data Science Approach to predict the winning Fantasy Cricket Team Dream 11 Fantasy Sports*. arXiv:2209.06999v1. URL: https://arxiv.org/abs/2209.06999v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 665 lines).
**Verdict:** REJECT — the headline R² ≈ 0.99 claims rest on target-derived features (severe leakage), the sampling descriptions are internally contradictory, and there is no contest backtest, ownership model, or payout analysis; nothing here transfers to NFL DFS.

## 1. Research question
The paper asks whether machine-learning regressors trained on historical cricket statistics can predict player-level Dream11 fantasy points and, combined with a budget-constrained team-selection optimizer, produce winning fantasy cricket teams. The applied goal is Dream11 contest team construction for ODI/IPL/T20 cricket.

## 2. Dataset / schema
Cricsheet ball-by-ball data: 3,100 matches total — 1,529 ODI, 756 IPL, 815 T20 — in YAML format, transformed with the YorkPy package into per-player aggregates. Derived tables: batsman-level rows (runs, balls, 4s, 6s, 50s, 100s, ducks, strike rate, rival, venue) and bowler-level rows (overs, runs conceded, maidens, wickets, economy, rival, venue). Time range of the matches is not precisely stated (Cricsheet historical coverage). Access: public via https://cricsheet.org/ and the YorkPy package (https://pypi.org/project/yorkpy/). Replicable in principle — the leakage (Section 9) is the problem, not data access.

## 3. Method / model
Pipeline: (a) Cricsheet YAML → YorkPy transformations → batsman/bowler feature tables; (b) PyCaret comparison of 22 regressors, selecting Extra Trees Regressor as best; (c) final regressors predict each player's Dream11 score for an upcoming match; (d) team selection: optimize an 11-player roster under Dream11 constraints — 100-credit salary cap and maximum 7 players from one team — combining greedy selection with knapsack logic to maximize predicted total points. The paper argues regressors (not classifiers, contra its cited base paper) are the right formulation for predicting player performance in a prospective game.

## 4. Equations & assumptions
No equations stated (no formal equations in the paper; the optimizer is described qualitatively). Assumptions: (a) historical per-player aggregates (including rival- and venue-specific splits) predict next-match fantasy points; (b) predicted points are additive across the 11 roster slots (no correlation/ownership/game-script effects); (c) the 100-credit cap and 7-per-team cap fully capture contest constraints (no lineup-duplication or ownership considerations); (d) PyCaret's model comparison ranking generalizes to unseen matches.

## 5. Features / target
Batsman features: runs, balls faced, 4s, 6s, 50s, 100s, ducks, strike rate, rival (opponent), venue. Bowler features: overs, runs conceded, maidens, wickets, economy rate, rival, venue. Target: player-level Dream11 fantasy score for a match. The paper's features include aggregates computed over data that contains the target match itself (target-derived/current-game statistics — see Section 9). Prediction horizon: one upcoming match.

## 6. Validation design
Contradictory and not time-ordered. The paper gives multiple incompatible sampling descriptions: one section states the model was built on 0.07% of data and tested on 0.93%; a later section states PyCaret used 10%, then that the final model was trained on 50% and tested on the unseen 50%. No dates for splits, no temporal ordering, no walk-forward or out-of-season backtest. Baselines: the 22-regressor PyCaret comparison (internal) and the base paper's classifier approach (argued against, not empirically beaten on a shared test set). Metric: R². No real contest backtest, no payout/ROI measurement, no ownership or lineup-duplication analysis.

## 7. Numerical results / baselines
Paper's claims: with the Extra Trees Regressor on 100% of the dataset at a 7:3 train-test split, R² = 0.99 for batsman Dream11-score prediction and R² = 0.97 for bowler prediction. These are the paper's numbers (Section: results/conclusions). My interpretation: R² ≈ 0.99 on a sports prediction task is a leakage signature, not a modeling achievement — the features contain target-derived statistics (Section 9). No confidence intervals, no per-season breakdowns, no contest-level results are reported.

## 8. Code / data availability
Data: public (Cricsheet, YorkPy). Code: no repository stated; the paper references PyCaret (https://pycaret.org/, version 1.0.0 per the references) and YorkPy but provides no implementation of its own pipeline. Effectively not reproducible as a pipeline despite public data.

## 9. Leakage & limitations
(a) Severe target leakage: features include current-game/target-derived aggregates (e.g., a player's stats computed over a window containing the match being predicted), which mechanically explains R² ≈ 0.99/0.97. The paper does not disclose the aggregation windows, so the leakage cannot be bounded. (b) Internally contradictory sampling: 0.07%/0.93% vs. 10% vs. 50%/50% descriptions cannot all be true; the evaluation actually run is unverifiable. (c) No temporal split: random/holdout splits on sports time series overstate performance. (d) No contest validity: predicted points are optimized additively with no ownership, stacking correlation, or payout-structure modeling — the "winning team" claim is never tested in or against real contests. (e) External validity to NFL DFS: none — cricket scoring, roster construction, and contest dynamics do not transfer; and GSE's DFS practice already covers budgeted roster optimization properly (Section 10). (f) The regression-vs-classification argument is asserted, not demonstrated on a shared benchmark.

## 10. GSE overlap
GSE's DFS corpus already covers budgeted roster optimization with real contest mechanics: `docs/research/2026-09-13-dfs/` (Week 1: stacks, ownership, winning-lineup construction, salary/tiers verification) and `docs/research/2026-09-19-dk-week2/` (Week 2: consensus by position, coverage matchups, optimizer pool JSON). Those include ownership and stacking — the elements this paper omits. The existing-research map's gap list explicitly notes "DFS-specific optimization literature" as thin on the academic side, but this paper does not fill it (no contest theory, no equilibrium, no ownership game). Classification: wrong-domain duplicate of an already-better-covered practice area — the budgeted-selection problem is a duplicate of GSE's DFS work, and the prediction claims are not credible evidence.

## 11. GSE implementation spec
No build warranted. The only salvageable component is the problem framing the paper gets right: fantasy-team selection as knapsack/greedy optimization under salary-cap and per-team-count constraints — which GSE already implements in its NFL DFS optimizer work. If GSE ever wanted a cricket module (it does not — NFL/NCAA first per Garrett's content focus), the correct spec would be: leakage-free player projections (features strictly from matches before the target match), ownership projection, correlation-aware (stacking) optimization, and contest backtesting with real payout structures. Estimated effort: not scheduled; 3–4 weeks if a cricket lane were ever commissioned.

## 12. Reproducible test
A leakage-free replication test (not recommended as a priority): rebuild the Cricsheet/YorkPy pipeline with features aggregated strictly from matches before each target match; train Extra Trees on pre-2022 seasons; test on 2022+ matches; metric = R² and, more importantly, simulated-contest ROI vs. a baseline of picking by average points. Expect the R² ≈ 0.99 to collapse once target-derived features are removed — that collapse is itself the informative result.

## 13. Acceptance / rejection gate
Gate: adopt any element only if a leakage-free rebuild (strict temporal cutoff, no target-derived features) achieves out-of-sample R² > 0.30 on player fantasy points AND a simulated-contest backtest shows positive ROI vs. average-points baselines. The paper as written fails the first condition by construction (its R² depends on leakage); rejected.

## 14. Improvement experiment
Beyond the paper: replace additive point-maximization with ownership-aware portfolio optimization — maximize expected payout under a contest payout structure using projected ownership and game-script correlation (e.g., QB–pass-catcher stacking generalized to cricket batting-order partnerships), then backtest across a full season of real contests. Rationale: the paper optimizes the wrong objective (mean projected points); real DFS profit comes from exploiting ownership inefficiency and correlation, which is where GSE's existing NFL work already operates.
