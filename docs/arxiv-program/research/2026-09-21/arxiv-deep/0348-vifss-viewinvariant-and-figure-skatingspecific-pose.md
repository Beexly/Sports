# [0348] VIFSS: View-Invariant and Figure Skating-Specific Pose Representation Learning for Temporal Action Segmentation (arXiv:2508.10281v1)

**Citation:** Ryota Tanaka, Tomohiro Suzuki, Keisuke Fujii (2026). *VIFSS: View-Invariant and Figure Skating-Specific Pose Representation Learning for Temporal Action Segmentation*. arXiv:2508.10281v1. URL: https://arxiv.org/abs/2508.10281v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1,786 lines).
**Verdict:** ADAPT — the two-stage recipe (view-invariant contrastive pretraining on 3D pose data, then domain-specific fine-tuning) is the most transferable idea in this wave for any future GSE pose-from-video work, but port the recipe to NFL actions, not the skating model or dataset.

## 1. Research question
Figure skating jump recognition from broadcast video needs (a) viewpoint robustness (3D motion filmed from many angles) and (b) procedural understanding (entry → jump → landing). Can a two-stage pose-representation learning framework — contrastive view-invariant pretraining on 3D pose datasets, then fine-tuning on figure-skating action classification — produce pose embeddings that beat raw 2D/3D pose features as input to a temporal action segmentation (TAS) model? The paper also introduces FS-Jump3D (first open 3D pose dataset for skating jumps) and a procedure-aware annotation scheme (entry/jump/landing phases).

## 2. Dataset / schema
- **FS-Jump3D (new):** 253 jump sequences from 4 expert skaters (A–D), 10 trials × 6 jump types, including triples; 12 hardware-synchronized cameras (Miqus Video, Qualisys) around an ice rink; markerless capture (Theia3D) at millimeter-level accuracy; 83 joints per pose (head 16, torso 16, arms 30, legs 34); includes mistakes/falls.
- **Pretraining co-datasets:** Human3.6M, MPI-INF-3DHP, AIST++ (dance) — cross-dataset training for pose diversity.
- **Fine-tuning (action classification):** SkatingVerse — 1,687 official videos → 19,993 training clips / 8,586 test clips, 28 classes (23 jump type×rotation combos + 4 spin types + NONE).
- **TAS dataset (new annotations):** 371 broadcast videos (Olympics 2010/2014/2018, Worlds 2017–2019, men's/women's short programs); average 4,265 frames/video, ~382 (8.96%) frames labeled; Set-level 13 labels (6 jump types + 6 entry types + shared landing), Element-level 30 labels (type × rotation); entry = 3 steps before take-off, landing = blade contact through back-outside-edge glide.
- Access: annotations + code "will be made publicly available at https://github.com/ryota-skating/VIFSS upon publication" (not yet released as of the paper).

## 3. Method / model
**Stage 1 — view-invariant contrastive pretraining:** JointFormer (transformer 2D-to-3D lifter) used as pose encoder. Preprocessing: RANSAC ground-plane alignment (lowest-z points, 50% assumed contact), facing-direction alignment (left hip → +x, right hip → -x), normalization (mid-hip centered; scaled so mid-hip→chest + chest→neck = 0.4). Augmentation: random virtual-camera 2D projections (azimuth ±180°, elevation ±30°, distance [5,10]), horizontal flip, Gaussian jitter (variance 0.01), 1% joint masking to (0,0). Embedding z splits into pose-invariant z_pose and view-dependent z_view. Loss: Barlow Twins on z_pose pairs + MSE between embedding cosine-similarity and camera-direction cosine-similarity on z_view + variance/KL-uniform regularization; weights w_pose=1.0, w_view=10.0, w_R=1.0; σ_target²=1.0. **Stage 2 — fine-tuning:** encoder + 2-layer BiGRU → temporal max pooling → FC→dropout→ReLU→dropout→FC over 28 SkatingVerse classes, cross-entropy. **TAS:** FACT transformer (Lu & Elhamifar 2024) on the learned embeddings; 2D-pose (DWPose) and 3D-pose (MotionAGFormer + alignment) baselines; scratch-FSS ablation (no pretraining).

## 4. Equations & assumptions
- Embedding split: \(z \in \mathbb{R}^d\), \(z = [z_{\text{pose}}; z_{\text{view}}]\), \(d = d_{\text{pose}} + d_{\text{view}}\).
- Pose loss: \(\mathcal{L}_{\text{pose}} = \text{BarlowTwins}(z_{\text{pose}}, z'_{\text{pose}})\).
- View loss: \(\mathcal{L}_{\text{view}} = \text{MSE}(\text{cossim}(z_{\text{view}}, z'_{\text{view}}), \text{cossim}(v_c, v'_c))\), where \(v_c, v'_c\) are unit vectors from mid-hip to the virtual cameras.
- Regularizer: \(\mathcal{L}_{\text{R}} = \text{VarianceLoss}(z) + \text{VarianceLoss}(z') + \text{KLUniformLoss}(z) + \text{KLUniformLoss}(z')\).
- \(\text{VarianceLoss}(z) = \frac{1}{d}\sum_{i=1}^d (\sigma_i^2(z) - \sigma_{\text{target}}^2)^2\), \(\sigma_{\text{target}}^2 = 1.0\).
- \(\text{KLUniformLoss}(z) = \frac{1}{d}\sum_{i=1}^d \big(z_i \log z_i + (1-z_i)\log(1-z_i)\big)\).
- Total: \(\mathcal{L}_{\text{total}} = w_{\text{pose}}\mathcal{L}_{\text{pose}} + w_{\text{view}}\mathcal{L}_{\text{view}} + w_{\text{R}}\mathcal{L}_{\text{R}}\).
- Assumptions: (1) virtual-camera projections are a valid stand-in for real multi-view footage; (2) RANSAC ground-plane + facing alignment removes nuisance variation without destroying action signal; (3) view-dependent features (rotation counting) can be learned jointly with view-invariance via the loss split; (4) 4 skaters suffice to represent skating jump dynamics.

## 5. Features / target
Input features: per-frame 2D pose estimates (DWPose, COCO-Wholebody) → encoder → pose embedding sequence. Target (TAS): frame-wise labels over 13 (Set) or 30 (Element) classes + NONE. Prediction is dense temporal segmentation; reported metrics exclude entry/landing/NONE labels (scored on jump segments only).

## 6. Validation design
Test set = all 2018 Olympics + 2018 Worlds footage; train = earlier years with 20% held out for validation — no same-competition-year overlap (a genuinely good split). Metrics: frame-wise accuracy, F1@{10,25,50,75,90}. Baselines: 2D pose, 3D pose (Tanaka et al. 2024), scratch-FSS (no pretraining). Ablations: with/without FS-Jump3D in pretraining; proposed vs. coarse annotation; pretraining-data fraction (100/50/10/1%). Average jump duration 16.25 frames, so F1@90 demands ~15-frame overlap (1–2 frame error margin).

## 7. Numerical results / baselines
- **Set-level (Table 1a)** Acc / F1@10 / F1@25 / F1@50 / F1@75 / F1@90: 2D pose **78.55 / 85.12 / 84.93 / 84.17 / 81.52 / 35.83**; 3D pose **79.89 / 87.13 / 86.94 / 86.56 / 82.36 / 33.36**; VIFSS **89.91 / 95.44 / 95.44 / 94.68 / 93.16 / 51.71**; scratch-FSS **86.38 / 92.48 / 92.29 / 91.72 / 88.87 / 42.44**.
- **Element-level (Table 1b):** 2D **71.34 / 78.97 / 78.97 / 78.78 / 75.74 / 35.39**; 3D **70.17 / 77.71 / 77.33 / 76.57 / 71.62 / 29.52** (worse than 2D — 3D estimation fails on quads/unseen rotations); VIFSS **85.82 / 92.75 / 92.75 / 92.56 / 90.65 / 49.62** (>92% F1@50 as per abstract); scratch-FSS **82.72 / 89.65 / 89.65 / 89.65 / 86.42 / 41.03**.
- **FS-Jump3D ablation (Table 2, Set):** VIFSS F1@50 **94.68 → 92.78** without FS-Jump3D; 3D-pose baseline 86.56 → 82.51.
- **Annotation ablation (Table 3, F1@50 Set):** proposed vs coarse — 2D: **84.17 vs 76.42**; 3D: **86.56 vs 72.78**; VIFSS: **94.68 vs 93.93** (coarse labels only 1.50% of frames vs 8.96% proposed).
- **Low-data (Fig. 9):** at 1% fine-tuning data, no-pretraining models collapse to near-zero F1@50; with pretraining **>70% (Set) / >60% (Element)**.
- Funding: JSPS 21H05300, 23H03282; JST PRESTO JPMJPR20CA. No competing interests declared.

## 8. Code / data availability
Code + TAS annotations promised at https://github.com/ryota-skating/VIFSS "upon publication" — not yet public as of the paper. FS-Jump3D described as publicly available (first open 3D skating-jump dataset).

## 9. Leakage & limitations
- **F1@90 collapse (51.71 Set / 49.62 Element):** the paper's stated aim — "fine-grained detection of take-off and landing timings" — fails at the strict metric; 1–2 frame precision is not achieved. Headline F1@50 numbers flatter the timing claim.
- **Metrics exclude entry/landing/NONE:** 91% of frames are NONE and unscored; the segmentation task as evaluated is much easier than full-video segmentation.
- **4 skaters in FS-Jump3D:** the "domain-specific" dataset has minimal subject diversity; generalization across skaters is barely tested.
- **Skater identity leakage:** the year-based split is good, but elite skaters compete across multiple Olympics/Worlds — the paper never checks whether test-set skaters appear in training years.
- **Pretraining adds only ~3 F1@50 points at full data** (94.68 vs 91.72 scratch-FSS); the dramatic pretraining story lives only in the 1%-data regime.
- **View loss dominates (w_view=10.0 vs w_pose=1.0):** the "view-invariant" framing is half the story — the model explicitly learns view-dependent features, which is fine for rotation counting but muddies the invariance claim.
- **3D-pose baseline fails on quads** because FS-Jump3D lacks them — the paper's own evidence that 3D estimation is bottlenecked by training diversity, which also bounds the pretraining data.
- NFL external validity: none demonstrated. Skating jumps are single-athlete rotation-counting; the NFL has no analogous fine-grained rotation task, and broadcast football has 22 athletes with constant occlusion.

## 10. GSE overlap
Per the existing-research map: GSE has no pose-estimation or pose-representation work — the NGS lane consumes tracking coordinates, and STRAIN was read for pass-rush metrics. This is a **new capability** (view-invariant pose representation learning), and its *recipe* is the transferable asset: contrastive view-invariance pretraining on 3D pose data + domain fine-tuning is exactly how GSE would bootstrap pose-based features from multi-angle NFL film with limited labels. No duplication.

## 11. GSE implementation spec
- **Purpose:** when GSE builds pose-from-video features (e.g., QB throwing mechanics, OL posture, tackling form) from heterogeneous broadcast/All-22/end-zone angles, use the VIFSS recipe to make embeddings viewpoint-robust with limited labeled NFL data.
- Data: (1) pretraining — public 3D pose datasets (Human3.6M, MPI-INF-3DHP) + any GSE-collected multi-view football pose data, with the paper's virtual-camera augmentation (azimuth ±180°, elevation ±30°); (2) fine-tuning — GSE-labeled NFL action clips (throw/run/tackle/block classes from charting).
- Model: JointFormer-style encoder per paper; keep the pose/view loss split (w_view high if rotation/orientation matters, e.g., QB shoulder rotation); 2-layer BiGRU + temporal pooling classifier for fine-tuning; RANSAC ground-plane + facing alignment adapted to the field plane.
- Exploit the paper's key finding: the recipe shines in low-data regimes (>70% F1@50 at 1% data) — so budget a small, high-quality NFL label set rather than mass annotation.
- Serving: offline embedding extraction on film ingest; embeddings stored as features for downstream mechanics models.
- Estimated effort: 6–8 engineer-weeks (encoder reimplementation + NFL fine-tune set + eval harness); gated on GSE first having a working 2D pose estimator on football film.

## 12. Reproducible test
Dataset: 300 multi-angle NFL clips (broadcast + All-22 + end zone of the same plays, 2024 season) with 500 labeled action segments (throw, handoff, tackle, block). Metric: cross-view action-classification accuracy and embedding cosine similarity for same-action/different-view pairs vs. (a) raw 2D-pose baseline, (b) scratch (no-pretraining) encoder. Window: one season sample, offline. Success = pretrained encoder beats scratch by ≥5 accuracy points cross-view.

## 13. Acceptance / rejection gate
**Adopt** the two-stage recipe for GSE pose work if the pretrained encoder beats the scratch encoder by ≥5 points on cross-view action accuracy on the 300-clip NFL test AND same-action cross-view embedding similarity exceeds different-action same-view similarity (a true view-invariance check the paper never runs). **Reject** if the pretraining gain is <5 points at full data (the paper's own full-data gain is only ~3 F1 points) or if view-invariance fails the similarity check — in which case GSE should skip pretraining and train directly on NFL labels.

## 14. Improvement experiment
Run the view-invariance check the paper omitted: measure whether same-action/different-view embedding distances are smaller than different-action/same-view distances, and ablate the w_view weight (10.0 vs 1.0 vs 0) to find the operating point where viewpoint robustness is maximized without destroying action discriminability. Then test whether adding a small amount of real multi-view NFL footage (not just virtual cameras) to pretraining closes the synthetic-to-real gap — the experiment that determines whether this recipe survives contact with stadium cameras.
