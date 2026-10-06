# [1539] Research on dynamic analysis and prediction model of tennis match based on Bayesian probability and analytic Hierarchy process (arXiv:2407.07116)

**Citation:** Chuangqi Li (2024). *Research on dynamic analysis and prediction model of tennis match based on Bayesian probability and analytic Hierarchy process*. arXiv:2407.07116. URL: https://arxiv.org/abs/2407.07116
**Ledger completed:** 2026-09-21. **Read:** full text (pdftotext of PDF).
**Verdict:** REJECT — the "Bayesian" content is a single textbook application of Bayes' rule to raw serve-first win counts (no priors over model parameters, no posterior inference, no MCMC, no uncertainty quantification); the remaining machinery is frequentist logistic regression by MLE, hand-tuned momentum scores with arbitrary constants, subjective AHP pairwise weights, and descriptive wavelet plots. It offers no Bayesian or state-space methodology worth adapting for GSE.

## 1. Research question
Analyze the 2023 Wimbledon men's final (Alcaraz vs Djokovic, "match 1701") with a multi-timescale win-rate classifier, an ad hoc "momentum" score, AHP-based momentum evaluation, wavelet trend analysis, and generalization tests on women's matches — framed as coaching advice.

## 2. Dataset / schema
Point-by-point data from the 2023 Wimbledon gentlemen's final (Alcaraz–Djokovic, labeled match 1701), plus "other competition datasets" and newly collected women's tennis data (sources unspecified). Features: serve order, point/game/set winners, unforced errors, running distance, psychological proxies, consecutive-scoring streaks. Preprocessing: negative AD values set to 50, mean imputation, categorical encoding (F=1 forehand, B=2 backhand).

## 3. Method / model
(1) "Bayesian probability": P(W|B) = P(B|W)P(W)/P(B) computed from empirical counts — the average P(player 1 wins | serves first) = 0.6734, failure 0.3266 — used as class labels for a multinomial logistic regression (Eqs. 4–9) fit by MLE/backpropagation. (2) Momentum score: P(n) = a1·M(n) + a2·N(n) (15), where M(n) averages points over ±1 games and N(n) over ±3 games, plus exponential bonuses e^{2k}/e^{k} for k consecutive scoring games (Eqs. 16–17), with hand-set α1 = 0.0012, β1 = 0.0025, w1 = 0.7, w2 = 0.3. (3) AHP: 9-scale pairwise judgment matrices, consistency ratio CR = 0.085 < 0.1. (4) Cosine-similarity trend test between momentum score and win rate (poly22 surface fit, R² = 0.7599; cosine similarity 0.0923). (5) Wavelet transform W(a,b) (Eq. 25) time-frequency plots of the momentum signal. (6) Generalization: decision tree/KNN/SVM/XGBoost comparison on other matches and women's data.

## 4. Equations & assumptions
- P(W|B) = P(B|W)·P(W)/P(B) (1); P(P1 wins|P1 starts) = P(wins ∧ starts)/P(starts) (2–3). These are empirical frequency ratios, not Bayesian inference — no prior/posterior over parameters.
- Sigmoid S(z) = 1/(1+e^{−z}) (4); multinomial logits (5–9) fit by MLE.
- P(n) = a1·M(n) + a2·N(n), a1+a2 = 1 (15); M1(n), N1(n) with e^{2k}, e^{k} streak bonuses (16–17); α1+α2 = 0, β1+β2 = 0 (18); 0 ≤ P(n) ≤ 1 (19).
- AHP weights (20–23); wavelet W(a,b) = ∫ f(t)·φ((t−b)/a)/√|a| dt (25).
Assumptions: hand-set momentum constants; AHP pairwise judgments are subjective; women's generalization via renormalizing men's model to best-of-3.

## 5. Features / target
Inputs: serve order, streak lengths, score differentials, running distance, "psychological factors." Targets: 4-class win-probability label {0, 0.3266, 0.6734, 1}; momentum score. Horizon: within-match (per-round).

## 6. Validation design
Table 2: classification metrics on the 4-class problem (accuracy ~0.91–0.93, macro-F1 0.912, micro-F1 0.931, ROC curves). Momentum-vs-win correlation via surface fit; women's-data "migration" shown only as fitted plots (Figures 10–11), no numeric generalization metrics. Benchmarks: decision tree, KNN, SVM, XGBoost for the generalization check (no numbers reported).

## 7. Numerical results / baselines
Paper's reported numbers (quoted): P(win | serve first) = 0.6734; classification accuracy 0.913–0.932 across classes, precision 0.911–0.996, F-measure 0.856–0.955; poly22 R² = 0.7599; cosine similarity 0.0923 (notably low — undermines the claimed "strong correlation" between momentum score and win rate); AHP CR = 0.085. No predictive-accuracy numbers on held-out matches; no Brier/log-loss.

## 8. Code / data availability
None stated — no code; data sources unnamed ("existing data set," "newly collected female tennis data").

## 9. Why it fails the lane bar
(1) No Bayesian modeling: Bayes' theorem is applied once to count data; there is no prior, no likelihood over parameters, no posterior, no credible interval anywhere in the paper. (2) The "multi-time scale logistic regression" is plain MLE classification of labels derived from the same Bayes-rule computation — circular. (3) Momentum constants (α1 = 0.0012, β1 = 0.0025, w1 = 0.7) are asserted without estimation or sensitivity analysis. (4) AHP is subjective expert weighting, not statistical inference. (5) The cosine similarity of 0.0923 contradicts the claimed strong momentum–win-rate correlation. (6) No code, no named data, no proper scoring, no baselines beaten — nothing to replicate or adapt. Tennis-momentum heuristics of this form have no path into GSE's calibrated probabilistic forecasting.

## 10. GSE overlap
None — no momentum/win-probability modeling of this kind in the corpus, and none is wanted at this level of rigor.

## 11. GSE implementation spec
N/A — rejected.

## 12. Reproducible test
N/A — rejected.

## 13. Acceptance / rejection gate
REJECT stands: to be reconsidered it would need genuine Bayesian inference (priors, posteriors, MCMC) over a well-defined probability model with proper out-of-sample scoring. Replacement: arXiv:2203.10706 (ledger 1546).

## 14. Improvement experiment
N/A — rejected.
