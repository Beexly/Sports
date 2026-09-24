# [0651] OpenFPL: An Open-Source Forecasting Method Rivaling State-of-the-Art Fantasy Premier League Services (arXiv:2508.09992)

**Citation:** Daniel Groos (2025). *OpenFPL: An Open-Source Forecasting Method Rivaling State-of-the-Art Fantasy Premier League Services*. arXiv:2508.09992v1. URL: https://arxiv.org/abs/2508.09992
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2508.09992.txt`). **Note:** "football" here is SOCCER (Fantasy Premier League).
**Verdict:** ADAPT — the methodology (position-specific ensembles, multi-horizon features, entropy-weighted training toward high-return players, prospective multi-horizon evaluation) ports directly to NFL DFS/fantasy projections. The key transferable insight: weighting training toward high-ceiling players beats commercial services exactly where rank gains come from.

## 1. Research question
Can an open-source, public-data-only method rival leading commercial (subscription, proprietary-data) Fantasy Premier League forecasting services? Built as position-specific XGBoost/Random Forest ensembles on FPL + Understat data, evaluated prospectively.

## 2. Dataset / schema
- Development: FPL + Understat APIs, 4 seasons 2020-21–2023-24; 5-fold CV split by TEAMS (26 PL teams allocated to folds C1–C5, 16 team-seasons each, balanced upper/lower table).
- Evaluation: PROSPECTIVE — 2024-25 gameweeks 32–38, predictions generated day-before-deadline from live APIs; benchmark = FPL Review Massive Data Model (paid); baseline = last-5-match mean.
- Features: player (Xp), team (Xt), opponent (Xo) features averaged over 1/3/5/10/38-match horizons + current status (Xs: FPL availability %, league ranks). 196 features (GK), 206 (DEF/MID/FWD), 122 (assistant managers). Target: normalized FPL points next match.

## 3. Method / model
- Per position (GK/DEF/MID/FWD/AM): K-Best Search (K=10, extended with automatic threshold from first-K RMSE) over RF (n_estimators {200,400,800}, max_depth {10,20,None}, etc.) and XGBoost (n_estimators {300,600,1200}, max_depth {3,5,7}, lr {0.01,0.05,0.1}, etc.) hyperparameters; optimized for RMSE.
- Sample weighting: position-specific entropy-based discretization of target (2/3/4/3/5 bins for GK/DEF/MID/FWD/AM) + balanced class weights, clipped at 95th percentile → up-weights high-return players.
- Ensemble: median of top-50 models per position (10 per fold × 5 folds).
- Code: https://github.com/daniegr/OpenFPL (MIT).

## 4. Equations & assumptions
- No novel equations; standard RF/XGBoost + MinMax scaling + KBinsDiscretizer weighting.
- Return categories: Zeros (DNP), Blanks (≤2 pts), Tickers (3–4), Haulers (≥5).
- Assumptions: public availability tags substitute for proprietary expected-minutes; team-split CV prevents within-team leakage; 2020-21 Understat gaps filled by 1-NN from other seasons.

## 5. Features / target
- Target: player FPL points next match (normalized), at 1/2/3-gameweek horizons.
- Inputs: 196–206 features across horizons and player/team/opponent/status groups.

## 6. Validation design
Prospective evaluation on unseen season (2024-25 GW 32–38); RMSE primary, MAE secondary; broken down by horizon × return category × position; vs commercial service and last-5 baseline concurrently.

## 7. Numerical results / baselines
- Both OpenFPL and FPL Review beat last-5 baseline by 5–34% RMSE across categories.
- OpenFPL WINS on high-return: Tickers and Haulers at all 3 horizons (e.g., 1-GW Haulers RMSE: OpenFPL 5.142 vs FPL Review 5.172 vs Last5 5.613; Tickers: 1.517 vs 1.594 vs 2.136).
- FPL Review wins on Zeros/Blanks (expected-minutes edge): e.g., 1-GW Zeros RMSE 0.689 vs OpenFPL 0.818.
- Position highlights: OpenFPL 19% better RMSE on FWD Blanks; FPL Review 26% better on AM Tickers.
- Horizon effect only for low-return categories (minutes info decays); no systematic horizon effect for high-return.

## 8. Code / data availability
Models + inference code: https://github.com/daniegr/OpenFPL (MIT license). Data: FPL API + Understat (public), FPL Historical Dataset (Vaastav Anand).

## 9. Leakage & limitations
- Soccer FPL scoring; NFL DFS scoring differs (no clean sheets; different bonus structure).
- Evaluation only GW 32–38 (7 gameweeks, end-of-season rotation effects).
- Loses on minutes prediction — in NFL, snap/route projections are the analogue and GSE must solve them separately (inactives, snap shares).
- 1-NN imputation for 2020-21 Understat gaps is crude.
- No calibration analysis; RMSE on points conflates minutes and per-minute efficiency.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has DFS/fantasy projection work and optimizer frameworks, but no position-specific ensemble study with entropy-weighted high-return training and prospective multi-horizon evaluation against a commercial benchmark. The "weight toward ceiling players" training trick and the prospective-evaluation protocol are new methodological contributions. Extension, not duplicate.

## 11. GSE implementation spec
- Data: nflverse 2019–2024 weekly fantasy points (DraftKings/FanDuel scoring), snap/route/target/carry data, injury designations, vegas lines.
- Port the recipe: (a) position-specific ensembles (QB/RB/WR/TE/DST) of XGBoost + RF, features over 1/3/5/10/17-game horizons (player/team/opponent) + status (injury designation, practice participation); (b) entropy-binning sample weighting toward high-ceiling outcomes (the paper's key trick — GSE's DFS value lives in ceiling, not median); (c) team-split CV (avoid same-game leakage); (d) PROSPECTIVE evaluation: freeze models, predict each week of 2024 from data available pre-lock, vs GSE's current projections and a last-5 baseline.
- Solve the minutes analogue: separate snap-share/route-share model (the paper's acknowledged weakness) — in NFL this is inactives + depth-chart driven; add a dedicated availability sub-model.
- Use case: weekly DFS projection feed + ceiling projections for GPP optimizer; the paper's Tickers/Haulers finding says this recipe wins exactly on the players that decide tournaments.
- Effort: medium — sklearn/xgboost pipeline; main cost is feature engineering over horizons.

## 12. Reproducible test
Dataset: 2019–2023 NFL (train/CV), 2024 season prospective weekly predictions. Test 1 (method check): position-specific weighted ensembles vs GSE's current projection baseline and last-5 baseline on 2024; gate = beats last-5 by ≥10% RMSE overall AND beats GSE baseline on high-ceiling games (top-quintile actual scores) by ≥5% RMSE. Test 2 (weighting ablation): same pipeline without entropy sample weighting; gate = weighted version wins on top-quintile outcomes by ≥3% RMSE — confirming the paper's core trick transfers.

## 13. Acceptance / rejection gate
ADAPT if Test 1 passes (beats baselines overall and on ceiling games) — the recipe earns a slot in GSE's projection stack. REJECT if it can't beat GSE's existing projections on 2024 holdout (the corpus may already capture this) or if the weighting trick doesn't transfer (Test 2 fails). Judge on RMSE by return-quintile, not just overall — the paper's whole point is WHERE the accuracy comes from.

## 14. Improvement experiment
Indirect vs direct forecasting: the paper forecasts fantasy points DIRECTLY, noting commercial services forecast constituent events (goals/assists) then convert. Test the indirect route for NFL: forecast constituent stats (targets, receptions, yards, TDs) with separate ensembles, then apply DFS scoring — vs direct points forecasting. The hypothesis: indirect wins on ceiling games (TDs are the skewed component) while direct wins on median; a hybrid (direct median + indirect ceiling) could dominate both.
