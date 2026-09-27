# [1780] RISAN: Robust Instance Specific Deep Abstention Network (arXiv:2107.03090)

**Citation:** (authors as listed on arXiv) *RISAN: Robust Instance Specific Deep Abstention Network*. arXiv:2107.03090. URL: https://arxiv.org/abs/2107.03090
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, double-sigmoid surrogate for 0-d-1 loss, joint learning of prediction function and instance-specific rejection width, classification calibration, excess-risk bound, generalization bounds, label-noise robustness experiments on Cats vs Dogs / CIFAR-10 vs DAC baselines, conclusion).
**Verdict:** ADAPT — jointly learning the pick function and a *per-pick* rejection width with a calibrated double-sigmoid surrogate is a stronger gate than any global threshold, and the label-noise robustness (+6–10 points accepted accuracy at 20–40% noise) matters for sports where graded outcomes are noisy; needs adaptation beyond binary classification and 0-d-1 loss.

## 1. Research question
Can a neural network jointly learn *both* the prediction function and an *instance-specific* rejection width — so each input gets its own abstention threshold — by optimizing a smooth surrogate of the 0-d-1 (predict / abstain / err) loss, and does this beat fixed-threshold and prior abstention networks, especially under label noise?

## 2. Dataset / schema
Cats vs Dogs and CIFAR-10 (binary-ified evaluations), with synthetic label noise injected at 20% and 40%. Baselines: DAC (Deep Abstaining Classifier) and standard fixed-threshold gating.

## 3. Method / model
RISAN: a network with two outputs — the prediction function f(x) and a rejection-width function ρ(x) (instance-specific: every input gets its own abstention band |f(x)| ≤ ρ(x)). Trained end-to-end with the *double-sigmoid* surrogate loss, a smooth, classification-calibrated approximation of the discontinuous 0-d-1 loss (cost d for abstention, 1 for error). The double-sigmoid shape gives gradients everywhere while preserving the 0-d-1 minimizer.

## 4. Equations & assumptions
- Target loss: L_d(yf(x), ρ) = 1{yf(x) ≤ −ρ} + d·1{|f(x)| ≤ ρ}, d ∈ (0, 0.5) the abstention cost.
- Surrogate: double-sigmoid loss L_ds — smooth, non-convex, classification-calibrated: excess 0-d-1 risk is bounded by excess surrogate risk.
- Generalization bounds for the joint (f, ρ) learner (paper's theorems).
- Assumptions: binary labels; abstention cost d known and fixed; the surrogate's calibration holds for the 0-d-1 target (not for arbitrary cost structures).

## 5. Features / target
Image pixels → binary class. The meta-output ρ(x) is the per-instance abstention width — the learned "how unsure am I on *this* input" function.

## 6. Validation design
Label-noise stress test: inject 20% / 40% label noise, compare accepted-accuracy (accuracy on non-abstained inputs) of RISAN vs DAC vs baselines at matched rejection rates.

## 7. Numerical results / baselines
- At 20% label noise and low rejection rates: RISAN's accepted accuracy is 6–7 percentage points higher than baselines.
- At 40% label noise: about +10 points on Cats vs Dogs and +5 points on CIFAR-10 over baselines.
- Improves 5–10 percentage points over DAC on unrejected samples.
- Claim: the instance-specific width (not a global ρ) plus the calibrated surrogate drives the win; robustness comes from the abstention mechanism refusing to fit noisy labels.

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- Binary classification with 0-d-1 loss only; sports picks have unit-denominated, asymmetric costs (a moneyline dog loss ≠ a spread loss) that the 0-d-1 + fixed-d model can't express.
- The double-sigmoid is non-convex: no global-optimality guarantee, initialization/optimization dependent.
- Label noise in the paper is synthetic and uniform; sports "noise" (bad beats, ref variance, grading disputes) is structured, not uniform.
- Instance-specific ρ(x) doubles the model's output complexity and its capacity to overfit the gate.

## 10. GSE overlap
New mechanism, no duplicate: GSE gates with global thresholds (and per the 1775–1777 ledgers, is moving toward learned gates) — but nothing learns a *per-pick* abstention width jointly with the pick function. The existing-research map has no instance-specific rejection work. Complements ledger 1775 (which learns a score for a *fixed* predictor) — RISAN learns predictor and gate *jointly*.

## 11. GSE implementation spec
Build **GSE-RISAN** as a second gate head: (a) take the pick model's feature trunk; add a ρ(x) head outputting a per-pick abstention width; (b) train jointly with a double-sigmoid-style surrogate adapted to unit loss: replace 0-d-1's fixed d with a per-pick cost d(x) = stake fraction at risk (keeps the paper's calibration structure, swaps in sports costs); (c) compare against the global-threshold gate and the ledger-1775 learned score on accepted-accuracy (hit-rate on posted picks) at matched card sizes. Effort: ~2 weeks (new head + custom surrogate + noise-robustness evals).

## 12. Reproducible test
Dataset: GSE graded picks with feature snapshots; inject synthetic outcome noise (flip 10–20% of graded results) to replicate the paper's stress test. Baseline: global gate. Candidate: RISAN joint (f, ρ). Metrics: accepted hit-rate and units at matched coverage, with and without injected noise.

## 13. Acceptance / rejection gate
ADAPT accepted if the joint (f, ρ) learner beats the global gate by ≥ 3 points of accepted hit-rate at matched coverage on clean data AND degrades less under 20% injected noise (robustness check); else REJECT (the joint training isn't worth its complexity — keep the fixed-predictor learned score from 1775).

## 14. Improvement experiment
Learn a *market-conditioned* width ρ(x, line-movement): the abstention band widens when the market disagrees with the model. The paper's ρ(x) sees only model features; in sports the line is a free, high-quality uncertainty feature. Test whether ρ(x, market) beats ρ(x) on accepted units — if yes, the gate is effectively learning "abstain when the market knows something I don't."

**Verdict:** ADAPT — per-instance learned rejection widths with a calibrated surrogate are the right upgrade from global thresholds and the noise-robustness result is directly relevant to noisy sports outcomes, but the binary 0-d-1 formulation must be reworked for unit-denominated, asymmetric sports costs.
