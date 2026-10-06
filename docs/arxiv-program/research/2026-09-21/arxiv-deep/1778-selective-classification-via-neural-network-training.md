# [1778] Selective Classification Via Neural Network Training Dynamics (arXiv:2205.13532)

**Citation:** (authors as listed on arXiv) *Selective Classification Via Neural Network Training Dynamics*. arXiv:2205.13532. URL: https://arxiv.org/abs/2205.13532
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML — abstract, NNTD method: checkpoint prediction disagreement with final label, late-weighted averaging, experiments on CIFAR-10/100, SVHN, Cats & Dogs, GTSRB with VGG16/300 epochs/SGD, comparison tables vs SAT/DG/SN/SR/MC-DO, conclusion).
**Verdict:** ADAPT — training-dynamics disagreement is a genuinely different, empirically winning confidence signal (beats SAT, Deep Gamblers, and MC-Dropout on coverage at fixed error) that GSE can lift as a second gate signal from its own model checkpoints; needs adaptation from image classification to sports pick models.

## 1. Research question
Can the *training dynamics* of a neural network — how its predictions on each example evolve across checkpoints — provide a better selective-classification (abstention) signal than the standard final-model confidence scores (softmax response, MC-Dropout, learned abstention heads)?

## 2. Dataset / schema
Image classification: CIFAR-10, CIFAR-100, SVHN, Cats & Dogs, GTSRB. Model: VGG16, 300 epochs, SGD. Baselines: SAT (SelectiveNet-style), DG (Deep Gamblers), SN (Selective Noise?), SR (softmax response), MC-DO (MC-Dropout).

## 3. Method / model
NNTD (Neural Network Training Dynamics): save 25–50 checkpoints during training; for each example, record whether each checkpoint's prediction agrees with the *final* model's label; the disagreement score is a late-weighted average of these disagreements (best reported weighting k = 0.05, emphasizing late checkpoints). Examples the model "changed its mind about" late in training are the uncertain ones — abstain on high-disagreement examples. No extra head, no extra training: the signal is free if you keep checkpoints.

## 4. Equations & assumptions
- Disagreement score: late-weighted average over checkpoints of 1[prediction at checkpoint t ≠ final prediction], with exponential-style weighting favoring late checkpoints (best k = 0.05).
- Selection rule: abstain on the highest-disagreement fraction; report risk–coverage curves.
- Assumptions: the final model's label is the reference (disagreement is measured against it, not ground truth); checkpoints are saved densely enough (25–50) to resolve the dynamics; late-training instability reflects genuine example difficulty rather than optimization noise.

## 5. Features / target
Input: images. Target: class label. The *meta-target* for selection: whether the final prediction is correct (disagreement as its proxy).

## 6. Validation design
Risk–coverage curves on five image datasets; two views: coverage at fixed error targets (2%, 1%, 0.5%) and error at fixed coverage (90%). Five random-split-style reporting with exact numbers vs five baselines.

## 7. Numerical results / baselines
- CIFAR-10, coverage at fixed error: at 2% error — NNTD 91.2 vs SAT 90.3, DG 89.1, SN 88.3, SR 85.8, MC-DO 86.1; at 1% — NNTD 86.4 (best); at 0.5% — NNTD 75.9 (best).
- SVHN, coverage at fixed error: at 2% — 98.5; at 1% — 96.3; at 0.5% — 88.1 (NNTD best at all three).
- CIFAR-10 at 90% coverage (error): NNTD 1.83 vs SAT 1.90, DG 2.19, SN 2.29, SR 2.78, MC-DO 2.87.
- 25–50 checkpoints suffice; late weighting (k = 0.05) is the best reported setting.

## 8. Code / data availability
None stated in the extracted text.

## 9. Leakage & limitations
- Disagreement is measured against the *final model's own label*, not truth — if the final model is confidently wrong on a whole subpopulation, NNTD can't see it.
- Image-classification only; sports models are often GBMs/ensembles, not checkpointed SGD nets — the "training dynamics" need redefinition (e.g., boosting-round or bagging-seed disagreement).
- Keeping 25–50 checkpoints is storage-heavy for large models; the paper doesn't cost this.
- Late-weighting hyperparameter k = 0.05 is tuned on the same benchmarks it wins on.

## 10. GSE overlap
New signal, no duplicate: GSE's gating today uses final-model probabilities/edges. Nothing in the corpus mines *training instability* as a confidence feature. The existing-research map's ensemble/uncertainty lanes cover prediction-time disagreement (ledgers on ensembles exist) but not training-time disagreement — a different, cheaper-to-compute axis.

## 11. GSE implementation spec
Build **GSE-NNTD** for the pick model: (a) during training, snapshot predictions on the full slate at each boosting round / epoch / bagging seed (25–50 snapshots); (b) per pick, compute the late-weighted disagreement of snapshot predictions vs the final pick; (c) add this as a *second gate feature* alongside the learned score (ledger 1775) — abstain when disagreement is high even if the final edge looks good (the "changed its mind late" picks); (d) for GBM-based GSE models, define snapshots as per-round predictions; for ensembles, per-seed predictions. Effort: ~1 week (snapshot logging + disagreement feature + gate ablation).

## 12. Reproducible test
Dataset: GSE model training runs with snapshot predictions + graded picks 2022–2025. Baseline: gate on final-model edge only. Candidate: gate on edge + NNTD disagreement. Metric: AuRC (risk–coverage) and hit-rate at the posted-card coverage; ablate the disagreement feature to isolate its contribution.

## 13. Acceptance / rejection gate
ADAPT accepted if adding the disagreement feature improves AuRC by ≥ 5% relative over the edge-only gate on walk-forward seasons AND the top-disagreement abstentions are enriched for losses (precision check); else REJECT the feature (keep snapshot logging off to save storage).

## 14. Improvement experiment
Weight the disagreement by *when* the flips happen relative to line movement: a pick the model flipped on late in training AND whose market line moved against it is doubly suspect. Test a joint training-dynamics × market-disagreement score vs NNTD alone — the paper's signal is purely internal; sports has an external "second opinion" (the market) the paper's domain lacks.

**Verdict:** ADAPT — checkpoint-disagreement is an empirically strong, nearly-free second gate signal that ports naturally to any iteratively-trained GSE model, but the snapshot definition and the weighting must be re-derived for sports models rather than copied from VGG16.
