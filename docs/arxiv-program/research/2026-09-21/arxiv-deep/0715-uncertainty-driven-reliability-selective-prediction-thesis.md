# [0715] Uncertainty-Driven Reliability: Selective Prediction and Trustworthy Deployment in Modern Machine Learning (arXiv:2508.07556v2)

**Citation:** Stephan Rabanser (2025). *Uncertainty-Driven Reliability: Selective Prediction and Trustworthy Deployment in Modern Machine Learning* (PhD thesis). arXiv:2508.07556v2. URL: https://arxiv.org/abs/2508.07556v2
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, /tmp/arxiv750-cache/fulltext/2508.07556.txt) — read complete thesis: Chapters 1 (intro), 3 (SPTD training-dynamics selective prediction, method + theory + all experiments), 4 (selective prediction under differential privacy), 5 (finite-sample gap decomposition), 6 (Mirage attack / Confidential Guardian), 7 (future work), plus Table 3.1, Table 3.2, Table 6.1 in full.
**Verdict:** ADAPT — SPTD checkpoint-disagreement scoring and the five-component selective-classification gap are directly portable to GSE's pick-abstention pipeline; the DP and adversarial-abuse results are lower-value for GSE's internal use.

## 1. Research question
How can uncertainty estimation make ML systems know when to abstain? Four sub-questions: (1) can a model's own training trajectory yield a post-hoc abstention signal without retraining (SPTD)? (2) how does differential-privacy noise interact with selective prediction? (3) what finite-sample factors govern how far a selective classifier falls from the perfect-ordering oracle? (4) can uncertainty signals be adversarially manipulated by the model operator, and can that be audited?

## 2. Dataset / schema
- Classification: CIFAR-10/CIFAR-100 (Krizhevsky et al. 2009), StanfordCars (Krause et al. 2013), Food101 (Bossard et al. 2014) — vision benchmarks; ResNet-18, 200 epochs (400 for StanfordCars), SGD lr 1e-2, momentum 0.9, weight decay 1e-4, LR decay ×0.5 every 25 epochs, checkpoint every 50 mini-batches of size 128.
- Regression: California housing (N=20640, D=8), concrete strength (N=1030, D=9), fish toxicity (N=546, D=9); 80/20 shuffle split; MLP D→10→7→4→1, Adam lr 1e-2, 200 epochs, weight decay 1e-2.
- Time series: M4 competition dataset (Makridakis et al. 2020), Hospital (Hyndman 2015); GluonTS DeepAR, 200 epochs, utility = MSIS (Gneiting & Raftery 2007).
- Mirage/audit experiments: synthetic Gaussian mixture, CIFAR-100, UTKFace, Credit, Adult tabular datasets.
No sports data. All datasets public.

## 3. Method / model
**SPTD (Selective Prediction via Training Dynamics):** save intermediate checkpoints during a single SGD run; for each test point, compute a weighted prediction-instability score from how often intermediate checkpoint predictions disagree with the final prediction, emphasizing late-training disagreements via weighting function v_t = (t/T)^k, best k ∈ [1,3]. Thresholding the instability score yields the reject option. Cost: O(1) extra training, O(T) inference forward passes; 10 checkpoints suffice for the high-coverage regime (reject 30–50%). Theory: checkpoint disagreement approximates posterior variance / Monte-Carlo posterior estimators; connects to dataset cartography (Swayamdipta et al. 2020) but label-free at test time, and to "forging" (Thudi et al. 2022).

**Ch.4 DP:** first study of selective classification under (ε,δ)-DP via DP-SGD. Findings: methods needing multiple dataset passes (e.g., full deep ensembles, SelectiveNet-style calibration) suffer because each run spends more privacy budget; checkpoint-based SPTD is most competitive, especially at ε=1. Proposes accuracy-normalized selective classification metric (discrepancy vs. a model-dependent perfect-ordering upper bound) because full-coverage accuracy alignment via early stopping is infeasible under DP.

**Ch.5 Gap decomposition:** Δ̂(c) ≤ ε_Bayes(c) + ε_approx(c) + ε_rank(c) + ε_stat(c) + ε_misc(c) — the coverage-uniform selective-classification gap to the oracle frontier decomposes into irreducible Bayes noise, capacity/approximation error, ranking error, statistical (finite-sample) noise, and optimization/shift slack. Key theorem: monotone post-hoc calibration (temperature scaling etc.) *cannot* reduce the ranking term because it preserves the total order of scores. Only non-monotone or feature-aware calibrators shrink ε_rank. Empirical: Bayes noise + capacity explain large gaps; temperature scaling improves calibration but not ranking (validated on two-moons, CIFAR-10N/CIFAR-100N, CIFAR-10C, Camelyon17-WILDS).

**Ch.6 Mirage / Confidential Guardian:** Mirage attack adds a KL-divergence penalty pulling the predictive distribution toward a label-smoothed near-uniform target (biased to the correct label by ε∈[0.1,0.2]) in a targeted region — confidence drops, accuracy unchanged, evading accuracy audits. Confidential Guardian detects it via ECE deviations on a reference dataset covering the uncertainty region, computed inside zero-knowledge proofs of verified inference (IT-MAC-authenticated). ZKP benchmark: Gaussian tabular model 0.033 sec/pt, 440.8 KB/pt; CIFAR-100-scale model <<333 sec/pt, <<1.27 GB/pt (expensive).

## 4. Equations & assumptions
- Selective rule: (f,g)(x) = f(x) if g(x) ≤ τ else ⊥. Coverage = M_τ/M; utility on accepted points (accuracy / R² / MSIS).
- MSIS (time series utility) given in full in §3.8: MSIS = (1/(M_τ R)) Σ_i [Σ_{r=n+1}^{n+R}(u−l) + (2/α)(l−y)1[y<l] + (2/α)(y−u)1[y>u]] / [(1/(n−m))Σ_{r=m+1}^{n}|y_r − y_{r−m}|].
- Gap: Δ̂(c) ≤ ε_Bayes + ε_approx + ε_rank + ε_stat + ε_misc, ∀c∈(0,1] (Eq. 5.1).
- DP-SGD: per-sample gradient clipping + Gaussian noise ∝ clip norm; post-processing property preserves DP for SPTD.
- Mirage penalty: KL(f(x) ‖ smoothed-target(ε)) in target region; ε ∈ [0.1,0.2] empirically effective.
- Assumptions: standard i.i.d. supervised setup; checkpoint recording practice; reference dataset with coverage of uncertainty region for the audit (flagged as limitation); deployed model already calibrated.

## 5. Features / target
Vision/regression/time-series tasks as above; targets: class labels, real values, forecast horizons. Mirage targets confidence in chosen input regions.

## 6. Validation design
Accuracy/coverage trade-off curves across coverage 100→10; baselines: SR (softmax response), SAT+ER+SR, SelectiveNet, ODIST (Gaussian/Student-t parametric output), Deep Ensembles (E=10). Hyper-parameter tuning documented in Appendix A.2.1. No time ordering (vision data), so not directly a backtest; time-series results on M4/Hospital.

## 7. Numerical results / baselines
Table 3.2 (selective accuracy, mean±std over random runs; quoting key rows):
- CIFAR-10 at coverage 50: SR 98.6±0.2, SAT+ER+SR 99.7±0.1, DE 99.7±0.1, SPTD 99.8±0.0, DE+SPTD 99.9±0.0. At coverage 90: SPTD 96.5±0.0 vs DE 96.8±0.1 vs SR 96.4±0.1.
- CIFAR-100 at coverage 50: SPTD 94.6±0.0 vs DE 94.8±0.0, SR 92.9±0.1; coverage 10: SPTD 99.4±0.1, DE 99.2±0.1, DE+SPTD 99.6±0.1.
- StanfordCars at coverage 70: SPTD 93.6±0.0 vs DE 92.4±0.1, SAT+ER+SR 92.2±0.1.
- Table 3.1 cost/performance rank (of selective-classification methods): SR=5, SAT=4, DE=2, SPTD=2 (train O(1), inference O(T)), DE+SPTD=1.
- Regression & M4/Hospital time series: SPTD comparable to DE, improves over DE at low coverage; ODIST "subpar" — no meaningful signal.
- Table 6.1 (Mirage): Gaussian — Acc 97.62→97.58, ECE 0.0327→0.0910, CalE-in-ε-bin 0.3721; CIFAR-100 — Acc 83.98→83.92, ECE 0.0662→0.1821; Credit — Acc 91.71→91.78, ECE 0.0094→0.0210; Adult — Acc 85.02→84.93, ECE 0.0109→0.0234. Accuracy preserved, miscalibration introduced — reliably detected by Confidential Guardian when the reference set covers the region.

## 8. Code / data availability
Author (arXiv-verified): Stephan Rabanser. Papers cited as the thesis's published chapters: Rabanser et al. 2023 (NeurIPS 36), 2025b, 2025c.

## 9. Leakage & limitations
- No sports/NFL data; external validity to betting-model abstention untested.
- SPTD requires recorded checkpoints from the *actual* training run of the deployed model; GSE's engine may not produce SGD trajectories (if it's tree-based or analytic, SPTD doesn't apply as-is).
- Chapter 4/6 are privacy/security results with limited GSE internal value (GSE does not publish differentially-private models; the Mirage threat model assumes a dishonest model *owner*, which is not GSE's setting).
- Accuracy-normalized metric is model-dependent (its own upper bound), complicating cross-model comparison.

## 10. GSE overlap
Existing-research map check: GSE's abstention work is conformal (CQR audit caught the cqr.ts clamp bug), plus BALToR-style conditional-risk thresholding (ledger 0714, this wave). The training-dynamics signal is new capability: if any GSE model trains by SGD with logged checkpoints (or is re-trainable with them), SPTD gives a free abstention feature — no extra training cost. The gap decomposition (monotone calibration cannot fix ranking error) directly disciplines GSE's calibration lane: it says temperature-scaling win-probabilities does not improve *which picks to post* — need a re-ranking signal. Complementary to, not duplicating, the conformal-abstention work.

## 11. GSE implementation spec
1. If GSE trains any neural model (props, DFS projections): save checkpoints each epoch; compute per-pick instability vs final prediction on the candidate pick set; feed instability as a feature into the posting gate (BALToR-style quantile rule from ledger 0714).
2. If no SGD model: emulate SPTD cheaply via seeded bagging of the existing tree model (10 seeds ≈ the "T=10 checkpoints" regime the paper shows suffices at high coverage) — compute prediction disagreement across seeds as the instability proxy.
3. Apply gap decomposition as a diagnostic: when the posted-pick accuracy/coverage curve underperforms the oracle bound, attribute to the five components and only invest in re-ranking signals (new features), not more calibration, if ε_rank dominates.
Effort: 1–2 weeks for the bagged-disagreement feature; calibration-only check is immediate.

## 12. Reproducible test
Dataset: GSE engine `picks` table, 2024–2025 seasons. Build seed-disagreement score (10 bagged refits or checkpointed NN) per pick; at c=0.70 coverage compare hit rate of instability-thresholded picks vs confidence-thresholded picks vs random. Success also requires reproducing the paper's structural finding: temperature scaling of engine probabilities must NOT change the accuracy-coverage curve (ε_rank preserved) — verify on the same data.

## 13. Acceptance / rejection gate
ADOPT the instability/disagreement feature if, at c=0.70 on 2024–2025 engine picks, instability-selected picks beat confidence-top-70% selection by ≥1.0 pp hit rate (or, for spread picks, +1.0 pp cover rate), with a two-sided McNemar p<0.10. REJECT otherwise. Separately, the "calibration can't fix ranking" principle is adopted as doctrine immediately (no test needed — it's a mathematical statement about monotone transforms).

## 14. Improvement experiment
Combine SPTD-style disagreement with Mondrian conformal risk scores: use disagreement as the conformity score's *ranking* dimension and conformal calibration for the *accept/reject threshold* — the paper treats these separately (DE+SPTD is the closest), but a conformalized instability threshold would give both a re-ranking signal and a finite-sample coverage guarantee, which neither paper has.
