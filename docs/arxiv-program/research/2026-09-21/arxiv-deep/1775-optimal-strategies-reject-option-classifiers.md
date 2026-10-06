# [1775] Optimal strategies for reject option classifiers (arXiv:2101.12523)

**Citation:** (authors as listed on arXiv) *Optimal strategies for reject option classifiers*. arXiv:2101.12523. URL: https://arxiv.org/abs/2101.12523
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, theory sections 2–4 (three reject models, proper uncertainty scores, SELE loss), section 5 experiments: 5.1 score-learning methods, 5.2 classification on 11 datasets, 5.3 ordinal regression Table 3, 5.4 structured output, conclusion).
**Verdict:** ADAPT — the unification (cost-based, bounded-improvement, bounded-coverage all share one Bayes classifier + randomized selection) plus the Fisher-consistent learned-score recipe and the AuRC-as-expected-coverage-quality interpretation give GSE both a cleaner gating theory and a concrete, better-performing score learner; needs adaptation to sports features and bankroll loss.

## 1. Research question
What is the optimal strategy for classification with a reject option under three different formulations — (i) cost-based (rejecting costs d), (ii) bounded-improvement (minimize risk subject to beating a baseline by a margin), (iii) bounded-coverage (minimize risk at a fixed coverage) — and how should one learn a good uncertainty score for a *pre-trained, black-box* predictor from examples?

## 2. Dataset / schema
- Classification: 11 benchmark datasets (UCI-style; named results include PHISHING, SATTELITE, SENSORLESS, SHUTTLE). Pre-trained predictors: logistic regression (LR), three SVM variants, gradient boosted trees. Baselines: MCP (max class probability) for LR, margin score for SVM.
- Ordinal regression: 11 datasets (CALIFORNIA, ABALONE, BANK, CPU, BIKESHARE, CCPP, FACEBOOK, GPU, METRO, MSD, SUPERCONDUCT) with SVOR classifier, MAE loss. Baseline: margin score.
- Structured output: DLIB face detector/landmark task; baseline: detector's own score. n = 3,484 training examples, m = 2,448 learned parameters.
- All: 5 random train/test splits; regularization C selected from {0, 1, 10, 100, 1000} by validation AuRC.

## 3. Method / model
- Theory: the three reject models induce the *same* Bayes classifier and differ only in the selection rule; the bounded-coverage model needs a *randomized* Bayes selection rule. A "proper" uncertainty score is one that preserves the ordering of the conditional risk; the Bayes selector thresholds it.
- Two black-box score learners for a fixed predictor h: (i) **loss regression (REG)** — ridge regression of the realized loss ℓ(y_i, h(x_i)) on features ψ(x_i): F_REG(θ) = C/2‖θ‖² + (1/n)Σ(ℓ_i − s_θ(x_i))²; (ii) **SELE loss** — a pairwise ranking loss ψ_sele(s, T_n) (Eq. 31) that directly optimizes the selective risk ordering, approximated by splitting data into chunks of ~500 (P = round(n/500)) to avoid O(n²) cost. Both are proved Fisher consistent (recover the proper score when estimation/approximation/optimization error are zero).
- Compared against TCP (Corbière et al. 2019), which needs posterior estimates from h and fails on fully discriminative models like SVMs.

## 4. Equations & assumptions
- REG objective: F_REG(θ) = (C/2)‖θ‖² + (1/n) Σ_i (ℓ(y_i, h(x_i)) − s_θ(x_i))², s_θ(x) = ⟨θ, ψ(x)⟩.
- SELE objective: F_SELE(θ) = (C/2)‖θ‖² + (1/P) Σ_p ψ_sele(s, T_n^p) over P chunks.
- Relative improvement metric (Fig. 2): 100 × (AuRC_baseline − AuRC_method) / AuRC_baseline.
- Key theoretical claim: AuRC (area under the risk–coverage curve) equals the expected quality of the bounded-coverage model under a uniformly random target coverage — so comparing methods by AuRC is comparing their expected performance across *all* coverage operating points.
- Assumptions: Fisher-consistency proofs assume known p(x,y), proper score in the hypothesis class, exact optimization; experiments deliberately violate all three ("proof of concept").

## 5. Features / target
Input features: fixed mappings ψ(x) defined per predictor (paper §5.2; e.g., classifier-output-derived features). Target for score learning: the realized loss ℓ(y_i, h(x_i)) (REG) or the pairwise selective-risk ordering (SELE). Prediction task of the underlying classifiers: binary/multiclass classification, ordinal regression (MAE), face landmark detection error.

## 6. Validation design
5 random splits per dataset; AuRC (area under risk–coverage curve) as the primary metric, reported as % misclassification (classification) or MAE (ordinal regression); average ranks + Friedman test + post-hoc Nemenyi test (p = 0.10, critical distance reported) for significance across datasets.

## 7. Numerical results / baselines
- Classification on top of SVM (AuRC, % misclassification, Table 2b fragment): average ranks — REG 1.09, SELE 2.09, baseline 2.82. Per-dataset: PHISHING — REG 0.72±0.12 vs baseline 6.37±0.44; SATTELITE — 3.82±0.27 vs 15.36±0.37; SENSORLESS — 1.56±0.08 vs 6.92±0.17; SHUTTLE — 0.24±0.07 vs 2.02±0.15.
- Ordinal regression on SVOR (Table 3, MAE AuRC): average ranks — SELE 1.27, REG 1.73, Margin 3.00 (Friedman rejects equivalence at p = 0.05; Nemenyi: both SELE and REG significantly better than Margin at p = 0.10, CD = 0.98). Examples: MSD — SELE 4.26±0.03 vs Margin 6.23±0.07 (base risk 6.22); GPU — 0.85±0.03 vs 1.43±0.02; FACEBOOK — 0.37±0.01 vs 0.51±0.01.
- Structured output (DLIB face detector): both learned scores beat the detector's own score; SELE slightly beats REG; the gap is largest at low coverage (SELE doesn't assign the lowest uncertainty to the worst landmark predictions, the baseline does).
- Claim: AuRC improvement is consistent across classifiers, tasks, and loss functions; learned scores help most where the predictor's native score is poor.

## 8. Code / data availability
None stated in the paper text as extracted.

## 9. Leakage & limitations
- Linear scores only (s_θ = ⟨θ, ψ⟩); the ψ mappings are hand-designed per predictor — feature engineering, not learned.
- "Proof of concept": small-scale, convex, linear regime; no deep or large-scale validation.
- The equivalence of the three reject models holds at the Bayes level; with estimation error the operating models can diverge, and the paper doesn't quantify that gap.
- SELE's chunking approximation (P = round(n/500)) is a heuristic to dodge O(n²); no analysis of the approximation cost.
- AuRC averages uniformly over coverages — GSE cares about specific operating points (e.g., exactly the posted card size), where a method with better AuRC could still lose.

## 10. GSE overlap
Direct extension, no duplicate: ledger 0714 covers bounded-abstention pairwise learning-to-rank, and the existing-research map flags "learning-to-abstain with coverage-risk curves" as an unread gap. Nothing in the corpus gives GSE a *learned gate score* trained on realized pick loss, nor the three-model unification. GSE's current gating (probability thresholds) is exactly the "baseline score from classifier output" this paper beats.

## 11. GSE implementation spec
Build **GSE-SELE**: (a) freeze the pick model h; (b) for each historical graded pick, compute realized loss ℓ (0/1 for ATS hit, or negative units for bankroll loss); (c) define ψ(x) from pick features (model edge, line movement, consensus disagreement, market count — the native "MCP/margin" analog is GSE's raw model probability); (d) learn the gate score by ridge regression on realized loss (REG) and by the pairwise SELE loss (SELE), selecting C by validation AuRC; (e) the bounded-coverage reading says: pick the coverage first (e.g., exactly the top-K card), then threshold the learned score — implement randomized tie-breaking at the threshold as the paper's Bayes rule requires. Effort: ~1.5 weeks (feature table exists; the SELE chunking code is new).

## 12. Reproducible test
Dataset: GSE graded picks 2022–2025 (spread/moneyline/total). Baseline: gate by raw model probability (MCP analog). Candidates: REG score, SELE score. Metric: AuRC over coverage (risk = 1 − hit rate; also units-lost variant). Report average rank + per-season RC curves; significance by the paper's Friedman/Nemenyi protocol.

## 13. Acceptance / rejection gate
ADAPT accepted if the learned score's AuRC beats the probability-threshold baseline by ≥ 10% relative (the paper's Fig. 2 scale) on walk-forward seasons AND the win holds at the actual operating coverage (posted card size); else REJECT. Hard fail: if the learned score's top-coverage picks don't beat the baseline's at the exact card size GSE publishes, do not ship regardless of AuRC.

## 14. Improvement experiment
Replace the linear score with a gradient-boosted ranker optimizing a differentiable AuRC surrogate directly, and test whether it beats linear SELE — the paper proves consistency for the linear case but never tests whether the ranking loss benefits from nonlinearity; sports features (line movement × edge interactions) are a natural place where it might.

**Verdict:** ADAPT — the unified reject-option theory plus a Fisher-consistent, empirically dominant learned gate score is the right foundation for GSE's pick gating, but the features, loss (units not 0/1), and operating coverage must be rebuilt for sports before it ships.
