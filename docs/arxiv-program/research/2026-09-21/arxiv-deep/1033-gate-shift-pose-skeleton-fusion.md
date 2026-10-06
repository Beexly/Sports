# 1033 — Gate-Shift-Pose: Enhancing Action Recognition in Sports with Skeleton Information (2503.04470)

## Citation / full-text source
Edoardo Bianchi, Oswald Lanz, "Gate-Shift-Pose: Enhancing Action Recognition in Sports with Skeleton Information", arXiv:2503.04470v2 (2025). Project page: https://edowhite.github.io/Gate-Shift-Pose. Full text: export.arxiv.org/pdf/2503.04470 (9 pages, PDF parsed in full).

## Research question
For binary athlete fall classification in figure skating, can adding skeleton pose (from YOLO11-x-pose) to a Gate-Shift-Fuse (GSF) RGB network — via early-fusion (Gaussian heatmap as 4th input channel) or late-fusion (two-stream RGB + pose MLP with multi-head attention) — substantially beat the RGB-only GSF baseline, and which fusion strategy suits which backbone capacity?

## Dataset / schema
**FR-FS** dataset [27]: 417 video samples — 276 fall (positive), 141 non-fall (negative) — each 103 frames, capturing take-off, rotation, landing; sourced from the FIV dataset + PyeongChang 2018 Winter Olympics footage. Poses: YOLO11-x-pose (COCO, 17 keypoints; mAP 69.5% @ 0.5:0.95, 91.1% @ 0.5; 58.8M params), keypoints precomputed to disk.

## Method
Gate-Shift-Pose (GSP) = GSF (2D CNN + gated temporal shift + weighted channel fusion, from TSN/TSM lineage) + pose, two fusion strategies:
- **Early-fusion:** each RGB frame augmented with a Gaussian heatmap channel of the 17 keypoints → 4-channel input into a single GSF network (learns pose–appearance correlations from input stage).
- **Late-fusion:** two streams — GSF on RGB; dedicated pose MLP (34-dim (x,y) → FC64 → FC128 → FC128 → 128-dim embedding, ReLU). Streams L2-normalized, concatenated → multi-head attention → refinement module (FC halve dim → BN → ReLU → dropout; FC halve again → BN → ReLU → dropout; here FC1 64, FC2 32) → FC classifier.
- Backbones: ResNet18 and ResNet50, ImageNet init. Training: SGD momentum 0.9, wd 5e-4, LR 0.01 cosine annealing, batch {4,8}, segments {16,32}, 120 epochs.

## Equations / assumptions
No numbered loss equations; formalized from text: early-fusion input X = [RGB; H(keypoints)] (4 channels), H = Σ_j exp(−||p−k_j||²/2σ²); late-fusion z = MHA(concat(L2(f_RGB), L2(f_pose))), refined through two halving FC–BN–ReLU–dropout blocks, cross-entropy loss. Assumptions: fall-relevant cues are pose-dominant; single clearly-visible athlete (low occlusion); precomputed poses are trustworthy inputs.

## Features / target
Features: RGB frames (+ Gaussian keypoint heatmap, early) or RGB + 34-dim joint coords (late). Target: binary fall vs non-fall per 103-frame sample.

## Validation
Classification accuracy on FR-FS, grid over backbone × fusion × batch × segments. Compared against RGB-only GSF baseline (same training).

## Exact results / baselines
(Table 1, exact values):
- ResNet18: GSF baseline best 67.79% (bs4, 32 seg; other configs 66.34–67.31) → GSP early best 81.25% (bs8, 32 seg) → GSP late best 95.19% (bs4, 32 seg; bs8/32 = 89.90).
- ResNet50: GSF baseline best 81.73% (bs8, 32 seg; others 70.68–75.00) → GSP early best 98.08% (bs4, 32 seg; bs8/16 = 97.12) → GSP late best 87.02% (bs8, 32 seg).
- Relative gains: ResNet18 67.79→95.19 (+27.4pp, ~40% relative per paper); ResNet50 81.73→98.08 (+16.35pp, ~20% relative).
- Training notes: batch 4 > batch 8 on this small dataset; 32 segments > 16 consistently.
- Rule-of-thumb finding: early-fusion wins with large backbones (ResNet50), late-fusion wins with light backbones (ResNet18).

## Code / data
Project page https://edowhite.github.io/Gate-Shift-Pose exists; FR-FS dataset [27] external. Pose precompute via YOLO11-x-pose reproducible.

## Leakage
Single binary task on 417 samples; train/val split protocol not described in the paper text (no explicit statement of athlete-disjoint splits or fold count — a real gap; the same athletes may appear in both splits since samples come from FIV + PyeongChang footage). Results should be treated as optimistic until split hygiene is confirmed.

## Limitations
- Tiny dataset (417 samples) with undisclosed split protocol; no cross-validation reported.
- RGB-only GSF baselines are weak (67.79%/81.73%) — likely undertrained — inflating the pose-fusion gain claims.
- Single narrow task (skating fall detection); no multi-class or temporal detection evaluation.
- YOLO11-x-pose is 58.8M params — real-time claim requires the lighter n/s variants, untested.
- Figure skating is a low-occlusion single-athlete sport; multi-player team sports untested.

## GSE overlap
GSE classifies fine-grained technique events (falls → think injuries, awkward landings, penalty motions) from broadcast video. The fusion-strategy-vs-backbone rule (early-fusion for heavy backbones, late-fusion for light) is a directly usable design rule for GSE's RGB+pose classifiers, and the Gaussian-heatmap-as-4th-channel trick is a cheap way to inject pose into any 2D video CNN without a graph network.

## Implementation (GSE adaptation)
For any GSE binary technique-event classifier (e.g., "clean vs awkward landing" on broadcast clips): run ResNet50-GSF with early-fusion 4-channel (RGB + keypoint heatmap) input when compute allows; ResNet18-GSF with late-fusion attention stream for edge/latency-constrained deployment. Precompute poses offline (YOLO11-pose) and store; sweep segments {16,32} and batch {4,8}.

## Reproducible test
Take GSE's own binary motion-event dataset (≥300 clips); train RGB-only GSF vs GSP-early vs GSP-late under athlete-disjoint 5-fold CV; report mean accuracy and the fusion/backbone ranking.

## Numeric gate
Both GSP variants must beat the RGB-only baseline by ≥10pp mean accuracy on athlete-disjoint folds AND the early-fusion-vs-late-fusion ranking must hold (ResNet50: early ≥ late; ResNet18: late ≥ early) before the design rule ships into GSE models. If fusion gains vanish under proper splits, the paper's headline 40% gain is a dataset artifact — drop it.

## Improvement experiment
Replace the handcrafted Gaussian heatmap with a learned spatial encoder: small conv net mapping (x,y,confidence)^17 to a 16-channel spatial prior, trained jointly with the GSF backbone; compare against fixed heatmap on the same folds. Also: test YOLO11-n-pose + early-fusion for latency–accuracy tradeoff on edge hardware.

## Verdict
ADAPT
