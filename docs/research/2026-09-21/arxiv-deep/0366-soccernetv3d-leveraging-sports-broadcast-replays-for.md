# [0366] SoccerNet-v3D: Leveraging Sports Broadcast Replays for 3D Scene Understanding (arXiv:2504.10106)

**Citation:** Gutiérrez-Pérez, M., Agudo, A. (2025). *SoccerNet-v3D: Leveraging Sports Broadcast Replays for 3D Scene Understanding*. arXiv:2504.10106. URL: https://arxiv.org/abs/2504.10106
**Ledger completed:** 2026-09-21. **Read:** full text (text extract, 1520 lines).
**Verdict:** ADAPT — the triangulation-from-broadcast-replays pipeline (PnLCalib field-line calibration → multi-view sync → reprojection-error-filtered triangulation → ball-size-prior bounding-box optimization) is a directly reusable recipe for turning ordinary broadcast footage into 3D annotations without wearables or multi-camera rigs; the datasets and baselines are soccer-only, but the *method for minting 3D ground truth from existing video* is the transferable asset. The headline engineering number: bounding-box optimization cut size error 19.01%→7.27% and lifted AP@0.5 0.65→0.81, which collapsed 3D MAE from 15.3 m to 0.81 m.

## 1. Research question
Can high-quality 3D ball-localization annotations be generated for soccer broadcast video — where no public dataset provides 3D ball ground truth — by synchronizing broadcast main-camera and replay frames, calibrating each view from field lines, triangulating 2D ball annotations, and using the 3D result to refine the 2D bounding boxes; and how well does a monocular 3D ball-localization baseline (2D detection + calibration + known ball diameter) perform on the resulting benchmarks?

## 2. Dataset / schema
- **SoccerNet-v3D** (new): 4,051 images with 3D ball annotations, train 3,240 / test 811; derived from SoccerNet-v3 (33,986 images, 12,764 main+replay multi-view systems) by PnLCalib calibration (JaC_0.5% > 0.75 → 4,297 calibrated systems; ≥1 m camera displacement filter; ball visible in multiple views) → 4,051 final. Diverse viewpoints, no temporal dimension.
- **ISSIA-3D** (new): 10,544 images, train 8,686 (cameras 3–6) / test 1,858 (cameras 1–2); from ISSIA (six static synchronized cameras, 25 FPS, 1920×1080, 2-min sequence) with manually added field-line annotations; all six cameras satisfy JaC_0.5% > 0.75. Includes temporal dimension → 3D ball tracking. Ball visible in ≥2 of 6 cameras (pairs overlap, not all six).
- Code: https://github.com/mguti97/SoccerNet-v3D.

## 3. Method / model
1. **Multi-view system generation**: pair broadcast main-camera frame with synchronized replay frames; estimate projection matrices P^c ∈ R^(3×4) via PnLCalib — an optimization pipeline over a 3D field model + keypoint grid from SoccerNet-v3 field-line annotations, with a PnL refinement over keypoints+lines.
2. **Calibration quality metric**: Jaccard index for camera calibration JaC_γ = TP_γ/(TP_γ+FN+FP) (Eq. 3), where a pitch segment is TP iff every point of the polyline reprojects within γ (% of image diagonal) of its annotation; computed at γ ∈ {0.5, 1, 2}%.
3. **3D ball localization by triangulation**: p = (1/N)Σ_{i,j}(p_ij | e_ij < τ) (Eq. 4) — average pairwise-triangulated positions with reprojection error e_ij below threshold τ; parallax-angle β caveat noted (small parallax → high uncertainty despite low reprojection error).
4. **Bounding-box optimization**: given 3D ball position p and calibration {K,R,t}, solve argmin_d ‖p − R^⊤ (φ p_c)/‖p_c^+(d) − p_c^−(d)‖ − t‖ (Eq. 8) — varying pixel diameter d walks the 3D ray to the labeled position; optimal d_opt sets the box centered on the ray with width/height = d_opt. Applied to SoccerNet-v3 boxes and to generate boxes from ISSIA's single-point annotations.
5. **Baseline**: YOLOv11-l 2D detection (YOLO_base trained on SoccerNet-v3; YOLO_opt fine-tuned on optimized boxes; YOLO_ISSIA fine-tuned on generated boxes) + PnLCalib calibration + monocular 3D from ball-size prior p = R^⊤ φ p_c/‖p_c^+ − p_c^−‖ + t (Eq. 7), following Van Zandycke & De Vleeschouwer 2022.

## 4. Equations / algorithms
- Camera model: P = KR[I|−t] ∈ R^(3×4) (1); K = [[α_x, s, x_0],[0, α_y, y_0],[0,0,1]] (2).
- Calibration metric: JaC_γ = TP_γ/(TP_γ + FN + FP) (3), TP iff ∀p∈s: min d(p,ŝ) < γ.
- Triangulation fusion: p = (1/N) Σ_{1≤i,j≤C} (p_ij | e_ij < τ) (4).
- Monocular rays: p_c = K^−1 [p̄_x, p̄_y, 1]^⊤ (5); p_c^± = K^−1 [p̄_x, p̄_y ± d/2, 1]^⊤ (6); 3D position p = R^⊤ (φ p_c)/‖p_c^+ − p_c^−‖ + t (7), φ = true ball diameter in meters.
- Box optimization: argmin_d ‖p − R^⊤ φ p_c/‖p_c^+(d) − p_c^−(d)‖ − t‖ (8), solved by local minimization (Press et al. 1989).

## 5. Key results
- **Bounding-box optimization (Table 1, vs ~10% manually re-annotated):** IoU 0.57→**0.66**; size error 19.01%→**7.27%** of annotated diagonal.
- **SoccerNet-v3D test (Table 2, oracle calibration):** YOLO_opt AP@0.5 **0.81** vs YOLO_base 0.65; MAE_m **0.81 m** vs 15.3 m; MAE_% 5.5 vs 18.3; P_2m **0.30** vs 0.03. With PnLCalib (non-oracle) calibration: MAE_m 4.2 m, P_2m 0.26 — calibration error degrades results only modestly.
- **ISSIA-3D test:** YOLO_base AP@0.5 0.04 (total failure — SoccerNet-trained detector does not transfer to ISSIA's static-camera distribution); YOLO_ISSIA (trained on generated boxes) AP@0.5 **0.65**, MAE_m 4.2 m, MAE_% 4.8, P_2m 0.35.
- **Sensitivity (Fig. 6, 100 samples):** 3D error is *highly sensitive to ball size*: ±10% pixel-size variation → **6–14 m error**, growing with camera distance; center position far less sensitive (±2% diagonal shift → 0.6–1.6 m). This justifies the whole box-optimization enterprise: size error dominates 3D error.
- **Parallax/displacement filter:** replay views too close to the main camera (< 1 m displacement) discarded as unreliable triangulation.

## 6. Strengths
First public 3D ball-localization annotations for soccer, generated without any new capture hardware — purely by mining existing broadcast + replay footage. The pipeline is principled end-to-end: field-line calibration with a quality gate (JaC_γ), reprojection-error-filtered triangulation with an explicit parallax caveat, and a closed-loop box optimizer that enforces 2D/3D consistency. The sensitivity analysis (size vs position) is the kind of error-budget analysis that makes the engineering decision obvious. Full code release. Honest cross-distribution failure (YOLO_base → 0.04 AP on ISSIA) with a constructive fix (generate boxes, retrain).

## 7. Limitations / threats to validity
- Soccer-only; American-football broadcast geometry (different field markings, ball shape/prolate spheroid, heavier occlusion) untested. A football is not a sphere — the ball-diameter prior (Eq. 7) needs re-derivation for a prolate spheroid with unknown orientation.
- Monocular 3D errors remain large in absolute terms (MAE_m 0.81 m best case, 4.2 m with estimated calibration) — fine for tactical zones, not for officiating-grade localization.
- No temporal model despite ISSIA-3D having video; baselines are per-frame.
- PnLCalib requires a minimum keypoint count and fails on fisheye/goal-camera shots — coverage gaps in exactly the views (behind-goal) that matter for some analyses.
- Replay/main-camera sync errors are filtered heuristically; the 1 m displacement threshold is ad hoc.

## 8. Implementation spec (how GSE would apply it)
1. Replicate the **annotation-mining pipeline** for NFL: field-line/yard-line-based camera calibration on broadcast + replay (All-22/coaches' film gives better multi-view geometry than broadcast replays), triangulate ball annotations, optimize bounding boxes with a **football-appropriate shape prior** (prolate spheroid, 11 in long / ~22 in circumference → orientation-aware projection instead of Eq. 7's sphere). 2. Use the **JaC_γ quality gate** to decide which camera views are calibratable before spending annotation budget. 3. Prioritize **ball-size accuracy over center accuracy** in the 2D detector (the 6–14 m vs 0.6–1.6 m sensitivity result) — train with size-weighted loss. 4. Expect and plan for the **distribution-shift failure**: a detector trained on one broadcast package will fail on another (0.04 AP); budget for per-source box generation + fine-tuning. 5. Use triangulated 3D ball tracks as pseudo-ground-truth to train/evaluate NGS-style tracking replacements (ties to the 2026-09-18 NGS replacement spec).

## 9. Experiments / tests to run
- Reproduce PnLCalib-style yard-line calibration on NFL broadcast frames: what fraction reach JaC_0.5% > 0.75? - Derive and validate the prolate-spheroid monocular 3D equations for a football vs the paper's sphere model. - Measure size-vs-center error sensitivity on NFL footage (does the 6–14 m size dominance hold at All-22 distances?). - Triangulate ball positions from broadcast+replay pairs on a sample NFL game; compare against any available tracking ground truth. - Test per-broadcast-package fine-tuning: quantify the AP drop across networks (FOX vs CBS vs ESPN) mirroring the SoccerNet→ISSIA failure.

## 10. Relation to existing research
The existing-research map (2026-09-21) has **no 3D ball localization, camera calibration, or triangulation coverage** — new ground. It is the 3D complement to **0362** (McByte 2D tracking: this paper's 3D ball tracks are the natural upgrade target for a tracking stack) and **0364** (event detection: 3D ball position enables geometrically precise event definitions like goal-line crossings). It directly serves the **2026-09-18 NGS replacement spec** (camera-based tracking data without wearables) and the map's note that "the 94MB nflverse file stayed out of the repo" — this paper's approach generates tracking-grade data from video alone. Also relevant to the **ST RAIN paper (2305.10262)** already read (NGS/tracking lane) as an alternative/complementary ball-tracking method.

## 11. Improvement path
Add temporal tracking (Kalman/particle smoothing over the triangulated 3D positions — ISSIA-3D's video dimension is currently unused); extend to multi-object 3D (players via pose + field calibration, not just the ball); replace the sphere prior with sport-specific shape models; learn calibration end-to-end instead of the keypoint-grid + PnL pipeline; and publish the cross-broadcast-package generalization study (the ISSIA failure deserves a full paper, not a table row).

## 12. Verdict reasoning
**ADAPT.** The transferable asset is the *method for minting 3D annotations from existing broadcast footage* — calibration quality gates, reprojection-filtered triangulation, and the closed-loop box optimizer — not the soccer datasets or the YOLO baselines. For GSE's NGS-replacement and tracking ambitions, this is the cheapest credible path to 3D ball ground truth: no wearables, no camera rigs, just broadcast video and field geometry. The sensitivity analysis gives a concrete engineering directive (optimize size, not center). REJECT is wrong because the annotation-mining recipe is sport-portable; the football-shape-prior caveat is an adaptation task, not a blocker.

## 13. Risks / open questions
- The sphere prior fails for a prolate-spheroid football with unknown orientation — Eq. 7 must be re-derived; error bounds unknown until tested. - NFL broadcast replays may not provide enough parallax (the paper discards < 1 m displacement pairs); All-22/coaches' film is the better multi-view source but has its own access/licensing constraints. - Absolute errors (0.81–4.2 m) are too large for officiating-grade use; tactical-zone use only. - Field-line calibration depends on visible yard lines — heavy rain/snow games or tight zoom shots may fail the JaC gate. - No temporal smoothing yet; per-frame triangulation will jitter on real broadcasts.

## 14. Metadata
- **Datasets used:** SoccerNet-v3 (33,986 images, 12,764 multi-view systems) → SoccerNet-v3D (4,051 images, 3,240/811 split); ISSIA (6 static cameras, 25 FPS) → ISSIA-3D (10,544 images, 8,686/1,858 split); ~10% manual re-annotation for box validation.
- **Code/data availability:** https://github.com/mguti97/SoccerNet-v3D — annotations and generation pipelines.
- **Reproducibility:** High — full pipeline (PnLCalib, JaC_γ gates, triangulation, box optimization), equations, and baseline configs specified.
- **Compute:** YOLOv11-l fine-tuning scale; calibration/triangulation are optimization-based, not learned.
- **GSE relevance:** 3D ball annotation mining from broadcast video; NGS-replacement tracking data; size-weighted detector training; per-broadcast-package fine-tuning budget.
