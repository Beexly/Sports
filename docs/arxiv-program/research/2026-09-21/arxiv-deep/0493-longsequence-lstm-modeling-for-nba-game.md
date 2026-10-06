# [0493] Long-Sequence LSTM Modeling for NBA Game Outcome Prediction Using a Novel Multi-Season Dataset (arXiv:2512.08591v1)

**Citation:** Charles Rios, Longzhen Han, Almas Baimagambetov, Nikolaos Polatidis (2026). *Long-Sequence LSTM Modeling for NBA Game Outcome Prediction Using a Novel Multi-Season Dataset*. arXiv:2512.08591v1. URL: https://arxiv.org/abs/2512.08591v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 741 lines).
**Verdict:** ADAPT — port the paper's "generalizable fallback model" concept to NFL: a long-history LSTM prior on nflverse that supplies a stabilized, multi-season base forecast to stack with GSE's current-season specialists.

## 1. Research question
Can an LSTM with an extreme sequence length (9,840 games = 8 full NBA seasons) model long-term performance trends and season-over-season dependencies well enough to beat traditional ML/DL baselines on NBA regular-season game-outcome prediction — and can such a long-context model serve as a "generalizable fallback" prior that resists concept drift instead of being harmed by old data?

## 2. Dataset / schema
Novel dataset: all NBA regular-season games 2004–05 to 2024–25, from nba.com/stats, public at https://www.kaggle.com/datasets/charlesrios/nba-advanced-metrics-2004-2024. Each game = 2 teams × ~33 features (Table 1): WINS, LOSSES, FGM, FGA, FG3A, FG3M, FTA, FTM, OREB, DREB, AST, STL, BLK, TO, PF, PTS, PLUS_MINUS, OFF_RATING, DEF_RATING, AST_PCT, AST_TOV, AST_RATIO, OREB_PCT, DREB_PCT, TM_TOV_PCT, EFG_PCT, TS_PCT, PACE, POSS, PIE, PCT_PTS_PAINT, PCT_PTS_FB, PCT_PTS_OFF_TOV, PCT_PTS_3PT — each duplicated as HOME_* and AWAY_*; each feature value = the team's stat from its most recent game. Notably absent: rosters, mid-season trades, free-agency signings. No train/test split dates stated beyond: samples require 9,840 preceding games, so predictions begin 2012–13 (2004-05→2011-12 fill the first window); sliding window shifts one game at a time.

## 3. Method / model
Sequence-to-one LSTM: input (batch, 9840, features) → LSTM(200, return_sequences=True) → LSTM(100, return_sequences=True) → LSTM(50, return_sequences=False) → Dense(32, ReLU) → Dropout(0.3) → Dense(1, sigmoid) = P(home win). Standard LSTM gate equations (1)–(6): f_t=σ(W_f·[h_{t−1},x_t]+b_f), i_t=σ(W_i·[h_{t−1},x_t]+b_i), c̃_t=tanh(W_c·[h_{t−1},x_t]+b_c), o_t=σ(W_o·[h_{t−1},x_t]+b_o), c_t=f_t⊙c_{t−1}+i_t⊙c̃_t, h_t=o_t⊙tanh(c_t); final ŷ=σ(w·a+b). Baselines: Logistic Regression (L2 C=1.0, sklearn); Random Forest (sklearn, bootstrap); MLP (Dense 128→BN→Dropout 0.3→Dense 64→Dropout 0.3→Dense 32→sigmoid, Adam, binary cross-entropy); CNN (Conv2D 32/64/128 with (1,2) kernels, (1,2) max-pool, kernel regularizer 0.001, flatten, Dense 128, sigmoid, Adam, BCE). TensorFlow/Keras. Hyperparameter tuning: none reported (fixed architectures). Framing: the LSTM as a generalizable "fallback" prior stacked with season-specific models (FiveThirtyEight ELO+RAPTOR hybrid cited as spirit).

## 4. Equations & assumptions
LSTM gates (1)–(6) as above. Metrics: (7) Accuracy=(TP+TN)/(TP+TN+FP+FN); (8) Precision=TP/(TP+FP); (9) AUC-ROC=∫_0^1 TPR(FPR)d(FPR), "probability that a randomly chosen positive instance is ranked higher than a randomly chosen negative." Assumptions: 9,840-game window captures multi-season team dynamics; game-level team stats from each team's most recent game are sufficient context (no roster/trade/injury data); regular-season games only (playoffs excluded); sliding-window samples treated as independent (no discussion of overlapping-window dependence in evaluation); binary cross-entropy on accuracy/precision/AUC evaluation with no calibration step.

## 5. Features / target
Inputs: ~33 team stats × 2 (home/away), most-recent-game values, 9,840-game sequences. Target: binary home-win/away-win label for the next game. Prediction horizon: one game ahead, predictions from 2012–13 onward.

## 6. Validation design
Sliding-window sequence construction over 2004-05→2024-25; evaluation on Accuracy, Precision, AUC-ROC vs LR/RF/MLP/CNN and vs three prior works (Perricone et al. 2016; Teno et al. 2022; Zhao et al. 2023) on accuracy. Train/validation/test partition not stated (no dates, no proportions, no CV); presumably train on earlier windows, test on later — not verifiable. No calibration analysis despite the AUC-vs-accuracy discussion; no statistical significance tests; no ablation of sequence length (the 8-season choice is asserted, not varied).

## 7. Numerical results / baselines
- LSTM: 72.35% accuracy, 73.15% precision, 76.13% AUC-ROC — best on all metrics.
- Logistic Regression: 70.12% accuracy, 70.66% precision, 69.85% AUC-ROC.
- Random Forest: "slightly increased accuracy and AUC-ROC" vs LR but decreased precision (no exact numbers given); top-3 RF feature importances: LOSSES, WINS, PIE (FG3A/FG3M ranked near bottom despite the 3-point revolution — paper's surprise).
- MLP: "larger jump" over LR/RF in all metrics (no exact numbers). CNN: lower accuracy and precision than MLP but higher AUC-ROC (no exact numbers) — better probability ranking, worse classification.
- External: LSTM outperformed the three prior works on accuracy (Figure 4, no numeric labels quoted).
- Context claim: "Vegas betting lines… roughly 55% accurate, significantly lower than our model's 72.35%" [16] — a category error (Vegas lines are priced to balance action, not maximize accuracy; and 55% refers to ATS-style pick rates in the cited source).

## 8. Code / data availability
Dataset public: https://www.kaggle.com/datasets/charlesrios/nba-advanced-metrics-2004-2024. Code: none stated. Built on Linux, Python, TensorFlow/Keras/sklearn.

## 9. Leakage & limitations
- The 9,840-game sliding window means consecutive samples overlap by 9,839 games — if the train/test split is random rather than strictly time-ordered (not stated), massive leakage; even time-ordered, overlapping windows inflate effective sample size and any SE claims.
- No train/val/test dates, proportions, or split protocol — the core methodological detail is missing; "predictions start 2012–13" is the only temporal anchor.
- No hyperparameter tuning, no ablations (sequence length, feature sets), no calibration despite touting probability outputs and sportsbook applications.
- The 72.35% vs Vegas-55% comparison is a false equivalence (Vegas optimizes balanced books, and published "55%" figures concern ATS win rates, not moneyline accuracy).
- No roster/trade/injury data — acknowledged; in the NBA these are first-order effects (the paper's own concept-drift discussion).
- Playoff exclusion limits betting relevance; overlapping-window sample dependence unaddressed.
- NFL transfer caveat: the NFL has 17-game seasons vs 82-game NBA seasons — an 8-"season" NFL window is ~136 games per team, a very different information regime; and NFL game-level features are noisier per game.

## 10. GSE overlap
Extension, not duplication. Garrett's corpus has state-space team strength (1701.05976, nested AR(1)), dynamic Elo, and the 15-area ML brief (RNN/sequence topics commissioned, results not yet in repo) — but no long-context sequence model as a generalizable prior, and no explicit "fallback prior stacked with season specialists" architecture. The paper's framing maps cleanly onto GSE's existing ensemble instinct: a stabilized multi-season base + current-season specialists. The per-team most-recent-game feature construction is primitive vs GSE's gse-lab metric suite; the transferable idea is the architecture role (long-history prior), not the feature set.

## 11. GSE implementation spec
(1) Data: nflverse play-by-play 2000–2024 aggregated to team-game features (EPA/play splits, success rate, turnover margin, special-teams EPA, pace — from gse-lab's 15 metric families), sequences of ~150–200 games per team (NFL's analogue of multi-season context; NOT 9,840 — scale to the information content). (2) Model: 2-layer LSTM (or GRU for speed) sequence-to-one → P(home win) / expected margin, trained on 2000–2018, validated 2019–2021, tested 2022–2024, strictly time-ordered windows, non-overlapping game targets. (3) Role: use its output as a Bayesian-style prior feature inside GSE's existing ensemble (logistic/GBM stacking), i.e., the "fallback" the paper proposes — stabilized cross-era base rates that current-season models fine-tune. (4) Calibrate with isotonic regression (the paper skipped calibration; GSE's calibration stack demands it). Effort: ~1 week for data windowing + training; inference is trivial. Hardware: single GPU fine.

## 12. Reproducible test
Dataset: nflverse team-game features, 2000–2024. Baseline: logistic regression on the same most-recent-game features (the paper's LR analogue) and GSE's current ensemble without the LSTM prior. Metric: log-loss and Brier score on strictly time-ordered holdout 2022–2024 (plus calibration-by-decile). Window: train ≤2021, validate 2022 (hyperparameters), test 2023–2024. Must demonstrate the stacked model beats the no-prior ensemble — the paper never ran this stacking test itself.

## 13. Acceptance / rejection gate
ADOPT the LSTM-fallback prior if the stacked ensemble's log-loss on the 2023–2024 holdout beats the no-prior baseline by ≥0.005 AND the LSTM component alone beats logistic regression on the same features (paper's margin: 72.35% vs 70.12%, ~2.2pp — adopt our NFL analogue only if ≥1.5pp AUC gain on moneyline-equivalent classification or ≥0.003 log-loss). REJECT if no gain — the NFL's 17-game seasons may simply not carry enough per-game information for long-context recurrence to help, and the paper's evaluation gaps (no stated split, overlapping windows) mean its headline number cannot be trusted as evidence.

## 14. Improvement experiment
Replace the fixed 8-season window with a learned, team-specific effective-history via attention over the sequence (the paper's uniform 9,840 window assumes all history is equally relevant and never ablates it). Hypothesis: attention weights will show most predictive mass on the last 1–2 seasons for most teams, with longer tails only for stable franchises — and a sparse-attention LSTM would beat the fixed window on log-loss while being cheaper to serve, directly testing the paper's unexamined "more history is better" claim.
