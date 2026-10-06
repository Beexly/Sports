# [0342] BlurBall: Joint Ball and Motion Blur Estimation for Table Tennis Ball Tracking (arXiv:2509.18387v3)

**Citation:** Thomas Gossard, Filip Radovic, Andreas Ziegler, Andreas Zell (2026). *BlurBall: Joint Ball and Motion Blur Estimation for Table Tennis Ball Tracking*. arXiv:2509.18387v3. URL: https://arxiv.org/abs/2509.18387v3
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 683 lines).
**Verdict:** ADAPT — the midpoint-plus-blur-vector label and blur-aware trajectory fitting are directly portable to NFL ball tracking (passes, punts, kicks), but the table-tennis detector and straight-blur assumption must be rebuilt for football geometry and broadcast cameras.

## 1. Research question
Table-tennis balls move so fast they appear as motion-blur streaks, and standard detectors label only a single "ball center," discarding the blur information. Can jointly estimating the ball position AND its motion-blur vector (orientation θ, half-length l) improve detection and downstream trajectory prediction? The paper introduces a new label (ball at the midpoint of the blur streak, plus θ and l), a blur-aware detector (BlurBall, built on WASB/HRNet with SE attention), and shows that blur vectors improve trajectory fitting.

## 2. Dataset / schema
- **New dataset:** 26 online table-tennis recordings, **64,119 frames** total. Train: 22 games, 363 clips, **51,423 frames** (displacement 18.7±16.4 px, blur ratio 0.58). Test: 4 games, 80 clips, **12,696 frames** (displacement 20.1±12.1 px, blur ratio 0.77). Blur present in 62% of frames overall; maximum blur half-length 73 px.
- Label schema: ball midpoint \(p_b\), blur orientation θ, blur half-length l; streak endpoints \(p_{1,2}=p_b\pm(l\cos\theta, l\sin\theta)\).
- Trajectory test set: 95 manually segmented trajectories for the fitting experiment.
- Public project/data: https://cogsys-tuebingen.github.io/blurball/; camera calibration supplied with the dataset.

## 3. Method / model
Label innovation: annotate the ball at the midpoint of its motion-blur streak plus the streak's orientation and half-length (endpoints reconstructed as above), instead of a single center point. Detector: WASB (HRNet backbone) with squeeze-and-excitation attention; the heatmap is trained to cover the full line blur; quality focal loss; at inference, PCA of the thresholded blob estimates the blur angle θ and the projected extent estimates the half-length l. Training: 30 epochs, Adam, batch 8, 288×512 input, d=2.5, cmin=0.7, hard-label self-mining (HLSM) from epoch 20, on an RTX 2080 Ti. Trajectory fitting: quadratic fit to the first three observations of each trajectory; compare position-only vs. position+blur-vector inputs.

## 4. Equations & assumptions
- Blur streak endpoints: \(p_{1,2} = p_b \pm (l\cos\theta,\ l\sin\theta)\), where \(p_b\) is the blur midpoint, θ the orientation, l the half-length.
- Blur-ratio and displacement statistics quoted as mean±std (e.g., train displacement 18.7±16.4 px).
- Assumptions: (1) motion blur is locally straight (the streak is a line segment) — fails at bounce/impact where the trajectory curves within one exposure; (2) the ball midpoint is the semantically correct "position"; (3) PCA of the thresholded heatmap blob recovers the true blur angle.

## 5. Features / target
Input features: RGB video frames (288×512). Targets: (1) detection — ball-present classification + heatmap over the blur streak; (2) blur parameters — orientation θ (degrees) and half-length l (pixels) per detection. Downstream target: trajectory prediction from the first three observations (position-only vs. position+blur).

## 6. Validation design
Detection: train/test split by game (22 games train / 4 games test — game-disjoint, which is good). Metrics: F1, accuracy, AP for detection; length MAE (px) and angle MAE (degrees) for blur estimation; ablations on midpoint vs. front-point labels, one-step vs. three-step, detection threshold δ=0.7, and SE attention. Trajectory: 95 manually segmented trajectories; quadratic fit on first three observations; MAE of predicted position (mean, median, upper whisker reported). No cross-dataset evaluation.

## 7. Numerical results / baselines
- Midpoint labels improved every detector: WASB steps=1 F1 front-point **95.58** → midpoint **96.00**.
- BlurBall SE, one-step: **96.52 F1, 93.47 accuracy, 98.23 AP, length MAE 1.5±1.2 px, angle MAE 6.5±18.9°**; three-step: **96.16, 92.89, 96.72, 1.6±1.2 px, 6.9±19.5°**.
- At δ=0.7, one-step: **97.17 F1, 94.75 accuracy, 97.34 AP, 1.2±1.1 px, 6.8±18.9°**.
- Trajectory fitting (95 trajectories): position-only MAE **84.4±136.6 px** vs. position+blur **53.0±87.1 px**; median **28.4 vs. 19.9 px**; upper whisker **224.6 vs. 140.2 px** — roughly a 37% mean-MAE reduction from using blur vectors.
- Limitations stated: straight-blur assumption fails at bounce; dynamic (moving) cameras increase misses; false positives on white hands/shoes/logos.

## 8. Code / data availability
Project/data: https://cogsys-tuebingen.github.io/blurball/ (stated); camera calibration included. Model code: as stated in the paper (project page is the stated artifact).

## 9. Leakage & limitations
- **Domain gap:** table tennis is a fixed-camera, small-ball, high-contrast setting. NFL footballs are larger, brown, frequently occluded, and filmed by moving broadcast cameras — the paper itself notes dynamic cameras increase misses.
- Straight-blur assumption fails at bounce — for NFL, the equivalent failure is at catch/tip/deflection points, exactly where trajectory accuracy matters most (completion probability, catch-point modeling).
- False positives on white hands/shoes/logos suggest the detector keys on small bright blobs — NFL white jerseys, yard lines, and pylon/field markings are a much harder distractor field.
- The 95-trajectory fitting test is small and manually segmented (selection bias toward clean trajectories); the huge std (±136.6 px position-only) indicates heavy-tailed errors the mean obscures.
- Angle MAE of 6.5±18.9° has enormous variance — blur orientation is unreliable precisely when the blur is short (low signal), which is when you'd most want it.
- No evaluation under occlusion, the dominant NFL failure mode.
- NFL external validity: untested on any football data; the transferable part is the label representation and the trajectory-fitting idea, not the trained detector.

## 10. GSE overlap
Per the existing-research map: GSE's tracking lane covers the 27-family NGS taxonomy, the NGS replacement spec, and STRAIN — all operating on NGS-provided tracking coordinates, i.e., downstream of ball detection. Blur-aware ball detection from video is a **new capability** (upstream perception), not a duplicate. It complements the NGS lane: better ball tracks feed every downstream metric (air distance, completion probability, catch-point models).

## 11. GSE implementation spec
- **Purpose:** improve football position/velocity estimates from broadcast video in the first frames after release (where blur is worst and velocity inference matters most for completion-probability and air-yard models).
- Data: annotate a GSE football blur dataset — 500+ pass/punt/kick clips from broadcast with midpoint+θ+l labels per the paper's schema; include bounces, tips, and occlusions as explicit hard cases.
- Model: replace the WASB/HRNet table-tennis detector with a football-tuned detector (same label schema: midpoint + blur vector); keep quality focal loss + PCA angle/extent decoding; add camera-motion compensation (estimate global motion via homography, subtract before blur estimation) to address the paper's dynamic-camera weakness.
- Trajectory fitting: replicate the quadratic-fit experiment with position+blur vs. position-only on NFL pass trajectories; feed estimated initial velocity vectors into catch-probability models.
- Serving: offline batch on film ingest; blur vectors stored alongside ball tracks with per-frame angle-uncertainty flags (given the ±18.9° variance, gate usage on blur length, not angle, when blur is short).
- Estimated effort: 5–7 engineer-weeks (annotation tooling + dataset + detector retrain + trajectory eval).

## 12. Reproducible test
Dataset: 300 NFL pass plays (2024 season) with broadcast video and NGS ball tracking as ground truth; annotate blur midpoint/θ/l on the first 5 frames post-release. Metric: (a) detection F1/AP vs. a center-point-only baseline detector; (b) trajectory-fit MAE at the catch point using position-only vs. position+blur from the first three observations, vs. NGS ground truth. Baseline: the same detector trained on center-point labels. Window: one season sample, offline.

## 13. Acceptance / rejection gate
**Adopt** the blur-label schema if the blur-aware detector beats the center-point baseline by ≥2 F1 points on the NFL test set AND position+blur trajectory fitting reduces catch-point MAE vs. NGS ground truth by ≥25% relative to position-only. **Reject** if detection gains don't transfer (dynamic-camera/occlusion collapse), if angle MAE variance makes blur vectors unusable (angle std > 15° on the NFL set), or if the trajectory gain is <25% — the paper's 37% was on clean manual trajectories.

## 14. Improvement experiment
Handle the bounce/deflection failure directly: train a piecewise trajectory model that detects blur-direction discontinuities (the signature of a bounce or tip) and fits separate quadratics per segment, using the blur vector as a bounce detector rather than discarding those frames. Test whether discontinuity-aware fitting beats the paper's single-quadratic fit on tipped/bobbled NFL passes — the exact frames where completion-probability models are most uncertain.
