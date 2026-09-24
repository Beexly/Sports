# [0037] Modern Deep Learning Approaches for Cricket Shot Classification: A Comprehensive Baseline Study (arXiv:2510.09187v1)

**Citation:** Sungwoo Kang (2025). *Modern Deep Learning Approaches for Cricket Shot Classification: A Comprehensive Baseline Study*. arXiv:2510.09187v1. URL: https://arxiv.org/abs/2510.09187
**Ledger completed:** 2026-09-21. **Read:** full local text (title through references, including Tables I–III, full per-class dataset split table, all four paradigm architectures, and results/discussion).
**Verdict:** REJECT — a cricket broadcast-video shot-classification benchmark with no NFL transfer; its one GSE-relevant insight is a reproducibility caution already covered by the benchmark lane.

## 1. Research question
Establish the first comprehensive, unified baseline for cricket shot classification (identifying batting techniques from video sequences) by re-implementing seven prior deep-learning approaches across four paradigms under a standardized protocol, and quantify the gap between reported accuracies in prior papers and re-implementation results. (Abstract, I-C)

## 2. Dataset / schema
**CricShot10 dataset** (Sen et al. 2021, sourced from the original authors): 1,894 video clips of 10 batting techniques — Cover Drive, Defensive Shot, Flick Shot, Hook Shot, Late Cut, Lofted Shot, Pull Shot, Square Cut, Straight Drive, Sweep Shot. Average 3.2 s/clip, 1280×720 resolution, approximately balanced (180–200 samples per class). Stratified split, fixed random seed 27: 70% train (1,320), 15% validation (284), 15% test (284); full per-class table (Table II) given in the paper (e.g., Cover 131/29/28, Pull 125/27/27, Square Cut 140/30/30, Straight 135/29/29, Sweep 136/29/29).

## 3. Method / model
Seven models across four paradigms (Section III-B):
- **Paradigm 1 — Kumar et al. LRCN (adaptation):** lightweight 4-layer CNN with aggressive 4×4 max-pooling and dropout 0.4, single-layer LSTM with 32 hidden units, fully-connected classifier; preprocessing: hard-coded crop [120:600, 360:920], 64×64 resolution, 25 evenly-spaced frames.
- **Paradigm 2 — Bhat et al. (comparative):** (a) CNN+RNN: 4-layer CNN (9,216-dim flattened features/frame) + 2-layer GRU (512 hidden units); (b) Attention Network: Bi-LSTM frame features + attention layer computing weighted sum to focus on salient frames; (c) ViT hybrid: ViT with 6-layer Transformer encoder on 20×20 patches per frame + GRU; all on 100×100 frames, 25-frame sequences.
- **Paradigm 3 — Sen et al. (progressive enhancement):** custom 5-layer CNN-GRU; Dilated CNN-GRU (dilated convolutions expanding receptive field); VGG16-GRU transfer learning with three fine-tuning variants — fully frozen, final 4 layers trainable, final 8 layers trainable; 15 frames/video, random sampling, 180×224 or 224×224 resolution.
- **Paradigm 4 — Proposed (modern optimization):** pretrained EfficientNet-B0 backbone (1,280-dim feature vector/frame, compound-scaled depth/width/resolution); 2-layer bidirectional GRU temporal modeler; temporal attention mechanism producing a single context vector → final linear classifier; preprocessing: 224×224 aspect-preserving resize + padding (no distortion), 30 uniformly-sampled frames, ImageNet-std normalization; hyperparameters (learning rate, weight decay, GRU layers/hidden dims) tuned via Optuna.
- All implementations in PyTorch Lightning ("modern MLOps practices"); trained/evaluated on a single NVIDIA A100 (40GB).

## 4. Equations & assumptions
No equations stated in the paper. Implicit assumptions: 15–30 sampled frames suffice to capture shot development; broadcast-camera framing is consistent enough for fixed-crop or full-frame approaches; the 10 shot classes are mutually exclusive and cover the task; a standardized preprocessing protocol isolates architectural differences.

## 5. Features / target
Inputs: RGB video frames of batting shots (resized per paradigm: 64×64 to 224×224). Target: 10-class batting-technique label (Cover Drive, Defensive Shot, Flick Shot, Hook Shot, Late Cut, Lofted Shot, Pull Shot, Square Cut, Straight Drive, Sweep Shot). No prediction horizon — per-clip classification.

## 6. Validation design
Single stratified 70/15/15 split (seed 27) on CricShot10; accuracy + weighted precision, recall, F1 (Section IV-B). No cross-validation, no time ordering (not applicable — video clips); baselines are the seven re-implementations compared under one protocol.

## 7. Numerical results / baselines
Overall comparison on CricShot10 (Table III), quoted exactly:
- EfficientNet-B0 + GRU (this work): accuracy **92.25%**, precision 92.27%, recall 92.25%, F1 92.13%.
- Dilated CNN-GRU (Sen et al.): 57.67% / 58.20% / 57.67% / 57.34%.
- Custom CNN-GRU (Sen et al.): 55.82% / 56.30% / 55.82% / 54.05%.
- CNN-RNN (Bhat et al.): 55.63% / 58.24% / 55.63% / 55.56%.
- VGG16-GRU Final8 (Sen et al.): 55.29% / 58.38% / 55.29% / 56.00%.
- VGG16-GRU Frozen (Sen et al.): 48.94% / 48.73% / 48.94% / 48.20%.
- LRCN (Kumar et al.): 46.03% / 47.26% / 46.03% / 45.90%.
- Attention Network (Bhat et al.): 40.49% / 39.10% / 40.49% / 37.78%.
- VGG16-GRU Final4 (Sen et al.): 26.46% / 18.63% / 26.46% / 16.93%.
- ViT-GRU Hybrid (Bhat et al.): 10.56% / 1.12% / 10.56% / 2.02%.
- **Performance gap (the paper's headline finding):** prior claims of 96% (Kumar/Balaji LRCN), 99.2% (Bhat et al. IJERCSE), and 93% (Sen et al. Sensors) re-implement to 46.0%, 55.6%, and 57.7% respectively — the abstract frames it as "10.6–57.7% compared to reported 93–99.2%." The paper attributes the discrepancy to dataset splits, evaluation code, and unspecified implementation details.

## 8. Code / data availability
Code: https://github.com/hpicsk/CricShot10_Baselines (stated as publicly available, all seven baselines + proposed method). Data: CricShot10 sourced from the original authors (no public URL stated).

## 9. Leakage & limitations
- The "gap" finding is honest but its causes are speculative ("likely due to differences in dataset splits, evaluation code, or minor implementation details") — the re-implementations may understate the originals if details were lost.
- Single split (no cross-validation) on 284 test clips; no per-class metrics despite the paper itself flagging subtle inter-class pairs (pull vs. hook) as the core challenge (I-A).
- The ViT result (10.56% accuracy, 1.12% precision — essentially chance) and the VGG16-Final4 collapse (26.46%) suggest implementation/training failures rather than architectural verdicts; the paper does not investigate either.
- Broadcast video shot-type classification in cricket; no tracking coordinates, no game-state context.
- External validity to NFL: none — no play-level labels, no coordinates, no outcome prediction.

## 10. GSE overlap
No duplication and no transfer. The existing-research map's tracking lane is NGS *coordinate* tracking (27-family taxonomy, STRAIN pass-rush metric) — GSE has no broadcast-video analysis lane, and cricket shot-type classification has no mapping onto NFL spread/total/moneyline or prop prediction. The one overlap is thematic: the paper's reproducibility moral ("standardized evaluation protocols expose inflated claims") rhymes with GSE's benchmark lane (the 156-item benchmark completeness audit and methods literature review in the map) — but that is a caution about research hygiene, not a capability to build. Per the map, arXiv tracking-data methodology that reproduces NGS metrics is in scope; this paper is not tracking-data methodology.

## 11. GSE implementation spec
None. No implementation is warranted: GSE has no video-analysis lane, no cricket data, and no task that maps to per-clip shot classification.

## 12. Reproducible test
None applicable to GSE's stack. (The paper's own reproducibility test — clone https://github.com/hpicsk/CricShot10_Baselines, rerun Table III on CricShot10 — is fully specified but answers a cricket question, not an NFL one.)

## 13. Acceptance / rejection gate
**Rejected outright:** no NFL task, no NFL data, no predictive technique that transfers. The paper's value (standardized video-classification benchmarking for cricket) stays with cricket researchers.

## 14. Improvement experiment
None applicable. The one lesson worth recording for GSE's benchmark lane: when evaluating any published sports-ML method for adoption, re-implement or re-run the baseline under GSE's own backtest protocol before trusting reported accuracy — this paper shows reported numbers can overstate re-implemented performance by 35–45 points. That discipline already exists in the benchmark-completeness audit, so no new experiment is required.
