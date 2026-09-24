# [0479] A Two-point Method for PTZ Camera Calibration in Sports (arXiv:1801.09005v1)

**Citation:** Jianhui Chen, Fangrui Zhu, James J. Little (2018). *A Two-point Method for PTZ Camera Calibration in Sports*. arXiv:1801.09005v1. URL: https://arxiv.org/abs/1801.09005v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 41,439 chars).
**Verdict:** REJECT — pure computer-vision broadcast-camera calibration with no transfer path to NFL pick/spread/total modeling.

## 1. Research question
How can pan-tilt-zoom (PTZ) broadcast cameras be calibrated in sports video when the field of view is narrow and fewer than four field-marking correspondences are visible (so classic 4-point homography annotation fails)? The paper proposes (a) a two-point annotation algorithm that uses prior knowledge of the PTZ camera's fixed base location/orientation, and (b) a "pan-tilt forest" (random forest regressing pan/tilt angles from SIFT patch descriptors) to calibrate new images without image-to-image feature matching. Demonstrated on soccer broadcast video.

## 2. Dataset / schema
- **Highlights dataset** (from public soccer highlights dataset [23]): 4 image sequences from 2 professional soccer games (2 sequences/game), 1280×720 @ ~6 FPS, 116 frames total. Ground truth camera parameters manually calibrated (two-point method used for frames with <4 correspondences; checked by projecting the field model into images and warping to top view).
- **World Cup dataset** (from Homayounfar et al. [16], World Cup 2014, originally 20 games): 2 games (BRA vs. MEX, 42 images; BRA vs. NED, 33 images) selected because they have enough images to cover the whole stadium and the fixed-PTZ-base assumption holds. Ground truth via manual annotation.
- **Synthetic dataset**: camera base from the highlights dataset (camera at right corner of field); pan ∈ [15°,75°], tilt ∈ [−14°,−5°], focal length ∈ [1500,5000]; 200 sampled rays per camera, ~90% projected off the field; Gaussian feature-location noise added; 100 cameras × 100 repeats.
- Schema per frame: pan, tilt, focal length (ground truth), plus (for training) SIFT-descriptor → (pan,tilt) ray pairs. Public provenance noted but the calibrated ground-truth annotations are the authors' own (released via code link); the World Cup 2014 source set is request/research access.

## 3. Method / model
Camera modeled as pinhole: **P = K Q_φ Q_θ · S[I|−C]** where C is camera center, S is base rotation (time-invariant prior), Q_θ/Q_φ pan/tilt rotations, K intrinsic with square pixels and principal point at image center (focal length f only unknown). Three steps: (1) focal length solved from two points via the image-of-absolute-conic quadratic (Gedikli et al. [11]); (2) initial pan/tilt from a single point via closed-form quadratic in tan(pan) (Li et al. [19]); (3) Levenberg-Marquardt refinement of reprojection error over both points. For new images: pan-tilt forest = random forest (5 trees, max depth 20, info-gain split criterion on angular variance) regressing SIFT patch descriptors → pan/tilt ray labels; outlier rejection by feature-distance threshold ‖x̄_l − x‖²₂; pose optimization min Σ‖p_i − P(r̂_i)‖² with RANSAC (2-point minimal set → 16 iterations at 99% success, 50% outliers, vs 71 for 4-point). Baselines: CalibMe [6] (reference-image method) and SIFT-vs-SURF ablation.

## 4. Equations & assumptions
- (1) **P = KQ_φQ_θ · S[I|−C]** (PTZ part · prior part).
- (2) **p = P(r) = [f·tan(θ_p − θ) + u, f·tan(φ_p − φ) + v]ᵀ** — pixel location from pan/tilt ray.
- (3) cos α = (d₁ᵀd₂)/(√(d₁ᵀd₁)√(d₂ᵀd₂)) = **x₁ᵀωx₂ / (√(x₁ᵀωx₁)√(x₂ᵀωx₂))**, ω = K⁻ᵀK⁻¹ (image of absolute conic) — used to solve for focal length; expands to quadratic in f², eq. (9) in appendix 6.1.
- (4–5) Forest regression target: **r̂_p = h(x_p)**; label **r_p = [θ + arctan((x−u)/f), φ + arctan((y−v)/f)]ᵀ**.
- (6–7) Split info gain: **E(S_n,θ) = Σ_{(x,r)∈S_n}(r−r̄)² − Σ_{j∈{L,R}} Σ_{(x,r)∈S_n^j}(r−r̄)²**.
- (8) Pose optimization: **{θ,φ,f} = argmin_P Σ_i ‖p_i − P(r̂_i)‖²**.
- Appendix 6.2 derives closed-form single-point pan/tilt: quadratic **a·t_p² + b·t_p + c = 0** in t_p = tan(pan) with a = (V²+1)Z² − U²(X²+Y²), b = −2XZ(U²+V²+1), c = (V²+1)X² − U²(Y²+Z²); tilt from eqs. (13–14).
**Assumptions:** camera base location/orientation fixed and known (tolerance-bound); square pixels, principal point at image center; no lens distortion (listed as a limitation); focal length the only intrinsic unknown.

## 5. Features / target
- **Inputs:** SIFT descriptors of local image patches (SIFT vs SURF ablated; binary LATCH suggested for speed); the two-point method takes 2 human-annotated 3D↔2D point correspondences (field-marking intersections/penalty marks).
- **Targets:** per-patch pan/tilt ray angles (θ_p, φ_p); at image level: camera pose (pan θ, tilt φ, focal length f).
- **Label definition:** ray labels computed analytically from ground-truth pose via eq. (5); ground-truth poses from manual annotation.

## 6. Validation design
- Synthetic: noise-sweep experiments over feature-location σ, camera-base-location uncertainty, camera-base-rotation uncertainty (100 cameras × 100 repeats).
- Highlights: leave-one-sequence-out cross-validation (train on 3 sequences, test on 4th). World Cup: 50/50 train/test split per game.
- Metric: IoU between field area warped to top view by ground-truth vs estimated camera; plus rotation (°) and focal-length (px) error distributions.
- Baseline: CalibMe [6], with 3–5 manually selected reference images per sequence. Splits are image-level, not time-ordered; no backtesting framing (vision paper).

## 7. Numerical results / baselines
- **Highlights dataset (mean IoU ± std):** ours 0.83±0.16 vs CalibMe 0.68±0.30; per sequence: Seq1 0.88±0.06 vs 0.75±0.22; Seq2 0.81±0.21 vs 0.73±0.27; Seq3 0.69±0.36 vs 0.61±0.37; Seq4 0.94±0.04 vs 0.62±0.33 (Table 2). Speed: 0.3 s/frame (0.2 s SIFT + 0.1 s prediction/optimization) vs 3.0 s/frame for CalibMe.
- **World Cup dataset:** ours 0.99±0.01 (BRA–MEX) and 0.98±0.01 (BRA–NED) vs CalibMe 0.84±0.24 and 0.69±0.37 (Table 3).
- **Synthetic:** at σ = 3.0 px feature noise, mean rotation error < 0.02° and mean focal-length error < 2.5 px (Fig. 5b); robust to base-location uncertainty, sensitive to base-rotation uncertainty (errors propagate from prior to PTZ part); 100-px focal error ≈ 3.2% of ground truth.
- >85% of real images have rotation error < 1° (Fig. 7).
- Feature-distance thresholding: inlier rate (angular error < 0.5°) 0.33 vs 0.09 without threshold; mean IoU 0.83 vs 0.53 (Table 4). SURF instead of SIFT drops mean IoU 0.83 → 0.74. ~5 trees suffice (Fig. 9).
- Narrow FOV (< ~25°) still causes failures (IoU < 0.6 red crosses in Fig. 8); FOV > ~40° has zero failures in these datasets.

## 8. Code / data availability
Code: https://github.com/lood339/two_point_calib (stated, "available online"). Data: ground-truth annotations collected by the authors (released with code per paper); underlying World Cup 2014 set from Homayounfar et al. and the public highlights dataset — access as per originals.

## 9. Leakage & limitations
- **Domain mismatch, not leakage:** this is a supervised-annotation pipeline, not a prediction problem; no train/test leakage concern beyond CV splits (image-level splits within same games risk overstating generalization to new stadiums, but base params are game-specific by design).
- **Stated limitations:** fixed-known camera base fails when bases change game-to-game; no lens-distortion model; real-valued descriptors expensive; narrow FOV (<25°) still produces failures; sequence 3's wide pan range uncovered by training data hurt IoU.
- **External validity to NFL:** essentially none. The method needs calibrated PTZ-base priors and field-marking correspondences for homography estimation — useful for broadcast tracking pipelines (e.g., SPORTLOGiQ-style player tracking), not for win/spread/total probability modeling. No transfer path to GSE's pick engine.

## 10. GSE overlap
Checked against `existing-research-map.md`: no camera-calibration / computer-vision lane exists in Garrett's corpus — the entire map is metrics, state-space models, calibration/uncertainty of probabilities, market microstructure, and NGS tracking-data taxonomy (which uses vendor-supplied tracking, not in-house broadcast calibration). Not a duplicate; it's simply outside the program's scope. The two-point method + RANSAC minimal-set efficiency is a vision engineering trick, not a probability-modeling method.

## 11. GSE implementation spec
None proposed — there is nothing to implement for GSE's NFL prediction engine. If a future GSE video-content operation ever wanted automated broadcast-camera registration (e.g., telestration overlays on real game footage), this would be the starting reference (estimated effort: 2–3 weeks for a prototype on open soccer data). That lane is not active (GSE's video rule requires real footage edits for highlights, not camera estimation), so no build is recommended.

## 12. Reproducible test
Not applicable — no sports-outcome prediction, so no prediction benchmark exists. If a future video lane needs it, the reproducible test is: replicate Table 2 on the public World Cup 2014 set, target mean IoU ≥ 0.95 on BRA–MEX/BRA–NED with ≤ 0.5 s/frame.

## 13. Acceptance / rejection gate
REJECTED at triage-of-purpose: accept would require a demonstrated prediction-task use, which the paper does not claim. Gate closed — no further testing.

## 14. Improvement experiment
If a GSE broadcast-video lane ever opens: replace the SIFT random forest with a learned per-patch regression network (per the paper's own LATCH suggestion) trained on synthetic NFL field renderings, and jointly optimize lens distortion (their cited fix [17]) — hypothesize this closes the sub-25° FOV failure mode and beats 0.83 mean IoU on NFL broadcast angles.
