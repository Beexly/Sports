# [0188] Field Converter: Geometry-Initialized Temporal Residual Refinement for World-Grounded Player Pose Estimation from Soccer Broadcasts (arXiv:2609.10498v1)

**Citation:** Simon Khan, Laurent Gajny, Jennyfer Lecompte, Sébastien Laporte (2026). *Field Converter: Geometry-Initialized Temporal Residual Refinement for World-Grounded Player Pose Estimation from Soccer Broadcasts*. arXiv:2609.10498v1. URL: https://arxiv.org/abs/2609.10498v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1268 lines).
**Verdict:** ADAPT — port the geometry-initialized temporal residual framework from soccer to NFL broadcast geometry for world-grounded player localization; keep the residual decomposition and TCN backbone, but swap in the NFL field plane, NFL broadcast camera calibration, and retrain on NFL tracking data.

## 1. Research question
Given monocular soccer broadcast video plus calibrated field geometry, how should a player's global translation be recovered in a shared metric world coordinate system? Specifically: is it more effective to **refine a geometry-based initialization temporally** than to **regress global translation directly**? The paper's empirical starting point: a strong upstream body model (SAM 3D Body) already gives an accurate pelvis-centered pose — "the dominant remaining error is not the articulated pose itself, but the global camera-space translation of the player" — so the learning problem is reduced to root localization.

## 2. Dataset / schema
**FIFA Skeletal Tracking Light 2026** dataset, calibrated monocular soccer-broadcast sequences. Processed subset: **89 clips from 8 matches, ~2.41M valid player–frame observations**. Annotations per frame: time-varying camera intrinsics Kt, extrinsics (Rt, tt), radial distortion kt, player bounding boxes, validity masks, and **25-joint 3D skeletons in a common metric field coordinate system**. Upstream inputs assumed available: bounding boxes, 2D keypoints, self-centered 3D pose (SAM 3D Body, Yang et al. 2026). Splits are **strictly match-disjoint**: train = 62 clips / 6 matches; validation = 12 clips (BRA_KOR); test = 15 clips (ENG_FRA) — no match appears in more than one split. Access: dataset availability not stated as a public URL in the paper (FIFA data; effectively restricted).

## 3. Method / model
Three stages (Fig. 3):
1. **Geometry-based root initialization (§3.4):** select the lowest valid lower-limb keypoint j*t = argmax image-row over candidates (ankles/heels/toes); back-project its 2D point through the calibrated camera to a world ray, intersect with the pitch plane (z=0), transform back to camera coordinates, and subtract the relative-pose offset: r^{c,init}_{i,t} = q^c_{i,t} − x̂^{rel}_{i,t,j*} (Eq. 18).
2. **Temporal residual refinement (§3.6):** per-frame encoder Eθ maps the input feature vector to a latent (TCN: 370→192³; Transformer: 345→256²); temporal backbone Gθ over **41-frame windows, stride 8** — either a **TCN** (5 residual blocks, dilations (1,2,4,8,16), k=3, 1.278M params) or a **Transformer** (2 encoder layers, 4 heads, FFN 512, learned positional encoding, 1.252M params), plus a frame-wise MLP baseline (0.194M); prediction head Hθ (192→128→3 or 256→128→3, GELU) outputs the residual Δr̂^c_{i,t}; refined root r̂^c = r^{c,init} + Δr̂^c (Eq. 33); overlapping windows aggregated by mean (Eq. 34).
3. **World-space reconstruction (§3.9):** anchor the relative skeleton at the refined root and transform to field coordinates via calibrated extrinsics (Eq. 45); same translation applies to mesh vertices (Eqs. 46–47).
- **Training (§3.7–3.8):** AdamW, lr 1.6788×10⁻⁴, weight decay 3.2001×10⁻⁴, batch 64 windows, ≤60 epochs, early stopping (patience 10) on validation root error, gradient clip 1.0, no scheduler; best epoch 41 (TCN) / 23 (Transformer). Hyperparameters via 12-trial random search + grid over window/stride and loss weights (TCN), and 16-config multi-fidelity search (Transformer).

## 4. Equations & assumptions
Key equations quoted faithfully:
- Camera mapping: x^c_{i,t,j} = R_t x^w_{i,t,j} + t_t (1); inverse x^w = R_t^⊤(x^c − t_t) (2).
- Root-anchored joints: x̂^c_{i,t,j} = x̂^{rel}_{i,t,j} + r̂^c_{i,t} (4).
- Ground-truth root: r^{c,gt}_{i,t} = ½(x^{c,gt}_{i,t,jL} + x^{c,gt}_{i,t,jR}) (5) (hip midpoint).
- Keypoint selection: j*_{i,t} = argmax_{j∈Jcand} v_{i,t,j} (8) (lowest in image).
- Ray: d^c_{i,t} = K_t^{−1} p̃_{i,t}/‖K_t^{−1} p̃_{i,t}‖₂ (10); world ray d^w = R_t^⊤ d^c (13); intersection λ*_{i,t} = −(n^⊤C_t + b)/(n^⊤d^w_{i,t}) (15); q^w = C_t + λ*d^w (16).
- Initialization: r^{c,init}_{i,t} = q^c_{i,t} − x̂^{rel}_{i,t,j*} (18).
- Residual target: Δr^{c,gt}_{i,t} = r^{c,gt}_{i,t} − r^{c,init}_{i,t} (28); refined root r̂^c = r^{c,init} + Δr̂^c (33).
- Root loss: L_root = (1/(N_rΩ)) Σ_{i,t} v_{i,t} Σ_a ω_a ρ_β(r̂^c_{i,t,a} − r^{c,gt}_{i,t,a}) (35), ρ_β Smooth-L1 with β=1 (36).
- Velocity/acceleration losses on first/second differences (37–41); total L = λ_root L_root + λ_vel L_vel + λ_acc L_acc + λ_cam3D L_cam3D (44).
Stated assumptions: the selected lower-limb joint is in contact with the pitch (fails when airborne); camera intrinsics/extrinsics available from annotations or upstream field registration; upstream 2D/relative-3D pose is trustworthy; pitch is the plane z=0.

## 5. Features / target
Per-player-per-frame input vector f_{i,t} = [f^{3D}_{i,t} (flattened pelvis-centered skeleton), f^{2D}_{i,t} (image- + box-normalized 2D keypoints), f^{box}_{i,t} (normalized box geometry + log aspect), f^{cam}_t (normalized intrinsics, distortion, camera center, viewing direction), q^w_{i,t} (world ray–ground intersection), m_{i,t} (joint validity mask)] — 370 dims (TCN) / 345 (Transformer). Target: ground-truth camera-space root residual Δr^{c,gt}_{i,t} (3-vector). Auxiliary targets: root velocity/acceleration differences and masked camera-space 3D joint consistency.

## 6. Validation design
**Match-disjoint splits** (train 62 clips/6 matches, val 12 clips/BRA_KOR, test 15 clips/ENG_FRA) — strong against match-specific camera/stadium leakage. Model selection on validation mean root error. Baselines: geometry-only initialization; direct absolute-root regression (MLP and TCN); frame-wise MLP residual. Metrics: root error (cm, Euclidean on camera-space root), World MPJPE (cm, common field frame), Local MPJPE (root-removed, identical by construction across variants), reprojection error (px). Ablations: absolute vs residual target, input-modality removal, plus appendix analyses (temporal consistency, motion regimes, image position/scale sensitivity).

## 7. Numerical results / baselines
Main results (Table 3), quoted exactly — root error / World MPJPE / Local MPJPE / reproj / params:
- Geometry initialization: **48.58 / 48.36 / 7.74 / 5.39 px** / 0M
- MLP residual: **13.63 / 15.76 / 7.74 / 3.69** / 0.194M
- **TCN residual (41f): 10.12 / 13.20 / 7.74 / 3.49** / 1.278M
- Transformer residual (41f): **11.04 / 13.21 / 7.74 / 3.43** / 1.252M
Paper's interpretation: residual learning cuts root error ~72% vs geometry alone even frame-wise; temporal context adds the rest; TCN ≈ Transformer — "temporal context matters more than the specific temporal backbone"; gains come from localization, not pose (Local MPJPE unchanged).
Ablation — absolute vs residual target (Table 4): direct regression MLP **256.00 cm**, TCN **63.05 cm** vs residual MLP 13.63, TCN 10.12 — the decomposition is doing the heavy lifting.
Input ablation, TCN (Table 5), Δ root error: w/o 2D pose + box cues **15.93 (+5.81)**; w/o camera descriptor **13.02 (+2.90)**; w/o relative 3D pose **12.40 (+2.28)**; w/o ground intersection **11.17 (+1.05)**; w/o validity mask **10.75 (+0.63)**.
Airborne failure (§4.3.2): TCN root error ~10 cm grounded → ~15 cm at 10–13 cm foot clearance → **29 cm** at 15–18 cm → **37 cm** at highest clearance; geometry-only degrades 46 cm → ~1 m.
Appendix Table 8 (temporal consistency, with 95% CIs): root-velocity error MLP **131.9 [124.1, 142.2]** → TCN **100.6 [95.3, 107.6]** cm/s; acceleration 48.3 → 39.6 m/s². Residual refinement is also more robust to bad initializations (Fig. 4: TCN holds 8–11 cm over a wide init-error range).

## 8. Code / data availability
Code: **https://github.com/KhanSimon/field_converter**. Dataset (FIFA Skeletal Tracking Light 2026): no public download link stated in the paper.

## 9. Leakage & limitations
Adversarial view: (1) The match-disjoint protocol is genuinely strong — the main leakage risk is upstream: SAM 3D Body pose errors and camera-calibration errors propagate into the final estimate unquantified (the paper assumes calibration is given). (2) **Airborne motion is a structural failure mode** — the ground-contact assumption in Eq. (18) is violated by jumps/headers, and temporal refinement only partially compensates (37 cm error). For NFL, jumping/diving plays are routine, so this limitation transfers directly. (3) Only 8 matches — limited stadium, lighting, and camera-crew diversity. (4) FIFA-curated annotations are cleaner than raw broadcast; real broadcast calibration noise is not tested. (5) Local MPJPE is identical across variants by construction, so the "13.2 cm World MPJPE" headline inherits the upstream pose estimator's quality. (6) External validity to NFL: soccer's continuous play and pitch-plane geometry differ from football's line-of-scrimmage structure and heavier occlusion in the box; the method must be re-validated, not assumed to transfer.

## 10. GSE overlap
Checked `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. The map has a real tracking/NGS lane: 27-family NGS taxonomy inventoried (2026-09-21), STRAIN (2305.10262) read in depth, NGS replacement spec (2026-09-18), and broadcast-tracking items (TrackNet, SportMamba ledger 0008). **No existing work recovers world-grounded 3D player pose from broadcast video** — GSE's tracking work uses NGS/tracking data products, not pose-from-broadcast. Overlap verdict: **extension** of the tracking/NGS lane — a new perception capability (broadcast → metric player positions) that could feed the NGS-replacement effort with video-derived ground truth, not a duplicate.

## 11. GSE implementation spec
Concrete NFL port:
- **Data:** NFL broadcast clips (All-22 / TV feed) paired with **nflverse / NGS player-tracking data as ground truth** (x/y positions at 10 Hz) for 2024–2025; field plane = NFL field (100×53.3 yd, goal lines as metric anchors); camera calibration from yard-line/number markings via an existing field-registration method (TVCalib-style) — calibration is the critical upstream dependency.
- **Feature engineering:** same input vector recipe: relative 3D pose from an off-the-shelf detector (e.g., RTMPose/SAM 3D Body mapped to a common joint convention), 2D keypoints, box geometry, camera descriptor, ray–ground intersection on the NFL plane, validity masks.
- **Model:** TCN residual backbone (the paper shows TCN ≈ Transformer; TCN is cheaper) — 41-frame windows, Smooth-L1 root loss + velocity/acceleration auxiliaries; train on NFL clips with tracking-derived root targets.
- **Training protocol:** game-disjoint splits (no game in two splits — mirror the paper's match-disjoint discipline); AdamW, early stopping on validation root error.
- **Serving:** offline batch processing of broadcast clips to produce metric player trajectories for the NGS-replacement corpus; not real-time.
- **Estimated effort:** ~6 engineer-weeks (calibration pipeline is the long pole).

## 12. Reproducible test
- **Dataset:** 2025 NFL regular-season broadcast clips (weeks 1–17) with synchronized NGS tracking ground truth; game-disjoint train/val/test.
- **Metric:** root localization error (cm) vs. two baselines from the paper: (a) geometry-only ray–ground initialization, (b) direct absolute-root regression.
- **Window:** full 2025 season; test on held-out games.
- Runnable: yes — all inputs are available (broadcast video + tracking data + field geometry).

## 13. Acceptance / rejection gate
**ADAPT (adopt the NFL port) if:** on held-out games, the residual-refined root error is **< 50% of the geometry-only error AND < 25 cm absolute**; **reject otherwise** (geometry alone or direct regression suffices, or broadcast calibration noise dominates). Gate evaluated on the 2025-season test games before any production use in the NGS-replacement pipeline.

## 14. Improvement experiment
Attack the paper's admitted failure mode directly: add an explicit **ground-contact vs. airborne state classifier** (from pose + vertical-velocity cues) that gates the initialization — use ray–ground Eq. (18) when contact is confident, and fall back to a learned airborne prior (ballistic extrapolation from the last grounded frame) otherwise, with a contact-aware term in the loss. The paper shows airborne error reaching 37 cm (and ~1 m for geometry-only); test whether the gated variant cuts high-clearance error by ≥ 40% on jumping/diving plays. This matters more for NFL than soccer given how often receivers and defenders leave the ground.
