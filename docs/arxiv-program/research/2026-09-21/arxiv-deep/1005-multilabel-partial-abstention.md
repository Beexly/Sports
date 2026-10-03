# [1005] Reliable Multi-label Classification: Prediction with Partial Abstention (arXiv:1904.09235)

## Citation / full-text source

- arXiv:1904.09235 — full text: https://arxiv.org/pdf/1904.09235
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Vu-Linh Nguyen, Eyke Hüllermeier (2019; v2). *Reliable Multi-label Classification: Prediction with Partial Abstention*. arXiv:1904.09235v2. URL: https://arxiv.org/abs/1904.09235
**Full-text source read:** local cache `/tmp/arxiv750-cache/fulltext/1904.09235.txt` (arXiv conversion; single-line file read in full via chunked extraction — abstract, §§1–9, Table 1, Figures 1–2 described in text, Appendices A–E proofs; figure curves described qualitatively).
**Ledger completed:** 2026-09-21. **Read:** full text.
## Verdict

**ADAPT** — gives a closed-form, O(m log m) per-slate rule for GSE's board: sort games by uncertainty u_i=2·min(p_i,1−p_i), publish the d most certain, skip the rest, with the skip-penalty tuned to the business cost of volume.

## 1. Research question
In multi-label classification (predict a label subset, not one class), can the learner PARTIALLY abstain — predict only the labels it is certain enough about — under a principled generalized-loss framework, with exact risk-minimizing rules for the Hamming loss, rank loss, and F-measure?

## 2. Dataset / schema
Six MULAN benchmarks (Table 1): cal500 (502 instances, 68 features, 174 labels), emotions (593, 72, 6), scene (2407, 294, 6), yeast (2417, 103, 14), mediamill (43907, 120, 101), nus-wide (269648, 128, 81). Base learner: binary relevance with sklearn logistic regression (C=1 default); classifier-chain results in supplement. Protocol: 10-fold cross-validation.

## 3. Method / model
Formalization: partial prediction ŷ ∈ {0,1,⊥}^m with decision set D(ŷ) (predicted labels) and abstention set A(ŷ). Generalized loss L(y,ŷ) = ℓ(y_D, ŷ_D) + f(|A(ŷ)|) (Eq. 9/10): original loss on predicted part plus abstention penalty; linear special case L = ℓ + |A|·c, c∈[0,1] (Eq. 11); also concave f_2(a)=(a·m·c)/(m+a) (decreasing marginal abstention cost). Desiderata: reduction (no abstention → original loss), monotonicity (correct ≻ abstain ≻ wrong), uncertainty-alignment (abstain on most uncertain labels, u_i = 2·min(p_i,1−p_i)). Results: Prop. 1 — for decomposable ℓ, risk-minimizer found in O(m log m): sort labels by label-wise expected loss s_i = min_{ŷ_i} E[ℓ_i], choose optimal prediction size d via argmin_d E[ℓ(y,ŷ_d)] + f(m−d). Corollary 1/2 (Hamming): sort by uncertainty u_i; with linear penalty, optimal d = |{i : min(p_i,1−p_i) ≤ c}| — a pure threshold rule; monotonic if f(k+1)−f(k) ≤ 1; uncertainty-aligned. Rank loss: partial rankings over subsets K, optimal K = top-d by p_i under conditional independence (Prop. 2), O(d² log d)-type procedure. F-measure: generalized F_G (Eq. 28, non-monotonic per Remark 3); under label independence, maximizer has decision set ⟨k,l⟩ = {1..k}∪{l..m} in p_i-sorted order (Lemma 4), found in O(m³) (Prop. 3).

## 4. Equations & assumptions
- u_i = 2·min(p_i,1−p_i) (Eq. 8); L(y,ŷ)=ℓ(y_D,ŷ_D)+f(|A(ŷ)|) (Eq. 10); ŷ=argmin_{1≤d≤m} E[ℓ(y,ŷ_d)]+f(m−d) (Eq. 12).
- Hamming: E[ℓ_H] = Σ_{ŷ_i=1}(1−p_i) + Σ_{ŷ_i=0}p_i; threshold rule d=|{i: min(p_i,1−p_i)≤c}|.
- Rank loss ℓ_R(y,π)=Σ_{(i,j):y_i>y_j}⟦π⁻¹(i)>π⁻¹(j)⟧ (Eq. 16); F_G generalized F-measure (Eq. 28).
- Assumptions: i.i.d. data; conditional probabilities p_i available from base learner; rank/F results assume conditional label independence p(y|x)=∏p_i^{y_i}(1−p_i)^{1−y_i} (Eq. 33).

## 5. Features / target
Features: dataset-native (audio features cal500, etc.); method consumes only per-label marginal probabilities p_i(x) from the base learner. Target: true label subset y ∈ {0,1}^m; partial prediction ŷ ∈ {0,1,⊥}^m.

## 6. Validation design
All competitors share the same BR+LR probabilities; they differ only in how probabilities become (partial) predictions: full prediction (MLC baseline), full abstention (ABS baseline), SEP (linear penalty f_1, Hamming c∈[0.05,0.5], rank c∈[0.1,1]), PAR (concave f_2, Hamming c∈[0.1,1], rank c∈[0.2,2]). Metrics: average generalized loss + average abstention rate |A|/m, 10-fold CV. No significance tests reported.

## 7. Numerical results / baselines
Results are figure curves (Figs. 1–2, three datasets shown, rest in supplement — qualitative as extracted): partial-abstention Hamming loss "often much lower" than both full prediction and full abstention across datasets; as c rises, loss rises and abstention rate falls; SEP converges to MLC performance at c=0.5, PAR at c=1 (sanity: at max penalty, never abstain). Rank loss: same pattern with slower convergence to MLC. No numeric tables or CIs extracted in the main text — all results are chart-read.

## 8. Code / data availability
None stated. Data: MULAN repository (public, http://mulan.sourceforge.net/datasets.html); base learner via scikit-multilearn.

## 9. Leakage
Standard 10-fold CV; probabilities and abstention decisions both derived in-fold — no leakage evident. Caveat: c swept and curves shown on the same CV — penalty selection would need a nested split in production.

## Limitations
- All headline results are figures without numeric tables — cannot quote exact loss values.
- No significance testing; "often much lower" is qualitative.
- Rank/F-measure optimality needs conditional label independence — false for correlated game outcomes on a slate.
- Base learner is weak (BR+LR) by design; gains may shrink with strong calibrated models.
- Abstention penalty c is a free knob with no principled calibration to real costs.

## 10. GSE overlap
Directly complements 1003 (general metric-targeted abstention via MC) and 1004 (per-component abstention on structured outputs): this paper gives the CHEAP closed-form version — sort-by-uncertainty + threshold/pick-d with O(m log m). No repo file implements per-slate selective publishing; gap #4 (learning-to-abstain with coverage-risk curves) again. The concave penalty f_2 is new vs 1003/1004: decreasing marginal cost of extra skips, which matches the board's economics (first skipped game costs more volume than the tenth). Extension, not duplicate.

## 11. GSE implementation spec
**Slate publish filter v1**: for each weekly slate of m games, get calibrated cover/total probabilities p_i from the engine; compute u_i = 2·min(p_i, 1−p_i); sort ascending; choose d = argmin_d [expected Hamming-style loss on published d + f(m−d)] with linear penalty c tuned on 2024 season (grid c∈[0.05,0.5]); publish top-d, skip rest. v2: concave penalty f_2 with c tuned to the marginal revenue cost of a skipped game. Rank-loss variant: rank games by edge and publish top-d by expected rank-loss. Effort: <1 day Python; runs on existing calibrated probabilities.

## 12. Reproducible test
2024 full NFL season, weekly slates: apply the threshold rule with c from a 2023 tuning split (nested — no test leakage); metric: hit rate and profit of published picks vs publish-all and vs the 1003-style fixed-k filter; time-ordered, fixed stakes.

## 13. Acceptance / rejection gate (numeric gate)
ADOPT if the uncertainty-sorted publish filter beats publish-all by ≥2.0 pp hit rate with Wilcoxon p<0.05 across the 18 weekly slates of 2024, at comparable or lower volume; otherwise REJECT. The single decisive number: **hit-rate delta ≥ +2.0 pp vs publish-all, p<0.05 over 18 slates**.

## 14. Improvement experiment
Calibrate the penalty to money: replace the abstract c with c = (marginal revenue of one published game)/(expected loss of one wrong published pick), estimated from the 2024 season's actual per-pick P&L — turning the abstention knob into a profit-maximizing rule rather than a tuned hyperparameter. Compare profit-tuned c vs grid-tuned c on 2025 holdout; expect the profit-calibrated version to choose smaller d in low-edge weeks automatically.
