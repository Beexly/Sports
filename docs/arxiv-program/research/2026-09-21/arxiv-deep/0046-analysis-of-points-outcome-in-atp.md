# [0046] Analysis of points outcome in ATP Grand Slam Tennis using big data and machine learning (arXiv:2506.05866v1)

**Citation:** Martin Illum, Hans Christian Bechsøfft Mikkelsen, Emil Hovad (2025). *Analysis of points outcome in ATP Grand Slam Tennis using big data and machine learning*. arXiv:2506.05866v1 [stat.AP]. URL: https://arxiv.org/abs/2506.05866v1. Technical University of Denmark, 6 Jun 2025 (v1; only version as of read date).
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML v1) on 2026-09-21 (505 lines, §§1–5).
**Verdict:** REJECT — an honest negative-result student project: every ML method matches or underperforms the naive "server wins the point" baseline, and it offers no transferable method or tennis edge relevant to GSE.

## 1. Research question
Predict, point-by-point within ATP Grand Slam men's singles matches, whether the server or the returner wins the next point — separately for first- and second-serve points — using only public data (Sackmann point-by-point data, player rankings, serve placement, accumulated in-match features). A secondary goal is interpreting feature importances to identify strategic factors for winning points.

## 2. Dataset / schema
- **Data:** Jeff Sackmann's public repos (tennis_atp + tennis slams point-by-point): Wimbledon + US Open men's singles, 2016–2020, **709 matches** (matches missing serve-placement features excluded).
- **Row design (§3.1):** each row = one point, containing information known *up to the serve*: direct outcome indicators (P1UnfErr etc.) excluded; **accumulated features** (e.g., P1PointsWon, P2BreakPointWon) record each player's performance up to the current point. Columns with post-point outcomes shifted one row up so each row is the state at the start of the point. Server always encoded as player 1 (features swapped when player 2 serves).
- **57 features** (§3.3.1, Table 1): accumulated in-match stats (points/games/sets won, aces, winners, double faults, unforced errors, net points, break points), serve descriptors (speed, ServeWidth B/BC/BW/C/W, ServeDepth CTL/NCTL, ReturnDepth D/ND, ServeNumber first/second), match descriptors (surface, P1Rank/P2Rank, scores, tiebreak flags, distance run, rally count).
- **Descriptive stats (§3.2):** 68.19% (AD court) / 68.15% (deuce court) of successful first serves went close to the sidelines, vs only 29.04% / 30.3% for second serves (second-serve depth often NCTL — not close to line — consistent with risk aversion). Server point-win rates: **73.2% on successful first serves, 57.2% on second serves, 64.8% overall**.
- Access: repo referenced as Illum (2022): https://github.com/illumlol/ANALYSIS-OF-POINTS-OUTCOME-IN-ATP-GRAND-SLAM-TENNIS-USING-BIG-DATA-AND-MACHINE-LEARNING; data public.
- Provenance: DTU student project (2022 thesis, posted to arXiv 2025), not a peer-reviewed venue paper.

## 3. Method / model
Standard applied-ML bake-off; only explicit math is textbook logistic regression:
- Sigmoid: G(x) = 1 / (1 + e^(−wᵀx)) (Eq. 1).
- Loss: L(x) = (1/m) Σᵢ −(1−yⁱ)log(1+yⁱ−G(xⁱ)) − yⁱ log(G(xⁱ)) (Eq. 2; nonstandard log(1+yⁱ−G(xⁱ)) form).
- SGD update: w_{j,n+1} = w_{j,n} − α ∂L/∂w_j (Eq. 3).
- Methods: **baseline** = server's empirical point-win rate (73.2% first serve / 57.2% second serve) vs Logistic Regression, Random Forest, AdaBoost, XGBoost (scikit-learn + XGBoost). XGBoost scale_pos_weight = 1.3 to upweight the under-represented class. Metrics: accuracy, recall, precision, F1, ROC-AUC.

## 4. Equations & assumptions
Eqs. 1–3 as in §3 above (standard sigmoid cross-entropy and SGD). No novel equations. Assumptions (implicit): point outcomes conditionally independent given features; accumulated in-match stats capture form; serve-placement categories adequately describe serve quality.

## 5. Features / target
- **Features:** 57 as listed in §2 (accumulated in-match stats, serve descriptors, match descriptors); server always player 1.
- **Target:** binary — server wins point vs. returner wins point, modeled separately for first-serve and second-serve points.

## 6. Validation design
- Split: 10% of matches randomly held out as test; remaining 90% split 80/20 train/validation; 10-fold CV on train/val; random search hyperparameter tuning of the best model. Split is by match (no point-level leakage across the train/test boundary — the row design also shifts post-outcome columns to avoid in-row leakage).
- Baseline: server's empirical win rate (73.2% / 57.2%).
- Metrics: accuracy, recall, precision, F1, ROC-AUC.

## 7. Numerical results / baselines
Quoted exactly as in the paper:
- **First serve — 10-fold CV (Table 2):** baseline accuracy 73.2%. All four ML models: **accuracy = 73.2%**, recall **0.0%** — "the models rarely or never actually predicts the returner as the winner" (class imbalance 73.2/27.8). Logistic Regression highest precision (31.0%), "due to the low recall score the result is quite unreliable."
- **First serve — tuned XGBoost on test (Table 3):** accuracy **73.4%** vs baseline 73.2% (**+0.2 pp**), recall 1.2%, precision 43.7%, F1 2.3%, ROC-AUC 56.9%. "The model achieves a slight gain in accuracy score compared to the baseline, but in general the overall model performance is questionable."
- **Second serve — 10-fold CV (Table 4):** baseline 57.2%; XGBoost 53.0%, AdaBoost 52.8%, Random Forest 53.0%, Logistic Regression 52.7% — "All models scores roughly 4% lower in accuracy than the baseline."
- **Second serve — tuned XGBoost on test (Table 5):** accuracy **53.1%** vs baseline 57.2% (**−4.1 pp**), recall 44.7%, precision 50.6%, F1 47.5%, ROC-AUC 53.5%. "The Roc-Auc score indicates that the model is slightly better than a random guess."
- **Feature importance (XGBoost gain):** strongest = score/state features — P1SetsWon, P2SetsWon, P2BreakPointWonA/P2BreakPointMissedA, P1Rank/P2Rank, Surface. "The accumulated features for the serve and return position had no significant influence. It has therefore not been possible to identify factors which gives strategic advances in tennis."

## 8. Code / data availability
Repo: https://github.com/illumlol/ANALYSIS-OF-POINTS-OUTCOME-IN-ATP-GRAND-SLAM-TENNIS-USING-BIG-DATA-AND-MACHINE-LEARNING. Data: Jeff Sackmann's public repos. No stated license or environment pinning.

## 9. Leakage & limitations
- Paper's own conclusion (§5): **negative result** — "The Point Winner model performed equal or worse than their baselines… The Roc-Auc was just above 0.5 which indicated that model was not performing much better than a random guess."
- Reviewer: (a) student project, no peer review; data 2016–2020, two Slams only; (b) the only "improvement" (+0.2 pp) comes with 1.2% recall — the model predicts the server virtually always, so the accuracy gain is degenerate; (c) authors note higher-quality spatiotemporal data (Hawk-Eye) exists but is not public; (d) no calibration analysis, no betting-market comparison, no match-level aggregation of point predictions.
- The row design (shifted columns, accumulated features) is careful about leakage — the failure is informational, not methodological: public summary features don't beat the serve prior.

## 10. GSE overlap
No overlap — no duplication. Men's tennis point prediction is outside GSE's NFL/NCAA-first scope. The transferable methodology (accumulated features shifted to avoid leakage) is standard practice GSE's play-by-play feature engineering already follows. Negative-result value: a useful cautionary citation — point-level prediction with public summary features is essentially a degenerate problem (predict the server) — but it changes no GSE modeling decision. Classification: **not duplicate, not extension — irrelevant.**

## 11. GSE implementation spec
Not recommended — rejected. Nothing to implement: the models underperform the naive baseline. Do not build.

## 12. Reproducible test
N/A (rejected). The paper's own test shows the model cannot beat the baseline; there is no positive result to reproduce. Gate closed.

## 13. Acceptance / rejection gate
Reject unconditionally: the paper's own finding is a negative result. No test window could resurrect it.

## 14. Improvement experiment
None from this paper. The authors' suggested extension (Hawk-Eye spatiotemporal features) is explicitly blocked by data availability, and tennis is outside GSE's current sport scope.
