# [0697] Towards Better Selective Classification (arXiv:2206.09034v4)

**Citation:** Leo Feng, Mohamed Osama Ahmed, Hossein Hajimirsadeghi, Amir Abdi (2022). *Towards Better Selective Classification*. arXiv:2206.09034v4. URL: https://arxiv.org/abs/2206.09034v4
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2206.09034.txt`, ar5iv-converted HTML text; complete paper §§1–6, all result tables, appendix A–B, read in full).
**Verdict:** ADAPT — the core finding directly sharpens ledger 0692's SelectiveNet adaptation: the external selection heads/logits are suboptimal; Softmax Response (max class probability) selection beats them at zero cost, and an entropy-minimization regularizer (β=0.01) yields up to 85% relative error reduction. The recipe is immediately actionable for GSE's publish gate.

## 1. Research question
Is the strong performance of SOTA selective methods (SelectiveNet, Deep Gamblers, Self-Adaptive Training) due to their external selection heads/logits, or to training a more generalizable classifier? And can a classifier-rooted selection mechanism plus entropy regularization beat them?

## 2. Dataset / schema
ImageNet100, ImageNet, ImageNetSubset (25–175 classes), StanfordCars, Food101, CIFAR-10. ResNet34/VGG16, 3–5 seeds. No sports data.

## 3. Method / model
Recipe: (1) train any selective classifier; (2) discard its selection mechanism (selection head / abstain logit); (3) rank samples by Softmax Response ḡ(x) = max_u p_θ(u|x_i) (or −H); (4) calibrate τ on validation for target coverage. Plus entropy-regularized loss ℒ_new = ℒ + β·H(p_θ(·|x)), β=0.01. SAT uses a dynamically moving target t_i ← α·t_i + (1−α)·p_θ(·|x_i) with a (C+1)th abstain logit.

## 4. Equations & assumptions
- Selective risk: min_θ,ψ E[l(f_θ(x),y)·g_ψ(x)] s.t. E[g_ψ(x)] ≥ c_target (Eq. 1).
- SelectiveNet loss: ℒ = α(ℒ_selective + λℒ_c) + (1−α)ℒ_aux (Eq. 3); ℒ_selective = (Σℓ·ḡ)/(Σḡ).
- SAT loss: ℒ = −(1/m)Σ[t_{i,y_i} log p_θ(y_i|x_i) + (1−t_{i,y_i}) log p_θ(C+1|x_i)] (Eq. 6).
- Entropy regularizer: ℒ_new = ℒ + β·H(p_θ(·|x)), β=0.01 (Eq. 7).
- Assumptions: validation and test identically distributed (calibration step breaks under shift); coverage threshold τ chosen on validation.

## 5. Features / target
Image classification (up to 1000 classes). For GSE: the same principle applies to the ATS/cover classifier — rank upcoming games by max softmax probability, publish the top-c_target fraction.

## 6. Validation design
Ablation across three selective methods × two selection mechanisms (original vs SR) × five datasets × coverages 10–100%; entropy-regularizer ablation (EM only, SR only, both); scalability sweep over class counts; 3–5 seeds.

## 7. Numerical results / baselines
- ImageNet100 (selective error): 80% coverage — SN 6.00→SN+SR 4.47; DG 5.21→DG+SR 4.52; SAT 5.20→SAT+SR 4.46. 50% coverage — SN 1.05→0.85; SAT 1.18→0.88.
- SAT+EM+SR: StanfordCars 70% coverage 21.34→15.84 (~26% relative); Food101 70% 4.89→3.52 (~28% relative); ImageNet100 60% 1.72→0.95. ImageNetSubset: up to **85% relative** improvement over vanilla SAT.
- ImageNet (SAT): 90% coverage 22.67→21.57; 70% 13.88→12.34 with EM+SR.
- Key negative result: SelectiveNet's own selection head catastrophically fails at low coverage (99.00% error at 10% coverage) — evidence the external head is the failure mode.
- Fairness caveat (Jones et al. 2021): lowering coverage can magnify recall disparities across groups.

## 8. Code / data availability
Code: https://github.com/BorealisAI/towards-better-sel-cls. Builds on official SAT and Deep Gamblers implementations. Datasets public.

## 9. Leakage & limitations
- Gains shown on vision benchmarks; no tabular/sports validation.
- SelectiveNet-at-low-coverage failure may be specific to its coverage-targeted training, not to all external heads.
- β=0.01 tuned on vision nets — needs retuning for GSE's architecture.
- Calibration assumes no distribution shift; NFL seasons shift.
- Fairness caveat: coverage-based selection can amplify subgroup disparities — relevant if GSE's publish filter systematically withholds certain game types.

## 10. GSE overlap
Existing-research map: refines ledger 0692 (SelectiveNet) — the selection head should be replaced by SR selection; complements 0694/0695/0696 as a fourth, cheapest abstention lane.

## 11. GSE implementation spec
1. Train GSE's cover classifier with entropy-regularized loss ℒ_new = CE + 0.01·H(p_θ) (start β=0.01, tune on validation).
2. Publish gate: rank weekly games by max softmax probability, publish the top-c_target fraction; calibrate the threshold on the prior season's validation data.
3. Compare against (a) any learned selection head (per 0692), (b) vanilla classifier + SR — the paper predicts (b) ≥ (a).
4. Monitor subgroup coverage: check the publish filter doesn't systematically exclude specific game types (e.g., divisional games, bad-weather games).
Effort: ~1 day (loss-term addition + thresholding; no architecture change).

## 12. Reproducible test
Dataset: nflverse 2010–2025, ATS cover classification. Train (a) entropy-regularized classifier + SR selection, (b) vanilla classifier + SR, (c) SelectiveNet-style 3-head + selection head. Coverages 10–100% (focus 20–40%). Time-ordered split: train ≤2023, validate 2024 (calibrate τ per coverage), test 2025. Metric: covered-set accuracy and ROI. Baseline to beat: (b).

## 13. Acceptance / rejection gate
ADAPT if (a) beats (b) on test-window covered-set ROI by ≥1pp at matched 30% coverage, or (b) beats (c) by ≥1pp — either finding confirms the paper's ordering on sports data; reject if (c) beats (b), contradicting the paper, in which case keep the learned selection head.

## 14. Improvement experiment
Test the paper's central claim causally on GSE data: freeze the classifier from (c) and swap only the selection mechanism (head vs SR vs entropy) — if SR wins with a frozen classifier, the claim replicates and GSE can safely drop all external selection heads permanently. Then sweep β ∈ {0.1, 0.01, 0.001, 0.0001} on the validation season to find GSE's optimal entropy weight rather than importing 0.01.
