# [0367] Efficient 2D to Full 3D Human Pose Uplifting including Joint Rotations (arXiv:2504.09953)

**Citation:** Ludwig, K., Oksymets, Y., Schön, R., Kienzle, D., Lienhart, R. (2025). *Efficient 2D to Full 3D Human Pose Uplifting including Joint Rotations*. arXiv:2504.09953 (April 2025). URL: https://arxiv.org/abs/2504.09953
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1599 lines, including §4 experiments, §5 conclusion, references).
**Verdict:** ADAPT — a single-forward-pass 2D→3D uplifter that outputs joint rotations alongside locations, 150× faster than the IK baseline, is the right architecture pattern for any GSE broadcast biomechanics work (QB mechanics, joint-torque analysis); adopt the rotation-matrix + geodesic-loss, SMPL-X-layer design, and replicate the weakly-supervised (VPoser/pseudo-label) recipe to train on broadcast NFL footage where ground-truth rotations don't exist.

## 1. Research question
Can 2D-to-3D human pose uplifting be extended to estimate **joint rotations** (needed for sports biomechanics, forces/torques) in a **single forward pass**, avoiding the computationally expensive inverse-kinematics (IK) post-processing of Ludwig et al. 2024 (UU-IK), while matching or beating IK and HMR models on accuracy? And can this be done when ground-truth rotations are unavailable (weak supervision)?

## 2. Dataset / schema
- **fit3D** (Fieraru et al. 2021): the only publicly available sports dataset with SMPL-X annotations. 11 subjects performing 47 fitness exercises, recorded in a studio with 4 synchronized RGB cameras + a 12-camera VICON mocap system; each subject 3D-scanned for body shape. One person visible per video. Official train/test splits exist, but ground truth (incl. body shape) is only available for the training subset, so the authors re-split: **6 subjects train (s03, s04, s05, s07, s08, s10), 1 validation (s09), 1 test (s11)**.
- **Joint set:** 22 main body joints + 2 joints per hand (thumb and pinky) = **26 joints** for training/evaluation; VPoser is only trained on the main body pose, so VPoser experiments evaluate on the 22 main-body joints. (Note: the naive-SMPL-X naming in Table 4 evaluates MPJPE-37 on the 37-keypoint set of Ludwig et al. 2024 for comparability, and MPJAE-26 in brackets with finger rotations zeroed where models don't estimate them.)
- **Access:** fit3D is public (Aifit/CVPR 2021). Code: https://github.com/kaulquappe23/full_3d_hpe_uplifting

## 3. Method / model
Backbone: **UU (Uplift and Upsample, Einfalt et al. 2023)** — spatial Transformer, temporal Transformer, strided Transformer. The paper extends UU to predict rotations in one forward pass, comparing three rotation representations (axis-angle AA, quaternions Q, rotation matrices RM), two angle losses (MSE, geodesic), and four supervision strategies:
1. **Naive approach (N-)** (§3.2.1): separate heads — the UU joint-location head plus an added joint-rotation head; joint locations and rotations supervised independently.
2. **SMPL-X layer approach (S-)** (§3.2.2): a differentiable SMPL-X layer maps estimated rotations (plus body shape) to joint locations; locations are derived *through* the SMPL-X model rather than predicted directly, tying the two outputs geometrically. Quaternions excluded (bad naive results + not used in SMPL-X).
3. **Pseudo-label approach (PS-)** (§3.3, weakly supervised, no GT rotations): run the IK routine of Pavlakos et al. 2019 on ground-truth 3D joint locations to obtain rotation pseudo-labels, then train the fully-supervised routine. IK routine only estimates the main body pose (not hands), so evaluation is on 22 joints.
4. **VPoser approach (V-)** (§3.4.2, weakly supervised, no GT rotations): use VPoser as a human-body prior to prevent unrealistic poses under weak supervision (joint locations supervised with GT labels, rotations constrained by the prior).
- **Within-Batch Augmentation (WBA):** horizontal flipping where half of each batch is original poses and half is flipped versions (shown effective for 2D→3D uplifting in Einfalt et al. 2023).

## 4. Equations & assumptions
- **MPJAE metric** (Eq. 3): for estimated rotations R̃ and ground-truth rotations R, with R_k' = R̃_k R_k^T (the rotation aligning prediction with GT): MPJAE(R, R̃) = (1/K) Σ_{k=1}^{K} arccos((tr(R_k') − 1)/2). Derived from tr(R_k') = 1 + 2cos φ; R_k' = I iff perfect match. Reported in radians in the metric but **converted to degrees** in the evaluation tables.
- **MPJPE:** root-relative Mean Per Joint Position Error (mm), standard.
- **Assumptions:** body shape known (ground truth in §4.6; A2B-estimated in §4.7); known bone/joint topology via SMPL-X; gaze-free lab studio setting; weak-supervision approaches assume location labels are trustworthy and only rotations are missing; WBA assumes mirrored poses are valid.

## 5. Features / target
- **Inputs:** 2D pose sequences (from an off-the-shelf 2D detector; the uplifter lifts 2D→3D); body shape parameters (GT or A2B-estimated).
- **Outputs:** 3D joint locations (26 joints) **and** 3D joint rotations (26 rotation matrices/AA/quaternion sets) in a single forward pass.
- **Targets during training:** GT 3D joint locations always; GT rotations (supervised), IK pseudo-labels (weak), or VPoser-prior constraints (weak).

## 6. Validation design
- Train/val/test = subject-disjoint split of fit3D (s03,s04,s05,s07,s08,s10 / s09 / s11). No cross-dataset evaluation. Metrics: MPJPE (mm) and MPJAE (degrees), plus runtime (mean ± std over ≥5k forward passes on an NVIDIA GeForce RTX 2080 Ti).
- **Baselines:** original UU (Uplift-Upsample, locations only; UU-1 no WBA, UU-2 with WBA), SOTA HMR model Multi-HMR (Baradel et al. 2024 — best fit3D performer per Ludwig et al. 2024; evaluated with its estimated rotations + ground-truth body shape for fairness), and UU-IK (Ludwig et al. 2024 pipeline: UU + IK for rotations, with/without pre-initialization from previous frame).

## 7. Numerical results / baselines
- **Supervised, naive (Table 1):** UU-2 (WBA) MPJPE **34.68** mm (locations only). Rotation reps differ wildly: best naive = **N-RM-2** (rotation matrices, geodesic loss, no WBA): MPJPE **39.40**, MPJAE **8.82°**; N-RM-4 (geodesic + WBA): 41.11/8.84. Axis-angle similar (N-AA-2: 48.35/9.39). **Quaternions collapse:** N-Q-2 (geodesic): MPJPE **563.84**, MPJAE **85.35°**; N-Q-4: 531.82/88.40 — geodesic loss is destructive for quaternions (MSE is better for Q: N-Q-1 78.51/10.60). WBA does *not* improve the naive models (unlike UU).
- **Supervised, SMPL-X layer (Table 2):** axis-angle now beats rotation matrices. **S-AA-3** (AA, MSE, WBA): MPJPE **36.69**, MPJAE **9.21°** — best overall supervised; only 2 mm worse MPJPE than location-only UU-2 and ~3 mm better than the best naive. S-AA-1 (MSE, no WBA): best MPJAE **9.14°** but MPJPE 62.48 (28 mm worse than UU). S-RM-4: 40.21/9.19. Qualitative results of S-AA-3 shown in paper Fig. 1.
- **Weakly supervised (Table 3, 22 joints):** pseudo-label PS-AA-3 (WBA): 37.30/**16.18°**; VPoser V-2 (WBA): 38.76/**15.90°** (best MPJAE). Weak MPJAE roughly doubles vs supervised (~9° → ~16°), but MPJPE stays competitive (only slightly above supervised, and below the best naive). No single best weak model: V-2 better on angles, PS-AA-3 better on positions; both benefit from WBA.
- **Head-to-head (Table 4, GT body shape, RTX 2080 Ti):** best supervised models (N-RM-2, S-AA-3) **outperform all other models on MPJAE** — beating both UU-IK (16.43°) and Multi-HMR (17.59°). UU-IK has the best MPJPE (34.62) but far worse rotation accuracy. Multi-HMR is worst on both (62.22/18.49). **Runtime: N-RM-2 9.86±2.78 ms; S-AA-3 11.09±3.14 ms; weak best 11.46±3.50 ms vs UU-IK 1952.19±1091.52 ms (with pre-init) / 4733.31±1826.99 ms (without)** — the paper's headline claim of **over 150× faster** than the IK approach. Multi-HMR 156.10±10.09 ms.
- **Consistent estimated body shape (Table 5, A2B models):** MPJPE-only (MPJAE shape-independent): UU-IK 35.71/38.41 (26/37 joints), S-AA-3 38.35/42.72, N-RM-2 41.01/43.95. Rankings hold with estimated shapes.
- **Important caveat (authors' own):** the MPJPE-37 evaluation is biased toward Ludwig et al. 2024's model since nearly a third of those keypoints aren't in the authors' training targets. Weak SMPL-X-only supervision (no prior) can produce impossible twisted rotations despite accurate joint positions.

## 8. Code / data availability
Code: https://github.com/kaulquappe23/full_3d_hpe_uplifting (stated). fit3D dataset: public (Aifit, CVPR 2021).

## 9. Leakage & limitations
- **Domain gap:** fit3D = studio fitness videos, single person, controlled lighting. Broadcast NFL (crowded, occluded, motion blur, tiny players) is a different distribution; no cross-domain test.
- **Subject split is tiny:** 1 validation + 1 test subject — test-set variance across subjects is unquantified.
- **Single-person only**; no multi-athlete handling, which broadcast NFL requires.
- Body shape must be known/estimated; A2B-shape results degrade modestly but the whole pipeline assumes per-athlete shape parameters — unavailable for NFL players from broadcast.
- Quaternions fail catastrophically under geodesic loss (a landmine for anyone reimplementing); the "best" choices are representation×loss×architecture-dependent, not universal.
- Weak supervision doubles rotation error (9° → 16°); twisted-rotation failure mode needs the VPoser prior to suppress.
- Runtime measured on a 2080 Ti with GT body shape; end-to-end (2D detection + uplifting) cost not reported.

## 10. GSE overlap
The existing-research map (2026-09-21) has **no 3D pose, biomechanics, or joint-rotation coverage** — nothing in the NGS-replacement spec or tracking lane captures body articulation; the map's human-centric entries are event detection and tracking, not biomechanical pose. This paper is **new capability**: a fast, deployable full-3D-pose + rotation estimator that would underpin any future GSE biomechanics product (throwing-mechanics analysis, joint-torque/injury-risk features) rather than duplicating anything existing. The weakly-supervised recipes (pseudo-label via IK, VPoser prior) are especially valuable because GSE will never have GT rotation labels for NFL broadcast footage.

## 11. GSE implementation spec
1. Take the paper's design as-is: UU-style spatial/temporal/strided Transformer uplifter, **rotation-matrix output head + geodesic loss + SMPL-X layer** (S-AA-3 / N-RM-2 recipe), single forward pass.
2. Train the weakly-supervised route first: 2D pose sequences from an off-the-shelf detector on NFL broadcast clips → pseudo-label rotations with the Pavlakos IK routine on estimated 3D joints → train with VPoser-style body prior to suppress twist failures. No GT rotation labels needed.
3. Target use cases: QB throwing-mechanics features (shoulder/elbow rotation sequences) and joint-angle-based injury-risk features — both gaps in the current NGS taxonomy inventory.
4. Effort: 3–4 weeks to replicate the training recipe on sports broadcast data; inference at ~10 ms/frame is fast enough for offline clip processing but not real-time broadcast.

## 12. Reproducible test
Build a 50-clip set of NFL broadcast QB dropback/throw sequences; run an off-the-shelf 2D detector + the paper's weakly-supervised VPoser pipeline; have two analysts score rotation plausibility (0–5 scale) per clip vs a naive baseline (joint positions only, rotations zeroed); acceptance if mean plausibility ≥ 3.5 with no impossible-twist failures — the paper's own failure mode is the explicit check.

## 13. Acceptance / rejection gate
PURSUE full replication if the plausibility test passes with zero twist failures and end-to-end runtime ≤ 50 ms/frame (paper achieves ~11 ms for the uplifter alone on a 2080 Ti, leaving headroom for the 2D detector); REJECT for broadcast use if twist failures persist despite the VPoser prior or the detector cost pushes the pipeline past 100 ms/frame — the design stays a lab recipe, not a product input.

## 14. Improvement experiment
Replace the SMPL-X layer's GT body shape with a per-player shape estimated from a few frames via the A2B anthropometric approach (paper §4.7) and fine-tune the uplifter jointly with shape estimation — this removes the biggest deployment blocker (per-athlete shape parameters) and tests whether the "consistent body shape" idea transfers from fitness studios to broadcast NFL, where player body types vary far more.
