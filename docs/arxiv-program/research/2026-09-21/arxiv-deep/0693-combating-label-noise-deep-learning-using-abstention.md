# [0693] Combating Label Noise in Deep Learning Using Abstention (arXiv:1905.10964v2)

**Citation:** Sunil Thulasidasan, Tanmoy Bhattacharya, Jeffrey Bilmes, Gopinath Chennupati, Jamaludin Mohd-Yusof (2019). *Combating Label Noise in Deep Learning Using Abstention*. arXiv:1905.10964v2. URL: https://arxiv.org/abs/1905.10964v2
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/1905.10964.txt`, ar5iv-converted HTML text; complete paper §§1–6, both experiments, lemmas, Table 1, read in full).
**Verdict:** ADAPT — the abstention-class loss as a data cleaner and structured-noise representation learner adapts to GSE's noisy historical game data (e.g., derived labels like "closing-line edge" that are corrupted in anomalous games); the image-classification experiments themselves are not directly reusable.

## 1. Research question
Can a deep classifier that is allowed to abstain during training — not just at inference — be robust to label noise, learn features associated with systematically unreliable samples, and serve as a data cleaner that identifies noisy training samples for removal?

## 2. Dataset / schema
- STL-10 (labeled): 5,000 train / 8,000 test 96×96 RGB images; used with synthetic structured noise (10% label-randomized + smudge feature; and full label randomization of the "monkey" class).
- CIFAR-10 / CIFAR-100 / Fashion-MNIST with uniform random label corruption at fractions {0.2, 0.4, 0.6, 0.8}; all public image benchmarks.
- Baselines compared on identical networks: standard baseline, generalized cross-entropy ℒ_q (Zhang & Sabuncu 2018), truncated ℒ_q, Forward/Forward-T̂ (Patrini et al. 2017), MentorNet (Jiang et al. 2018), and an oracle cleaner with perfect noise information.
- No sports data.

## 3. Method / model
Deep Abstaining Classifier (DAC): standard k-class DNN + one extra output p_{k+1} = abstention probability. Training loss per sample (Eq. 1): ℒ(x_j) = (1−p_{k+1})·(−Σ_i t_i log(p_i/(1−p_{k+1}))) + α·log(1/(1−p_{k+1})). First term: cross-entropy over the k real classes with abstention mass normalized out (reduces to standard CE when p_{k+1}=0). Second term: abstention penalty, weight α≥0. Works with any DNN architecture (loss-only change).
α auto-tuning (Algorithm 1): L abstention-free warmup epochs; track moving average β̃ of the abstention threshold (1−p_{k+1})(−log(p_j/(1−p_{k+1}))); at epoch L set α = β̃/ρ (ρ=64, μ=0.05, untuned), then linearly ramp α to α_final over remaining epochs. Data-cleaning protocol: train DAC, observe best-validation-epoch non-abstaining portion; eliminate samples where training error persists there (likely label noise); retrain a regular DNN on the cleaner set.

## 4. Equations & assumptions
- DAC loss (Eq. 1): ℒ(x_j) = (1−p_{k+1})(−Σ_{i=1}^k t_i log(p_i/(1−p_{k+1}))) + α log(1/(1−p_{k+1})).
- Abstention gradient (Eq. 2): ∂ℒ/∂a_{k+1} = p_{k+1}[(1−p_{k+1})(log(1/(1−p_{k+1})) − g) + α], where g = standard CE loss. Abstention mass grows iff α < (1−p_{k+1})(−log(p_j/(1−p_{k+1}))), j = true class.
- Lemma 1: ∂ℒ/∂a_j ≤ 0 for the true class pre-activation — learning on true classes persists even while abstaining.
- Lemma 2: with fixed α, as training epochs t→∞, abstention rate γ→0 or γ→1 (all-or-nothing); hence α must be auto-tuned, and LR-decay phases can drive memorization (abstention collapses at epochs 60/120 in their runs).
- Assumptions: validation set assumed clean for the cleaning protocol; noise modeled as label corruption (feature noise not addressed).

## 5. Features / target
Image pixels → class label; abstention class p_{k+1}. For GSE: game features → derived labels (e.g., beat-closing-line indicator, cover indicator); abstention mass identifies games whose derived labels are unreliable (e.g., games with late QB scratches, weather shocks — structured corruption).

## 6. Validation design
Synthetic structured-noise experiments (smudge + randomized monkey class, STL-10/VGG-16) with abstention precision/recall and Grad-CAM-style visual confirmation that abstention keys on the noise-correlated features. Unstructured-noise experiments on CIFAR-10/100 and Fashion-MNIST at 4 corruption levels vs 5 published methods + oracle, all on identical architectures with lengthened schedules for cleaned sets.

## 7. Numerical results / baselines
- Structured: DAC abstains with high precision and recall exactly on the smudged (label-randomized) images; post-DAC DNN trained on the cleaned set "significantly" beats the baseline DNN on risk–coverage curves; on the monkey-class experiment the DAC abstains on ~80% of monkey images and keeps a small but consistent risk–coverage lead; threshold-on-softmax produces confident-but-wrong predictions (many p≥0.9 on monkeys).
- Unstructured (Table 1, test accuracy, noise 0.2/0.4/0.6/0.8): CIFAR-10 ResNet-34 — Baseline 88.94/85.35/79.74/67.17; DAC **92.91**/90.71/86.30/74.84 (fraction removed / remaining noise: 0.24/0.01, 0.41/0.03, 0.56/0.07, 0.75/0.16); Oracle 92.56/90.95/88.92/86.43 (DAC beats the oracle at 0.2 noise); ℒ_q 89.83/87.13/82.54/64.07; Forward T 88.63/85.07/79.12/64.30; MentorNet results from literature. CIFAR-10 WRN28x10 — DAC 93.35/90.93/87.58/70.8 vs MentorNet 92.0/89.0/−/49.0. CIFAR-100 ResNet-34 — DAC 73.55/66.92/57.17/32.16 vs baseline 69.15/62.94/55.39/29.5. Fashion-MNIST ResNet-18 — DAC 94.76/94.09/92.97/90.79 vs baseline 93.91/93.09/91.83/88.61.
- Memorization (§5): with fixed α, abstention → 0 or 1 as t→∞; LR annealing at epochs 60/120 triggers a memorization phase that collapses abstention and hurts generalization.

## 8. Code / data availability
Code: https://github.com/thulas/dac-label-noise. All datasets public.

## 9. Leakage & limitations
- Game outcomes in sports are clean labels — GSE's "label noise" lives in derived training labels (closing-line edge estimates, synthetic targets), which this paper doesn't study.
- Cleaning protocol assumes a clean validation set; in GSE's case a clean recent window must be constructed carefully (no truly clean period exists when labels are derived).
- Abstention collapses under LR decay / long training (Lemma 2, §5) — any GSE selection-head training must monitor abstention rate across LR schedules, not just final epochs.
- DAC removes up to 75% of training data at 0.8 noise — fine for CIFAR, dangerous for small sports samples; sample-efficiency tradeoff unaddressed.
- Competing methods' numbers taken from their papers (Forward, MentorNet), not re-run.

## 10. GSE overlap
Existing-research map: no label-noise or data-cleaning entries — new capability. GSE trains on historical games where derived features (e.g., lookahead-adjusted ratings, opening-line edge estimates) can be systematically corrupted in anomalous games; nothing currently flags or removes such games.

## 11. GSE implementation spec
1. Train a DAC-style variant of GSE's pick/outcome model with a k+1 abstention head on historical games, using a derived noisy-ish target (e.g., "beat closing line" or quintile of ATS margin — labels corrupted by late news).
2. Use the α auto-tuning schedule (warmup L epochs, ρ=64, μ=0.05) and watch for the memorization collapse at LR decays; stop/select the checkpoint at best clean-validation abstention behavior.
3. Remove games the DAC abstains on at that checkpoint; retrain the production model on the cleaner set; compare.
4. Structured-noise analog: check whether abstained games concentrate on identifiable anomalies (backup-QB starts, extreme weather, international games) — if so, the abstention head becomes an interpretable "unreliable game" detector for the write-up pipeline.
Effort: ~3–5 days (loss change is small; retraining cycles dominate).

## 12. Reproducible test
Dataset: nflverse 2010–2025 games with a derived noisy target (e.g., cover indicator where the spread used is the opening line, corrupted by line movement). Train (a) DAC with abstention head, (b) standard model. Metric: after DAC-based cleaning, test-set log-loss/Brier of a retrained model vs the baseline model trained on all data, time-ordered split (train ≤2023, test 2024–2025). Baseline to beat: (b).

## 13. Acceptance / rejection gate
ADAPT if the post-cleaning retrained model beats the all-data baseline on test Brier by ≥0.003 with the abstained fraction ≤25% of training games; reject if the gain is <0.003 or cleaning removes >40% of games (sample destruction) — then label noise isn't GSE's binding constraint.

## 14. Improvement experiment
Combine with ledger 0692's SelectiveNet coverage constraint: train the DAC with BOTH the α-penalty abstention head (data cleaning during training) AND a SelectiveNet-style coverage-targeted selection head (publish-time abstention). Test whether training-time cleaning + inference-time selection compose (each improving the covered-set ROI) or interfere — the paper studies them separately, never jointly.
