# [1465] Leveraging Data to Say No: Memory Augmented Plug-and-Play Selective Prediction (arXiv:2601.22570v1)

**Citation:** Sarkar, A., Li, Y., Cheng, J., Mishra, S., & Vasconcelos, N. (2026). *Leveraging Data to Say No: Memory Augmented Plug-and-Play Selective Prediction*. Published as a conference paper at ICLR 2026. arXiv:2601.22570v1 [cs.CV]. URL: https://arxiv.org/abs/2601.22570. Code: https://github.com/kingston-aditya/MA-PaPSP
**Ledger completed:** 2026-09-21. **Read:** full text (PDF) plus key supplementary tables.
**Verdict:** ADAPT — training-free selective-prediction gate built on external VLM embeddings, retrieved proxy embeddings, and contrastive score normalization; lowers AURC across captioning, classification, video, and language tasks. Directly ports to GSE as a confidence gate / abstention layer over the pick engine.

## 1. Research question
Can selective prediction (knowing when to abstain) be done plug-and-play — with no training, no access to the base model's internals — by retrieving proxy embeddings from an external memory bank and normalizing confidence scores contrastively? The paper tests whether this memory-augmented gate beats standard confidence scores (softmax, entropy) and recent selective-prediction baselines across modalities.

## 2. Dataset / schema
- Evaluation: MS-COCO (image captioning), Flowers-102 (fine-grained classification), UCF-101 (video action recognition), SugarCrepe (compositional language understanding).
- Retrieval pool (memory bank): CC12M + CC3M + SBU-1M image-text pairs; paper states no overlap with the evaluation sets.
- Metric: AURC (Area Under the Risk-Coverage curve), lower is better. Standard in selective prediction: risk as a function of the fraction of examples the model answers.

## 3. Method / model
MA-PaPSP pipeline (training-free):
1. Take the base model's input/output embedding (e.g., a VLM embedding of the image and the model's generated caption).
2. Retrieve nearest-neighbor proxy embeddings from the external memory bank (CC12M+CC3M+SBU-1M).
3. Compute a raw confidence from the base model and a contrastive normalization term from the retrieved proxies — the score is calibrated against what the memory bank says "similar inputs" look like, correcting for the base model's miscalibrated confidence.
4. Threshold the normalized score for the coverage/risk trade-off.
No gradients, no fine-tuning; the base model is treated as a black box.

## 4. Equations & assumptions
The paper defines the contrastive score normalization and the proxy-retrieval weighting (exact forms in Sec. 3 of the paper). Assumptions: (1) the external memory bank covers the input distribution (no overlap with eval sets is asserted, but domain coverage is assumed); (2) embedding distance in the VLM space correlates with task difficulty / model reliability; (3) the base model's confidence is systematically miscalibrated in a way that neighborhood contrast can correct.

## 5. Features / target
Features: base-model embedding of the instance + retrieved proxy embeddings from the memory bank. Target: a selective-prediction score; the decision is answer vs abstain at a chosen coverage.

## 6. Validation design
Zero-shot evaluation on the four benchmarks with multiple large base models (VLMs for vision tasks). Baselines: standard softmax/entropy confidence, energy scores, and recent selective-prediction methods. Metric is AURC throughout; risk-coverage curves reported.

## 7. Numerical results / baselines
AURC (lower = better), large-model examples (paper's main table): MS-COCO captioning (Cider-based risk) 0.136 → 0.109; Flowers-102 0.074 → 0.063; UCF-101 0.113 → 0.088; SugarCrepe 0.078 → 0.062. Ablation (proxy + contrastive vs base): MS-COCO 0.109 vs 0.160; Flowers 0.063 vs 0.172; SugarCrepe 0.062 vs 0.204. Gains are consistent across modalities and base models.

## 8. Code / data availability
Code: https://github.com/kingston-aditya/MA-PaPSP. Data: public benchmarks; memory bank is public web-scale image-text corpora.

## 9. Leakage & limitations
- "No overlap" between the memory bank and eval sets is asserted but web-scale corpora (CC12M/CC3M/SBU-1M) can contain near-duplicates of eval images; contamination would inflate gains. Not stress-tested.
- Retrieval quality depends on the memory bank's domain coverage; for out-of-domain inputs the proxies may be misleading rather than corrective.
- AURC improvements are relative to weak confidence baselines in some settings; the absolute risk at high coverage is still nonzero.
- Compute cost of per-instance retrieval is not benchmarked against simply using a better-calibrated base model.

## 10. GSE overlap
Per `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, GSE's calibration lane covers conformal prediction (incl. the 2026-09-21 cqr.ts audit finding) and abstention is a standing theme (pick selection/abstention keywords), but no existing ledger implements a retrieval-based confidence gate. This is a new capability: a training-free abstention layer that sits on top of frozen pick models.

## 11. GSE implementation spec
- Build a "memory bank" of historical NFL game states: for each past game, store the engine's feature vector (or a compact embedding of it) plus the realized outcome and whether the model's pick was correct.
- At prediction time, retrieve k nearest historical game-states to the current matchup; compute the contrastive correction: model confidence minus/adjusted by the empirical accuracy of neighbors.
- Abstain (or down-weight stake) when the corrected confidence falls below a coverage threshold tuned on 2023–2024.
- Effort: ~1 week (kNN index over stored game-state vectors + calibration curve).

## 12. Reproducible test
Dataset: GSE pick logs 2022–2024 with model probabilities. Metric: AURC where "risk" = pick incorrectness, plus realized ROI at 80% coverage. Baseline: raw model-confidence thresholding. Window: fit neighbor index on ≤2022, tune threshold on 2023, test on 2024.

## 13. Acceptance / rejection gate
ADOPT the gate if, on 2024, the memory-augmented abstention policy yields higher ROI at matched coverage than raw-confidence abstention, with AURC reduced by ≥10% relative. Reject if neighbor-corrected confidence does not beat raw confidence (retrieval adds noise, not signal).

## 14. Improvement experiment
Replace the generic kNN with a learned residual-neighborhood: train a small model to predict pick correctness from (model confidence, neighbor accuracy, neighbor distance, matchup features) — i.e., distill the memory bank into a parametric gate — and test whether it keeps the AURC gain while removing per-instance retrieval latency.
