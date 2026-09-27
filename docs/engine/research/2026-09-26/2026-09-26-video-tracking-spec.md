# GSE Video-to-Tracking Pipeline — Implementation Spec

**Status:** SPEC (not built). Written 2026-09-26.
**Purpose:** Extract player trajectories (field position, speed, acceleration, distance) from broadcast video for games/plays where NGS tracking data is unavailable — college football, historical NFL, all-22 film. Output feeds the GSE prediction engine as tracking-like features.
**Relation to V3 broadcast-video movement primitive:** V3's contract is the math — camera compensation, homography to field coordinates, speed/acceleration/distance — and is explicitly NOT a YOLO implementation. This spec composes with V3: **Stages S4–S6 below ARE the V3 primitive** (field registration → projection → kinematics). Stages S0–S3 (ingest, shot segmentation, detection, tracking) are the new video front-end that feeds V3. The detector is a swappable interface; the math is the stable contract.
**License architecture:** the pipeline has a shippable path (permissive licenses only) and a lab path (restricted licenses). They share interfaces but never mix dependencies. See §5.

---

## 1. Design principles

1. **Detector is an interface, not an implementation.** `detect(frame) -> sv.Detections`. Any detector can be plugged in. The shippable default is RF-DETR (Apache-2.0). Lab alternatives (Ultralytics YOLO, LocateAnything-3B) implement the same interface but live under `lab/` and never ship.
2. **The math is the contract.** Homography estimation, projection, and kinematics are pure functions with exact I/O (§3). They don't care which detector produced the boxes.
3. **Deterministic.** Same video bytes + same config + same pinned versions → byte-identical output. No unseeded randomness anywhere in the shippable path.
4. **Shots are the unit of tracking.** Tracker state resets on every camera cut. Track IDs are namespaced per shot. Cross-shot re-identification is explicitly out of scope for v1.
5. **Fail loudly, flag everything.** Every output row carries QC flags. A stage that can't meet its QC gate marks its output failed rather than silently degrading.

---

## 2. Pipeline overview

```
video file
  │ S0 ingest: decode → frames (ndarray HxWx3 RGB, fps, frame_idx)
  ▼
  │ S1 shot segmentation: frames → shots [(start_frame, end_frame)]
  ▼ (per shot)
  │ S2 detection: frame → Detections (pixel xyxy boxes, person class)
  ▼
  │ S3 tracking: per-frame Detections → Detections + tracker_id (per shot)
  ▼
  │ S4 field registration: shot frames → homography H (3x3), per shot (+ per-frame refine)
  ▼
  │ S5 projection: (foot pixel point, H) → field_x_yd, field_y_yd
  ▼
  │ S6 kinematics: field x/y time series → smoothed → speed, accel, cumulative distance
  ▼
per-player-per-frame rows → CSV/Parquet (§7)
```

---

## 3. Stage contracts (exact I/O)

### S0 — Ingest
- **In:** video file path (mp4/mkv/mov/ts), config `{target_fps}`.
- **Out:** generator of `(frame_idx, t_sec, frame_rgb)` where `frame_rgb` is `np.ndarray[H, W, 3]` uint8 RGB; `t_sec = frame_idx / target_fps`.
- **Rules:** decode with OpenCV; resample to `target_fps` (default 30; if source is 29.97/60, resample by frame selection, never interpolation). Record source fps, resolution, duration in run manifest. Deterministic frame selection: `keep_idx = round(i * src_fps / target_fps)`.

### S1 — Shot segmentation (camera-cut detection)
- **In:** frame stream from S0.
- **Out:** list of `Shot {shot_id: int, start_frame: int, end_frame: int}` covering the full video with no gaps/overlaps.
- **Rules:** hard cuts only in v1 (dissolves/wipes treated as: end shot at transition start, begin new shot at transition end — conservative). Minimum shot length: 30 frames (1s @30fps); shorter segments are merged into the neighboring shot and flagged `qc_short_shot`. **Registration (S4) hard-resets at every cut.**
- **Method:** TransNetV2 (MIT — shippable) as primary shot-boundary detector (reported F1 77.9–96.2); PySceneDetect (BSD-3 — shippable) as fallback. Football-specific contaminants: replay wipes/dissolves and graphics overlays — both handled by the conservative transition rule above.
- **QC gate:** every output frame belongs to exactly one shot (assert coverage).

### S2 — Detection
- **In:** `(frame_rgb)`; **Out:** `sv.Detections` with fields `xyxy` (float32, pixel coords), `confidence`, `class_id`, `data` dict. Only the person class is kept (`class_id == 0` for COCO person, or the fine-tuned player class).
- **Interface:** `detect(frame_rgb: np.ndarray) -> sv.Detections`.
- **Shippable default:** `rfdetr.RFDETRMedium` (`model.predict(frame_rgb, threshold=0.5)` returns `sv.Detections` directly). COCO-pretrained person class works zero-shot; fine-tuning on football-player boxes is recommended as a follow-up (not v1).
- **Config:** `confidence_threshold=0.5` (tune on fixture; record final value), NMS IoU default from model.
- **Lab alternatives** (same interface, `lab/` only): Ultralytics YOLO (`sv.Detections.from_ultralytics(results)`), LocateAnything-3B text-query mode (`"the football player"`) — see §5.

### S3 — Tracking
- **In:** per-frame `sv.Detections` within one shot. **Out:** `sv.Detections` with `tracker_id` (int ≥ 0) populated; detections with `tracker_id == -1` are dropped before downstream stages.
- **Component:** `trackers` package (roboflow/trackers, Apache-2.0).
- **Default:** `ByteTrackTracker` — `tracked = tracker.update(detections)`.
- **Moving-camera alternative (recommended for broadcast):** `BoTSORTTracker` with camera motion compensation enabled (`enable_cmc=true`, `cmc_method="sparseOptFlow"`, `cmc_downscale=6`). Broadcast cameras pan/tilt/zoom continuously; CMC compensates frame-to-frame camera motion inside the tracker via homography (ORB/SIFT/sparse-optical-flow/ECC). Benchmarks (default params): BoT-SORT 73.8 HOTA on SportsMOT vs ByteTrack 73.0; 84.5 vs 84.0 on SoccerNet. Minis: run test §9.3 with BOTH trackers on the fixture and pick the winner on ID-switch count — do not assume.
- **Params (initial, tune on fixture):** `track_activation_threshold=0.25`, `minimum_consecutive_frames=1`, `minimum_iou_threshold=0.3`, `lost_track_buffer=30` (1s @30fps — keeps IDs through brief occlusions).
- **Rules:** fresh tracker instance per shot (state reset on camera cut — no ID carryover). Filter `detections[detections.tracker_id != -1]` after update.
- **Optional smoothing:** `sv.DetectionsSmoother().update_with_detections(detections)` may be applied to box coordinates pre-projection; v1 default OFF (smooth in field space at S6 instead — one smoothing stage, not two).

### S4 — Field registration (homography) [V3 primitive, part 1]
- **In:** shot frames + field template for the competition (`nfl` | `ncaa` — templates differ, see below).
- **Out:** per shot: base homography `H_shot` (3x3 float64, pixel → field-yards); per frame: refined `H_frame` (3x3) or `None` if refinement failed; `reprojection_error_px` (mean, over inlier correspondences); `homography_ok: bool`; `h_confidence: float` in [0,1] (inlier ratio × spread score).
- **Landmark detection (hybrid — verified approach):**
  - Learned keypoint model for line *identity*: Roboflow Universe `football-field-key-points-mvmjf/2` (pretrained American-football keypoint model; identity correct ~16/20 frames on All-22 but localization coarse ±3–30 px — use it to *name* lines, not to *measure* them). License: Roboflow Universe terms — **review before shippable use; treat as lab-only until terms are verified.**
  - Classical geometry for *measurement*: Hough line detection on the field-line mask for precise line geometry.
  - Alternative: TVCalib (MIT — shippable, segmentation weights downloadable).
  - Do NOT use PnLCalib in the shippable path until its license is verified (official impl exists, license unverified — lab only for now).
  - Pattern to re-implement (no public weights): Nie et al. WACV'21 — SportsFields dataset incl. American football, temporal tracking loss, self-verification gates.
  - **Hard exclusions:** the virtual 1st-&-10 (yellow) line and any broadcast graphics must be explicitly excluded from landmarks — they are not painted on the field and will corrupt the fit.
- **Football-specific conditioning trap:** correspondences concentrate in the thin hash-mark band; fits can show ~1.3 px in-band residual yet drift badly off the painted lines elsewhere. **Sideline and endzone intersections are mandatory correspondences** — a fit with only hash-band points is rejected regardless of residual.
- **Math contract:**
  - Landmark correspondences `(u,v) ↔ (x_yd, y_yd)` → normalized DLT + RANSAC (10 px threshold).
  - **QC gate (all must hold):** `n_inliers ≥ 6`, correspondences non-collinear and spread (must include ≥2 sideline/endzone intersections), inlier ratio ≥ 0.6, held-out mean reprojection error < 5.0 px @720p (scale linearly with resolution). Frames failing the gate get `homography_ok=false`, `H_frame=None`, and their rows are still emitted with `field_x_yd=NULL` + flag (never silently project with a bad H).
- **Per-shot vs per-frame (verified design):** estimate base H on a sharp keyframe per shot (highest landmark count); refine per frame via re-estimation + **9-DoF Kalman filter on vec(H_t)** with regime-tuned process noise (σ_q = 0.001 fixed camera / 0.02 follow camera). EMA fallback + jump rejection on large H deltas. Keyframe interpolation ONLY between valid fits. **Hard reset at every camera cut. Never extrapolate past the last valid fit.**
- **Failure bridging:** short runs of failed frames (≤ 15) are bridged (rows flagged `qc_h_bridged`, field coords NULL); longer runs fail loud — mark the shot `qc_h_unstable`, stop emitting field coords until a good H returns, record the frame range in the manifest. Manual-keyframe fallback exists for pathological shots (operator supplies 4+ correspondences).
- **Field templates (parameterized, validated input — never inferred):** NFL: 120×53.33 yd, hash marks 18.5 ft apart. NCAA: 120×53.33 yd, hash marks 40 ft apart. **Wrong template = silent 3.58-yd systematic bias** — `competition` is a required, validated pipeline input. Endzone depth varies by stadium — template takes `endzone_depth_yd` param (default 10). Yard-line spacing 5 yd both.
- **Accuracy context:** no public football field-registration benchmark exists (all published numbers are soccer-derived: JaC5 ~69–76, JaC10 ~87–93, MRE ~4.5 px). The highest-leverage data investment for this pipeline is a **200–500 frame hand-labeled football set** (landmark correspondences) — enables tuning, regression tests, and fine-tuning.

### S5 — Projection [V3 primitive, part 2]
- **In:** tracked detection (foot point), `H_frame` (or `H_shot` fallback), `homography_ok`.
- **Out:** `(field_x_yd, field_y_yd)` or `(NULL, NULL)` + flag if not ok.
- **Foot point:** bottom-center of bbox: `u = (x1+x2)/2`, `v = y2`. (Rationale: closest pixel proxy for ground contact; standard practice. Head/center points are NOT used.)
- **Coordinate convention (engine-wide, document once):** `field_x_yd ∈ [0,120]`, x=0 at back of endzone A, x=120 back of endzone B, increasing toward endzone B. `field_y_yd ∈ [0,53.33]`, y=0 at one sideline. Which sideline/endzone is "0" is arbitrary per video — record `orientation_note` in the run manifest (v1 does not auto-resolve orientation; a later stage or manual tag assigns offense direction).

### S6 — Kinematics [V3 primitive, part 3]
- **In:** per-track time series `(t_sec, field_x_yd, field_y_yd)` within one shot, with `homography_ok=true` rows only (gaps allowed).
- **Out:** per row: `speed_yd_s`, `accel_yd_s2`, `dist_cum_yd`.
- **Method (deterministic):**
  1. Sort by `t_sec`. Resample to uniform grid at `target_fps` (forward-fill gaps ≤ 5 frames; longer gaps split the track segment — distance does not accumulate across gaps).
  2. Smooth x(t), y(t) with Savitzky-Golay (window=9, polyorder=2) — applied per segment.
  3. `speed = hypot(dx/dt, dy/dt)` from smoothed series (central differences).
  4. `accel = d(speed)/dt` (central differences on smoothed speed).
  5. `dist_cum` = cumulative `hypot(dx, dy)` over smoothed positions, reset per segment.
- **QC gates:** flag `qc_implausible_speed` if `speed > 12.0 yd/s` (~24.6 mph, above verified human max); flag `qc_implausible_accel` if `|accel| > 12.0 yd/s²`. Flagged rows are kept (engine decides) but marked.
- **Units:** yards, seconds. No mph in storage (convert at presentation).

### S7 — Output
- One row per (shot, frame, track). Schema in §7. Written via deterministic writer: rows sorted by `(shot_id, frame_idx, track_id)`; floats rounded to 4 decimals; CSV with header + SHA256 recorded in run manifest. Parquet optional (same row order).

---

## 4. Component table (verified 2026-09-26)

| Stage | Component | Version pin | License | Shippable? | Notes |
|---|---|---|---|---|---|
| S2 | RF-DETR (Nano/S/M/L) — `rfdetr` pkg | pin at impl | Apache-2.0 | **YES** | Shippable default detector. `RFDETRMedium`: COCO AP50:95 54.7, 4.4ms latency. XL/2XL are PML 1.0 — DO NOT USE. `model.predict(img, threshold)` → `sv.Detections` |
| S2-lab | Ultralytics YOLO (v8/v11/v12/v26) | — | AGPL-3.0 | **NO** | Lab only. Enterprise license is the only commercial path. `sv.Detections.from_ultralytics()` |
| S2-lab | NVIDIA LocateAnything-3B | — | NVIDIA non-commercial | **NO — lab only** | 10x faster grounding via parallel box decoding; text-query → boxes. R&D accelerator only, never ships |
| S2-alt | YOLOX / DAMO-YOLO | — | Apache-2.0 | **YES** | Fallback shippable detectors if RF-DETR underperforms on football |
| S2/S3 glue | supervision (`supervision`) | ≥0.31.0 pin | MIT | **YES** | `sv.Detections`, `from_ultralytics/from_inference`, `DetectionsSmoother`, annotators, `process_video`, `VideoSink`, `get_video_frames_generator`. NOTE: built-in `sv.ByteTrack` was REMOVED in 0.31.0 — use `trackers` pkg |
| S3 | `trackers` (roboflow) — `ByteTrackTracker` | pin at impl | Apache-2.0 | **YES** | `tracker.update(detections)` → `tracker_id`. Default tracker. Benchmarks: 73.0 HOTA SportsMOT / 84.0 SoccerNet |
| S3-alt | `trackers` — `BoTSORTTracker` (CMC) | pin at impl | Apache-2.0 | **YES** | Built-in camera motion compensation (`enable_cmc`, methods: orb/sift/sparseOptFlow/ecc). Recommended for panning broadcast cameras. 73.8 HOTA SportsMOT / 84.5 SoccerNet. Pick winner vs ByteTrack on fixture per §9.3 |
| S3-orig | ByteTrack (ifzhang) | — | MIT | **YES** | Reference impl; prefer `trackers` pkg re-implementation |
| S1 | shot-boundary model | TBD | TBD — verify | TBD | Interface specified; model choice pending (§3 S1) |
| S4 | field-landmark model | TBD | TBD — verify | TBD | Interface specified; model choice pending (§3 S4) |
| S4 math | OpenCV (`cv2.findHomography` RANSAC) | pin | Apache-2.0 | **YES** | Homography estimation itself is license-clean |
| S4 landmarks | TVCalib | — | MIT | **YES** | Segmentation-based field registration; weights downloadable |
| S4 landmarks | Roboflow Universe `football-field-key-points-mvmjf/2` | — | Universe terms — **unverified** | **LAB ONLY until terms reviewed** | Pretrained American-football keypoint model. Use to *name* lines (identity ~16/20 frames All-22); localization coarse (±3–30 px) — pair with classical Hough for geometry |
| S4 landmarks | PnLCalib (official impl) | — | **unverified** | **LAB ONLY until verified** | Do not touch shippable path |
| S4 pattern | Nie et al. WACV'21 (SportsFields) | — | paper — re-implement | **YES (re-implementation)** | Most football-relevant published method: temporal tracking loss + self-verification gates. No public weights — re-implement the pattern |
| S1 | TransNetV2 | — | MIT | **YES** | Primary shot-boundary detector (F1 77.9–96.2) |
| S1 | PySceneDetect | — | BSD-3 | **YES** | Fallback shot-boundary detector |
| S6 | scipy (Savitzky-Golay) | pin | BSD-3 | **YES** | |

**Correction to earlier assumption:** no member of the Ultralytics YOLO family is MIT — all are AGPL-3.0 (v9 is GPL-3.0). There is no shippable YOLO from Ultralytics without a paid enterprise license. The shippable detector lane is RF-DETR / YOLOX / DAMO-YOLO.

---

## 5. License boundary (hard rule)

- `src/video_tracking/` — shippable path. May depend ONLY on: RF-DETR (≤L), supervision, trackers, opencv, scipy, numpy. CI check: fail the build if `ultralytics`, `locateanything`, or any AGPL/non-commercial package appears in the shippable dependency closure.
- `lab/video_tracking/` — R&D only. May use Ultralytics YOLO, LocateAnything-3B, any shot/landmark model regardless of license. Shares the `detect()` interface so lab findings transfer, but lab code and weights NEVER merge into `src/`.
- Model weights: RF-DETR ≤L weights are Apache-2.0 (redistributable). Any fine-tuned player-detection checkpoint trained by GSE is GSE property — record training data provenance (no CC BY-NC data in commercial training — cf. Big Data Bowl dataset restriction).

---

## 6. Camera-cut and zoom handling

- **Cuts:** S1 segments shots (TransNetV2 primary, PySceneDetect fallback); S3 tracker state resets per shot; S4 re-estimates base homography per shot with a hard reset — no H carried across a cut. A cut mid-play means the play's trajectory is split across shots — downstream play-stitching (matching track IDs across shots) is OUT OF SCOPE v1; each shot's tracks stand alone with `shot_id` namespacing.
- **Zoom/pan/tilt (continuous):** S4 per-frame re-estimation + 9-DoF Kalman on vec(H_t), regime-tuned process noise (σ_q=0.001 fixed / 0.02 follow cam), EMA fallback + jump rejection. Keyframe interpolation only between valid fits. Never extrapolate past the last valid fit.
- **Replays:** a replay is a new shot (different camera) — handled by the cut rule. Slow-motion replay: `target_fps` resampling keeps t_sec honest; kinematics are in seconds, not frames, so slow-mo doesn't distort speed.
- **Graphics overlays / tight zooms with no visible yard lines:** homography QC gate fails → `homography_ok=false` → rows emitted with NULL field coords + flag. Short failed runs (≤15 frames) are bridged (`qc_h_bridged`); long runs fail loud (`qc_h_unstable` + frame range in manifest). Never interpolate H across a failed region.

---

## 7. Output schema

Table `video_tracks`, one row per (shot_id, frame_idx, track_id). Column order fixed.

| Column | Type | Unit / values | Notes |
|---|---|---|---|
| game_id | string | — | caller-supplied, nullable |
| play_id | string | — | caller-supplied, nullable |
| shot_id | int | ≥0 | camera-shot namespace; track_id only unique within shot |
| frame_idx | int | ≥0 | resampled frame index |
| t_sec | float | seconds | `frame_idx / target_fps`, 4 decimals |
| track_id | int | ≥0 | ByteTrack ID within shot |
| pixel_x / pixel_y | float | pixels | foot point (bottom-center of bbox), 1 decimal |
| field_x_yd / field_y_yd | float | yards | NULL when `homography_ok=false`, 4 decimals |
| speed_yd_s | float | yd/s | NULL when not computable, 4 decimals |
| accel_yd_s2 | float | yd/s² | NULL when not computable, 4 decimals |
| dist_cum_yd | float | yards | cumulative per track segment, 4 decimals |
| conf_detection | float | [0,1] | detector confidence, 4 decimals |
| homography_ok | bool | — | S4 QC gate |
| h_confidence | float | [0,1] | inlier ratio × correspondence-spread score, 4 decimals |
| qc_flags | string | csv of flags | `qc_short_shot, qc_h_fallback, qc_h_bridged, qc_h_unstable, qc_sparse_tracks, qc_implausible_speed, qc_implausible_accel` (empty = clean) |

Run manifest (JSON, stored alongside output): video path, sha256 of source, src_fps, target_fps, resolution, detector name+version+threshold, tracker params, landmark model id, field template id (`nfl`/`ncaa` + endzone depth), orientation_note, output sha256, package versions.

---

## 8. Failure modes & QC gates

| Failure | Detection | Response |
|---|---|---|
| Detector misses small/distant players (all-22 wide shot) | track count per frame < expected (config `min_players_visible`, default 5 for 11v11) sustained > 2s | flag shot `qc_sparse_tracks`; keep output |
| ID switch on player crossing | (test-time) ID-switch count; (prod) track fragment count per shot | v1: flag only. ID-switch budget in §9 |
| Homography fails (tight zoom, no lines, night glare) | `homography_ok=false` via reprojection gate | NULL field coords + flag; never project with bad H |
| Camera cut mid-track | S1 boundary | new shot, tracker reset, new track_id namespace |
| Motion blur / low light | detection confidence drop | downstream of detector threshold; flagged via sparse-tracks rule |
| Wrong field template (NFL vs NCAA hashes) | caller-supplied `competition` param; mismatch caught by landmark reprojection error | misregistration → high reprojection error → gate fails safe |
| Non-determinism | §9 test 1 | CI failure, block merge |

---

## 9. Test assertions (exact)

All tests run on pinned versions with fixed seeds. Fixture: a 30-second 1080p30 broadcast clip with 2+ camera cuts (checked into `test/fixtures/`, small, license-clean — record its provenance; do not use NFL-copyrighted footage as a committed fixture — use a royalty-free scrimmage or synthetic clip).

1. **Determinism:** run pipeline twice on fixture → `sha256(output.csv)` identical. Assertion: hashes equal.
2. **Synthetic homography accuracy:** render synthetic field image from a known `H_true` (project template lines into a virtual camera view, add 1px Gaussian noise to landmark detections). Estimate `H_est` via S4. Assertions: held-out mean reprojection error < 5.0 px @720p (scale linearly with resolution); max field-coordinate error at midfield < 0.5 yd; inlier ratio ≥ 0.6 with ≥ 6 non-collinear spread correspondences including ≥ 2 sideline/endzone intersections.
2b. **Hash-band conditioning trap:** synthetic view where landmarks are visible ONLY in the hash band (no sidelines/endzones). Assertion: `homography_ok=false` despite low in-band residual — the gate must reject fits without spread correspondences.
2c. **Template mismatch is safe, not silent:** run S4 with the NCAA template on an NFL-hash synthetic view. Assertion: systematic error detected — either the QC gate fails (preferred) or measured bias is flagged; never silently accepted. (True bias of wrong template: 3.58 yd.)
3. **Tracking identity:** fixture with K hand-labeled player identities across a crossing event, run with BOTH `ByteTrackTracker` and `BoTSORTTracker` (CMC on). Assertions: ID switches ≤ 2 per 30s fixture; tracks-per-true-identity ≤ 1.5 (fragmentation bound). Ship the tracker with the lower ID-switch count.
4. **Kinematics on synthetic track:** constant-velocity synthetic trajectory (10 yd/s for 3s) through S5–S6. Assertions: mean speed within 2% of 10.0; |accel| < 0.5 yd/s²; final `dist_cum_yd` within 2% of 30.0.
5. **Shot segmentation:** fixture with exactly 2 hard cuts (+1 dissolve), run through TransNetV2 (PySceneDetect as cross-check). Assertions: exactly 3 shots detected; cut frames within ±2 frames of ground truth; dissolve region assigned to neither shot's clean range (flagged).
6. **Homography failure is safe:** fixture segment with tight zoom on players (no yard lines visible). Assertion: 100% of rows in that segment have `homography_ok=false` and NULL field coords (zero silent bad projections).
7. **Speed plausibility gate:** synthetic track at 15 yd/s. Assertion: rows flagged `qc_implausible_speed`, output still emitted.
8. **Performance benchmark (not a gate):** report end-to-end fps on reference hardware; record in manifest. Target: ≥10 fps on a single consumer GPU for 1080p30 with RFDETRMedium.

---

## 10. File layout (for minis)

```
src/video_tracking/                 # SHIPPABLE — permissive licenses only
  __init__.py
  config.py                         # PipelineConfig dataclass (all thresholds, params)
  ingest.py                         # S0
  shots.py                          # S1 — segment()
  detect.py                         # S2 — detect() interface + RF-DETR impl
  track.py                          # S3 — ByteTrackTracker wrapper, per-shot reset
  field_register.py                 # S4 — landmark interface (learned identity + Hough geometry),
                                  # DLT+RANSAC, per-frame 9-DoF Kalman on vec(H), QC gates,
                                  # virtual-line exclusion, per-shot hard reset
  project.py                        # S5 — foot point + H projection
  kinematics.py                     # S6 — Savitzky-Golay + derivatives
  writer.py                         # S7 — deterministic CSV/Parquet + manifest
  templates/
    nfl.json                        # field template: 120x53.33 yd, hashes 18.5 ft, endzone_depth param
    ncaa.json                       # field template: 120x53.33 yd, hashes 40 ft, endzone_depth param
  pipeline.py                       # orchestrates S0→S7 per shot
lab/video_tracking/                 # R&D ONLY — restricted licenses allowed
  detect_ultralytics.py
  detect_locateanything.py
  experiments/
tests/video_tracking/
  fixtures/                         # license-clean fixture clip + synthetic generators
  test_determinism.py               # §9.1
  test_homography_synthetic.py      # §9.2
  test_tracking_identity.py         # §9.3
  test_kinematics_synthetic.py      # §9.4
  test_shots.py                     # §9.5
  test_homography_failure.py        # §9.6
  test_qc_gates.py                  # §9.7
```

---

## 11. Open items (do not guess — resolve before/with v1)

1. **License verifications (blocking for shippable path):** PnLCalib license; Roboflow Universe terms for `football-field-key-points-mvmjf/2`. Until verified: both are lab-only. TVCalib (MIT) is the clean shippable landmark path.
2. **Labeled data investment (highest leverage):** build a 200–500 frame hand-labeled football set (landmark correspondences across NFL + NCAA, day/night, tight/wide shots). Unblocks tuning, regression tests, and fine-tuning. No public football field-registration benchmark exists — all accuracy numbers above are soccer-derived.
3. Fixture clip: source a license-clean 30s broadcast-style clip with 2+ hard cuts and 1 dissolve (or synthesize one).
4. `competition` (nfl/ncaa) is caller-supplied and validated in v1 — auto-detection is a later enhancement.
5. Orientation (which endzone is x=0) is recorded, not resolved, in v1.
6. Cross-shot track stitching / jersey-number OCR for true player identity — explicitly v2.
7. Fine-tuning RF-DETR on football-player boxes — recommended follow-up, not v1 (COCO person zero-shot first).

---

## 12. What NOT to do

- Do not put `ultralytics`, LocateAnything, or any AGPL/non-commercial component in `src/` or the shippable requirements. CI must enforce this.
- Do not train commercial models on CC BY-NC data (e.g., the Big Data Bowl 2026 dataset) — methods transfer, data doesn't.
- Do not use RF-DETR XL/2XL (PML 1.0 license) in the shippable path.
- Do not smooth twice (boxes AND field coords) — smooth once, in field space (S6).
- Do not interpolate homography across failed frames — flag and NULL instead.
- Do not carry tracker state across camera cuts.
