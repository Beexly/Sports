# [0723] On Calibration of Modern Neural Networks (arXiv:1706.04599v2)

**Citation:** Chuan Guo, Geoff Pleiss, Yu Sun, Kilian Q. Weinberger (2017). *On Calibration of Modern Neural Networks*. arXiv:1706.04599v2. URL: https://arxiv.org/abs/1706.04599v2
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/1706.04599.txt (322 lines incl. supplementary).
**Verdict:** ADAPT — the canonical calibration paper and the temperature-scaling recipe. Directly disciplines GSE's model-probability outputs (pick confidence, Kelly sizing, abstention gates): calibrate every probability the engine emits, because accuracy-optimized models are systematically overconfident.

## 1. Research question
Why are modern neural networks poorly calibrated — unlike their 2000s predecessors — which training/architecture trends cause the miscalibration, and which post-processing method fixes it best in practice?

## 2. Dataset / schema
Vision: Caltech-UCSD Birds (200 classes), Stanford Cars (196), ImageNet 2012 (1.3M/25k/25k), CIFAR-10/100 (45k/5k/10k), SVHN. NLP: 20 News (20 cats), Reuters (8), SST binary + 5-class fine-grained (TreeLSTM). Models: ResNet, ResNet-SD, Wide ResNet, DenseNet, LeNet, DAN-3, TreeLSTM. Standard train/validation/test splits; validation used for calibration fitting.

## 3. Method / model
Diagnose miscalibration drivers: depth, width, BatchNorm, weight decay, NLL-overfitting during training (test error drops 29%→27% while NLL overfits on CIFAR-100). Compare post-processing calibration methods: histogram binning, isotonic regression, BBQ (Bayesian binning into quantiles), Platt variants (matrix scaling, vector scaling), and **temperature scaling** — single scalar T>0 applied to logits, q̂_i = max_k σ_SM(z_i/T)^(k), optimized on validation NLL. T does not change argmax → **accuracy unchanged**.

## 4. Equations & assumptions
- Perfect calibration: P(Ŷ=Y | P̂=p) = p ∀ p∈[0,1] (1).
- ECE = Σ_m (|B_m|/n) |acc(B_m) − conf(B_m)| (3); MCE = max_m |acc−conf| (5); NLL = −Σ_i log π̂(y_i|x_i) (6).
- Temperature scaling (9): q̂_i = max_k σ_SM(z_i/T)^(k); T chosen to minimize validation NLL.
- Entropy-maximization derivation: temperature scaling is the unique max-entropy distribution subject to E[true-class logit] = E[weighted logit] (Claim 1, §S2).
- Assumptions: train/validation/test from same distribution; calibration done post-hoc on held-out validation.

## 5. Features / target
Inputs: model logits/probabilities. Target: calibrated probability matching empirical correctness frequency.

## 6. Validation design
Table 1: ECE (M=15 bins) before/after each method across all dataset×model pairs. §S3: MCE, test error, NLL tables. Reliability diagrams; convergence/timing of each method.

## 7. Numerical results / baselines
(quoted exactly from Table 1, ECE %, M=15)
- CIFAR-100 ResNet-110: 16.53% → temp scaling 1.26%; histogram binning 2.66%; isotonic 4.99%; BBQ 5.46%; vector 1.32%; matrix 25.49%.
- CIFAR-10 ResNet-110: 4.60% → temp 0.83%; DenseNet-40: 3.28% → 0.33%.
- ImageNet ResNet-152: 5.48% → 1.86%; DenseNet-161: 6.28% → 1.99%.
- Birds ResNet-50: 9.19% → 1.85%. Cars: 4.30% → 2.35%.
- 20 News DAN-3: 8.02% → 4.11%. SVHN: 0.44% → 0.17% (already near-calibrated).
- Reuters: 0.85% → 0.91% — already calibrated; post-processing unnecessary.
- Matrix scaling fails on 1000-class ImageNet (doesn't converge; quadratic parameter blowup).
- Vector scaling's learned vector is nearly constant → miscalibration is intrinsically low-dimensional.
- Binning methods change class predictions and hurt accuracy (§S3 Table S2).
- Temperature scaling = 1-D convex optimization, ~10 conjugate-gradient iterations, fraction of a second; BBQ ~3 orders of magnitude slower.
- ECE grows with depth and width; BatchNorm increases miscalibration even as accuracy improves; more weight decay monotonically improves calibration well past the accuracy optimum.

## 8. Code / data availability
Implementation: http://github.com/gpleiss/temperature_scaling. Datasets: public benchmarks.

## 9. Leakage & limitations
- Paper's own: post-hoc calibration assumes validation and test from the same distribution — under distribution shift (injuries, trades, weather) calibration can break; does not fix out-of-distribution uncertainty.
- ECE is binning-sensitive; MCE unstable on small test sets.

## 10. GSE overlap
Foundational for GSE's **calibration lane** — the core of Garrett's goal ("most accurate and calibrated fantasy/prediction sports company"). Dedup note: temperature scaling is already inventoried in the repo (competitor-scrape-2026-09-12.md; master calibration list alongside Platt/isotonic, grouping loss, CQR, LRD) — this ledger is the first *full treatment* of the recipe, adding the mechanism (NLL-vs-accuracy disconnect, overfitting to probabilistic error), the drivers (depth, width, BatchNorm, weight decay), the comparative evidence (Table 1), and the entropy-maximization derivation of temperature scaling. Every probability GSE emits (pick win-probabilities, Kelly fractions, confidence scores in abstention gates 0714–0720) must pass through temperature scaling on a held-out validation set. The NLL-vs-accuracy disconnect explains why a model with good pick accuracy can still produce terrible Kelly sizing. Fits the lane structure: this paper is the calibration recipe; 0724 (probability calibration trees) gives a complementary tree-based calibrator; 0714–0716 give the abstention wrapper around calibrated probabilities.

## 11. GSE implementation spec
1. For each GSE pick model: reserve a held-out calibration set (recent games, time-ordered); fit temperature T on validation NLL over model logits/probabilities; apply q̂ = softmax(z/T) before any confidence display or Kelly sizing.
2. Track ECE (M=15) weekly per market; re-fit T on a rolling window to handle distribution shift (team composition changes).
3. Never use binning calibrators (they change predictions/accuracy); prefer temperature scaling for its accuracy-invariance — the pick stays the same, only its price changes.
Effort: 1–2 days; the reference implementation exists.

## 12. Reproducible test
Dataset: GSE engine's 2024–25 NFL pick logs with model logits and outcomes. Fit T on a calibration split; measure ECE before/after and compare Kelly-growth on the test split using calibrated vs uncalibrated probabilities. Pass if calibrated ECE < 2% and Kelly-growth improves without changing pick accuracy.

## 13. Acceptance / rejection gate
ADOPT if calibrated probabilities improve realized Kelly-growth or reduce abstention-gate false-positives on 2024–25 NFL logs. REJECT if GSE's probabilities are already calibrated (Reuters-like) — measure ECE first; if <1%, skip.

## 14. Improvement experiment
Extend temperature scaling to **class-conditional (vector) scaling** on markets where miscalibration is asymmetric (e.g., home underdogs vs road favorites) — the paper found the vector solution is nearly constant, so test whether GSE's market-specific data breaks that low-dimensionality. Second: online temperature tracking (re-fit T weekly) as an explicit regime-shift detector.
