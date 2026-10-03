# 1035 — Monocular 3D Human Pose Estimation for Sports Broadcasts using Partial Sports Field Registration (2304.04437)

## Citation / full-text source
Tobias Baumgartner, Stefanie Klatt, "Monocular 3D Human Pose Estimation for Sports Broadcasts using Partial Sports Field Registration", CVsports 2023 workshop. arXiv:2304.04437. Code/data: https://github.com/tobibaum/PartialSportsFieldReg_3DHPE. Full text: export.arxiv.org/pdf/2304.04437 (9 pages, PDF parsed in full).

## Research question
Broadcast video flattens 3D athlete kinematics into 2D; standard monocular 3D HPE lifts 2D joints with an *implied* (learned, lab-bias) geometry that is wrong for long-distance telephoto broadcast shots. Can partial sports field registration — deriving camera calibrations consistent with visible line markings up to one degree of freedom, then jointly optimizing calibration + ray-cast 3D pose — recover kinematically valid 3D running kinematics from close-up broadcast footage where full field registration is impossible?

## Dataset / schema
**Synthetic**: 10,571 frames, 31 sequences, Unreal Engine 5 + Mixamo (marker-based MoCap animations) + MetaHumans (varied height, body composition, limb length, running style). Athlete runs the straight of a 400m track; static camera pans/tilts/zooms like a broadcast. Ground truth: rendered images + 2D joint pixel locations (Human3.6m joint defs) + absolute 3D world coordinates + complete camera calibration (location, orientation, FoV). Plus anecdotal real-world footage from a world-class track event for qualitative demo.

## Method
1. **Partial field registration**: detect visible track lane lines (OpenCV Hough), compute one vanishing point, then construct a dense set of candidate camera calibrations consistent with that vanishing point (1° azimuth increments; elevation/roll/FoV solved to match; translation fitted to lane positions). One DoF remains per frame (e.g., camera height); the static-camera constraint (shared height across the sequence) resolves it.
2. **Ray-cast lifting**: from ground contact frames, ray-cast the foot pixel to the ground plane to get athlete location; interpolate ground projection between contacts to define the sagittal plane; cast the pelvis ray onto that plane; then walk the skeleton outward (torso→limbs), intersecting each joint's camera ray with a sphere of radius = limb length (limb lengths from an off-the-shelf 3D HPE run averaged over the scene), pruning the 2^3 configurations per segment via range-of-motion + frame-to-frame consistency.
3. Baselines: MeTRAbs (Sárándi et al., SOTA "3D Poses in the Wild Challenge") and MeTRAbs + rotation (their calibration injected).

## Equations / assumptions
Described procedurally, no numbered loss equations. Key geometric relations: projection matrix P^C = K^C · (R^C | t^C) (Eq text, §3.2); vanishing-point-consistent calibration family parametrized by azimuth with interpolated selection; limb-sphere intersection: joint = ray ∩ sphere(limb_len) around parent joint.
Fundamental ambiguity result (Figure 2): identical image pixels produced by 3D skeletons whose right-leg angle differs by 7.8° — provably unrecoverable without scene geometry.
Assumptions: static camera across the sequence; foot strikes ground between strides; running is cyclical (used in the "+context" variant); limb lengths constant per athlete; known field marking geometry.

## Features / target
Features: 2D joint pixel locations (MeTRAbs 2D output) + visible lane markings. Target: absolute 3D joint positions (cm) and knee angles (degrees) in world coordinates.

## Validation
Synthetic ground truth: reprojection error (px, estimated pose re-rendered with GT calibration), 3D Euclidean error (cm, pelvis-aligned), knee-angle error (°). Camera calibration errors vs GT: lane endpoints 21.98±24.42 px off; vanishing point 2.58±1.89%; camera location 0.85±0.72 m (3.97±3.10% of lane distance); FoV 3.07±0.88°. MeTRAbs-XL 2D error 4.66±0.87 px (COCO defs). Lens-distortion ablation (real broadcast calibration applied): error 7.05→5.78 cm (undistorted), 9.88→8.08 cm (distorted).

## Exact results / baselines
Table 1 (mean (std)): MeTRAbs: reprojection 6.36 (4.08) px / 3D 10.33 (1.69) cm / knee 20.31 (9.74)°. MeTRAbs+rotation: 5.01 (2.96) / 7.92 (2.12) / 12.41 (7.94)°. **Their method: 2.76 / 6.41 (1.65) / 9.91 (9.00)°.** Their method +context (GT 2D joints + cyclical step-frequency consistency, idealized): — / 2.44 (0.58) / 2.87 (3.27)°.
Context: running literature reports meaningful knee-angle differences of 3–4° between conditions — so MeTRAbs' 20.31° is two orders of magnitude too coarse for real kinematic analysis, and even their base 9.91° only approaches usefulness with the +context idealization (2.87°).

## Code / data
Public: https://github.com/tobibaum/PartialSportsFieldReg_3DHPE (synthetic dataset + code). Synthetic generator reproducible from UE5 + Mixamo + MetaHumans.

## Leakage
Evaluation is fully on held-out synthetic renderings (no train on the synthetic set — authors explicitly discourage training on it); MeTRAbs is used off-the-shelf. Real-footage demo is qualitative only. No leakage concern.

## Limitations
- Narrow domain: middle-distance running on a straight track; single athlete per shot; static camera.
- +context results are highly idealized (GT 2D joints, cyclical prior) — not achievable in the wild.
- Knee-angle error 9.91° still exceeds the 3–4° effect sizes of interest in real studies.
- Unreal renderings ≠ real broadcast (the authors' honest framing: a demo avenue, not a solved pipeline).
- Requires visible lane markings and a static camera; won't apply to handheld or crowd-dense team-sport closeups.

## GSE overlap
NFL broadcast/sideline and All-22 video is exactly the target use case: the football field has the richest marking geometry in sports (yard lines every 5, hash marks, numbers, sidelines) — even better than a 400m track for partial registration. Recovering kinematically valid 3D player motion from broadcast clips is the missing primitive for GSE technique/mechanics content (tackling form, running gait, QB throwing kinematics) and for building a real kinematic dataset from existing footage.

## Implementation (GSE adaptation)
NFL-FieldReg-3D pipeline: (a) detect yard lines + hash marks per broadcast frame (Hough/segmentation) → vanishing point(s); (b) build candidate calibration family, resolve DoF via static-camera assumption per broadcast shot; (c) ray-cast lift from a 2D pose estimator (RTMPose/HRNet) onto the field plane + sagittal planes per player; (d) limb-length-constrained skeleton assembly with range-of-motion pruning; (e) validate against GSE's own tracked GPS/Next-Gen-Stats player positions as ground-truth position anchors (GSE has NGS data — a unique calibration anchor this paper lacked). Target: 3D joint kinematics for technique analysis segments and a GSE kinematic clip dataset.

## Reproducible test
Rebuild the synthetic pipeline with a football field (yard lines) in UE5 with 5 running-style variants; run MeTRAbs off-the-shelf vs partial-registration ray-casting; replicate Table 1 (reprojection px, 3D cm, knee-angle °) and confirm the ambiguity demonstration (same pixels, different 3D).

## Numeric gate
Ray-cast method must beat MeTRAbs by ≥3 cm on 3D error AND ≥8° on knee-angle error on the synthetic football-field set (matching the paper's own margins: 10.33→6.41 cm, 20.31→9.91°) with reprojection error ≤3 px, before any real-broadcast pilot. If geometry-injection doesn't beat MeTRAbs off-the-shelf by those margins, the extra pipeline complexity is unjustified.

## Improvement experiment
Anchor the ray-cast lifting with Next Gen Stats player (x,y) positions as hard positional constraints (GSE-exclusive data the paper never had): for each tracked player, replace the ground-plane interpolation step with NGS ground truth; measure 3D error reduction vs pure-vision pipeline. This directly tests whether GSE's data moat unlocks the kinematic validity the paper was chasing.

## Verdict
ADAPT
