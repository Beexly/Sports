# [0676] Predicting Football Match Outcomes with eXplainable Machine Learning and the Kelly Index (arXiv:2211.15734)

**Citation:** Yiming Ren, Teo Susnjak (2022). *Predicting Football Match Outcomes with eXplainable Machine Learning and the Kelly Index*. arXiv:2211.15734. URL: https://arxiv.org/abs/2211.15734
**Ledger completed:** 2026-09-21. **Read:** full text (local cache /tmp/arxiv750-cache/fulltext/2211.15734.txt, sections 1–5 incl. tables 4–10, SHAP analysis, betting experiment, conclusion, references).
**Verdict:** ADAPT — Kelly-Index difficulty classification + confidence-gated staking is a directly portable pick-selection/abstention filter; adapt for GSE's market-microstructure lane.

## 1. Research question
Can decomposing football match prediction into sub-tasks by Kelly-Index difficulty (easy/medium/hard), trained with new Elo-based features and ensemble ML plus SHAP explainability, produce competitive predictions and a profitable betting strategy?

## 2. Dataset / schema
1,140 English Premier League matches, 2019–2021 seasons (380/season): match stats, six European bookmakers' odds (Bet365, Interwetten, Bet&Win, Pinnacle, VC Bet, William Hill), Elo-based engineered features. Access: public datasets.

## 3. Method / model
Kelly Index K_H = (O_H/avgO_H)·F_99 (bookmaker odds ÷ mean odds × payout rate), per outcome, per bookmaker. Matches: Type 1 (≥2 bookmakers with K>1 — easiest), Type 2 (exactly one), Type 3 (none — hardest). Per-type classifiers: CatBoost, XGBoost, Random Forest, Gradient Boosting, Logistic Regression, KNN, Decision Tree, Stacking, Voting + 2 baselines, tuned via RandomizedSearchCV. SHAP for feature importance. Betting experiment: $1 flat stake per match, ROI = profit/invested, plus confidence-threshold gating (bet only if model confidence ≥ threshold, Pinnacle odds).

## 4. Equations & assumptions
- K_H = (O_H/avgO_H)·F_99; K_D = (O_D/avgO_D)·F_99; K_A analogous (F_99 = payout rate).
- Type rule: count of bookmakers with any K>1 → Type 1/2/3.
- Assumptions: bookmaker liability (K>1) proxies market confidence; odds-implied difficulty transfers across matches; model confidence calibrated enough to gate stakes; $1 flat-stake ROI generalizes.

## 5. Features / target
Features: historical home-win records, Elo-based variables, team match statistics, pre-match bookmaker odds. Target: {home win, draw, away win}.

## 6. Validation design
Expanding-window forecasting across the three seasons; per-type accuracy/precision/recall/F1 + average rank across windows; baseline comparison (no Kelly split); simulated betting ROI per bookmaker per type and per confidence threshold.

## 7. Numerical results / baselines
Draw rates: Type 1 16.0–21.1%, Type 3 23.6–29.5% per season; Type 1 home wins dominate. Accuracy: Type 1 CatBoost 70.0% (precision 66.6, F1 63.6); Type 2 Random Forest 52.7%; Type 3 RF 41.1%; all-matches RF 52.0%. SHAP: Type 1 → home historical stats dominate; Type 2/3 → bookmaker odds features dominate. Betting ROI ($1 stakes): naive per-type mostly negative (Type 1: Bet365 −1.1%, Pinnacle +1.4%; Type 2/3: all −3.3% to −6.3%). Only profitable: Type 1 matches + model confidence ≥70% on Pinnacle odds → final ROI +17%. Stacking/voting unexpectedly underperformed.

## 8. Code / data availability
No code stated; public EPL/bookmaker data.

## 9. Leakage & limitations
Soccer 3-way; confidence distribution shows even "easy" matches rarely exceed 60% model confidence (Table 9: Type 1 2020: 0% above 0.7). The profitable 17% ROI rests on a small slice (Type 1 + ≥70% confidence — 2020 had 0 such matches). Upset definition is model-relative. Odds features leak market information into "model" predictions. No transaction costs modeled; Pinnacle-only profitability may not transfer to US books.

## 10. GSE overlap
Existing-research-map has market-implied ratings, CLV and de-vigged consensus, but no difficulty-based match classification or confidence-gated staking. This fills the pick-selection/abstention gap directly — new lane contribution, not a duplicate.

## 11. GSE implementation spec
Add a "market difficulty" classifier to the pick pipeline: compute per-game Kelly-style index across US books (book odds ÷ market mean × payout rate), classify games into easy/medium/hard; train the engine's confidence calibration separately per class; gate published picks: easy + engine confidence ≥70% → full unit, medium → half unit or pass, hard → pass. Backtest on 2020–2024 NFL ATS vs closing lines. Effort: ~2 days.

## 12. Reproducible test
Dataset: NFL 2020–2024 with multi-book odds (use The Odds API archive). Protocol: compute Kelly index per game, classify, apply engine confidence gating; metric: ROI and CLV of gated picks vs ungated. Baseline to beat: engine's current published-pick ROI. Pass criterion: gated strategy ROI > ungated with positive CLV, p<0.05 on paired game-level returns.

## 13. Acceptance / rejection gate
Adopt the difficulty classifier in the pick pipeline if backtest shows gated picks beat ungated on ROI by ≥3 percentage points with CLV>0 over 2020–2024; keep as monitoring metric only otherwise.

## 14. Improvement experiment
Replace the count-of-bookmakers rule with a continuous difficulty score (entropy of the de-vigged consensus + max Kelly index) and fit the confidence threshold by maximizing backtested Sharpe ratio per season via walk-forward optimization; test whether the optimal threshold is stable across seasons.
