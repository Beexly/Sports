# [0341] 3DPCNet: Pose Canonicalization for Robust Viewpoint-Invariant 3D Kinematic Analysis from Monocular RGB cameras (arXiv:2509.23455v1)

**Citation:** Tharindu Ekanayake, Constantino Álvarez Casado, Miguel Bordallo López (2026). *3DPCNet: Pose Canonicalization for Robust Viewpoint-Invariant 3D Kinematic Analysis from Monocular RGB cameras*. arXiv:2509.23455v1. URL: https://arxiv.org/abs/2509.23455v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 510 lines).
**Verdict:** ADAPT — adopt the estimator-agnostic canonicalization layer (rotation prediction + Gram–Schmidt SO(3) mapping) as a preprocessing step for any multi-camera NFL pose work, but drop or constrain the non-rigid residual (Δ) so downstream biomechanical measurements stay honest.

## 1. Research question
Can 3D human pose estimates from monocular RGB cameras be made viewpoint-invariant by canonicalizing them — predicting a per-frame global rotation that maps any input pose into a canonical reference frame — independent of which pose estimator produced the input? 3DPCNet is an estimator-agnostic, pose-only canonicalization network: given a 17-joint 3D skeleton in an arbitrary camera frame, it outputs the same skeleton in a canonical frame, enabling cross-view and cross-camera kinematic comparison.

## 2. Dataset / schema
- **MM-Fi (train/eval):** 40 subjects, 27 activities, four environments; 3D skeletons with synthetic yaw/pitch/roll rotations applied to simulate viewpoint variation; official S1/S2/S3 subject splits. Used for the main quantitative results (cross-environment generalization).
- **TotalCapture (qualitative):** ~1.9M synchronized frames, five subjects, 8 RGB camera views, Vicon ground truth + 13 IMUs. Cross-modal (RGB vs IMU) canonicalization results are qualitative only — no quantitative numbers reported.
- Schema: 17-joint 3D skeletons. Access: both datasets are public; code at https://github.com/tharindu326/3DPCNet.

## 3. Method / model
Hybrid adaptive-GCN + Transformer network. Input: a 17-joint 3D pose in an arbitrary viewpoint. A 3-layer adaptive GCN (hidden 256) models the skeleton graph with adjacency \(A=\sigma(\alpha)A_0+(1-\sigma(\alpha))A_{\text{learned}}\); a 2-layer Transformer (8 heads, output dim 384) with cross-attention and a learned gating mechanism fuses the streams. The network predicts a continuous 6D rotation representation, mapped to SO(3) via Gram–Schmidt orthogonalization, plus an optional 17×3 per-joint residual Δ. Canonical output: \(\hat X_c=\hat R^\top X+\Delta\). Training: 80 epochs, AdamW, lr 5e-4, batch 1024; loss weights wp=1 (pose MSE), wr=1 (rotation), wc=0.25 (cycle consistency), wperc=0.15 (bone/joint perceptual terms), plus regularization. Estimator-agnostic: trained on poses from one estimator, tested on poses from others.

## 4. Equations & assumptions
- Canonical mapping: \(\hat X_c=\hat R^\top X+\Delta\), where \(\hat R\) is the predicted rotation and Δ the optional residual.
- Adaptive adjacency: \(A=\sigma(\alpha)A_0+(1-\sigma(\alpha))A_{\text{learned}}\).
- Rotation supervision: SO(3) geodesic error \(\arccos((\operatorname{tr}(\hat R R_{GT}^{\top})-1)/2)\).
- Loss (weighted sum): pose MSE (wp=1) + geodesic rotation error (wr=1) + cycle consistency (wc=0.25) + bone/joint perceptual terms (wperc=0.15) + regularization.
- Assumptions: (1) viewpoint variation is well modeled as a rigid global rotation (plus small residual); (2) ground-truth canonical frames (R_GT) are available at training time via the synthetic-rotation protocol; (3) upstream pose estimator outputs are "good enough" — canonicalization cannot fix bad poses.

## 5. Features / target
Input features: 17-joint 3D skeleton coordinates from any monocular pose estimator (pose-only; no image input). Target: the same skeleton expressed in the canonical reference frame (rotation-corrected joint coordinates); auxiliary target is the ground-truth rotation R_GT. Prediction is per-frame (no temporal modeling).

## 6. Validation design
MM-Fi official splits S1/S2/S3 (subject-disjoint, cross-environment). Viewpoint variation is synthetic (random yaw/pitch/roll applied to ground-truth poses). Metrics: MPJPE, PA-MPJPE, and mean rotation error in degrees. Compared against a geometric (non-learned) canonicalization baseline. Cross-modal validation on TotalCapture is qualitative only. No real multi-camera NFL-style evaluation.

## 7. Numerical results / baselines
- MM-Fi S2 split — geometric baseline: **62.85 MPJPE, 0 PA-MPJPE, 20.64°**; 3DPCNet (S2-trained): **47.57 MPJPE, 37.49 PA-MPJPE, 3.58°**; 3DPCNet (S3-trained): **46.24, 36.94, 3.43°**.
- MM-Fi S3 split — geometric: **64.58, 0, 21.56°**; 3DPCNet (S2-trained): **48.83, 38.22, 4.29°**; 3DPCNet (S3-trained): **47.71, 37.61, 4.24°**.
- So: ~24–28% MPJPE reduction vs the geometric baseline and rotation error cut from ~21° to ~3.5–4.3°, with cross-environment transfer (S2↔S3 training) holding up. No quantitative TotalCapture numbers stated. (Note: the paper's PA-MPJPE column reads 0 for the geometric baseline, quoted as printed.)

## 8. Code / data availability
Code: https://github.com/tharindu326/3DPCNet (stated). Datasets MM-Fi and TotalCapture are public.

## 9. Leakage & limitations
- **Synthetic rotations:** viewpoint variation is simulated by rotating ground-truth poses — real multi-camera geometry (occlusions, foreshortening-dependent estimator error, calibration error) is not tested. The hardest part of real canonicalization (view-dependent pose-estimation error) is absent from the evaluation.
- **Residual Δ breaks strict rigidity:** the optional 17×3 residual means the output is not a pure rotation of the input — the network can "edit" joint positions, which silently corrupts biomechanical measurements (joint angles, limb lengths) downstream.
- **No scale recovery:** canonicalization handles rotation only; camera-distance/scale ambiguity from monocular input is unaddressed.
- **Upstream error propagation:** the method is only as good as the input pose estimator; no evaluation on noisy estimator outputs is reported quantitatively.
- **Per-frame, no temporal consistency:** predicted rotations can jitter frame-to-frame; no temporal smoothing evaluated.
- NFL external validity: evaluated on lab-style datasets (MM-Fi, TotalCapture), not on stadium footage with 22 athletes, occlusions, and broadcast camera angles.

## 10. GSE overlap
Per the existing-research map: GSE's tracking/NGS work (27-family taxonomy, NGS replacement spec `docs/research/2026-09-18-ngs-replacement-spec.md`, STRAIN read) operates on NGS tracking coordinates, not on pose estimation or multi-camera canonicalization. This is a **new capability** — a pose-canonicalization preprocessing layer that would sit in front of any future GSE pose-from-video pipeline. No duplication.

## 11. GSE implementation spec
- **Purpose:** canonicalize 3D player poses estimated from heterogeneous NFL camera angles (broadcast, All-22, end zone) into a common field frame so pose-derived features (joint angles, posture metrics) are comparable across views.
- Data: collect multi-angle NFL practice/film clips; run an off-the-shelf 3D pose estimator to generate inputs; use synthetic-rotation training as in the paper for the base model, then fine-tune on real multi-view NFL clips with field-calibration-derived ground-truth rotations.
- Model: 3DPCNet architecture per paper (3-layer adaptive GCN + 2-layer Transformer, 6D→SO(3) Gram–Schmidt head); **remove or heavily regularize the Δ residual** (set wperc residual weight to 0 or penalize ‖Δ‖) to preserve measurement integrity.
- Add a temporal smoothing/consistency term on the predicted rotation sequence (the paper is per-frame; NFL film needs jitter-free output).
- Serving: batch preprocessing step in the film-ingest pipeline, before any pose-feature extraction.
- Estimated effort: 3–4 engineer-weeks (reimplementation from the public code + NFL fine-tune + temporal extension).

## 12. Reproducible test
Dataset: 200 NFL clips with synchronized multi-angle coverage (e.g., broadcast + All-22 of the same plays), 3D poses from a fixed estimator. Metric: cross-view MPJPE of canonicalized poses of the same player at the same timestamp (lower is better) and rotation-consistency across consecutive frames (jitter, degrees/frame), vs. the geometric baseline from the paper. Window: one batch of 2024-season film, offline.

## 13. Acceptance / rejection gate
**Adopt** the canonicalization layer if on real multi-angle NFL film it reduces cross-view MPJPE by ≥20% vs. the geometric baseline AND median frame-to-frame rotation jitter is ≤2° after temporal smoothing. **Reject** if cross-view MPJPE improvement <20%, if the residual Δ is found to alter limb lengths by >3% on validation (measurement corruption), or if performance collapses on occluded frames (the synthetic-rotation gap biting).

## 14. Improvement experiment
Extend 3DPCNet with a temporal rotation filter: predict per-frame rotations, then fuse them with a constant-velocity Kalman smoother on SO(3) (or a learned temporal Transformer head), supervised by multi-view consistency loss on real NFL multi-angle clips rather than synthetic rotations. Test whether the temporal+real-geometry variant beats the paper's per-frame synthetic-rotation model on the cross-view MPJPE test — directly attacking the paper's two weakest points at once.
