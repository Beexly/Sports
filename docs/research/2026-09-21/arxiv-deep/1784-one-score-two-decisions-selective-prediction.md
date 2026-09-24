# [1784] One Score, Two Decisions: Selective Prediction on the Rare-Disease Tail (arXiv:2608.14683)

**Citation:** Zhaoyang Jiang et al. *One Score, Two Decisions: Selective Prediction on the Rare-Disease Tail*. arXiv:2608.14683. URL: https://arxiv.org/abs/2608.14683
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, feasibility check §5.2 / Eq. 2, score decomposition Eq. 3, margin-vs-top-score experiments on Exomiser/SciFact/entity linking, Proposition 1 unidentifiability proof, Phenopacket Store benchmark: 10,374 cases / 780 diagnoses / 8,553 ranked candidates, conclusion).
**Verdict:** ADAPT — the two distinctions are both directly usable: (1) the feasibility ceiling (selective accuracy ≤ min(1, p/c)) is a go/no-go check GSE should run before any gating project, and (2) the top-two margin vs top-score decomposition tells GSE to gate on edge-over-alternatives (margin), not raw confidence; the unidentifiability result is a warning that the choice must be settled empirically, not by staring at score distributions.

## 1. Research question
In selective prediction over *ranked* outputs, two confusions are routine: (a) people try to hit selective-accuracy targets that are mathematically infeasible given the base model's accuracy, and (b) the same top score is thresholded for two different decisions — "is the top candidate correct?" vs "is any correct candidate present?" Do these two decisions need different signals, and can the better signal be identified from unlabeled scores alone?

## 2. Dataset / schema
Phenopacket Store v0.1.27: 10,374 real patient cases (HPO phenotype terms) with confirmed OMIM diagnoses; 780 distinct diagnoses as labels; retriever ranks all 8,553 candidates per case. Rankers: eight small open-weight LLMs (differential diagnosis) + phenotype-only Exomiser. Auxiliary confirmations: SciFact retrieval and biomedical entity linking.

## 3. Method / model
Three claims: (1) **Feasibility** (Eq. 2, §5.2): if the predictor is correct on fraction p of cases and answers fraction c, even a *perfect* confidence ranking can't exceed selective accuracy min(1, p/c) — check this *before* comparing confidence estimators. (2) **Score decomposition** (Eq. 3): each candidate's score = a case-level component shared across candidates + a candidate-specific residual; the top-two *margin* cancels the shared component, so it reads "which candidate is correct" from the residual gap — while the *top score* retains case-level information ("is any answer present?"). (3) **Unidentifiability** (Prop. 1): no functional of the unlabeled score distribution can tell you whether the margin or the top score gates better — the choice needs labeled data or an intervention (§5.5's mechanism experiment).

## 4. Equations & assumptions
- Feasibility ceiling: selective accuracy ≤ min(1, p/c), where p = base accuracy, c = coverage. Recalibration/rescoring cannot beat it — confidence only reorders correct answers.
- Eq. (3): s_i(x) = a(x) + r_i(x) — score = shared case-level term + candidate-specific residual; the margin s_1 − s_2 = r_1 − r_2 cancels a(x).
- Eq. (5): no zero-sum contrast over candidates can recover the discarded case-level information (presence detection needs a(x), which the margin destroys).
- Proposition 1: two joint laws with identical unlabeled score distributions P_S and identical base accuracy, but margin-vs-top-score gains of opposite sign (+1/2 vs −1/2 in the construction) — so no unlabeled-score functional identifies the better gate.
- Domain condition for the margin: meaningful only when one predictor scores a common candidate set with distinct top-two alternatives on a common scale (fails for free-form generator samples, App. B.6).

## 5. Features / target
Patient HPO phenotype terms → ranked differential diagnosis (8,553 OMIM candidates). The meta-decision: endorse the top candidate or defer the case for review.

## 6. Validation design
Feasibility audit first (8 LLMs' Recall@1 on ultra-rare diseases), then head-to-head gating: top-score threshold vs top-two-margin threshold at fixed coverage, on Exomiser + SciFact + entity linking; the §5.5 mechanism experiment intervenes on scores (outside Prop. 1's scope) to confirm the causal story.

## 7. Numerical results / baselines
- Feasibility: across 2,000 prevalence-stratified records, eight small LLMs achieve at most 4.6% Recall@1 on ultra-rare diseases — so at 10% coverage, even perfect confidence ranking can't reach 50% selective accuracy (ceiling: min(1, 0.046/0.10) = 46%). The limit is regime-specific (more accurate models pass the check).
- Exomiser (phenotype-only): top-two margin selects 10% of cases at 29.0% accuracy vs 13.3% overall; the top score provides no reliable gate.
- SciFact + entity linking confirm the split: correctness reads from the residual gap (margin), presence needs the case-level component the margin discards.
- Prop. 1's construction: margin-selects-perfectly under P_+, top-score-selects-perfectly under P_−, identical unlabeled scores — the sign of the gain is unidentifiable without labels.

## 8. Code / data availability
Phenopacket Store v0.1.27 (public). No model code stated in the extracted text.

## 9. Leakage & limitations
- Medical ranking domain; the "candidate set" structure (one scorer, common scale, distinct alternatives) must hold for the margin story to transfer — GSE's "candidates" (bet sides) need checking against App. B.6's condition.
- Prop. 1 is a worst-case unidentifiability: in practice the margin often wins, but the paper forbids *assuming* it.
- The feasibility ceiling uses base accuracy p measured on the *deployed* distribution — under shift, p is misestimated and the ceiling misleads.

## 10. GSE overlap
New distinctions, no duplicate: GSE gates on raw model probability (the "top score") — nothing in the corpus considers the *margin* (edge of the pick over the next-best alternative: model prob vs market-implied prob, or best vs second-best model) as the gate signal, and nothing runs the feasibility ceiling check. The existing-research map's abstention gap covers both.

## 11. GSE implementation spec
Two adoptions: (a) **Feasibility gate**: before any gating project, compute p (base hit-rate) and target c (card size / slate size); if the target selective hit-rate exceeds min(1, p/c), kill or rescope the project — no threshold tuning can beat arithmetic. (b) **Margin gating**: define GSE's margin as model-implied probability minus market-implied probability (the edge over the *alternative* of betting the other side / not betting); gate the card on this margin rather than raw model confidence, per Eq. (3)'s logic — the margin cancels game-level "everybody's uncertain" effects (bad weather, backup QB news) that inflate/deflate all probabilities together. Effort: ~1 week (the margin feature is one line; the feasibility check is a spreadsheet).

## 12. Reproducible test
Dataset: GSE graded picks with model probs and market-implied probs. Test 1 (feasibility): compute the ceiling for the current card size; check whether the card's target hit-rate is below it. Test 2 (margin vs top-score): at fixed coverage, compare selective hit-rate gating on raw model prob vs on (model prob − market prob); the paper predicts the margin wins where case-level uncertainty is shared.

## 13. Acceptance / rejection gate
ADAPT accepted if margin-gating beats top-score gating by ≥ 2 points of selective hit-rate at the posted-card coverage on walk-forward seasons (respecting Prop. 1: decided empirically, not assumed); the feasibility check is adopted unconditionally (it's arithmetic). If the margin doesn't win, keep top-score gating — the paper explicitly licenses that outcome.

## 14. Improvement experiment
Decompose GSE's margin further à la Eq. (3): split the model-vs-market gap into a *game-level* component (total uncertainty both sides share — e.g., weather) and a *side-specific* residual. Test gating on the residual alone vs the full margin: the paper's theory says the residual is the correctness signal and the shared component is presence information — in betting, "presence" (is there *any* edge on this game?) vs "correctness" (is *this side* the edge?) may want different thresholds, i.e., literally two decisions from one score.

**Verdict:** ADAPT — the feasibility ceiling is a mandatory pre-check for every GSE gating project and margin-over-top-score is the most actionable gating change in this wave, but Prop. 1 means the margin's superiority must be proven on GSE's own graded picks, not taken on faith.
