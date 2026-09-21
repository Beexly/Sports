# 1037 — AthletePose3D: A Benchmark Dataset for 3D Human Pose Estimation and Kinematic Validation in Athletic Movements (2503.07499)

## Citation / full-text source
Calvin Yeung, Tomohiro Suzuki, Ryota Tanaka, Zhuoer Yin, Keisuke Fujii, "AthletePose3D: A Benchmark Dataset for 3D Human Pose Estimation and Kinematic Validation in Athletic Movements", arXiv:2503.07499v3 [cs.CV], 11 Jul 2025. Code/data/checkpoints: https://github.com/calvinyeungck/AthletePose3D. Full text: export.arxiv.org/pdf/2503.07499 (11 pages, PDF parsed in full).

## Research question
SOTA monocular 3D pose models are trained on lab/everyday-motion datasets (Human3.6M, MPI-INF-3DHP) that lack the high speed and high acceleration of competitive sports. How badly do they fail on true athletic motions, does sports-specific fine-tuning fix it, and — critically for biomechanics use — are the kinematic waveforms (joint angles, velocities) derived from estimated poses actually valid against motion-capture ground truth?

## Dataset / schema
AthletePose3D: ~1.3M frames, 165K unique postures, 8 athletes (inter-university to international level). Running (lab, 3 subjects, 55 keypoints, 4 cameras, 40K poses, 120 FPS, 161K frames); track & field — shot put, glide shot put, javelin, discus, spin discus (lab, 1 subject, 86 keypoints, 8 cameras, 52K poses, 60 FPS, 416K frames); figure skating — Axel, Salchow, Toe Loop, Loop, Flip, Lutz (ice rink, 4 subjects, 86 keypoints, 12 cameras, 73K poses, 60 FPS, 700K frames). Markerless Qualisys Miqus Video system, hardware-synchronized, calibration error <1 mm. CDF comparisons show wrist/ankle/hip speeds and accelerations significantly higher than Human3.6M, MPI-INF-3DHP, and SportsPose. Videos average ~250 frames (vs 1000+ for everyday datasets).

## Method
(1) Capture + 3D reconstruct athletic motions via multi-camera markerless MoCap. (2) Benchmark SOTA 2D models (HRNet, SwinPose, ViTPose, UniFormer, MogaNet) fine-tuned from COCO pretraining (20 epochs, 1e-4→1e-5→1e-6, PDJ@0.2 normalized by shoulder-hip distance, PDJ-AUC, AP). (3) Benchmark SOTA 3D models (MotionAGFormer, TCPFormer, 81-frame input) under three training regimes: Human3.6M only, AP3D only, H3.6M+AP3D (60 epochs), evaluated with MPJPE and P-MPJPE (hip-aligned / Procrustes-aligned). (4) Kinematic validation: derive limb joint velocity and joint-angle waveforms from estimated poses (4th-order Butterworth 8 Hz zero-phase smoothing), compare against GT MoCap via paired t-test statistical parametric mapping (α=0.05) and Pearson correlation.

## Equations / assumptions
PDJ: keypoint detected if normalized distance < threshold (normalizer = shoulder-center to hip-center distance); AUC over thresholds 0.0–0.2. MPJPE (Protocol 1, hip-aligned) and P-MPJPE (Protocol 2, Procrustes rigid alignment). SPM paired t-tests on linearly interpolated kinematic waveforms; Pearson r for interpretation. Assumptions: lab-captured motions generalize to field capture; COCO-format 2D keypoint projection valid for 2D fine-tuning; 81-frame windows suffice for short athletic clips.

## Features / target
Features: monocular video clips. Targets: 2D keypoints (COCO format, face keypoints masked) and 3D joint positions (Human3.6M format, camera coordinates), plus derived kinematics (joint angles, limb velocities).

## Validation
60/20/20 train/val/test split; results reported on validation set. Kinematics validated on the test set against the MoCap ground truth.

## Exact results / baselines
**3D models fail on athletic motion without sports-specific data**: MotionAGFormer trained on H3.6M → MPJPE 257.26 mm (P-MPJPE 95.67; knee 320.39, ankle 560.23); TCPFormer H3.6M → 234.20 mm (P-MPJPE 101.80; ankle 324.96). **After fine-tuning on AP3D**: MotionAGFormer 100.12 mm / 31.84; TCPFormer 98.77 mm / 30.67 (~60% reduction). Best: H3.6M+AP3D training — TCPFormer 98.26 mm / 29.91 mm; MotionAGFormer 98.62 / 30.54.
**2D models** (validation PDJ@0.2): MogaNet 95.7 (AUC 81.7, AP 95.6), UniFormer 95.2 (AUC 80.9), ViTPose 95.0 (AUC 81.4, AP 95.8 best), SwinPose 90.7, HRNet 88.7.
**Kinematic validation** (Table 5): joint-angle correlations — 3D model: upper limb r=0.90 (p=0.001), lower limb r=0.82 (p=0.044); 2D model: 0.75 (p=0.021) / 0.66 (p<0.001). Velocity correlations: 2D 0.47 (p=0.032) / 0.45 (p=0.027); 3D 0.28 (p=0.036) / 0.11 (p=0.004). All paired t-test SPMs p<0.05 — every estimated waveform differs significantly from GT; correlations say angles carry the true trend, velocities don't.

## Code / data
Public: https://github.com/calvinyeungck/AthletePose3D — dataset, code, and model checkpoints.

## Leakage
Clean 60/20/20 split; 3D models evaluated on validation with the H3.6M-only regime acting as the out-of-domain control. No leakage concerns.

## Limitations
- Only 3 sports, 8 athletes, no team/field sports — zero football/ball-sport content; no occlusions from other players.
- Lab and ice-rink capture, not broadcast; 120/60 FPS high-speed cameras, not 25/30 FPS broadcast video.
- Velocity estimation from monocular pose is weak (r=0.11 lower limb for 3D) — motion blur and frame-rate limits likely bite harder on broadcast footage.
- Best 3D error (98 mm MPJPE) is still large for fine-grained biomechanical use; only joint angles are kinematically trustworthy.

## GSE overlap
Two GSE-relevant lessons: (1) the transfer principle — H3.6M-trained lifters collapse on athletic motion (234–257 mm), and sport-specific fine-tuning cuts error ~60%; GSE's NFL archive is exactly the kind of sport-specific corpus that makes pose models work, and this paper gives the benchmark protocol to prove it. (2) The kinematic validation methodology (SPM + Pearson on joint-angle/velocity waveforms vs MoCap) is the acceptance test GSE should run before trusting any pose-derived technique metric (throwing kinematics, tackling form) in content or products. The dataset itself (public, with checkpoints) is a ready fine-tuning source for athletic-motion pose models.

## Implementation (GSE adaptation)
Athlete-FineTune-GSE: (a) pull the public AP3D checkpoints + TCPFormer/MotionAGFormer and fine-tune on GSE-labeled NFL broadcast clips (GSE's own 2D annotations) following the paper's 81-frame / H3.6M+AP3D+domain protocol; (b) implement the kinematic validation pipeline (Butterworth 8 Hz smoothing → SPM paired t-test + Pearson vs any available MoCap/IMU ground truth from combine or practice data); (c) ship joint angles as the only pose-derived kinematics until velocity correlation clears r>0.5.

## Reproducible test
Download AP3D; reproduce Table 4's H3.6M-only vs AP3D regimes (234–257 mm → ~99 mm) with the public checkpoints; confirm the kinematic validation table (angles r≥0.8 for 3D, velocities r≤0.5).

## Numeric gate
GSE's NFL fine-tuned lifter must reach P-MPJPE ≤ 35 mm on a held-out NFL broadcast clip set (matching the paper's best 29.91 mm regime) AND joint-angle waveform correlation r ≥ 0.8 against any available ground truth before GSE uses pose-derived kinematics in any product or published analysis.

## Improvement experiment
Test whether adding broadcast-style degradations (25 FPS, motion blur, compression artifacts) to AP3D fine-tuning data closes the lab→broadcast gap: compare MPJPE on real NFL clips with/without degradation-augmented training. This is the experiment the paper didn't run but GSE needs.

## Verdict
ADAPT
