# [1774] A Theory of Selective Prediction (arXiv:1902.04256)

**Citation:** (authors as listed on arXiv) *A Theory of Selective Prediction*. arXiv:1902.04256. URL: https://arxiv.org/abs/1902.04256
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, sections 1–2 (Algorithm 1, Lemma 2.1, matching lower bound §2.3), smooth-function extension Theorem 1.4, concatenation-concave extension, references).
**Verdict:** ADAPT — the "choose which future window to predict, and adaptivity buys almost nothing" result is a scheduling principle for GSE: pick the bettable window of the season/slate up front rather than re-optimizing it adaptively, but it needs translation from sequence-means to sports betting cadence.

## 1. Research question
In a purely adversarial setting (no stochastic model of the data), can a predictor do better than trivial error by *choosing which part of the sequence to predict* — i.e., observing x_1…x_t and then naming a future interval (t, t+m] and a target statistic f_m of that interval — and does choosing the window *adaptively* (after seeing data) beat fixing it in advance (non-adaptive)?

## 2. Dataset / schema
Theory-only paper. No datasets, no experiments, no empirical schema. All results are worst-case over arbitrary bounded sequences x ∈ [0,1]^n of length n.

## 3. Method / model
The predictor first selects a prediction window (a time t and interval length m) — Algorithm 1 fixes this choice up front (non-adaptively) using a dyadic scheme over k = ⌊log_2 n⌋ scales. Intuition: a sequence cannot be simultaneously high-variance at all scales; if the adversary makes every single point unpredictable (uniform random bits), the whole-sequence average concentrates and is predictable. The algorithm exploits this scale trade-off: it finds a scale at which the variance is controlled and predicts the mean over that window. The main theorem shows the adaptive version (choosing t, m after seeing data) gains only a constant factor over the non-adaptive one.

## 4. Equations & assumptions
- Lemma 2.1: for integer k ≥ 1, Algorithm 1 achieves expected squared loss ≤ 1/k on any sequence of length 2^k. Remark 2.2: with k = ⌊log_2 n⌋ this gives O(1/log n) for general n.
- Theorem 1.1 (mean estimation): ∃ algorithm with expected squared loss O(1/log n) on any sequence of length n; tight: ∃ distribution over sequences where no algorithm beats Ω(1/log n). The O(1/log n) upper bound was first shown in Drukh (2013); the matching lower bound resolves that work's open question.
- Lower bound (§2.3): for any predictor A, there exists a binary sequence of length n on which A incurs expected squared loss ≥ 1/64. The construction builds anti-concentration at both small and large timescales simultaneously.
- Theorem 1.4 (L-smooth statistics w.r.t. earth mover's distance, Def. 1.2–1.3): expected absolute loss O(L/√log n).
- Concatenation-concave families (Def. 1.5: f_{m1+m2}(x,y) ≥ (m1/(m1+m2)) f_{m1}(x) + (m2/(m1+m2)) f_{m2}(y)): expected squared loss O(1/log n).
- Assumptions: sequences are bounded (𝒳 = [0,1]); the adversary is arbitrary but fixed; the statistic family is known to the predictor.

## 5. Features / target
Not applicable (theory). The "target" is the value of the chosen statistic f_m over the chosen future window; the "features" are the observed prefix of the adversarial sequence.

## 6. Validation design
Not applicable — no empirical validation; validation is by proof (upper-bound algorithm + matching lower bound).

## 7. Numerical results / baselines
No numerical experiments. The quantitative content is the rates: O(1/log n) squared loss for means (upper and lower), O(L/√log n) absolute loss for L-smooth statistics, O(1/log n) for concatenation-concave families, and the explicit constant 1/64 in the lower-bound lemma.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- No empirical validation of any kind; the rates are worst-case over adversarial sequences, so they may be extremely pessimistic for real sports data with structure.
- The model predicts *statistics of intervals*, not individual events — mapping to per-game picks requires an extra reduction step.
- The 1/64 lower-bound constant is for binary sequences and mean estimation; it says nothing about classification accuracy ceilings.
- Adversarial, non-stochastic framing ignores the fact that NFL outcomes have stable base rates GSE can exploit (the paper's algorithm doesn't use any distributional knowledge).

## 10. GSE overlap
New capability, no duplicate: the existing-research map notes "Selection-under-budget, learning-to-abstain with coverage-risk curves" as an unread gap, and nothing in the corpus addresses *when* to predict (scheduling) as opposed to *whether* to predict (gating). GSE currently commits to a fixed weekly slate; this paper gives a principled lens on the commit-up-front vs adapt-week-by-week choice.

## 11. GSE implementation spec
Translate the principle into a **bet-window selection protocol**: (a) define the "sequence" as the season's weekly slates and the "statistic" as weekly ROI or hit-rate over a chosen window of weeks; (b) implement the paper's non-adaptive lesson operationally: pre-commit the *gating strictness schedule* (e.g., which weeks get full-card vs reduced-card treatment) at season start based on historical variance structure, rather than re-tuning thresholds week to week on noisy recent results; (c) test whether an adaptive window choice (skipping a week entirely after a bad run) beats the pre-committed schedule — the paper predicts the adaptive gain is small, so if GSE's backtest shows a large adaptive gain, that diagnoses overfitting in the adaptive rule, not genuine signal. Effort: ~1 week (analysis-only; no new model).

## 12. Reproducible test
Dataset: GSE's graded picks history (or public ATS records, 2018–2025). Metric: cumulative squared error of weekly hit-rate vs predicted hit-rate (the "statistic over a window"). Baseline: fixed weekly schedule. Candidate: an adaptive rule that skips/reduces weeks based on trailing performance. Compare realized error; the paper predicts the adaptive rule should not beat the fixed schedule by more than a small constant factor.

## 13. Acceptance / rejection gate
ADAPT accepted if the backtest shows the pre-committed gating schedule's error is within a small factor of any adaptive alternative's (confirming the theory's practical bite: stop over-tuning weekly gates); rejected if adaptive scheduling wins by a large, stable margin (theory misfires on sports data, keep the adaptive machinery).

## 14. Improvement experiment
Extend the analysis to *which games within a week* (not just which weeks): define the window over the ordered slate (e.g., sorted by model edge) and test whether predicting the top-m edge games of each slate beats predicting a fixed m — a per-slate selective-prediction reduction that turns the paper's time-window idea into a within-week coverage rule.

**Verdict:** ADAPT — the window-selection/abstention-as-scheduling principle ports to GSE's weekly card construction, but the paper is pure adversarial-sequence theory and needs a full sports-data translation before any of it touches production.
