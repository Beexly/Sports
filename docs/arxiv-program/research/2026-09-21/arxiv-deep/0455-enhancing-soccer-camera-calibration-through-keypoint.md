# [0455] Enhancing Soccer Camera Calibration Through Keypoint Exploitation (arXiv:2410.07401v1)

**Citation:** Falaleev, N.S., Chen, R. (2024). *Enhancing Soccer Camera Calibration Through Keypoint Exploitation*. Proc. 7th ACM MMSports '24 (Melbourne). DOI: 10.1145/3689061.3689074. arXiv:2410.07401v1. URL: https://arxiv.org/abs/2410.07401v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML→text extract, 916 lines, incl. references).
**Verdict:** REJECT — broadcast-video camera calibration for soccer analytics; no transferable mechanism to GSE's tabular probabilistic engine. GSE has no video-ingest lane and does no player tracking, offside detection, or pose estimation from footage.

## 1. Research question
Broadcast camera calibration for soccer analytics (mapping 2D broadcast frames to 3D pitch coordinates for tracking/offside/speed analytics) suffers from point-pair scarcity: few accurate 2D↔3D correspondences per frame. Can accuracy be improved by (a) massively increasing usable keypoints from pitch geometry (line-line and line-conic intersections, conic tangent points, points on conics) and (b) a heuristic "voter" algorithm that iteratively selects the most reliable keypoint subsets for calibration?

## 2. Dataset / schema
SoccerNet-Calibration-2023: 25,506 images at 960×540 px from 500 games, with field-marking annotations (camera-independent semantic points on pitch markings, per Magera et al. 2024) — the largest public football broadcast calibration dataset. Train/valid/test splits; a private challenge split on eval.ai for independent verification. No sports-betting or tabular data.

## 3. Method / model
Multi-stage pipeline:
1. **Point detection**: HRNetV2-w48 backbone, heatmap regression, 57 landmark keypoints per pitch — 30 line-line intersections (two-stage line-fitting from annotation polylines, coarse→refined near the intersection), 6 line-conic intersections (Halíř–Flusser least-squares ellipse fitting, analytic ellipse–line intersection), 8 conic tangent points (tangent lines from a known external pitch point to the fitted ellipse; projective tangency is preserved), 13 extra structural points (9 along the longitudinal axis + 4 quarter-turns on the centre circle, projected via a homography from the fitted subset). Gaussian peaks σ=3px; MSE then Adaptive Wing Loss fine-tune; Adam, LR 0.001 halved after 8 stagnant epochs.
2. **Line detection**: same backbone, 23 heatmap channels (one per pitch line), two extremity peaks per line (orderless), σ=4px; decoded to line equations, enabling intersection points even beyond the frame boundary.
3. **Calibration**: OpenCV 4.7 `calibrateCamera` pinhole model (zero astigmatism/distortion, principal point fixed at frame centre); "OpenCV Multiplane" variant adds two vertical goal planes (crossbars off the ground). **Iterative Voter**: repeat calibration over keypoint subsets (all keypoints / line-line only / RANSAC-filtered 5px / ground-plane only; multiplane vs. standard), thresholds tuned with Optuna on the valid split, fuse line-model intersections when keypoints are insufficient, discard camera sets failing sanity heuristics (below ground, >100m high, >250m from pitch centre, focal length outside [10, 20000] px); final set chosen by lowest pitch-pattern reprojection RMSE (<5px prefers the all-points solution).
Left-right pitch ambiguity resolved by remapping so the goal area nearest the camera is the "left" side.

## 4. Equations & assumptions
- Acc@t = TP@t / (TP@t + FN@t + FP@t), t = 5 px (polylines matching; eq. 1). Score = Acc@5 × CR (completeness ratio; eq. 2).
- Halíř–Flusser direct least-squares ellipse fitting; analytic ellipse–line intersection; tangent-from-external-point construction.
Assumptions: pinhole camera, fixed principal point, zero distortion (lens distortion explicitly disregarded in tangent-point computation; distortion-parameter optimization was tried and *reduced* accuracy); known real-world pitch dimensions; left-right remapping convention consistent across train/inference.

## 5. Features / target
Inputs: broadcast video frames. Targets: 57 keypoint heatmaps + 23 line heatmaps; derived camera intrinsic/extrinsic parameters. Evaluation target: Score = Acc@5 × CR.

## 6. Validation design
Challenge test split (private, eval.ai) plus local valid/test splits. Metrics: Acc@5 (polyline overlap at 5px), completeness ratio CR, Score, and raw L2 keypoint error. Ablations: keypoint subsets (Table 1, valid split); calibration algorithms (Table 2, test split); Top-5 challenge leaderboard (Table 3). Baselines: OpenCV reference, OpenCV Multiplane, Voter, Iterative Voter, challenge baseline (DeepLabv3 segmentation + extremities), competitors (ikapetan, BPP, SAIVA Calibration, Spiideo). Optuna-tuned confidence thresholds on valid split only.

## 7. Numerical results / baselines
- Keypoint subsets (valid, 3-plane calibration): intersections only → L2 4.46px, Acc@5 0.7711, CR 0.6034, Score 0.4653; +tangent → L2 4.79, Acc@5 0.7527, CR 0.6731, Score 0.5067; +extra → L2 4.89, Acc@5 0.7446, CR 0.7245, Score 0.5395 (extra points hurt raw accuracy but win on completeness).
- Calibration algorithms (test): OpenCV ref Score 0.5297; Multiplane 0.5484; Voter 0.5566; Iterative Voter 0.5630; Iterative Voter + Lines 0.5638 (final submission).
- **Challenge 2023 leaderboard**: 1st "Our" — Acc@5 0.7322, CR 0.7559, **Score 0.5535**; 2nd Spiideo 0.5293; 3rd SAIVA 0.5262; 4th BPP 0.5014; 5th ikapetan 0.4287; baseline 0.0833. Substantial margin.
- Speed: 44.1 ms/image (batch 1) / 3.1 ms (batch 128) point model on RTX 3090; line model 33.6 ms/image.

## 8. Code / data availability
Code: https://github.com/NikolasEnt/soccernet-calibration-sportlight. Data: SoccerNet-Calibration-2023 (public).

## 9. Leakage & limitations
- The strongest accuracy contributor (intersections only, Acc@5 0.7711) is also the least complete; the final Score is driven by heuristic engineering (voter, Optuna thresholds, sanity filters) as much as by the learned model.
- Zero-distortion pinhole assumption; distortion fitting *hurt* — real broadcast lenses are distorted, so generalization to heavy wide-angle broadcast cameras is untested.
- Soccer-specific pitch geometry; nothing transfers to American-football fields without re-deriving the keypoint set (different markings, no centre circle).
- Left-right remapping is a dataset convention hack; fails silently if mis-applied.
- Single-frame calibration; temporal stability across frames explicitly left to future work (flicker risk in tracking).
- **No transfer path to GSE**: the engine consumes tabular tracking/statistical data, not broadcast video; there is no video-ingest, annotation, or homography lane in GSE, and building one is out of scope for a betting-picks product (cf. memory: NFL content operation uses real footage only for short transformative clips, never as a data source).

## 10. GSE overlap
**No overlap — out of domain.** The existing-research map contains no computer-vision/camera-calibration work; GSE's data lanes are statistical (nflverse, NGS tracking as data, odds feeds). The only conceivable shared idea is "voter ensembles over heuristic subsets," which is generic robust-estimation practice, not a transferable mechanism. Not a duplicate, extension, or capability — it belongs to a different product (broadcast analytics), not a betting engine.

## 11. GSE implementation spec
None — rejected. If GSE ever built a video lane (not planned), the transferable fragment would be: heatmap keypoint detection on field markings + RANSAC/voter subset selection with reprojection-RMSE voting, re-derived for NFL field markings.

## 12. Reproducible test
N/A (rejected). A validation would require: SoccerNet-Calibration-2023 frames → run the authors' public code → reproduce Score ≈ 0.5535 on the test split; then re-derive keypoints for an NFL field and measure Acc@5. Not undertaken: no GSE lane consumes this output.

## 13. Acceptance / rejection gate
**Rejected at triage.** Gate that would reverse this: GSE commissions a broadcast-video analytics product (tracking from footage, automated telestration) — at which point revisit for the NFL-field adaptation. Until then, no action.

## 14. Improvement experiment
Within its own domain: replace the zero-distortion pinhole assumption with a learned radial-distortion model fit jointly with the voter selection, and add temporal smoothing across frames (both flagged as future work by the authors) — expect the Acc@5 of the intersections-only subset to carry over to wide-angle broadcast cameras without the CR collapse. Not a GSE experiment.
