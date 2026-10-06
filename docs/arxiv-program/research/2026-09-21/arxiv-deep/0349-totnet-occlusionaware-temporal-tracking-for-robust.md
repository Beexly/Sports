# [0349] TOTNet: Occlusion-Aware Temporal Tracking for Robust Ball Detection in Sports Videos (arXiv:2508.09650v1)

**Citation:** Hao Xu, Arbind Agrahari Baniya, Sam Wells, Mohamed Reda Bouadjenek, Richard Dazeley, Sunil Aryal (2025). *TOTNet: Occlusion-Aware Temporal Tracking for Robust Ball Detection in Sports Videos*. arXiv:2508.09650v1. URL: https://arxiv.org/abs/2508.09650
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1241 lines).
**Verdict:** ADAPT — the visibility-weighted loss and occlusion-augmentation recipe ports directly to any NGS-style tracking pipeline (e.g., ball/player heatmap heads), while the full 3D-U-Net is overkill for GSE's offline analytics; the ideas transfer, the architecture likely doesn't.

## 1. Research question
How can a ball detector reliably localize a ball through partial and full occlusions in sports video, without relying on frame-by-frame spatial features alone? The authors propose TOTNet — a 3D-convolutional temporal network with visibility-weighted BCE loss and occlusion augmentation — evaluated on four racket-sport datasets, including a new occlusion-rich table tennis dataset (TTA) collected from Paralympic matches.

## 2. Dataset / schema
Four datasets (frames resized to 288×512):
- **TTA (introduced in this paper):** 9,159 samples at 25 fps, 1080×1920, from four professional-level Paralympic table tennis matches; 1,996 occlusion samples (annotated per the visibility-label standard of Huang et al. 2019 / Sun et al. 2020). Visibility split (train/val/test): fully visible 5,141/1,285/668; partially occluded 834/215/72; fully occluded 650/158/67. Shared "upon academic request" — not open.
- **TT dataset (Li et al. 2023):** five training + seven testing table-tennis videos, 120 fps, 1080×1920; 36,224 train / 3,232 val / 3,720 test samples; minimal occlusion, no visibility labels.
- **Tennis dataset (Huang et al. 2019, via Tarashima et al. 2023):** 10 clips, 30 fps, 720×1080, visibility labels 0 (out-of-frame) / 1 (visible) / 2 (partial) / 3 (fully occluded). Test split: fully occluded = only 5 frames.
- **Badminton dataset (Sun et al. 2020):** 26 train + 3 test matches, 30 fps, 720×1280, binary visibility labels. Test: 10,468 visible, 2,188 out-of-frame.
- Visibility labels follow the 0/1/2/3 scheme from prior TrackNet work (0=out-of-frame, 1=visible, 2=partially visible, 3=fully occluded).

## 3. Method / model
- **Architecture:** U-Net backbone that retains the temporal dimension throughout (unlike TrackNet/TrackNetV2/MonoTrack, which stack frames along the channel axis for 2D convs). Each encoder block applies 2D spatial convolutions per frame, then 3D temporal convolutions across frames, then 3D max-pooling (spatial + temporal reduction), with a residual connection from spatial-conv output to temporal-conv output. Channel count rises and resolution/sequence length fall with depth; temporal kernel sizes shrink as the temporal dimension shrinks. Bottleneck: temporal dim reduced to 1; (1,1,1) pointwise temporal conv for cross-channel mixing; more spatial layers than other blocks. Decoder: trilinear 3D upsampling (heatmap output), skip connections for spatial and temporal convs concatenated along channels. Final: temporal conv block to 1 channel + softmax over the heatmap.
- **Optical-flow variant (TOTNet OF):** integrates optical flow from a pre-trained RAFT model in the initial encoder.
- **Occlusion augmentation:** masks the ball area in the target frame with a randomly sized shape filled with surrounding mean pixel values; adds random mean-filled rectangles in the *other* frames as well to prevent over-adaptation. Standard augmentations (color jitter, random crop/resize, horizontal/vertical flip) also applied.
- **Loss:** visibility-aware weighted BCE over factorized 1D heatmaps (x- and y-axes predicted as separate 1D heatmaps, not a 2D map). Target definitions: visible/partially occluded → one-hot; fully occluded → normalized Gaussian target (encodes positional uncertainty); out-of-frame → explicit no-target signal (no Gaussian map, avoiding the (0,0) bias). Per-visibility weights w_v scale the loss.
- **Input:** five consecutive frames (ablation-chosen "optimal balance between temporal context and computational efficiency"); target = last frame of the window (middle-frame variant in supplementary).
- **Optimizer:** AdamW (Loshchilov 2017); hyperparameters and re-implementation details in the GitHub repo (AugustRushG/TOTNet), not in the paper body.

## 4. Equations & assumptions
Quoted from §3.3 (equation numbering as in paper):
- Target maps for visible/partially occluded (levels 1–2), one-hot: T_{x,map}[j] = 1 if j = T_x, else 0; T_{y,map}[k] = 1 if k = T_y, else 0.
- For fully occluded frames, normalized Gaussian targets (paper labels these (1) and (2), appearing to overlap with the one-hot statement — the paper uses one-hot for visible/partial and Gaussian for fully occluded):
  - T_{x,map}[j] = (1/Z_x) exp(−(j − T_x)² / (2σ²)); T_{y,map}[k] = (1/Z_y) exp(−(k − T_y)² / (2σ²)), with Z_x, Z_y normalizing the distributions to sum to 1.
- Visibility-based weighting: each visibility level v ∈ {0,1,2,3} gets weight w_v via vector w = [w_0, w_1, w_2, w_3] (values not stated in paper; presumably in repo).
- Final loss: L = w_v · (BCE(P_x, T_{x,map}) + BCE(P_y, T_{y,map})).
- Evaluation: dist = √((x_pred − x_label)² + (y_pred − y_label)²); correct if dist ≤ 5 px for visible/partial (ball's average size), ≤ 10 px for fully occluded (annotation uncertainty). Equation labeled (3).
- **Assumptions:** predictions factorize across x and y axes (independent 1D heatmaps); softmax normalization over the heatmap; target frame is the last of five input frames; out-of-frame samples excluded from tennis training due to rarity; ground-truth Gaussian width σ and visibility weights w_v are set externally (not stated). Kalman-filter-style state models rejected on the grounds that KF is linear and balls move non-linearly.

## 5. Features / target
- Inputs: 5 consecutive RGB frames (288×512), plus pre-computed RAFT optical flow in the OF variant.
- Target: ball (x, y) pixel coordinates in the last frame, represented as factorized 1D heatmaps (x-map, y-map) with visibility-dependent encoding (one-hot vs normalized Gaussian vs no-target).
- Labels: per-frame ball coordinates plus visibility level 0/1/2/3; out-of-frame → no target.

## 6. Validation design
- Splits per dataset (train/val/test with exact visibility-level counts given in Table 1; TTA split: 6,625 train / 1,658 val / 807 test approx from the table rows).
- Baselines re-implemented by the authors (no public implementations available): TTNet, TrackNetV2, MonoTrack, WASB (Tarashima et al. 2023, "the most recent and advanced model for ball tracking tasks").
- Metrics: RMSE and accuracy at the 5 px / 10 px thresholds, reported per visibility level on each dataset; inference FPS and parameter counts reported.
- Ablation: TOTNet baseline → +weighted BCE → +occlusion augmentation → +optical flow on TTA.
- Additional experiments (input-frame count, middle-frame target) relegated to supplementary materials, not in the paper body.
- Note: splits are match/clip-based (train vs test matches) but temporal structure within matches means frames are highly correlated; no time-ordered holdout issue since this is a tracking (per-window) task, not forecasting.

## 7. Numerical results / baselines
From Table 2 (per visibility level; "TT (Overall)" rightmost column = overall RMSE for the TT dataset):
- **TTA fully occluded:** WASB (prev. SOTA) RMSE 37.30 → TOTNet 12.31 → TOTNet(OF) **7.19**; accuracy 0.63 → 0.74 → **0.80**. (Abstract headline: "reducing RMSE from 37.30 to 7.19 and improving accuracy on fully occluded frames from 0.63 to 0.80.")
- **Tennis partially occluded:** RMSE 105.73 (WASB) → **63.41** (TOTNet). Fully occluded: RMSE 264.45 → 27.98 (TOTNet) → **15.31** (OF); accuracy 0.17 → 0.67 → 0.33 (OF — accuracy drops vs non-OF on tennis full occlusion despite RMSE win).
- **TT dataset overall RMSE:** 4.02 (TTNet) / 3.11 (WASB) → **1.38** (TOTNet OF); accuracy 0.98.
- **Badminton visible RMSE:** 27.17 (WASB) → **23.43**; not-visible 56.50 → 70.22 (OF, *worse* than WASB) / 44.55 (plain TOTNet).
- **Ablation on TTA (Table 3):** full-occlusion RMSE: baseline 29.57 → +WBCE 24.43 → +aug only 54.26 (**worse** — augmentation alone hurts) → WBCE+aug 12.31 → +OF **7.19**; full-occ accuracy: 0.54 → 0.61 → 0.56 → 0.74 → **0.80**.
- Efficiency (Table 2): parameters M / FPS — TTNet 7.62/40.75; TrackNetV2 11.34/40.74; MonoTrack 2.84/44.67; WASB 1.48/33.44; TOTNet 8.65/28.08; TOTNet(OF) 8.66/12.19. TOTNet is slower and heavier than the WASB baseline it beats on accuracy.
- Caution: tennis fully-occluded test n = 5 frames (Table 1); badminton results are on only 3 test matches.

## 8. Code / data availability
Code: GitHub repo `AugustRushG/TOTNet` (stated; hyperparameters, re-implementation details, ablations live there). Data: TTA dataset "will be shared upon academic request" (not open download). TT, tennis, badminton datasets from prior papers.

## 9. Leakage & limitations
- **Tiny fully-occluded test sets:** tennis fully-occluded test = 5 frames (Table 1); claims on tennis full-occlusion rest on 5 frames. TTA full-occ test = 67 frames — better but still small for an 8.65M-parameter 3D network.
- **Baselines are author re-implementations** ("re-implemented models from [29], [18, 30], [34] due to the lack of publicly available implementations") — quoted SOTA baselines are the authors' own reproductions, not reference implementations; any implementation gap flatters TOTNet.
- **Augmentation-only ablation is worse than baseline** (full-occ RMSE 29.57 → 54.26); gains come from the WBCE+augmentation *combination*, suggesting sensitivity to loss/augmentation interplay rather than a robust single mechanism.
- **OF variant regressions:** TOTNet(OF) is worse than plain TOTNet on tennis full-occ accuracy (0.67 → 0.33) and badminton not-visible RMSE (44.55 → 70.22), and halves FPS (28.08 → 12.19).
- **Speed cost:** 8.65M params / 28 FPS at 288×512 on (unspecified) hardware vs WASB 1.48M / 33 FPS — real-time claims don't transfer to this model; authors frame it for offline use.
- **Gaussian σ and visibility weights w_v not reported** in the paper (repo-only), so the loss — the headline mechanism — is not reproducible from the paper alone.
- **External validity to NFL:** demonstrated only on racket sports with a single small ball against mostly static backgrounds. American football has 22 players, line-of-sight occlusion far more severe (ball hidden by bodies for whole plays, carried by players), larger object scale, and broadcast camera motion — the occlusion regime is structurally different. The TTA occlusion samples are brief ball-hides, not sustained full-body occlusion.
- **Reproducibility gap:** "detailed hyperparameters and training settings provided in the GitHub repository" — not in the paper.

## 10. GSE overlap
Per the existing-research-map (built 2026-09-21): Garrett's corpus covers the **NGS/tracking lane** via the 27-family NGS metric taxonomy (2026-09-21 sweep, profile-inventory + metric-glossary) and the STRAIN pass-rush tracking paper (2305.10262, read in depth). **Occlusion-aware ball tracking methodology is NOT covered** — none of the 7 repo papers, 57 Drive dossiers, X-account sweeps, or gse-lab tables address visibility-weighted loss, occlusion augmentation, or 3D temporal tracking architectures. The NGS replacement spec (2026-09-18) aims to reproduce NGS metrics from public data; ball/player trajectory quality under occlusion is a genuine dependency for any tracking-based metric (route classification, separation, pressure-time). Verdict: **new capability** (extension of the tracking lane, no duplicate).

## 11. GSE implementation spec
- **What to port:** NOT the full 3D U-Net. Port the two cheap, framework-independent ideas: (a) visibility-weighted loss for any heatmap/detection head — re-weight training examples by an occlusion/visibility proxy (e.g., player-body overlap with the ball via a pose or detection mask); (b) occlusion augmentation — randomly mask the ball region in the target frame during training so the network learns to use temporal context.
- **Where it lands in GSE:** any future vision-based tracking build (broadcast-frame player/ball tracking for NGS-replacement metrics like route classification, separation-at-catch, pressure timing). This is a model-training tweak, not a standalone GSE product; effort is days-to-weeks of training-loop work *inside* a vision project.
- **Data:** reuse existing broadcast NFL footage; no new data purchase needed. Visibility labels can be synthesized (mask known ball boxes) — the paper's own occlusion augmentation shows labels need not be hand-annotated.
- **Model:** keep whatever tracking backbone GSE adopts; add the per-visibility loss weights w_v as tunable hyperparameters and the mean-fill masking augmentation.
- **Training protocol:** ablate WBCE vs augmentation vs both (paper shows augmentation alone hurts — the combination matters).
- **Serving:** no serving impact; the loss/augmentation only affect training.
- **Estimated effort:** 1–2 weeks of ML-engineer time to integrate into an existing tracking trainer, assuming GSE has a tracking model in training — which it currently does not, so this is a deferred enabler.
- **Precondition:** no GSE vision-tracking program exists yet; adopt only as a design note for when one starts.

## 12. Reproducible test
- **Dataset:** clone the authors' repo (AugustRushG/TOTNet) and retrain plain TOTNet on the TTA dataset (request access) OR retrain on the tennis dataset with the same train/val/test split the paper used.
- **Metric:** fully-occluded-frame RMSE on the TTA test set (paper reports 12.31 for plain TOTNet, 7.19 for OF variant).
- **Baseline to beat:** re-implemented WASB RMSE 37.30 / accuracy 0.63 on TTA full occlusion (or the authors' reported Table 2 row).
- **Time window / protocol:** one train run with the repo's stated hyperparameters; evaluate per-visibility-level RMSE/accuracy on the fixed test split. Success = full-occ RMSE < 20 and accuracy > 0.70 (roughly half the SOTA-vs-TOTNet gap, allowing for reimplementation noise).
- **GSE-side test (deferred):** once a GSE tracking trainer exists, A/B the visibility-weighted loss on NFL broadcast clips with synthetic occlusions: metric = ball-center RMSE under masked-ball evaluation frames vs the same trainer without the weighting.

## 13. Acceptance / rejection gate
- **Adopt the WBCE + occlusion-augmentation recipe** (not the architecture) if a GSE tracking trainer's fully-occluded/masked-frame RMSE improves by ≥ 15% over the unweighted-loss control on a held-out NFL broadcast clip set with synthetic occlusion labels, with no regression on fully-visible frames (Δ accuracy ≤ 1 pp).
- **Reject** if the ported loss/augmentation moves masked-frame RMSE by < 10% or degrades visible-frame accuracy — or if no GSE vision-tracking program is started within 12 months (the idea has no home without one).
- **Never adopt** the 3D U-Net architecture itself: 8.65M params at 28 FPS is slower and heavier than WASB (1.48M / 33 FPS) and GSE's offline analytics don't need this specific architecture; the transferable value is the loss and augmentation design.

## 14. Improvement experiment
Run the paper's occlusion augmentation against **player-body-aware masking** instead of mean-fill rectangles: use a person-segmentation mask (e.g., Mask R-CNN person class) to paste actual player silhouettes over the ball region, producing realistic occluders rather than flat mean-filled patches — this directly matches the NFL regime where the ball disappears behind bodies, not behind uniform rectangles. Compare full-occ RMSE on masked NFL broadcast clips: mean-fill augmentation vs silhouette-paste augmentation vs both. Hypothesis: silhouette-paste trains genuine amodal completion (inferring the ball *behind* a body), while mean-fill only teaches robustness to missing pixels. Second arm: replace the factorized x/y 1D heatmaps with a joint 2D heatmap to test whether axis-independence (a stated assumption) costs accuracy on diagonal high-speed trajectories.
