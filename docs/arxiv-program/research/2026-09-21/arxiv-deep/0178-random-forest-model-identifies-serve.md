# 0178 Random forest model identifies serve strength as a key predictor of tennis match outcome (arXiv:1910.03203v1)

**Citation:** Gao, Z., & Kowalczyk, A. (2019). *Random forest model identifies serve strength as a key predictor of tennis match outcome*. arXiv:1910.03203v1. URL: https://arxiv.org/abs/1910.03203v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 934 extracted lines, read 0–934). ar5iv HTML had no body (metadata only), PDF used.
**Verdict:** REJECT — the headline 83.18% accuracy is not credible evidence: the key serve features are plausibly computed from the match being predicted (target leakage, see Section 9), the train/test split is random rather than chronological, and the apparatus is tennis-specific. Nothing to port beyond generic feature-selection hygiene GSE already practices.

## 1. Research question
Can simple, fast, interpretable ML models (SVM, logistic regression, random forest) predict pre-match tennis outcomes from ATP match statistics (2000–2016), and which features drive accuracy? Secondary: can the models' outputs reconstruct bookmaker odds distributions? (Abstract, Introduction.)

## 2. Dataset / schema
- **ATP World Tour 2000–2016** (Masters 1000, 500, 250, Challenger) from atptennis.com merged with **Jeff Sackmann's Match Charting Project** (GitHub) — claimed "largest database of tennis match information to date."
- **49,188 entries** (one player per match); split for the odds comparison: **29,238 entries without betting odds (train), 19,880 with odds (test)**. Betting odds from major bookmakers (e.g., Bet365), averaged per match; merged via match date + player names.
- Missing values imputed with the **median** per feature. Some features combined to reduce collinearity (e.g., aces/double faults ratio).
- Access: public (ATP site, Sackmann GitHub); no code stated.

## 3. Method / model
- **Models:** SVM with RBF kernel, random forest classifier, logistic regression. Evaluation: random train/test split + **10-fold cross-validation** (not chronological).
- **Feature selection (RF-focused):** systematic removal/addition of Table 1 features. SVM and logistic regression performed best with the full feature set; RF was sensitive. Removing "FirstWonFirstIn" or "SecondWonSecondIn" alone caused large accuracy drops (Fig 1); adding them caused the largest jumps (Fig 2). Features whose removal *increased* CV accuracy were dropped (76.23% vs 73.85% all-features, Fig 3); dropped features were then re-added one-by-one ordered by single-addition gain (Fig 4).
- **Final RF feature set:** w_height, w_age, AceVsDf, Champ, GamesPlayed, FirstIn1stServe, FirstWonFirstIn, SecondWonSecondIn, roundR128, roundRR.
- **Score metric** for confidence analysis: score = (p − 0.5) · w, where p = predicted win probability and w = +1 (player won) / −1 (lost). [UNCERTAIN — extraction garbled the formula; reconstruction is consistent with all stated properties: up to +0.5 for high-confidence correct, down to −0.5 for high-confidence wrong, near 0 = low confidence, positive = correct/low-confidence, negative = incorrect/low-confidence.]
- Implied probability from decimal odds: P = 1/ODDS (linear transformation; L106–L112, extraction fragmented but standard).

## 4. Equations & assumptions
- Score metric: score = (p − 0.5)·w as above [UNCERTAIN reconstruction].
- P(win) = 1 / decimal_odds.
- **Assumptions:** median imputation is harmless; averaged bookmaker odds approximate "the market"; random split + 10-fold CV estimates generalization (no temporal structure); the three models' accuracies can be combined to reconstruct the odds distribution (Fig 5); serve features are legitimate pre-match predictors (unstated — see Section 9).

## 5. Features / target
**Features (Table 1):** physical (w_height, w_age, HandPer), record-based (w_rank_points, PastPer, Champ, WinRound, GamesPlayed, TourPer, OpponPer), court/tournament (surface*, round*, SurfacePer), serve (AceVsDf, FirstIn1stServe, FirstWonFirstIn, SecondWonSecondIn), mental strength (BpSBpF). **Target:** binary match outcome (player win/loss). **Horizon:** single pre-match prediction.

## 6. Validation design
Random train/test split + 10-fold CV. Baselines: betting-odds-implied predictions (69.04% accuracy, computed only on the odds subset). Metrics: percent correct + the confidence score. Comparison across the three models and odds. No chronological validation, no holdout tournament, no statistical tests, no calibration metrics.

## 7. Numerical results / baselines
Exact from Table 2 (final 10-fold CV):

| Model | % correct | Score |
|---|---|---|
| SVM | 62.06% | 834.04 |
| Logistic regression | 61.60% | 884.36 |
| **Random forest** | **83.18%** | 1750.91 |
| Betting odds | 69.04% | **2059.66** |

- RF feature-selection path: removing accuracy-decreasing features → 76.23% CV vs 73.85% all-features; adding "RoundSF" at one stage → 80.68%; final reported RF = 83.18%.
- Key finding: serve strength (FirstWonFirstIn, SecondWonSecondIn) dominates RF feature importance; rank, win record, surface, round, break-points-saved, head-to-head had "relatively little impact."
- **Accuracy vs confidence discrepancy:** betting odds have the highest total score (2059.66) despite lower accuracy — odds predictions are high-confidence when correct; RF is correct more often but with low confidence (score distribution shifted right but concentrated near zero, Fig 5).
- Combining the three models' accuracies "nearly recreated" the average-odds probability distribution (abstract, Fig 5) — interpreted as bookmakers using similar information.

## 8. Code / data availability
None stated. Data sources named (atptennis.com, Sackmann Match Charting Project on GitHub); no URLs given.

## 9. Leakage & limitations
- **Probable target leakage (major):** the decisive features (FirstWonFirstIn, SecondWonSecondIn, FirstIn1stServe) are serve-performance percentages whose Table 1 "Calculation" column gives no pre-match aggregation window (unlike AceVsDf, which is explicitly "over past 12 months"). They appear sourced from the Match Charting Project's per-match charting. If computed from the match being predicted, the model is predicting winners from in-match serve stats — explaining the implausible 83.18% vs 69.04% odds gap. The paper never states these are pre-match aggregates.
- **Random (non-chronological) split:** future matches inform past predictions; no walk-forward validation.
- Tennis-only; no betting simulation or ROI — accuracy only, despite the betting framing.
- "Largest database to date" is an unverified claim; first author affiliation is a high school (Darlington School) — not disqualifying, but the leakage issue is.
- The bookmaker-bias discussion (favorite-longshot bias, balancing payouts) is speculative, not measured.

## 10. GSE overlap
Per existing-research-map: tennis analytics has no GSE overlap; the engine-benchmark lane is NFL-focused. The portable methodological points — feature-selection discipline, accuracy-vs-confidence (calibration) analysis — are already standard GSE practice. The cautionary value is the leakage pattern: GSE must ensure all features are strictly pre-kickoff aggregates (the paper's failure mode is exactly what GSE's feature pipeline must never do). No extension or new capability.

## 11. GSE implementation spec
None — REJECT. No build. The one defensive action (already GSE policy, restated for the record): audit that every GSE model feature is computed from data available before kickoff, with a unit test that drops any feature whose values change after game start. This paper is the case study for why.

## 12. Reproducible test
Not applicable — REJECT. No paper claim is trusted enough to test. (If the *concept* of per-unit dominance features were tested: NFL analog of "serve strength" = per-play efficiency (EPA/dropback, success rate) as features; test whether per-play efficiency features dominate season-aggregate features in an NFL win-probability model on chronological holdouts. But that test belongs to GSE's existing feature program, not to this paper.)

## 13. Acceptance / rejection gate
**REJECT.** Gate for any future reconsideration: a corrected version with (i) strictly pre-match features, (ii) chronological walk-forward validation, (iii) accuracy reported alongside log loss/Brier score, and (iv) a betting simulation with ROI — none of which this version provides.

## 14. Improvement experiment
None warranted on this paper. The honest follow-up the authors never ran: recompute with pre-match-only serve aggregates (trailing-12-month) under walk-forward validation; hypothesis is that the 83.18% collapses toward the 69–72% range and the serve-strength dominance attenuates — which would convert the paper from a leakage artifact into a real finding. Not GSE's job to run.
