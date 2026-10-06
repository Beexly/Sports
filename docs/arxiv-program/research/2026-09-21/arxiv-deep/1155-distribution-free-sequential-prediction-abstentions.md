# [1155] Distribution-Free Sequential Prediction with Abstentions (arXiv:2602.17918) — REJECTED

**Citation:** Jialin Yu, Moïse Blanchard (2026). *Distribution-Free Sequential Prediction with Abstentions*. arXiv:2602.17918v2 [cs.LG], Georgia Institute of Technology. URL: https://arxiv.org/abs/2602.17918
**Ledger completed:** 2026-09-21. **Read:** full paper (53-page PDF: 17 pages of main text plus appendices read in full through EOF).
**Verdict:** REJECT
Replaced by ledger 1330 ([1330] Available Guardrails: Certifying Selective Prediction across ML Systems, arXiv:2609.22048). Deep, correct theory for a problem GSE does not have.

## 1. Research question
In sequential prediction where an adversary may inject arbitrarily many corrupted instances into an i.i.d. stream, can a learner that may abstain (free on corrupted rounds, penalized on clean ones) achieve sublinear misclassification *and* abstention error for all finite-VC classes **without knowing the clean distribution µ**? (Removes the known-µ assumption of [GHMS23].)

## 2. Dataset / schema
None. Pure theory — no experiments, no data, no simulations.

## 3. Method / model
**AbstainBoost:** (a) *Weak learners* WL(T,z): partition a subset of rounds' instances into m groups, estimate k-shattering probabilities ρ̂^S_k(F) via U-statistics + median-of-means, abstain when min_y ρ^S_k(F^{x→y}) ≥ 0.9ρ^S_k(F) (instance doesn't shrink the version space), else predict argmax label; (b) *Boosting* (Alg. 6): delete each expert's first s predictions, majority-vote among survivors, abstain if < C experts predict; multi-layer deletion over log L rounds. Censored variant C-AbstainBoost (label observed only when predicting).

## 4. Equations & assumptions
- MisErr = Σ_t 1[ŷ_t ∉ {y_t, ⊥}]; AbsErr = Σ_t 1[c_t = 0 ∧ ŷ_t = ⊥] (free abstention on corrupted rounds).
- **Thm. 2 (oblivious):** MisErr ≲ T^{3α}, E[AbsErr] ≲ d² log^{5/3}(T)·T^{1−α}, α ∈ [0,1/3].
- **Thm. 5 (adaptive, finite reduction dimension):** same MisErr; AbsErr ≲ d²(D log D + log T)^{2/3} log(T)·T^{1−α}. Linear classifiers in R^p: Õ(p^{4.67}T^{1−α}).
- **Thm. 3 (lower bound, tight up to poly factors):** some VC-1 class forces E[MisErr] ≥ T^α/32 or E[AbsErr] ≥ T^{1−α}/2 — the polynomial tradeoff is necessary.
- Assumptions: realizable binary classification (clean labels even on corrupted rounds), finite VC dimension, oblivious/adaptive adversary injecting arbitrary instances.

## 5. Features / target
Not applicable — pure theory, no features. Target: label sequence y_t with corruption indicator c_t; abstain decision ŷ_t = ⊥.

## 6. Validation design
Not applicable — no experiments, no simulations; results are theorems with proofs (Appendices read in full).

## 7. Numerical results / baselines
Not applicable — no numerical results. The "results" are the theorems in section 4 above.

## 8. Code / data availability
None — no code, no data released.

## 9. Leakage & limitations
1. **Wrong problem.** GSE does batch prediction on a stochastic (non-adversarial) sports data-generating process. The paper's entire contribution is surviving an adversary that injects *arbitrarily many* corrupted instances — a threat model GSE does not face. Nothing in the paper improves pick selection, calibration, or ROI under GSE's actual data regime.
2. **Nothing implementable beats the alternatives.** The portable mechanisms — disagreement-region abstention (Alg. 2 lines 9–10) and committee majority-vote abstention — are covered more directly and practically by papers **1153** (disagreement among near-optimal policies, with an implementable spec) and **1157** (version-space agreement, same assignment). The boosting-with-deletion trick is specific to the online/adversarial setting and has no batch analogue worth building.
3. **No empirical validation.** Pure theory; even the authors' claims about practicality are absent. Adapting would mean inventing the entire empirical bridge ourselves.
4. The polynomial misclassification/abstention tradeoff (Fig. 1) is a genuine theoretical contribution but a design curiosity for GSE, not an actionable improvement — GSE controls abstention through coverage targets (1154), not through T^{3α} asymptotics.

## 10. GSE overlap
Overlaps with this assignment's own selective-prediction lane (1153, 1154, 1157, 1330), but adds nothing beyond them: 1153/1157 give the implementable abstention mechanisms, 1154 the coverage control, 1330 the certification layer. The adversarial sequential framing has no counterpart in GSE's batch sports pipeline.

## 11. GSE implementation spec
Not applicable — REJECTED; no mechanism is carried forward. Any future adaptation would start from the disagreement-abstention rule via ledgers 1153/1157, not this paper.

## 12. Reproducible test
Not applicable — REJECTED; no empirical claims to reproduce.

## 13. Acceptance / rejection gate
**REJECT** stands: pure adversarial-sequential theory with no implementable GSE mechanism beyond what 1153/1154/1157/1330 already cover. Replacement ledger 1330 (same lane) was read in full and verified ADAPT.

## 14. Improvement experiment
Not applicable — REJECTED; no forward experiment is planned on this paper.
