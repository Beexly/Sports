# [0692] SelectiveNet: A Deep Neural Network with an Integrated Reject Option (arXiv:1901.09192v4)

**Citation:** Yonatan Geifman, Ran El-Yaniv (2019). *SelectiveNet: A Deep Neural Network with an Integrated Reject Option*. arXiv:1901.09192v4. URL: https://arxiv.org/abs/1901.09192v4
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/1901.09192.txt`, ar5iv-converted HTML text; complete paper §§1–9, all tables, read in full).
**Verdict:** ADAPT — the integrated selection-head + selective-loss recipe is the cleanest abstention architecture for GSE's pick-selection head; adapt from image-classification DNNs to a tabular pick model with a coverage constraint tied to GSE's posting policy. (Caveat: 2206.09034, ledger 0697 in this same wave, argues the gains come from a better classifier rather than the selection mechanism — treat that as the skeptical null in our test.)

## 1. Research question
Can a deep network that learns prediction and rejection jointly, end-to-end — rather than thresholding a confidence score from a pre-trained network — achieve a better risk–coverage trade-off for both selective classification and selective regression?

## 2. Dataset / schema
- CIFAR-10: 50,000 train / 10,000 test images, 10 classes, 32×32×3 RGB (public).
- SVHN: 73,257 train / 26,032 test digit images, 32×32×3 (public).
- Cats vs. Dogs (ASIRRA extract): 25,000 images (12,500/class), rescaled to 64×64, stratified split 20,000 train / 5,000 test (public).
- Concrete Compressive Strength (UCI): 1,030 instances, 8 numerical features (7 ingredients + age), target = compressive strength (public).
- All non-sports image/tabular benchmarks; no sports data used.

## 3. Method / model
SelectiveNet: shared main-body block (VGG-16 variant for images; 1-hidden-layer 64-ReLU FC net for regression) → representation layer → three heads: prediction head f(x) (softmax / linear), selection head g(x) (FC hidden 512-ReLU + BN → single sigmoid neuron), auxiliary head h(x) (same task as f, standard loss, oblivious to coverage — prevents the network from overfitting to the wrong coverage slice before features mature). Inference: predict f(x) iff g(x) ≥ 0.5, else abstain.

## 4. Equations & assumptions
- Selective risk: R(f,g) = E_P[ℓ(f(x),y)g(x)] / φ(g); coverage φ(g) = E_P[g(x)]; empirical versions r̂, φ̂ defined analogously on sample S_m.
- Constrained objective: θ* = argmin R(f_θ, g_θ) s.t. φ(g_θ) ≥ c.
- Interior-point unconstrained loss: ℒ(f,g) = r̂_ℓ(f,g|S_m) + λΨ(c − φ̂(g|S_m)), Ψ(a) = max(0,a)²; total ℒ = αℒ(f,g) + (1−α)ℒ_h with α=0.5, λ=32 (λ chosen "large enough to preserve the constraint," not tuned).
- Post-training coverage calibration on unlabeled validation set V_n: τ = 100(1−c) percentile of g(x_i), predict iff g(x) ≥ τ. Bound: Pr{ε-violation} ≤ 2e^{2nε²}; with confidence 1−δ, coverage ∈ [c−ϵ, c+ϵ], ϵ = √(ln(2/δ)/(2n)).
- Assumptions: target coverage c given by user; selection head capacity adequate; Hoeffding bound for the calibration guarantee.

## 5. Features / target
- Classification: raw pixels → class label; selection head decides abstain/predict.
- Regression: 8 concrete features → compressive strength; abstain on uncertain predictions.
- For GSE adaptation: tabular game features → pick correctness / margin; selection head decides whether the pick is published.

## 6. Validation design
SelectiveNet trained at target coverages c ∈ {0.70, 0.75, …, 0.95} vs baselines SR (max-softmax threshold on a full-coverage-trained twin network, Geifman & El-Yaniv 2017b) and MC-dropout (Gal & Ghahramani 2016; classification p=0.5, 100 forward passes; regression p=0.05, 200 passes). Coverage calibrated post-training on an unlabeled validation set. Metrics: selective risk (0-1% error / MSE) at each coverage; risk–coverage curves; a train-calibration "confusion matrix" (train at coverage i, calibrate to j) showing diagonal (train = calibrated coverage) is near-optimal.

## 7. Numerical results / baselines
- CIFAR-10 (Table 2, 0-1% selective risk): c=0.70: SelectiveNet **0.32** ± 0.01 vs MC-dropout 0.43 ± 0.05 (26.38% improvement) vs SR 0.42 ± 0.06 (23.88%); c=0.95: 4.16 ± 0.09 vs 4.58 ± 0.05 (8.98%) vs 4.55 ± 0.07 (8.56%). Consistent significant gains at every coverage.
- SVHN (Table 3): c=0.80: 0.53 ± 0.01 vs 0.61 ± 0.01 (14.07%) for both baselines; at c=0.95 all methods statistically indistinguishable.
- Cats vs. Dogs (Table 4): c=0.80: 0.35 ± 0.09 vs 0.55 ± 0.02 (36.39%) vs 0.68 ± 0.05 (48.16%).
- Concrete regression (Table 5, MSE): c=0.70: 27.94 ± 1.12 vs MC-dropout 33.70 ± 0.58 (17.09%); c=0.50: 26.81 ± 1.36 vs 28.90 ± 0.77 (7.23%); gains hold for all coverages below 0.90.
- Coverage calibration (Table 1, CIFAR-10): average violation of target coverage 3.63% (SelectiveNet) vs 11.98% (SR); post-training τ-calibration lands coverage in [c−ϵ, c+ϵ].
- Representation analysis (t-SNE, §8.2): SelectiveNet doesn't waste capacity separating rejected points — rejected instances collapse into a central cluster, easy for g(x) to capture; covered points separate better.

## 8. Code / data availability
Complete code: https://github.com/geifmany/SelectiveNet. Datasets all public (CIFAR-10, SVHN, ASIRRA Cats/Dogs, UCI Concrete).

## 9. Leakage & limitations
- All experiments are image/tabular benchmarks, zero sports or time-series data — transfer to GSE's pick domain is unvalidated in the paper.
- MC-dropout cost (100–200 forward passes per prediction) is a straw-man on inference cost; SR is the fair baseline, and the paper still beats it consistently.
- The coverage constraint is enforced only in expectation via penalty λ=32; test coverage still violates the target (avg 3.63%) without the post-hoc τ calibration — the post-hoc step, not the end-to-end loss, is what actually hits the coverage.
- Competing explanation: 2206.09034 (same wave, ledger 0697) finds that "the superior performance of state-of-the-art methods is owed to training a more generalizable classifier rather than their proposed selection mechanisms" — SelectiveNet's prediction head is trained with a coverage-weighted loss that may simply produce a better classifier; the abstention gain vs the classification gain are not cleanly separated here.
- Rejected-set representational collapse (central cluster) is interpretable but could mask failure modes where rejected points are systematically biased (e.g., a whole class).

## 10. GSE overlap
Existing-research map: no abstention/selective-prediction entries — new capability, not duplicate. GSE's X mandate is "only high-confidence engine picks go up" (MEMORY), which is an informal selective-prediction policy; no formal selection mechanism exists in the engine.

## 11. GSE implementation spec
1. Add a selection head to GSE's pick model: shared feature trunk → (a) outcome head (spread/total prediction), (b) selection head (single sigmoid), (c) auxiliary head (same outcome task, full-coverage loss).
2. Train with selective loss ℒ = 0.5·[r̂_ℓ(f,g) + 32·max(0, c − φ̂)²] + 0.5·ℒ_h; set target coverage c = fraction of picks GSE historically publishes (e.g., top ~30% by edge → c=0.30).
3. Post-training: calibrate τ on a recent unlabeled (i.e., outcome-unknown-at-posting-time) game window to hit the target publish fraction; bound with the Hoeffding ε formula.
4. Compare against the current baseline: threshold on model edge (the GSE analog of SR) and against a shared-trunk model trained at full coverage with the same selection mechanism — the 0697-skeptical null: if the selective-loss model doesn't beat threshold-on-better-classifier, use the simpler mechanism.
Effort: ~3–5 days (head + loss ~100 lines; retraining the pick model twice; calibration script).

## 12. Reproducible test
Dataset: GSE `picks` table (3,411 engine picks, model v5.2.7) with model probabilities, outcomes, timestamps; add the feature matrix the engine used. Protocol: time-ordered split (train ≤2025 season, select on early 2026, test on recent 2026 picks). Train (a) SelectiveNet-style with c=0.30, (b) full-coverage twin + threshold on |edge| calibrated to 0.30 coverage. Metric: realized ROI and win rate on the covered (published) 30% in the test window. Baselines must see identical features.

## 13. Acceptance / rejection gate
ADAPT if (a) beats (b) on test-window ROI of the covered set by ≥2 percentage points of ROI at matched 30% coverage AND the win-rate lift is significant at p<0.05 (paired over picks); reject if the gap is <2pp or insignificant — then the 0697 null stands and GSE keeps threshold-on-edge.

## 14. Improvement experiment
Make the target coverage adaptive to market state: c_t = f(days-to-kickoff, line-movement volatility) learned from historical data, instead of a fixed c. Hypothesis: the selection head should publish more picks early in the week (soft lines) and fewer near kickoff (sharp lines). Test whether adaptive-c coverage yields higher covered-set ROI than fixed-c at the same average coverage — a market-aware abstention policy the paper doesn't consider.
