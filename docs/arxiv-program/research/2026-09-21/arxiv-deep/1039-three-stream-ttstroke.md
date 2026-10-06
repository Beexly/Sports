# 1039 — Three-Stream 3D/1D CNN for Fine-Grained Action Classification and Segmentation in Table Tennis (2109.14306)

## Citation / full-text source
Pierre-Etienne Martin, Jenny Benois-Pineau, Renaud Péteri, Julien Morlier, "Three-Stream 3D/1D CNN for Fine-Grained Action Classification and Segmentation in Table Tennis", MMSports 2021 workshop, arXiv:2109.14306v1 [cs.CV], 29 Sep 2021. Full text: export.arxiv.org/pdf/2109.14306 (7 pages, PDF parsed in full).

## Research question
Fine-grained sports actions (table-tennis strokes) have extreme intra-class similarity — same background, same objects, near-identical motion. Can adding a third pose stream to the standard RGB + optical-flow two-stream 3D-CNN, fused late via bilinear layers with attention blocks, improve both pure classification and joint detection+segmentation of untrimmed video?

## Dataset / schema
TTStroke-21: table-tennis videos at 120 FPS (1920×1080 → 320×180), 129 videos used = 1,048 annotated strokes + 106 negative samples. 21 classes: 8 services, 6 offensive strokes, 6 defensive strokes, 1 negative. Train/val/test split 0.7/0.2/0.1. Modalities computed per clip: RGB cuboids (120×120×100 ≈ 0.83 s), optical flow (iterative re-weighted least squares, foreground-masked, μ+3σ normalized), pose (PoseNet/PersonLab, 13 joints + pose center → 14×(x,y,score) descriptor; 25% of frames have no detection — filled with ROI center + score 0). ROI centered on a blend (α=0.6) of OF-maximum location and OF center of gravity.

## Method
Three parallel branches: RGB and OF streams through 3D spatio-temporal convolutions (3 layers: 30/60/80 filters of 3×3×3, max-pool 2×2×2, attention blocks, FC-500); the pose stream through 1D temporal convolutions over the N_joints×3 descriptor channels with temporal max-pooling. Pairwise bilinear fusion (y = x_1^T A x_2 + b) of the three branches, summed, softmax. Training: SGD with Nesterov momentum (0.5), weight decay 0.05, batch size 5, cross-entropy, up to 1,500 epochs, warm-restart LR scheduler (0.01 → /10 down to 1e-5, restart at best validation state).

## Equations / assumptions
(1) ROI center: X_max = argmax ||V||₁, X_g = (ΣX δ(X))/(Σδ(X)), x_roi = α f(x_max) + (1−α) f(x_g), α=0.6; (2) J(i) = (x_i, y_i, s_i)^T per joint/pose; (3) OF normalization v^N(i,j) = v'(i,j) if |v'|<1 else SIGN(v'), with v' = v/(μ+3σ); (4) 3D convolution out(j) = bias(j) + Σ_k weight(j,k) ★ X(k) (★ = valid 3D cross-correlation). Fusion: bilinear y = x_1^T A x_2 + b (N_classes outputs), summed across pairs.
Assumptions: ROI tracks the player via OF maxima; pose stream needs the other two modalities to converge; stroke classes defined by expert STAPS annotations.

## Features / target
Features: RGB cuboids + foreground OF cuboids + pose-descriptor sequences. Target: stroke class (classification task) or per-frame class labels via sliding-window decision fusion (vote/average/Gaussian-weighted, window 150/150/201).

## Validation
Classification accuracy (train/val/test) vs I3D, single/twin STCNN variants, with/without attention. Joint detection+classification accuracy on untrimmed video under three decision rules, reported with and without the negative class.

## Exact results / baselines
**Pure classification** (Table 1, train/val/test %): Three-Stream 97/90/87.3 (attention on RGB+OF only) and 95.8/86.5/87.3 (attention on all) vs Twin-STCNN 99/86.1/81.9, Twin-STCNN† 97.3/87.8/87.3, RGB+Flow-I3D 99.2/76.2/75.9, RGB-STCNN† 96.9/88.3/85.6. I3D overfits badly (99.2 train → 75.9 test). Three-stream converges faster: epoch 1176 (736 effective) vs 1400+ for baselines.
**Detection+classification** (Table 2): Three-Stream* 43.6/63.1/63.9/62.9 vs Twin† 31/46.8/47.7/47.3; without negative labels: 69.6/83.7/84.3/**85.6** vs 45.2/63.8/65.6/67.9 — up to +18 points from the pose stream. Frame-wise negative-class precision 0.99, recall 0.42 (F-score 0.59): the model over-fires stroke labels.
**Key negative result**: pose alone cannot converge — 22% test accuracy. The fusion is what makes pose useful, not the pose itself.

## Code / data
No code URL in the paper. TTStroke-21 dataset referenced from prior work (Martin et al. 2020); pose via rwightman/posenet-python (public).

## Leakage
Train/val/test split with distinct videos; test-phase uses temporally centered crops without augmentation. No leakage concerns.

## Limitations
- Table tennis: single player, fixed camera, constrained scene — a long way from 22-player NFL broadcast footage.
- 25% pose miss rate even in this clean setting; pose filled with ROI center + score 0 is a hack that won't survive broadcast occlusions.
- The detection task still over-classifies strokes (recall 0.42 on negatives); untrimmed segmentation is far from solved.
- Attention on all three branches underperforms attention on RGB+OF only (slight overfitting) — the fusion isn't fully understood.
- No quality assessment of strokes (dataset lacks it); classification only.

## GSE overlap
The fine-grained problem structure maps directly to GSE: play-action vs RPO vs straight dropback, or route-type classification from broadcast, all share table tennis's property — high intra-class similarity, same background, same uniforms, with the discriminative signal living in the motion itself. The paper's design lessons transfer wholesale: (1) pose alone fails (22%) — always fuse RGB + motion + pose; (2) bilinear late fusion of modality streams; (3) warm-restart LR scheduling for small fine-grained datasets; (4) the sliding-window vote/average/Gaussian decision fusion for untrimmed broadcast segmentation.

## Implementation (GSE adaptation)
PlayType-Fusion-GSE: for a fine-grained NFL classification task (e.g., RPO vs play-action vs dropback from All-22), build the three-stream architecture — RGB clip cuboids, optical-flow cuboids (foreground-masked to players), and 1D temporal convolutions over GSE's 2D skeleton streams; fuse with bilinear layers. Use the paper's warm-restart training and report both trimmed-clip accuracy and untrimmed segmentation with/without negative (non-play) segments.

## Reproducible test
Reproduce Table 1's ordering on TTStroke-21 (three-stream ≥ twin on test; pose-alone ≈ chance 22%) before porting any component to football data.

## Numeric gate
On GSE's own trimmed play-type clips, the three-stream model must beat the two-stream (RGB+flow) twin by ≥3 points test accuracy AND beat pose-alone by ≥40 points (paper's margins: +5.4 vs twin† on classification test 87.3 vs 81.9 for non-attention... use exact: 87.3 vs 87.3 for twin† — honest reading: the pose stream's gain shows in detection+segmentation, +18, not pure classification). Gate: detection+segmentation without negatives must improve ≥10 points over the two-stream baseline, else the pose stream is dropped.

## Improvement experiment
Replace the PoseNet descriptor with GSE's multi-person skeleton tracks (all 22 players) using a per-player attention-weighted aggregation before the 1D temporal convolutions — the paper's single-pose stream can't represent team sports; test whether multi-agent pose input unlocks the same +18 segmentation gain on NFL film.

## Verdict
ADAPT
