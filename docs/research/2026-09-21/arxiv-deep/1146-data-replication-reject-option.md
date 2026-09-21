# [1146] The Data Replication Method for the Classification with Reject Option (arXiv:1011.3177)

**Citation:** Sousa, R.; Cardoso, J. S. (2011/2018). *The Data Replication Method for the Classification with Reject Option*. arXiv:1011.3177. URL: https://arxiv.org/abs/1011.3177
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, arXiv:1011.3177v3 [cs.CV]).
**Verdict:** ADAPT

The data-replication trick learns a reject region with a single standard binary classifier — no post-hoc thresholds, no separate confidence model — and it maps directly onto GSE's pick-abstention lane: a principled, trainable "don't bet this game" region instead of hand-tuned confidence cutoffs.

## 1. Research question
Can classification with a reject option (a third "send to human review" class between good/bad) be reduced to a single standard binary classification problem — avoiding both intersecting-boundary pathologies of the two-classifier approach and the non-standard optimization of embedded-reject SVMs?

## 2. Dataset / schema
- SyntheticI: 400 points uniform in [0,1]², labels from hyperbolic transition zones α = 10(x₁−0.5)(x₂−0.5) with Gaussian noise ε₁∼N(0,0.125²).
- SyntheticII: 400 points from two 2-D Gaussians (means [−2,−2]ᵀ and [+2,+2]ᵀ, covariances diag(9,9)/diag(25,25)) + uniform noise ε∈[0.025,0.25].
- BCCT: 960 breast-cancer conservative-treatment observations, 30 aesthetic measurements; binary version aggregates {Excellent,Good} vs {Fair,Poor}; multiclass version keeps 4 ordered classes.
- SyntheticIII: 5-class extension of SyntheticI; SyntheticIV: SyntheticII + third Gaussian (mean [7,7]ᵀ, Σ=4I); Letter AH dataset (mentioned in results).
- Protocol: train on 5%, 25%, 40% of data; 100 random splits; hyperparameters via 5-fold CV grid search; evaluation = Accuracy-Reject (A-R) curves over rejection cost wr < 0.5.

## 3. Method / model
View the three outputs as ordered: C₁ < C_reject < C₂. Replicate each training point twice into R^{d+1}: [x; h] and [x; 0] (h = const). In replica 1 (extension 0), discriminate C₁ vs {C_reject, C₂} with HIGH cost on C₂ errors (biases boundary toward C₂ accuracy); in replica 2 (extension h), discriminate {C₁, C_reject} vs C₂ with HIGH cost on C₁ errors. Train one binary classifier on the 2ℓ replicated points; its intersection with each replica subspace yields two non-intersecting boundaries. Prediction: classify both replicas; label sequences (C₁,C₁)→C₁, (C₂,C₁)→reject, (C₂,C₂)→C₂. Mapped to SVMs (rejoSVM: standard binary SVM on replicated data, objective adds ½(b₂−b₁)²/h² for unique thresholds) and NNs (rejoNN: partially linear output G(x) = G(x) + wᵀe_i). Extended to K-class ordinal with 2(K−1) replicas and K−1 reject regions.

## 4. Equations & assumptions
- Loss: L = 0 if correct, w_r if reject, 1 if error; empirical risk = w_r·R + E, 0 ≤ w_r ≤ 1 (w_r = C_low/C_high = normalized rejection cost).
- SVM: min ½wᵀw + ½(b₂−b₁)²/h² + CΣ_{q,k,i} C_{i,q}^{(k)}·sgn(ξ_{i,q}) s.t. the 4 standard margin constraints per replica (usually with ξ instead of sgn(ξ) for efficiency).
- K-class: 2(K−1) boundaries wᵀx + b_i, reject regions between boundaries (2j−1, 2j); prediction from count of C₂ labels N_{C₂}: reject if N_{C₂}/2+1 non-integer.
- Assumptions: ordered outputs (reject is "between" classes — valid for abstention); both classes contribute to each threshold so order constraints hold automatically; w_r < 0.5 (above that, random guessing beats rejecting).

## 5. Features / target
Generic: any binary/ordinal classification features; the replication machinery is classifier-agnostic. GSE mapping: game-level features (spread, total, model edge, market movement); target = {bet side A, ABSTAIN, bet side B} ordered by model edge sign.

## 6. Validation design
A-R curves (accuracy at each reject rate) across w_r ∈ (0, 0.5), three training-size regimes, 100 repetitions; compared against: two-independent-classifiers approach, single classifier with post-hoc threshold, Fumera's embedded-reject SVM (linear kernel only), and a Frank–Hall-style ordinal extension. MATLAB code released for reproducibility.

## 7. Numerical results / baselines
- rejoSVM outperformed all comparators over the FULL w_r range on SyntheticI, SyntheticII, binary BCCT, SyntheticIII, SyntheticIV, and 4-class BCCT (Figs. 10–19).
- rejoNN was the best NN-based method in most settings, though SVM-based methods beat NN-based ones overall.
- Key qualitative wins claimed: (1) single standard binary classifier; (2) reject region learned during training, not set post-hoc; (3) no intersecting/ambiguous regions by construction; (4) one direction (parallel boundaries) → interpretable.
- No exact numeric table values reported — all results are A-R curve figures.

## 8. Code / data availability
MATLAB code: http://www.inescporto.pt/~jsc/ReproducibleResearch.html (legacy URL, likely dead; not verified). Fumera's baseline code was C/C++, linear-kernel only. Datasets: synthetic (regenerable from the paper's equations); BCCT from Cardoso & Cardoso 2007.

## 9. Leakage & limitations
- **No exact numbers** — every result is a curve figure; can't extract a single accuracy/reject-rate operating point for the report.
- **Legacy code link** probably dead; rejoSVM needs MATLAB Bioinformatics Toolbox (proprietary).
- **Parallel-boundary restriction**: both reject boundaries share one direction w — less flexible than fully independent boundaries; the paper frames this as interpretability, but it's a capacity constraint.
- **Fumera baseline may have been misused** (authors admit possible incorrect use of the provided implementation; only linear kernel available, so they hand-extended features with quadratic terms — an uneven comparison).
- **w_r must be chosen**, just like a threshold — the "no thresholds" claim is about post-hoc cutoffs, but the rejection cost w_r is still a hyperparameter that traces the A-R curve.

## 10. GSE overlap
GSE's abstention lane currently rests on conformal prediction intervals and hand-set confidence rules (per the calibration-lane work). What's missing: a **trainable abstention classifier** that learns the "don't bet" region from data rather than from a fixed coverage level or a manual edge cutoff. This paper is the cleanest such mechanism in the wave-3 set — and it composes with the conformal work (conformal gives interval width as a feature; rejoSVM learns the reject boundary over it). Complements 1147/1148/1149 (reject-option papers below) — this one is the most implementation-ready because it reduces to a standard SVM/NN.

## 11. GSE implementation spec
Build a **trainable pick-abstention layer** for the GSE engine:
1. For each historical pick (2019–2024, model v5.x), construct features: model edge vs closing line, interval width (from cqr.ts), market steam (line movement), sport/league, days-to-game, model version; label = {win, loss} (pushes excluded or as abstain-neutral).
2. Apply data replication: duplicate each pick into [x;0]/[x;h], cost structure C_high on the "wrong side" errors per replica; train a single binary classifier (sklearn SVC or a small NN) to get bet-A / ABSTAIN / bet-B regions.
3. Sweep w_r ∈ (0, 0.5) to trace the A-R curve: accuracy on non-abstained picks vs abstention rate; pick the operating w_r that maximizes ROI under GSE's staking (Kelly), not raw accuracy.
4. Ship as a pre-bet filter: engine outputs pick + abstain flag; abstained games never reach the card.
Effort: ~1 week (feature table exists in the picks DB; replication + SVC is <200 lines).

## 12. Reproducible test
Dataset: GSE engine picks table (3,411 picks, model v5.2.7) with realized outcomes. 5-fold time-series CV. Baselines: (a) no abstention, (b) fixed edge-threshold abstention (current practice), (c) conformal-width abstention. Metrics: ROI and win rate on retained picks at matched abstention rates (10%, 20%, 30%). Success: rejoSVM-style abstention beats the fixed-threshold baseline on ROI by ≥2 percentage points at the 20% abstention rate, with the A-R curve dominating the baselines across w_r.

## 13. Acceptance / rejection gate
ADOPT the trainable abstention layer into the engine only if: (a) it beats fixed-threshold abstention on out-of-sample ROI at ≥2 abstention rates, (b) the learned reject region is stable across CV folds (boundary direction cosine similarity ≥0.8 — else it's noise-fitting), and (c) abstention doesn't concentrate on a single league/market (no degenerate "abstain all NBA totals" solution). Otherwise keep conformal-width gating.

## 14. Improvement experiment
Replace the parallel-boundary restriction with a **two-stage learned gate**: stage 1 = rejoSVM for a coarse abstain region; stage 2 = a small gradient-boosted model on the retained picks' features that outputs a continuous "bet quality" score for Kelly sizing. Hypothesis: the abstention decision and the sizing decision want different features (abstention wants uncertainty signals like interval width and steam; sizing wants edge magnitude), and decoupling them beats the paper's single-direction model — test by comparing ROI of the two-stage system vs pure rejoSVM at matched bet counts.

---

**Notes for tracker:** arXiv:1011.3177v3 [cs.CV]. Primary ledger #1146 in reader-05 wave-3 set. Full text read.
