# [0376] Metamorphic Testing for Pose Estimation Systems (arXiv:2502.09460v1)

**Citation:** Matías Duran, Thomas Laurent, Ellen Rushe, Anthony Ventresque (2025). *Metamorphic Testing for Pose Estimation Systems*. arXiv:2502.09460v1. URL: https://arxiv.org/abs/2502.09460
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5018 lines, through references).
**Verdict:** ADAPT — a cheap, label-free QA protocol for any pose estimator GSE deploys (jersey-pose, tackle-pose, All-22 skeleton lanes). Adopt the rule taxonomy and severity metric directly as regression tests before trusting pose features in production.

## 1. Research question
Can pose estimation systems be systematically tested without manual keypoint labeling (the oracle problem), using metamorphic rules — input transformations with known expected output relations — and does such testing find as many or more faults than classic ground-truth-based testing?

## 2. Dataset / schema
- **PHOENIX** (sign-language recognition): 947,756 video frames, German weather forecasts; controlled environment (plain background, black clothing); no ground-truth keypoints. Used dev subset: 55,775 images.
- **FLIC** (human pose benchmark): 4,552 movie frames, uncontrolled environments; ground-truth 11 keypoints via Amazon Mechanical Turk. Used test subset excluding FLIC-full: 835 images.
- **SUT:** MediaPipe Holistic (BlazePose GHUM 3D) — face (468), hands (21 each), body (33 landmarks); run in static-image mode (verified deterministic via Id rule).

## 3. Method / model
**MeT-Pose framework:** each metamorphic rule ℳ = (ℳ.trans, ℳ.rel). Apply trans to test image, run SUT on both images, check rel; return violation (yes/no) + severity. Rule families:
- **Spatial:** Id (determinism check), Stch (stretch h,w — expect same relative coords), Mirr (horizontal/vertical/both mirror), Rot (rotation ω about center c).
- **Image quality:** Res (downscale factor <1), Gamma γ, Bright (a+m·v), Bilat (bilateral filter str/size — tests texture over-reliance, after Geirhos et al.), Motion (motion blur kernel size/direction). Relation: keypoints unchanged.
- **Colour-space:** Grey, CWheel (hue rotation θ), Cchans (per-channel scaling in RGB/BGR/XYZ), Flt(rule,zone) — filtered variants applying the transform only to skin/clothes/hair/background, Cfill (solid colour fill of a zone).
- **Violation metric** Err_lmks: ∞ if landmarks detected on only one of the pair; 0 if on neither; else **median** of per-landmark L2_MP distance (Euclidean normalized per MediaPipe model cards: shoulder distance for body, iris distance for face, wrist–middle-finger-joint distance for hands). Test passes iff Err_lmks < t_err. Median chosen to attenuate outlier keypoints.

## 4. Equations & assumptions
- Rule: img_mod = ℳ.trans(img_orig); rel: O(img_orig) ↔ O(img_mod) property (identity or geometric transform).
- Pass criterion: Err(O_expected, O_mod) < t_err.
- Subsumption rate: SubRate(ℳ1,ℳ2) = #(images violating both) / #(violating ℳ1), or 1 if ℳ1 never violated.
- Stated assumptions: transformations don't change which landmarks *should* be detected (only positions); static-image mode determinism; both-empty detection is coherent (no violation), though on these datasets empty = a fault outside the rule scope; threshold must be user-set per application (no "correct" global t_err).

## 5. Features / target
Input: unlabeled test images + rule set. Target: violation flags + severities per (image, rule), aggregated to failure rates, subsumption matrices, per-rule fault counts.

## 6. Validation design
Three RQs: RQ1 (does it find faults? fault rate vs threshold, three rule sets: AllRels, SubRels, {Grey, Mirr_h}); RQ2 (FLIC only, vs classic GT testing: 2.1 fault counts, 2.2 same images?, 2.3 error magnitudes); RQ3 (3.1 rule subsumption via SubRate matrices at t_err=0.2; 3.2 fault-type diversity via count of rules violated per image).

## 7. Numerical results / baselines
- **RQ1:** MeT-Pose finds many violations; rate depends strongly on threshold and rule set. Body landmarks, t_err=0.2 (% images with ≥1 violation): AllRels — PHOENIX 66.35, FLIC 83.83; SubRels — PHOENIX 25.08, FLIC 61.44; {Grey, Mirr_h} — PHOENIX 0.01, FLIC 43.11. Infinite errors (detected on one image only) persist even at high thresholds — always violations. Hand landmarks (PHOENIX, Mirr_h/Grey) expose far more faults than body landmarks — the rule/landmark subset must match the use case.
- **RQ2 (FLIC):** at very low thresholds both methods flag nearly everything (oversensitive); at higher thresholds MeT-Pose finds **more** failures than classic testing (e.g., SubRels at t_err=0.2: MeT-Pose-only ≈ 76.6% of the stacked failures vs classic-only ≈ 19.9%; at t_err=2.0 classic-only ≈ 44.1% vs MeT-Pose-only ≈ 44%...). Paper's stated answers: RQ2.1 — overall MeT-Pose finds more failures; RQ2.2 — partial overlap, each finds failures the other misses; RQ2.3 — MeT-Pose finds *larger* errors (classic testing misses big failures that metamorphic pairs catch).
- **RQ3:** subsumption matrices (Fig 7, t_err=0.2) are strongly dataset-dependent — rules are not redundant across domains. Motion-blur settings don't nest intuitively (stronger blur does not cleanly subsume weaker blur), attributed to Holistic's nonlinear behavior. Table II: at reasonable thresholds most violating images fail only a small number of rules → different rules expose different fault types.
- Threats (§VIII) honestly addressed: median vs mean aggregation, single-rule vs multi-rule counting, and rule-scope choices all change results; external validity limited to Holistic; DL models evolve fast.

## 8. Code / data availability
Companion repository: https://github.com/MatoFD/MeT-Pose. Datasets PHOENIX/FLIC public. No code verified by this reader (no network).

## 9. Leakage & limitations
- Violation ≠ ground-truth error: a metamorphic failure means *one* of the two outputs is wrong, but which is unknowable without labels — severity ranking is heuristic.
- Threshold is the entire game: at t_err→0 everything fails, at ∞ only detection-dropouts fail; no principled way to set it without GT data — which partly defeats the "no labels" claim for calibration (though a small labeled pilot fixes this).
- Both-empty detection is scored 0 (coherent) even though it's a fault on these datasets.
- Results are Holistic-specific; generalization to other pose systems claimed by design (black-box) but not tested.
- Rule configurations (e.g., which blur kernels) were partly pruned to avoid "artificially high error rates" — some experimenter degrees of freedom in SubRels.
- NFL relevance: pose estimators on football film face motion blur, low resolution, occlusions, unusual body angles — exactly the paper's quality/spatial families. Limitation: landmarks here are human-pose (face/hands); football needs sport-specific keypoints, so relations must be re-derived (e.g., jersey-number visibility under rotation is a valid relation; shoulder-pad occlusion is not testable by these rules).

## 10. GSE overlap
New capability — no pose-estimation lane in the research map. Directly upstream of papers 0369/0370 (this wave, multi-person physics-based pose; unconstrained 2D pose) and the video-tracking trio 0374/0375/0371: any GSE pose model (tackle form, QB mechanics, route-running skeletons) needs exactly this kind of label-free regression suite before its outputs feed EPA/prop models. Cite as the QA standard for a future pose lane.

## 11. GSE implementation spec
When GSE first deploys a pose estimator on NFL film: (1) port the MeT-Pose rule taxonomy — Id, Mirr_h (left/right-handed QBs), Rot ±10°, Res {0.5,0.7}, Gamma {0.5,1.5}, Motion {blur kernels matching broadcast 24fps motion}, Grey — with expected relations defined per keypoint group; (2) adopt Err_lmks with median aggregation and shoulder-normalized L2; (3) run on 500–1,000 unlabeled All-22/broadcast frames; (4) hand-label a 50-frame pilot to calibrate t_err (one-time cost, then the suite runs label-free); (5) gate any model version on "zero infinite-errors and <5% violation rate at calibrated t_err." Effort: 1–2 weeks once a pose model exists. The framework is model-agnostic — it survives architecture swaps.

## 12. Reproducible test
Clone https://github.com/MatoFD/MeT-Pose; run on the FLIC test subset (835 images) with MediaPipe Holistic, rule set {Grey, Mirr_h}, body landmarks; verify violation rates match Fig 4c (e.g., ≈43% at t_err=0.2, ≈0% for PHOENIX at t_err≥0.1). Without their code: implement Id + Mirr_h + Grey on any pose estimator over 100 unlabeled images and confirm (a) Id yields zero violations (determinism), (b) Mirr_h violations concentrate on asymmetric poses — the paper's concept-understanding probe.

## 13. Acceptance / rejection gate
ADOPT MeT-Pose as the mandatory pre-deployment QA gate for any GSE pose estimator if the pilot shows the suite catches ≥80% of the faults found by a 50-frame hand-labeled GT test while requiring no additional labels; REJECT as the *sole* QA method regardless — it must complement, not replace, a small labeled benchmark, because a violation never identifies which of the two outputs is wrong.

## 14. Improvement experiment
Add a temporal-consistency rule family the paper omits: for video pose (not static images), consecutive frames should produce keypoint trajectories with bounded velocity — flag frames where any keypoint's frame-to-frame displacement exceeds a sport-specific percentile (e.g., 99th percentile of per-keypoint speed from clean data). This catches jitter/dropout faults that static metamorphic pairs miss and is directly applicable to All-22 tracking, where temporal smoothness is the cheapest oracle available.
