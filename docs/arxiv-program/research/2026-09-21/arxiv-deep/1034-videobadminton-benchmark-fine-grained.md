# 1034 — Benchmarking Badminton Action Recognition with a New Fine-Grained Dataset (2403.12385)

## Citation / full-text source
Qi Li, Tzu-Chen Chiu, Hsiang-Wei Huang, Min-Te Sun, Wei-Shinn Ku, "Benchmarking Badminton Action Recognition with a New Fine-Grained Dataset", arXiv:2403.12385v2 (2024). Full text: export.arxiv.org/pdf/2403.12385 (16 pages incl. appendix, PDF parsed in full).

## Research question
Coarse benchmarks (Kinetics, UCF101) don't capture fine-grained racquet-sport actions. Can a new self-recorded badminton dataset (18 stroke classes, consistent broadcast-style camera) serve as a discriminative benchmark, and how do leading video vs skeleton architectures rank on it — including in the low-sample regime?

## Dataset / schema
**VideoBadminton**: 7,822 clips, 18 classes, 145 minutes total, self-recorded (Table 1). 19 adept players (15M/4F, National Central University badminton school team); 18 BWF-standard stroke types: Short Serve, Cross-Court Flight, Lift, Tap Smash, Block, Drop Shot, Push Shot, Transitional Slice, Cut, Rush Shot, Defensive Clear, Defensive Drive, Clear, Long Serve, Smash, Flat Shot, Rear Court Flat Drive, Short Flat Shot. Camera: Imaging Source DFK 37AUX273, 1280×960 @ 60fps, XRGB; positioned 2 m behind baseline, 4.5 m high, tilted 30° (broadcast-like); wide-angle radial distortion corrected via OpenCV chessboard calibration, then cropped/resized. Labeling: Shot-By-Shot (S²) tool — rally/shot segmentation, shuttlecock trajectory detection, per-shot labels; 5 student labelers (incl. team member), reviewed by head coach; rare classes augmented via controlled ball-feeding under the same camera setup. File naming encodes date/time/ID/start-end/half/ball-type. Includes player locations and shuttle trajectory annotations. Dataset + code promised for release. vs prior: Badminton Olympic dataset (10 videos, 751 point instances, 12 stroke classes) and ShuttleNet (43,191 clips, 10 classes, stroke-forecasting focus).

## Method
Benchmark of 7 architectures via MMAction2 on VideoBadminton (8:1:1 train/val/test): R(2+1)D, SlowFast, TimeSformer, Swim (Video Swin Transformer), MViT-V2 (video models), ST-GCN, PoseC3D (skeleton models). Full training configs disclosed (Appendix B: optimizers, schedulers, pipelines per model). Also evaluates on two balanced subsets: VideoBadminton-10 and VideoBadminton-50 (10/50 clips per class). Dataset characterization: frame entropy (Eq 1–3) and mean consecutive-frame ResNet-50 feature distance (Eq 4–5) per class.

## Equations / assumptions
- Frame entropy: p(i)=h(i)/N (Eq 1); Entropy = −Σ_{i=0}^{255} p(i) log2 p(i) (Eq 2–3).
- Mean frame-level feature difference: f = F'(I) (Eq 4, ResNet-50 penultimate layer); d(f_i, f_{i−1}) = √(Σ_j (f_ij − f_{(i−1)j})²) (Eq 5).
- Model equations recapitulated per method (Eq 6–16: (2+1)D conv, ST-GCN graph conv, TimeSformer attention, PoseC3D joint/limb heatmaps, SlowFast pathways, MViT attention + relative PE).
- Assumptions: controlled recording generalizes to match footage; coach-verified labels are ground truth; 60fps broadcast-style angle suffices for stroke discrimination.

## Features / target
Features: video clips (RGB) or pose skeletons (ST-GCN: COCO layout, 2-person input, clip_len 100; PoseC3D: 17-ch heatmaps, clip 48, σ=0.6). Target: 18-class stroke label.

## Validation
Top-1, Top-5, Mean Class Accuracy on the held-out test set; plus 10-shot and 50-shot-per-class balanced subsets. Training protocols per original papers; augmentation: random crop, horizontal flip, color jitter.

## Exact results / baselines
- **Full dataset (Table 3):** SlowFast 82.80 / 97.54 / 73.80 (top1/top5/mean-cls) — best; Swim 81.99/96.52/69.93; PoseC3D 80.76/96.01/67.18; R(2+1)D 79.53/96.11/66.97; ST-GCN 74.41/93.76/61.44; TimeSformer 73.18/94.78/57.70; MViT-V2 14.23/62.23/10.76 (catastrophic failure — won't converge on this data).
- **VideoBadminton-10 (Table 2):** ST-GCN 28.05/68.58/23.59 (best top-1); PoseC3D 23.03; Swim 19.86; TimeSformer 19.45; R(2+1)D 13.10; SlowFast 12.79; MViT-V2 13.10.
- **VideoBadminton-50:** ST-GCN 60.70/89.25/54.86 (best); PoseC3D 59.98; Swim 53.53; TimeSformer 45.45; R(2+1)D 40.84; SlowFast 12.28; MViT-V2 12.69.
- Key finding: skeleton methods (ST-GCN, PoseC3D) are the most sample-efficient architectures here; heavy RGB models need the full dataset; MViT-V2 never trains on this fine-grained data under the authors' configs.

## Code / data
Dataset + code promised public for research (no URL in the paper text — check for release before depending on it). Full MMAction2 configs disclosed in Appendix B (reproducible training).

## Leakage
Train/val/test split 8:1:1 by clip; athletes may repeat across splits (19 players across 7,822 clips — player-disjointness not enforced, stated or implied). Identity leakage likely inflates absolute accuracies; the *relative architecture ranking* is the durable finding.

## Limitations
- No player-disjoint splits → absolute numbers optimistic.
- Practice footage with a fixed camera, not real match broadcasts (no crowd, no camera cuts, no occlusions).
- MViT-V2 failure may be config error rather than a fundamental finding (no diagnostic).
- Class distribution (Figure 6) not numerically reported; mean-class accuracy gaps (SlowFast 73.80 vs top-1 82.80) show imbalance effects.
- Dataset release URL not yet confirmed in the paper.

## GSE overlap
Direct template for GSE's own fine-grained sports benchmark: the same architecture ladder (RGB vs skeleton vs transformer) evaluated on racquet-sport data answers "which model family should GSE bet on for fine-grained technique classification." The sample-efficiency ranking (ST-GCN/PoseC3D ≫ RGB at 10–50 shots) maps directly onto GSE's label-scarce reality. The data-collection recipe (fixed broadcast-like camera, distortion correction, S²-style shot labeling, coach verification, controlled ball-feeding for rare classes) is a blueprint for building GSE's own fine-grained datasets for new sports.

## Implementation (GSE adaptation)
(1) Adopt the VideoBadminton benchmark protocol as GSE's model-selection harness: when a new fine-grained action task arises, run the ST-GCN/PoseC3D/SlowFast/Swin ladder on 10-, 50-, and full-shot subsets and pick the family by the same three metrics. (2) Use the dataset-construction pipeline (fixed camera + distortion correction + expert-verified shot labeling + rare-class staged capture) to build GSE's first fine-grained benchmark for an NFL-adjacent action set (e.g., tackling forms, route variants). (3) Use frame entropy + consecutive-frame feature distance (Eq 1–5) as dataset-difficulty diagnostics for any new GSE video corpus.

## Reproducible test
Download VideoBadminton (if released) and reproduce the Table 3 ranking with MMAction2 configs from Appendix B; verify ST-GCN wins the 10-shot subset and SlowFast wins full data.

## Numeric gate
The architecture-selection harness is adopted only if the reproduced ranking matches the paper's (ST-GCN/PoseC3D top at 10–50 shots; SlowFast/Swin top at full data) within ±3pp — if the ranking doesn't reproduce, treat the paper as dataset-only and re-derive GSE's own ranking from scratch.

## Improvement experiment
Re-run the ladder with player-disjoint folds (group clips by the 19 athletes into 5 folds) and measure how much the absolute accuracies drop and whether the skeleton-first ranking survives — this quantifies the identity-leakage inflation and produces GSE a leak-corrected benchmark. Also add a VPD-style distilled-pose backbone to the ladder.

## Verdict
ADAPT
