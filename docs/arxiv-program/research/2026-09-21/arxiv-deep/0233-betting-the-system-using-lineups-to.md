# [0233] Betting the system: Using lineups to predict football scores (arXiv:2210.06327v3)

**Citation:** Peters, G. & Pacheco, D. (2023). *Betting the system: Using lineups to predict football scores*. arXiv:2210.06327v3. URL: https://arxiv.org/abs/2210.06327
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 884 lines).
**Verdict:** ADAPT — adopt the evaluation protocol (fitness + standings/table reconstruction + top-4/relegation + £1 flat betting sim) as GSE's model scorecard template, and the finding that aggregates beat lineups as a prior against over-granular features; the soccer models themselves don't transfer.

## 1. Research question
Do individual player lineups (vs. team-level aggregates) improve machine-learning prediction of football (soccer) final scores, which features matter most (hypothesis: attacker stats; finding: goalkeeper stats), and can the resulting models beat bookmaker odds in a simulated betting system?

## 2. Dataset / schema
- 680 English Premier League matches, seasons 2020–2022, sorted chronologically; last 100 matches = test set.
- Fixtures from fixturedownload.com; individual player statistics scraped from FBRef.com (full stat list at github.com/georgejpeters/Feature-list-and-legend — position-specific: e.g., goals against/saves for goalkeepers; long passes/assists for outfield).
- Feature sets: Players (encoded player names: 1 home / −1 away / 0 neither); Lineup Stats (52 features: per-position-group season-to-date averages for the starting XI — 13 defender, 14 midfielder, 13 attacker stats + 12 opponent stats [5 GK + 7 defender]); Team Stats (same 52 features but squad-averaged, ignoring lineups).
- Odds from oddsportal.com for the betting simulation. No code link stated in text.

## 3. Method / model
- Two independent regression models per match: home goals scored, away goals scored; combined into scoreline.
- Six approaches: 3 heuristics (Home Win = always 1:0; Tradition = 1:0 to higher-table team; Recency = repeat each team's last scoreline) + 3 feature sets (Players, Lineup Stats, Team Stats) × 5 ML techniques (Linear Regression, KNN, Decision Tree Regression, Random Forest Regression, Support Vector Regression) = 18 models.
- Evaluation framework: (i) fitness: MAE, RMSE, R²; (ii) real-world: Kendall τ rank correlation of reconstructed standings, top-4 accuracy, relegation (bottom-3) accuracy; (iii) betting sim: £1 bet per predicted exact scoreline per test match, winnings = stake × odds, starting pot £0.
- Feature importance via chi-squared test on lineup-stats features.

## 4. Equations & assumptions
No equations stated — the paper is empirical/descriptive; no mathematical model is formalized. (Scoring rule for standings: 3 pts win / 1 draw / 0 loss; Kendall τ cited without formula.)
Stated assumptions: home/away goals modeled independently; features are season-to-date averages "up to that point in the season" (in-sample expanding window); Players encoding assumes a player's "social capital" effect is linear in presence/absence; betting sim assumes odds available at prediction time and unlimited £1 exact-score bets at posted odds.

## 5. Features / target
- Features: as §2 — 52 aggregated stats (position-group means) or player-identity indicators.
- Target: home goals and away goals (non-negative integers; regression output rounded).
- Horizon: next match (one-step-ahead).

## 6. Validation design
- Chronological split: train on first 580 matches, test on last 100 (time-ordered — good).
- Metrics: MAE/RMSE/R² per home/away model; Kendall τ on full-table reconstruction; top-4 and relegation accuracy; cumulative £ profit over 100 £1 bets.
- No cross-validation; no hyperparameter details stated; no odds-baseline (e.g., implied-probability) comparison beyond heuristics.

## 7. Numerical results / baselines
Home goals (Table 1): best = Lineup Stats SVR (MAE 0.89, RMSE 1.16, R² 0.17); Team Stats KNN best MAE 0.86. Heuristics: Home Win MAE 1.12/RMSE 1.42/R² −0.23; Tradition 1.0/1.46/−0.30; Recency 1.41/1.83/−1.06. Players LR degenerate (MAE ≪1 reported as "<<1", R² −1.97 — encoding failure).
Away goals (Table 2): best = Team Stats SVR (MAE 0.87, RMSE 1.14, R² 0.20); Lineup Stats SVR (0.90/1.17/0.16).
Feature importance (chi², Table 3): goalkeeper stats rank #1 and #2 for both models — away keeper clean sheets 420.0, away keeper goals against 80.5 (home model); home keeper clean sheets 405.0, home keeper goals against 96.5 (away model). Attacker goals conspicuously absent; goal-creating actions (attackers/midfielders) rank 3–5.
Standings: Kendall τ — Players 0.232 (best), Team Stats 0.053, Lineup Stats −0.021. Top-4: all ML models 50%. Relegation: Lineup Stats 100%, Team Stats 100%, Players 67% — "predicted correctly all relegated teams after forecast 100 consecutive matches."
Betting (Table 6, £ profit over 100 £1 bets): Team Stats KNN +£42.5 (42% ROI, best); Lineup Stats DTR +£18.9; Team Stats DTR +£18.8; Lineup Stats KNN +£14.6; Home Win −£7.0; best-fitness model (Lineup Stats SVR) lost −£30.9. Players models all deeply negative (−£37 to −£90).
Interpretation note: fitness-best ≠ betting-best — the paper's own headline tension; no significance tests on the betting profits (100 bets, exact-score market, high variance).

## 8. Code / data availability
Feature list: github.com/georgejpeters/Feature-list-and-legend. No model code link stated. Data sources: fixturedownload.com, FBRef.com (scraped), oddsportal.com.

## 9. Leakage & limitations
- "Season-to-date averages up to that point" — if computed over the full season rather than strictly pre-match, that's lookahead; the paper doesn't specify the aggregation cutoff precisely. Adversarial read: FBRef season aggregates scraped once would leak full-season info.
- 100-match test set with exact-score betting: £42.5 profit on 100 £1 exact-score bets is a handful of hits — enormous variance, no confidence interval, no multiple-comparison correction across 18 models (the winning KNN could easily be the luckiest of 18).
- No de-vigged odds baseline: beating "odds" on exact scores without comparing to implied probabilities or CLV is weak evidence of edge.
- Players LR degenerate (R² −1.97/−2.35) suggests an implementation bug in the identity-encoding, not a real finding.
- Contradiction: Players encoding best on Kendall τ (0.232) but worst on betting — unresolved.
- External validity to NFL: soccer low-scoring dynamics don't map to NFL; but the *structural* findings (aggregates ≥ lineups; defensive stats dominate) are the transferable part. Sample is small (680 matches, 100 test).

## 10. GSE overlap
Per existing-research-map.md: soccer modeling is well covered (Fischer/Heuer Poisson-vs-ML 2408.08331, Dixon-Coles, Skellam, in-game soccer WP 1906.05029, xG player/position-adjusted 2301.13052). The paper's headline empirical claims — lineups don't beat aggregates; goalkeeper/defensive stats dominate — partially overlap GSE's existing unit-matchup and EPA work (gse-lab unit matchups, EPA distributions) but the *evaluation scorecard* (fitness + table reconstruction + tier accuracy + flat-stake betting sim) is not a formalized GSE protocol. This is an **extension**: a reusable multi-criteria model scorecard plus a "granularity doesn't help" prior for feature engineering.

## 11. GSE implementation spec
- Adopt the 4-part scorecard as GSE's standard model-evaluation template: (1) fitness (MAE/RMSE/R² or log-loss/Brier on probabilities); (2) standings/table reconstruction rank correlation (NFL: predicted vs actual season win totals / playoff seeding); (3) tier accuracy (NFL analogs: playoff teams, division winners — replaces top-4/relegation); (4) flat-stake betting sim at fixed odds ($1 per pick at recorded closing odds, track ROI and CLV alongside).
- Adopt the granularity prior: before investing in player-level/lineup-scratch features for a new NFL model, require a Team-Stats-vs-Lineup-Stats bake-off; default to aggregates unless lineups win significantly (paper: they didn't).
- Adopt the feature-importance lesson directionally: test whether defensive-unit aggregates (pressure rate, defensive EPA) dominate GSE's score/total models the way keeper stats dominated here — run chi²/SHAP importance on the totals model.
- Effort: 1 engineer-week (scorecard harness over existing backtest outputs; no new model).

## 12. Reproducible test
Dataset: nflverse 2021–2024; build two total-points models: (A) team-aggregate features only (offensive/defensive EPA, success rates), (B) A + lineup-level features (individual player EPA aggregates for starters). Metric: the 4-part scorecard on 2024 holdout — MAE/RMSE on totals, rank correlation of predicted vs actual team wins, playoff-team accuracy, and $1 flat-stake ROI at closing totals. Baseline: the paper's structural claim = B does not beat A.

## 13. Acceptance / rejection gate
Adopt the scorecard as GSE's standard if it surfaces at least one model-ranking disagreement between fitness metrics and the betting/tier components on GSE's own backtests (replicating the paper's SVR-vs-KNN tension) — i.e., it must add information beyond MAE/RMSE. Adopt the granularity prior if lineup-level features fail to beat aggregates by >2% MAE on 2024 totals. Reject the scorecard if all four components rank models identically (no added value); reject the granularity claim for NFL if lineup features do help (the paper's soccer result need not hold for football).

## 14. Improvement experiment
Beyond the paper: (a) replace the £1 flat-stake sim with Kelly-sized stakes from the model's own calibrated probabilities — the paper bets flat £1 regardless of confidence, leaving the sizing question (GSE's gap #1) untouched; combine the scorecard with fractional-Kelly and compare; (b) run the granularity bake-off *by position group*: the paper aggregates all positions together, but NFL inactives at QB vs WR have asymmetric value — test whether a "key-position-only" lineup model beats both full-lineup and pure-aggregate; (c) add CLV as a fifth scorecard component, since beating the market at close is the actual objective the paper's oddsportal sim only proxies.
