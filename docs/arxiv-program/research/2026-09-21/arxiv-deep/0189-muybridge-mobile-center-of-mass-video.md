# [0189] MuyBridge: Mobile Human Center-of-Mass Estimation from Monocular Video via Sparse Fusion (arXiv:2609.02854v1)

**Citation:** Aidan Bradshaw, Marco Giordano, David Rode, Andreas Habersack, Elif Basokur, Annika Kruse, Markus Tilp, Michele Magno, Peter Wolf, Luca Benini, Christoph Leitner (2026). *MuyBridge: Mobile Human Center-of-Mass Estimation from Monocular Video via Sparse Fusion*. arXiv:2609.02854v1. URL: https://arxiv.org/abs/2609.02854v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 888 lines).
**Verdict:** ADAPT — port the analytic metric-fusion recipe (sparse keypoint-depth + stature-scaled anthropometric range cues + physical ground-contact/ballistic anchors) from running/figure-skating to NFL broadcast footage for metric player localization and landing/cutting biomechanics; replace the phone-deployment stack with an offline pipeline and football-specific motion priors.

## 1. Research question
Can the metric 3D center of mass (CoM) — a primary quantity in sport biomechanics for balance, acceleration, and landing analysis — be estimated from a **single phone camera** on-device, without any 3D or CoM supervision, by fusing a compact 2D pose network with sparse monocular depth through analytic anthropometric and physical priors? The paper targets coaches/analysts who need CoM where athletes actually train and compete, not in motion-capture labs.

## 2. Dataset / schema
**AthletePose3D** (Yeung et al. 2025): ~1.3M synchronized multi-view frames, **8 athletes**, partitioned into running, track and field, and figure skating. Test partitions: **1,028 sequence-camera pairs, 235,183 frames**. Neither perception network is trained or fine-tuned on AthletePose3D. Reference CoM is computed from the dataset's 3D joints using the same de Leva segmental formulation as the predictions (i.e., the reference is **markerless**, not marker-based motion capture — a limitation, §9). Perception networks trained on: pose — COCO-WholeBody + HICO-DET (converted to Halpe-26); depth — ~1.2M synthetic RGB-D pairs from Hypersim + Virtual KITTI 2. Depth accuracy also benchmarked on KITTI-Depth, Hypersim (held-out), NYU-Depth v2. Access: AthletePose3D is a published benchmark; the paper's own captures are not released.

## 3. Method / model
Three stages (Fig. 1):
1. **2D pose network (§3.3, §4.1):** compact RTMPose-style — RTMDet person detector + CSPNeXt backbone + gated attention + SimCC regression head; 256×192 crop; outputs 26 Halpe-26 keypoints with confidences. Compressed for Apple Neural Engine: SiLU→ReLU, width×0.275/depth×0.157, **GroupFisher structured pruning** (stages 0–1 cut 55–65%, stages 2–3 40–50%, stage 4 ≤10%; 3336→2389 channels, ~halved FLOPs), quantization-aware training (INT8 weights/activations; SimCC softmax kept FP).
2. **Depth network (§3.4, §4.2):** Marigold latent-diffusion depth → **single-step via latent consistency distillation**; affine-invariant dense depth Z(u,v) sampled sparsely at keypoints; median over valid joints z̃_f as robust relative-range signal. Compressed: CLIP text conditioning replaced by fixed learned embedding (**−340M params**), GELU/SiLU→ReLU/Hardswish, norm folding, QAT on UNet + PTQ on VAE.
3. **Analytic metric fusion (§3.5):** metric range from (a) **anthropometric cues** — t^{size}_{f,k} = L_k/‖d_{f,i} − d_{f,j}‖ with de Leva segment lengths L_k scaled by stature (low-quantile aggregation; foreshortening biases upward); (b) **physical cues** — ground contact via ray–ground intersection, airborne via image-acceleration-vs-gravity; (c) **depth anchoring** — least squares (α,β) = argmin Σ_{f∈A} w_f(αz̃_f + β − t^{anchor}_f)² giving t^{depth}_f = αz̃_f + β; fused with a **constant-velocity range model** → t̂_f. Keypoint rays intersected with the vertical plane at t̂_f give metric joints; de Leva segmental CoM via Eqs. (1–2).
- **Deployment (§4.3):** Core ML on **iPhone 15** — pose at **63 FPS (15.58 ms)**, depth at **2.86 Hz (349.9 ms)** asynchronous; fusion at pose rate; full pass 638.4 mJ, 946.3 MB model, 1185 MB peak memory.

## 4. Equations & assumptions
Quoted faithfully:
- Segment center: c_s = p^{prox}_s + ρ_s(p^{dist}_s − p^{prox}_s) (1), ρ_s = longitudinal CoM position (de Leva).
- Whole-body CoM: C = (Σ_s m_s c_s)/(Σ_s m_s) (2), m_s = sex-specific de Leva mass fractions.
- Camera ray: d_{f,j} ∝ K^{−1}[u_{f,j}, v_{f,j}, 1]^⊤ (3); depth sample z_{f,j} = Z_f(u_{f,j}, v_{f,j}); robust range z̃_f = median_{j∈V_f} z_{f,j}.
- Anthropometric range: t^{size}_{f,k} = L_k/‖d_{f,i} − d_{f,j}‖ (4).
- Depth anchoring: (α,β) = argmin_{α,β} Σ_{f∈A} w_f(αz̃_f + β − t^{anchor}_f)² (5); t^{depth}_f = αz̃_f + β.
Stated assumptions: de Leva population segment proportions (sex-specific, stature-scaled) apply to the athlete; a one-time scene calibration provides ground-plane geometry; subject sex and stature are specified once; the trunk is neck-to-hip-center and hand mass is folded into forearms; depth is affine-invariant so absolute scale must come from the anchors.

## 5. Features / target
Inputs: monocular RGB frames (+ one-time camera intrinsics, scene calibration, subject sex/stature). Intermediate features: 26 Halpe-26 2D keypoints + confidences; sparse affine-invariant depth samples at keypoints. Target: metric 3D whole-body CoM trajectory (plus per-axis components and camera-to-athlete range).

## 6. Validation design
No training on AthletePose3D (zero-shot evaluation of both perception branches). Errors averaged over frames within each sequence-camera pair, reported as **medians over pairs**. Baselines (Table 5, official pretrained models, no fine-tuning): MeTRAbs-S, HMR2.0, CameraHMR, NLF (absolute) + MotionAGFormer (root-relative, given per-frame GT scale). Ablations: alternative range/body representations (constant range, torso-only), individual cue removal (ground contact, keypoint-depth), keypoint-sampling sets, and the two uses of depth (range estimate vs consistency filtering) separated. Metrics: 3D CoM MAE + lateral/vertical/depth split, range AbsRel, jump-height MAE/correlation/bias.

## 7. Numerical results / baselines
Metric CoM accuracy (Table 4, medians) — regime / mean range / 3D MAE / AbsRel / X / Y / Z:
- Running (4.4 m): **187 mm / 3.6%** / 44 / **33** / 166 mm
- Track & field (5.4 m): **185 mm / 2.3%** / 94 / **39** / 117 mm
- Figure skating (10.1 m): **707 mm / 6.6%** / 167 / **41** / 672 mm
Headline: **vertical CoM error 33–41 mm** across regimes; depth axis dominates (166/187 running, 117/185 T&F, 672/707 skating).
Baselines (Table 5, absolute 3D CoM MAE, running / T&F / skating): MeTRAbs-S **224** / 120 / 231; CameraHMR 392 / 180 / 534; NLF **52** / 209 / 646; **MuyBridge 187 / 185 / 707**. Root-relative: MuyBridge **45** / 118 / 76 vs MotionAGFormer 45 / 79 / 90 (with GT scale), MeTRAbs-S 67/72/57, HMR2.0 70/80/69. MuyBridge is the only method with demonstrated mobile deployment.
Ablations (Table 6, 3D MAE running/T&F/skating): constant sequence range → **721 / 235 / 1890**; torso-only body → 284 / 252 / 733; no ground-contact cue → 355 / 808 / 1220; no keypoint-depth cue → 387 / 316 / 939; full MuyBridge 187/185/707 — every component contributes. Depth-use split (Table 8): removing the depth-derived range estimate costs +205 mm (running) / +197 mm (skating); removing consistency filtering costs +164 mm (running).
Figure skating phase analysis: contact error 3.6–5.6% of range vs flight **7.0–8.7%** (1.5–2.3× worse) across all six jump types — airborne motion is the failure regime, consistent with ledger 0188.
Jump height: **62 mm MAE, r = 0.84, +12 mm bias** over 719 sequence-camera pairs (0.26–1.31 m).
Compression cost (Tables 1–2): pose INT8 reaches **224 FPS, AUC 0.902, PCK@0.1 73.32%** vs RTMPose-FP32 123 FPS / 0.870 / 66.35% (1.82× throughput, +7.0 pts — attributed to Halpe-26 retraining, not quantization); depth INT8 AbsRel 0.132→**0.155** (KITTI), 0.128→**0.149** (Hypersim), 0.053→**0.061** (NYU).

## 8. Code / data availability
Code: **https://github.com/Abradshaw1/Muybridge**. Data: AthletePose3D (published benchmark); Hypersim / Virtual KITTI 2 / COCO-WholeBody (public). The authors' iPhone captures: not released.

## 9. Leakage & limitations
Adversarial view: (1) Reference CoM comes from **markerless** 3D joints, not marker-based mocap — the "ground truth" shares error modes with the method. (2) Only **8 athletes** — anthropometric generalization untested, and de Leva population proportions are dubious for elite NFL body types (linemen especially). (3) **Camera-to-athlete range error dominates** (depth axis is 60–95% of 3D error); at skating's 10.1 m the method degrades to 707 mm — NFL broadcast ranges are comparable or larger. (4) Airborne phases lose the ground-contact anchor and error roughly doubles — football has frequent jumps, dives, and tackles. (5) One-time scene calibration + known sex/stature are deployment assumptions that don't hold for broadcast footage of 22 players. (6) The mobile stack (Core ML, Neural Engine, 63 FPS) is irrelevant to GSE's offline use — the transferable part is the fusion math, not the deployment. (7) Constant-velocity range model will lag abrupt football accelerations (cuts, collisions).

## 10. GSE overlap
Checked `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No CoM or biomechanics work exists in the corpus. Adjacent: the tracking/NGS lane (27-family taxonomy, STRAIN, NGS replacement spec) and ledger **0188** (Field Converter — learned residual localization for broadcast pose, same-day program). Overlap verdict: **extension** — 0188 gives a learned approach to broadcast player localization; MuyBridge gives a complementary **analytic** fusion approach (anthropometric + physical anchors, no learned residual) that could serve as a prior, fallback, or cross-check for metric player trajectories feeding biomechanical features (landing/cutting loads → injury-risk signals for props). Not a duplicate of anything in the repo.

## 11. GSE implementation spec
Concrete NFL port (offline, not on-device):
- **Data:** NFL broadcast/All-22 clips + NGS tracking (ground truth); roster height/weight as subject-adaptive anthropometry (replacing population de Leva where possible); field plane from yard-line calibration.
- **Feature engineering:** 2D pose per player (off-the-shelf detector); monocular depth (single-step distilled model, no phone constraint — run at full resolution offline); sparse depth sampling at keypoints; segment lengths from roster stature; ground-contact from foot-keypoint/field-plane proximity; ballistic phases from vertical acceleration.
- **Model:** the paper's analytic fusion unchanged in structure (Eqs. 1–5) with football-specific anchors: replace the constant-velocity range model with a coordinated-turn/constant-acceleration model suited to cuts; subject-adaptive segment proportions from roster measurements (the paper's own stated future work).
- **Training protocol:** no training needed for the fusion itself (analytic); validate against NGS tracking; optionally learn the anchor weights w_f.
- **Serving:** offline batch over game film to produce per-play CoM/landing/cutting features for the props/injury-risk feature store.
- **Estimated effort:** ~5 engineer-weeks (pose + depth plumbing exists in open source; football anchor tuning is the work).

## 12. Reproducible test
- **Dataset:** 2025 NFL regular-season broadcast clips with synchronized NGS tracking ground truth; game-disjoint splits.
- **Metric:** range AbsRel and vertical CoM error vs. two baselines: (a) monocular-depth-only range (affine-aligned), (b) constant-range assumption.
- **Window:** 2025 season sample (weeks 1–17), held-out games.
- Runnable: yes — broadcast video + tracking + roster data all available.

## 13. Acceptance / rejection gate
**ADAPT (adopt the NFL port) if:** analytic fusion achieves **≥ 30% relative reduction in range AbsRel** vs. monocular-depth-only **and** vertical CoM error **< 60 mm** on held-out games; **reject otherwise** (the anchors don't buy enough over raw depth at NFL broadcast ranges). Gate evaluated before wiring outputs into any props/injury feature.

## 14. Improvement experiment
Implement the paper's stated future work the authors did not: **subject-adaptive anthropometry** — learn per-player segment mass/length proportions from roster measurements (height, weight, position) rather than population de Leva tables, and add a **football contact model** (tackle/collision phases where neither ground-contact nor ballistic assumptions hold, using multi-player proximity as a range anchor). Test whether adaptive anthropometry + contact-aware anchors cut the depth-axis error — the dominant term (60–95% of 3D MAE) — by ≥ 25% on lineman/backfield plays, the body types and phases where population priors fail hardest.
