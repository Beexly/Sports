# [0035] Assessing win strength in MLB win prediction models (arXiv:2511.02815v1)

**Citation:** Morgan Allen and Dr. Paul Savala (2025). *Assessing win strength in MLB win prediction models*. St. Edward's University. arXiv:2511.02815v1. URL: https://arxiv.org/abs/2511.02815v1
**Ledger completed:** 2026-09-21. **Read:** full local text (1,264-line extract: abstract, §§1–7, Tables 1–9, Figures 1–10, bibliography). All numbers and equations below are quoted verbatim from the local text.
**Verdict:** ADAPT — the "predicted win probability carries margin-of-victory information" finding ports directly to NFL spread modeling, and the temporal-split discipline plus calibration-over-accuracy betting lesson are methodological upgrades; the MLB models themselves do not transfer.

## 1. Research question
Prior MLB win-prediction studies each used different datasets and often leaked temporally (cross-validation within overlapping seasons). The paper asks three things on one common dataset: (1) how do six standard ML model families compare at predicting MLB game winners; (2) do the predicted win probabilities relate to *win strength* as measured by score differential (i.e., does a 90% forecast imply a bigger expected margin than a 51% forecast — "no work to date has investigated the extent to which this is true"); and (3) can predicted win probabilities drive profitable run-line betting, and what separates winning from losing betting strategies? (Abstract; §1)

## 2. Dataset / schema
**46,159 MLB regular-season games, 2001–2019 seasons (playoffs excluded).** Training: 2001–2015; held-out test: 2016–2019 — split **by season** explicitly to avoid temporal leakage ("it would be a methodological error to evaluate their performance on the same seasons"). Sources: Baseball Reference, FanGraphs, Lahman's Database, Retrosheet — all public, so replication is feasible. **83 features** (Table 2) vs. 30 in the next-closest prior study: hitting (team OPS/AVG/SLG/OBP/R, fielding %, run differential, ISO, total runs — with %Diff/Diff/offset-1-yr variations), pitching (team ERA/WHIP/runs allowed, starting-pitcher IP/WPA/ERA/WHIP/games thrown), and other (Bayesian win probability, W-L, rank, Pythagorean expectation, average attendance, win differential, win %, FiveThirtyEight ELO, rest days, previous-game W/L, Log5, year, month).

## 3. Method / model
Six families on the common dataset: **logistic regression (LogR), support vector machines (SVM; RBF kernel, C=1 from grid search over 1–10), gradient boosting decision trees (XGB, Chen 2016 package), K-nearest neighbors (KNN; k=150, Minkowski distance, from grid search 1–300), artificial neural networks (ANN; feed-forward)**, plus a **baseline home-team-win model (HomeWin)** and **FiveThirtyEight's ELO-based model (FTE)** as an external reference (FTE: home field worth 24 ELO points; adjusts for travel (linear), rest, starting pitcher; simulations produce probabilities). Hyperparameters "optimized via grid search with cross-validation where applicable." Classifiers predict home-team win/loss, emitting P(home win). Ensembling explored: pairwise agreement analysis and majority-vote triplets; theoretical-maximum accuracy ("what if we knew which model was correct for each game").

## 4. Equations & assumptions
Standard implementations of the six families (no novel equations). Quoted:
- LogR: linear predictor β₀+β₁x₁+…+βₙxₙ as the "least squares regression line for ln(p/(1−p))" where p = P(home win).
- KNN probability: proportion of the K=150 neighbors in the majority class (e.g., 7 of 10 → 70%).
- Pythagorean expectation (a feature): `runs_scored² / (runs_scored² + runs_allowed²)`.
- Betting returns "as a percentage of money invested"; drawdown defined (for future work) as "the maximum return at any point in the season minus the minimum return."
**Assumptions:** season-blocked split suffices for temporal independence; binary home-win framing captures the task; score differential (home final score minus away final score) is a valid proxy for "win strength"; SBRO run-line data represents real betting; player/team statistics (not identities) as features neutralizes offseason roster movement.

## 5. Features / target
Features: the 83 variables in §2 (traditional + advanced team/player statistics, ELO, Pythagorean expectation, attendance, rest, calendar). Target: **home-team win (binary)**; predicted probability of home win retained for the win-strength and betting analyses. Horizon: pre-game.

## 6. Validation design
Train 2001–2015 / test 2016–2019, season-blocked (time-ordered — a strength vs. the literature's within-season CV; Table 1 documents prior studies: Jia et al. 2013: 59.6% SVM on 2012; Soto Valero 2016: 58.92% SVM via leaky 10-fold CV over 2005–2014; Elfrink 2018: 55.52% GB, train 1930–2015/test 2016; Huang and Li 2021: 94.18% ANN via within-2019 CV — "likely leading to significant temporal dependence"). Metrics: **accuracy, AUROC, log-loss, Brier score** (Table 4). Baselines: HomeWin (53.15% accuracy), FTE Elo (56.96%), and the six families against each other. Betting data: Sports Books Reviews Online (SBRO) run-lines and run-line money, season-by-season.

## 7. Numerical results / baselines
Table 4 (exact, test set 2016–2019):
| Model | Accuracy | AUROC | Log-loss | Brier |
|---|---|---|---|---|
| HomeWin | 53.15% | 0.5000 | 16.1820 | 0.4685 |
| LogR | **62.94%** | **0.6768** | **0.6418** | **0.2254** |
| SVM | 62.38% | 0.6597 | 0.6529 | 0.2303 |
| KNN | 62.15% | 0.6686 | 0.6492 | 0.2274 |
| XGB | 61.08% | 0.6499 | 0.6639 | 0.2347 |
| ANN | 62.13% | 0.6653 | 0.6500 | 0.2292 |
| FTE | 56.96% | 0.5950 | 0.6769 | 0.2420 |
- "LogR performs top across all metrics" but "the differences between them were generally small enough that no one model should be considered 'best.'"
- Accuracy/calibration dissociation: "SVM has the second best accuracy, yet is only fourth best for Brier score and Log-loss. This is because SVM performs relatively poorly at the extremes of its prediction range."
- Ensembling (Table 5): model agreement 81–90%; XGB has the lowest agreement with others — "a strong candidate for model ensembling." Even the best majority-vote triplet (LogR/SVM/XGB, 62.83%) "slightly under-perform[s] the best individual model (LogR)." Theoretical maximum from optimally combining any three models: 70.90%–74.50% ("around 75%").
- Win strength: "All models show a positive relationship between predicted probabilities and score differential. While the individual R² values remain around 0.1" (Table 6: FTE 0.036, LogR 0.140, SVM 0.105, KNN 0.063, XGB 0.098, ANN 0.120). "LogR, KNN and ANN show the strongest positive linear trends." Toss-up games (Table 7): e.g., LogR at 45–55%: n=2,289, mean margin −0.371 ± 4.120; at 49–51%: n=461, −0.243 ± 4.011 — "even when the prediction range narrows… the standard deviation for all models remains relatively unchanged"; all means are negative ("when a model predicts a toss-up game, there is actually slightly more chance of the home team losing than winning"); ANN's toss-up margins are closest to zero. Dominant favorites (Table 8): LogR at 85–100%: n=181, mean margin 4.072 ± 3.978; XGB 85–100%: n=334, 3.434 ± 4.151. Away-dog dominants (Table 9): LogR at 0–15%: n=25, −6.920 ± 5.507. "SVM, KNN and FTE all fail to predict any games to have an especially high or low win probability" (FTE: 25th percentile 48.3%, 75th 58.7% — narrow, conservative).
- Run-line betting: naive strategy (bet home when P ≥ 0.5, away otherwise, every game, LogR predictions) "giving a loss of 51.39% of money wagered." Optimized strategy (20×20 grid of low/high cutoffs; games between cutoffs not bet): "For appropriate choices of win and loss cutoff we demonstrate positive returns, even into the double digits." Positive-return regions bet ~0.5%–5% of games (~5–120 games/season; highest returns at ~1–2%, roughly 25–50 games per season).
- Conclusion: "if interpretability is an important factor, then logistic regression should be a first choice, with K-nearest neighbors also being a strong candidate. If, on the other hand, the ability to fine-tune the model matters more… then a gradient boosting model is an excellent choice, along with a feed-forward neural network."

## 8. Code / data availability
None stated. Data sources are all public (Baseball Reference, FanGraphs, Lahman, Retrosheet), so replication is feasible without author code.

## 9. Leakage & limitations
- **Strength:** the season-blocked split is the paper's explicit methodological contribution vs. prior work — no temporal leakage by construction.
- **Betting strategy grid**: 400 cutoff pairs evaluated on the same 2016–2019 test set that selected LogR — the "double digits" returns region could reflect strategy mining; no nested validation of the cutoff choice.
- **Effect sizes are modest:** R² ≈ 0.06–0.14 for the win-strength relationship; individual-game margin SDs of ~4 runs dwarf the mean effects; profit regions cover only 0.5–5% of games.
- **FTE handicap:** FTE's probability distribution is far narrower (few tail predictions), which flatters its calibration comparisons.
- **External validity to NFL:** MLB is a moneyline/run-line sport with starting-pitcher dominance; the win-prob→margin mapping is cleaner than football's. The *methodological* lessons transfer; the fitted models do not.

## 10. GSE overlap
Directly adjacent to GSE's core: win-probability modeling, calibration (CQR, grouping loss, temperature scaling, LRD all in repo), and market-relative learning. What is **new**: (a) the explicit empirical test that predicted win probability predicts *margin* (score differential), not just the binary outcome — GSE's corpus has EPA/margin modeling but no paper testing P(win)→expected-margin monotonicity as a model diagnostic; (b) the accuracy-vs-calibration dissociation demonstrated on a common dataset (SVM accurate but miscalibrated at extremes — directly relevant to GSE's model selection); (c) the "naive ML betting loses / appropriate strategies win" result, which reinforces GSE's market-relative framing. **Extension**, not duplicate.

## 11. GSE implementation spec
1. **Win-strength diagnostic for GSE's NFL models:** on a held-out season, bin games by engine predicted win probability (deciles) and plot mean actual score differential per bin; require monotonicity. Any model whose extreme-probability bins do not show larger mean margins is miscalibrated in the tails (the paper's SVM failure mode) — flag for recalibration.
2. **Spread-translation test:** regress actual margin on logit(P_win) per model; compare against the market spread as a competing predictor. This turns the paper's qualitative claim into a quantitative GSE diagnostic: does the engine's P(win) carry margin information *beyond* the spread?
3. **Betting-strategy discipline:** replicate the paper's naive-vs-appropriate comparison on NFL spreads — naive = bet every positive-edge game; appropriate = edge threshold + Kelly fraction + calibration filter — and require the "appropriate" variant to beat naive out-of-sample before any strategy ships.
4. Data: nflverse + GSE picks DB + historical spreads (all in hand). Effort: ~1 day.

## 12. Reproducible test
Dataset: nflverse 2020–2024 regular season (train) / 2025 (test), season-blocked like the paper. Fit LogR, XGB, and Elo-style baselines on team efficiency features to predict home win; compute Brier/log-loss/AUROC per model; then the win-strength diagnostic: mean actual margin by predicted-probability decile, plus the spread-translation regression. Baseline to beat: the market spread's margin prediction (MAE). Metric for the diagnostic: Spearman correlation between decile predicted probability and decile mean margin (paper-analogue), reported per model.

## 13. Acceptance / rejection gate
**Adopt** the win-strength diagnostic as a standing GSE model check if, on the 2025 test season, at least one candidate engine model shows a *non-monotonic or flat* P(win)→margin relationship while matching competitors on Brier — i.e., the diagnostic catches a miscalibration that proper scores miss (the paper's SVM case). If all models' margin curves are equivalently monotonic, the diagnostic adds nothing over Brier — **reject** as redundant.

## 14. Improvement experiment
Jointly model outcome and margin: replace the binary classifier with an ordered/continuous model (e.g., Skellam or ordered-logit on binned margin, or direct margin regression converted to win probability via the empirical margin distribution) and test whether the joint model beats the binary LogR on *both* Brier and margin-MAE. Rationale: the paper shows P(win) already encodes margin information implicitly; modeling the margin directly should dominate, and GSE's gap list notes spread/total probability surfaces are thin.
