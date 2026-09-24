# [1648] Can You Trust Your Model's Uncertainty? Evaluating Predictive Uncertainty Under Dataset Shift (arXiv:1906.02530)

**Citation:** Yaniv Ovadia, Emily Fertig, Jie Ren, Zachary Nado, D. Sculley, Sebastian Nowozin, Joshua V. Dillon, Balaji Lakshminarayanan (2019). *Can You Trust Your Model's Uncertainty? Evaluating Predictive Uncertainty Under Dataset Shift*. arXiv:1906.02530. NeurIPS 2019. Google Research. URL: https://arxiv.org/abs/1906.02530
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: methods/metrics §3, MNIST/CIFAR-10/ImageNet/text/Criteo experiments §4, takeaways §5, appendices referenced).
**Verdict:** ADOPT — this paper is GSE's calibration-under-shift EVALUATION DOCTRINE: the headline empirical findings (temperature scaling FAILS under shift — worse Brier than vanilla on Criteo; ensembles win under shift; i.i.d. calibration does not transfer) directly govern how GSE should validate every calibrator in `apps/web/lib/calibration/`. Adopt its benchmark protocol (accuracy + Brier + ECE + NLL across shift intensities) as the acceptance harness for `temperature-map.ts`, `platt-scaling.ts`, and the CQR/ACI stack.

## 1. Research question
Post-hoc calibration (temperature scaling) makes models well-calibrated on i.i.d. test data — but does ANY of it survive dataset shift? Across image, text, and categorical/ad modalities, which uncertainty methods (vanilla, temperature scaling, MC-dropout, ensembles, SVI, last-layer variants) degrade most gracefully as shift intensifies, and what should practitioners actually do?

## 2. Dataset / schema
(1) **MNIST** (LeNet): shift = rotation/translation intensity; OOD = Not-MNIST. (2) **CIFAR-10** (ResNet-20) and **ImageNet** (ResNet-50): shift = 80 corruptions (16 types × 5 intensities, Hendrycks & Dietterich 2019); OOD = SVHN for CIFAR models. (3) **20 Newsgroups** (LSTM): in-distribution = 10 even classes, shifted = 10 odd classes, OOD = One Billion Word Benchmark. (4) **Criteo Display Advertising** (37M examples, 13 numerical + 26 categorical features): shift = random reassignment of categorical tokens with probability controlling intensity (simulates non-stationary hash/token drift). Hyperparameters via Bayesian optimization (except ImageNet).

## 3. Method / model
Not a new method — a large-scale BENCHMARK of uncertainty methods: vanilla (max softmax), temperature scaling (Guo et al. 2017, post-hoc on validation), MC-dropout, deep ensembles, SVI (Blundell et al.), last-layer SVI/dropout (LL-SVI, LL-Dropout). Metrics: accuracy/AUC, Brier score (with calibration/refinement decomposition, DeGroot & Fienberg; Bröcker), NLL, ECE, predictive entropy. Brier: BS = |Y|⁻¹Σ_y(p(y|x,θ) − δ(y−y_n))².

## 4. Equations & assumptions
- Brier score: `BS = |𝒴|⁻¹ Σ_y ( p(y|x_n,θ) − δ(y − y_n) )² = |𝒴|⁻¹( 1 − 2p(y_n|x_n,θ) + Σ_y p(y|x_n,θ)² )`
- Brier is a proper scoring rule (optimum = perfect prediction) but over-emphasizes tail probabilities and is insensitive to rare-event probabilities (paper §3 discussion).
- ECE = Σ_b (|acc_b − conf_b|)·(n_b/n) over confidence bins.
- Assumption under test: that i.i.d.-validation calibration transfers — the paper's empirical answer is NO.

## 5. Features / target
Images → classes; text → newsgroups; ad features → click (binary). Transfer: the EVALUATION PROTOCOL transfers — GSE game features → cover/no-cover (binary), with shift = season phase, QB changes, weather regime.

## 6. Validation design
For each dataset: standard train/val/test PLUS increasingly shifted test sets PLUS a fully OOD set. Methods compared on accuracy, Brier, NLL, ECE, entropy as functions of shift intensity. 10 runs (MNIST, SE shaded); boxplots over the 16 corruption types per intensity (CIFAR/ImageNet). Capacity control: doubled-filter vanilla/dropout models to rule out "ensembles just have more parameters" (no gain — Appendix C).

## 7. Numerical results / baselines
- **Temperature scaling does NOT survive shift**: on MNIST nearly all methods beat post-hoc temperature scaling in Brier under shift; on CIFAR-10/ImageNet its ECE "increases significantly as the shift increases"; on Criteo "temperature scaling has a WORSE Brier score than Vanilla, indicating that post-hoc calibration on the validation set actually HARMS calibration under dataset shift."
- **Ensembles consistently best** across metrics/modalities under shift (accuracy AND ECE AND Brier); most ensemble gains achieved with only 5 models (50 helps marginally).
- Dropout consistently beats temperature scaling and last-layer methods; LL-SVI/LL-Dropout often WORSE than vanilla on shifted/OOD data.
- SVI: worst i.i.d. accuracy on MNIST but best Brier under heavy shift (less confidently wrong); on Criteo SVI "proved challenging to train and uniformly performed poorly."
- OOD: most methods show low entropy + high confidence on fully OOD data ("confidently wrong"); ensembles have high accuracy AND high entropy on OOD.

## 8. Code / data availability
https://github.com/google-research/google-research/tree/master/uq_benchmark_2019. Datasets: MNIST, CIFAR-10-C/ImageNet-C (Hendrycks), 20 Newsgroups, Criteo (Kaggle), SVHN, Not-MNIST (public).

## 9. Leakage & limitations
(a) Classification-only — GSE's core targets (margin, total) are regression; the regression analogue of "temperature scaling fails under shift" needs its own validation. (b) Shift is synthetic (corruptions, token randomization) — real NFL shift is subtler and structured. (c) No conformal methods in the comparison (2019 timing) — the paper can't tell us how CQR/ACI rank. (d) Hyperparameter tuning via Bayesian optimization per method is expensive; ImageNet skipped it. (e) ECE with fixed bins is itself estimator-noisy under shift.

## 10. GSE overlap
GSE's calibration library (`temperature-map.ts`, `platt-scaling.ts`, `isotonic-pava.ts`, `brier.ts`, `ece.ts`, `brier-ece.test.ts`, `calibration-map-bakeoff.ts`) implements EXACTLY the post-hoc methods this paper indicts under shift — but GSE validates them on i.i.d.-ish backtests only. No shift-stress protocol exists. This paper converts a vague worry into an adoption-ready evaluation harness.

## 11. GSE implementation spec
(1) **Shift-stress harness**: extend the calibration bakeoff (`calibration-map-bakeoff.ts`) with shift dimensions — calibrate on weeks 1–12, evaluate on weeks 13–18 + playoffs (temporal shift); calibrate pre-QB-injury, evaluate post-injury; (2) metrics per the paper: Brier (+ decomposition), NLL, ECE, accuracy across shift intensities; (3) methods under test: temperature scaling, Platt, isotonic, CQR, ACI, ensembles (model-parliament); (4) decision rule: any calibrator whose Brier under shift is worse than vanilla gets flagged/replaced. Effort: 3–4 days.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025, game-level cover probabilities. Protocol: fit calibrators on season-first-half games; evaluate on second-half + playoffs (shift), plus synthetic shift (feature noise injection à la Hendrycks corruptions). Metrics: Brier, ECE, NLL on i.i.d. vs shifted splits; rank-stability of methods across shift (does temperature scaling collapse like the paper says?).

## 13. Acceptance / rejection gate
ADOPT the harness if it reproduces the paper's signature pattern on GSE data (post-hoc calibrators lose their i.i.d. edge under temporal shift; ensembles most robust). REJECT/retire any GSE calibrator that scores worse-than-vanilla Brier under the playoff-shift evaluation — per the paper, shipping it is worse than shipping nothing.

## 14. Improvement experiment
**Shift-aware temperature**: fit the temperature (or Platt slope) as a FUNCTION of shift indicators (weeks-since-QB-change, December flag, weather bucket) instead of a scalar — test whether a conditional post-hoc calibrator survives shift where the scalar version dies. This is the constructive follow-up the paper doesn't provide.

**Verdict:** ADOPT — adopt the paper's shift-stress evaluation protocol (Brier/NLL/ECE across shift intensities, OOD slice) as the mandatory acceptance harness for every calibrator in `apps/web/lib/calibration/`; retire any post-hoc calibrator that scores worse than vanilla under temporal shift.
