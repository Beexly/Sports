# Homography / Field Registration Research — Football Video-to-Tracking Pipeline
**Date:** 2026-09-26 · **Scope:** ONLY the camera-geometry piece (video pixels → field x/y). Detection/tracking and kinematics are other lanes.

---

## 1. Standard field-registration pipeline

The universal pipeline (soccer literature, directly portable):

1. **Detect field landmarks** in the frame — either classical (white-paint segmentation → Hough/probabilistic line detection) or learned (keypoint heatmaps / line segmentation networks).
2. **Establish 2D↔2D correspondences** — detected image keypoints ↔ known positions on a metric field template.
3. **Estimate homography H (3×3)** — normalized DLT + RANSAC (Nie et al. use RANSAC reprojection threshold **10 px**).
4. **Project** the ground-contact estimate of each player (bottom-center of box, *never* box center or helmet) through H⁻¹ into field coordinates; derive speed/accel downstream.

### Landmark/keypoint representations standard for **American football**

American football fields have no boxes, arcs, or circles — the landmark set is almost entirely straight lines, which changes the conditioning of the problem:

| Landmark class | Role in template |
|---|---|
| **Yard lines** — full-width lines every 5 yd (lines 5,10,…,95 in a 0–100 frame; goal lines at 0 and 100) | Primary long parallel features; intersections with hashes/sidelines are keypoints |
| **Hash marks** — short dashes *every yard*, two rows (NFL vs NCAA rows differ — §5) | Hash × yard-line intersections are the densest keypoint grid; **but** they live in a thin band (±~3.1 m NFL, ±~6.7 m NCAA), ~12% of field width |
| **Sidelines** — yard-line × sideline intersections | Critical **vertical spread** — the single most important correspondence class for conditioning |
| **End lines / endzone corners** | Anchor the ends; endzone-camera shots depend on them |
| **Yard numbers** (painted, every 10 yd) | Provide **line identity** (which yard is which) — not geometry. Learned models read them well |
| **Goal-line / endzone boundary** | 10-yd endzone depth must be in the template |

**Known conditioning trap (verified in practice):** correspondences extracted only from the hash band produce a homography that is well-constrained along the band but wrong in slant — one real All-22 project measured **1.31 px in-band residual yet the projected field grid visibly drifted off the painted lines away from the hashes**. Fix: require vertically-spread landmarks (sideline intersections, endzone corners, numbers). Source: https://github.com/sumedhk0/nflgsplat/blob/HEAD/docs/superpowers/specs/2026-06-26-field-landmark-detector-design.md

**Virtual graphics trap:** the broadcast "1st & 10" line and line-of-scrimmage overlays are *virtual* — never treat them as real markings.

---

## 2. Available models / datasets / code for football field registration

### Soccer-origin (state of the art, template must be re-fit to football)

- **TVCalib** (Theiner & Ewerth, WACV'23) — treats registration as full camera calibration: field-line segmentation → keypoint extraction → self-optimizing calibration minimizing a differentiable segment-reprojection loss. Pretrained segmentation weights (`train_59.pt`) downloadable. **License: MIT.** Code: https://github.com/MM4SPA/tvcalib · paper: https://arxiv.org/abs/2207.11709 · project: https://mm4spa.github.io/tvcalib
- **PnLCalib** (Gutiérrez-Pérez & Agudo, arXiv 2404.08401) — HRNetv2 keypoint heatmaps + line-extremity detection + PnL nonlinear refinement module; trains on SoccerNet / WorldCup2014 / TSWorldCup. Reports **78.6 final-score on SN22-test-center** at 960×540. Official impl: https://github.com/mguti97/PnLCalib · **License: not verified in search — check repo LICENSE before integration.**
- **"No Bells Just Whistles"** (CVPRW'24) — geometric registration; JaC5 73.7 / JaC10 86.7 / CR 77.5 on WC14 (see §6).
- **Nie et al., WACV'21 "A Robust and Efficient Framework for Sports-Field Registration"** — the most football-relevant paper: multi-task network predicts (a) a uniform grid of keypoints covering even texture-less field areas and (b) dense field features (normalized distance-to-line maps); inference-time online optimization warps frame t−1 to t via relative homography with a **temporal tracking loss** (λ_feat 0.9 / λ_track 0.1, Adam 50 iters); self-verification gates (keypoint goodness 100, homography IoU-consistency 0.6). Evaluated on their **SportsFields dataset — 192 clips across 5 sports including American football**, with rain/snow/glare variation. Claims real-time HD on commodity hardware. **Public code/weights not confirmed — treat as research-only; re-implement pattern, don't expect to download.** Paper: https://openaccess.thecvf.com/content/WACV2021/html/Nie_A_Robust_and_Efficient_Framework_for_Sports-Field_Registration_WACV_2021_paper.html
- **Xeebra** (industrial, PGM) — cited in ProCC as the **practical upper bound** for calibration quality on WC14; not open.

### American-football-specific

- **Roboflow Universe `football-field-key-points-mvmjf/2`** — pretrained keypoint model for American-football fields (classes like `30`, `30-top-hash`, `30-bottom-sl`). One independent evaluation on real All-22 footage found: **identity correct on 16/20 frames, RANSAC residuals 1–3 px** (a line swap would show ~76 px) — i.e., *the model names the lines* — but keypoint localization was coarse (±3–30 px), good enough to pick the line, not to be the geometric measurement. Recommended pattern: **hybrid — learned model names the lines, classical detection measures them**. Note: it hallucinates off-frame sideline points (drop `*-sl` classes). **License: Roboflow Universe per-dataset terms — verify before commercial use.** Source: https://github.com/sumedhk0/nflgsplat/blob/HEAD/docs/superpowers/specs/2026-07-04-pretrained-hybrid-field-registration-design.md
- **TendencyIQ / lucas-balentine/football-cv** — end-to-end American-football pipeline: YOLO hash×yard-line intersection detection → homography → SAM segmentation → playbook view; includes pre-snap frame extraction and shot filtering. Good reference architecture. (GitHub: lucas-balentine/football-cv)
- **nflgsplat (sumedhk0)** — NFL All-22 registration work: hint-anchored per-frame calibration, homography-consensus labeling, per-frame PnP. Docs only; useful design patterns (fail-loud calibration, short-gap interpolation).
- **bgyss/football-tracking** — design docs for All-22 tracking with calibration JSON per shot (`shot-0`, `shot-1`), 6–8 landmarks/shot, withheld-landmark QC: https://github.com/bgyss/football-tracking/blob/HEAD/docs/accuracy-calibration-replay.md

### Datasets
- **SoccerNet-Calibration** (25,506 images, 226,305 polylines, 2023 ed.) — academic gold standard but **soccer-only, polyline annotations, research NDA**. Fine-tuning source only.
- **WorldCup 2014 (WC14)** — 209 train / 186 test images with homography annotations; most-cited benchmark.
- No public American-football equivalent of SoccerNet-Calibration found — **building one (even 200–500 labeled broadcast frames) is the highest-leverage data investment**.

---

## 3. Camera cuts — shot-boundary detection for broadcast football

**Recommended: TransNetV2 primary + PySceneDetect fallback + min-shot merge.**

| Tool | F1 (reported) | Notes | License |
|---|---|---|---|
| **TransNetV2** (Souček & Lokoč 2020) | **77.9 ClipShots / 96.2 BBC Planet Earth / 93.9 RAI** | Detects hard cuts *and* gradual transitions (dissolves/fades/wipes); 3D separable convs; runs on 48×27 frames; TF + PyTorch ports | **MIT** (upstream soCzech/TransNetV2; PyPI `transnetv2-pytorch` also MIT) |
| **PySceneDetect** | ~85–90% F1 (classical) | ContentDetector (HSV change), AdaptiveDetector, threshold; weak on gradual transitions; fast CPU, dependency-light | **BSD-3-Clause** |
| FFmpeg `select='gt(scene,0.4)'` / `scdet` | — | Zero-dependency baseline | — |

Sources: https://github.com/Breakthrough/PySceneDetect · https://pypi.org/project/transnetv2-pytorch/1.0.4/ · https://github.com/vbasky/viser/blob/HEAD/docs/per-shot-encoding.md

### Football-broadcast specifics
- **Replays** are the dominant contaminant: same play re-shown from other angles, usually opened/closed by wipes or dissolves and labeled with "REPLAY" graphics. Strategy: shot-detect, then **replay-duplicate matching** (frame-embedding similarity / logo-template match) to tag replay shots as non-live.
- **Graphics overlays**: score bugs (persistent, small), full-screen stat cards and wipe-ins (transient, cover lines). Transient overlays → treat covered frames as calibration gaps; persistent bugs → mask the region in landmark detection.
- **Merge rule**: minimum shot length ~1 s to kill camera-snap/false-cut bursts (used in production pipelines).
- **Per-shot strategy**: reset registration state at every hard cut. Within a shot, keyframes are re-fit points. Tag each shot by view type (live sideline / endzone / all-22 / replay / non-field) and **only attempt registration on field-visible shots**; drop or null the rest.

---

## 4. Zoom / pan / tilt handling

Broadcast cameras pan/tilt/zoom continuously, so a single static homography per shot is wrong for football (unlike a bolted-down all-22 sideline cam). Four practiced strategies, in recommended combination:

1. **Per-frame re-estimation with temporal tracking (recommended core).** Re-estimate H every frame (or every N=5–15 frames), then smooth the 9-vector `vec(H_t)` with a **Kalman filter whose process noise is regime-tuned** — e.g. σ_q = 0.001 for a fixed sideline cam vs 0.02 for a following/drone cam (pattern from aahmadf123/football-iq#127: https://github.com/aahmadf123/football-iq/issues/127). Lighter alternative seen in the wild: **EMA smoothing (α ≈ 0.35)** + **abrupt-jump rejection** (drop H updates that move correspondences > ~170 px frame-to-frame): https://github.com/aquaqamelob/homography
2. **Keyframe refit + interpolation.** Refit from field features at keyframes; **interpolate only between valid fits**; invalidate positions when reprojection error rises. Never extrapolate past the last valid fit. (bgyss/football-tracking: https://github.com/bgyss/football-tracking/blob/HEAD/docs/system-design.md)
3. **Nie-style temporal consistency loss.** At inference, warp frame t−1's dense features to t via the relative homography H_t·H_{t−1}⁻¹ and penalize inconsistency — cheap, no extra labels.
4. **Optical-flow camera-motion compensation (GMC)** — used by BoT-SORT-style trackers to stabilize *tracking* through pan/zoom. **This is not metric calibration**; keep it as a separate module with separate QC.

**What breaks:** heavy zoom (few landmarks visible, no painted numbers → line-identity ambiguity); fast pans (motion blur kills line detection); cuts (must hard-reset the filter); tight endzone shots (near-degenerate geometry); any frame where <4 reliable correspondences survive → emit `None`, not a guess.

**Zoom-lens caveat:** broadcast lenses have significant radial distortion at long zoom; the homography-only model absorbs it imperfectly. The ProCC authors show a pinhole+radial model can disagree with a homography-only model by **>2.5 m in parts of the field** even when image wireframes look close (https://arxiv.org/html/2404.09807v1/). For speed/accel QC this matters most at frame edges — either estimate one radial coefficient or down-weight edge correspondences.

---

## 5. NFL vs NCAA field geometry — template parameters

All levels share **120 yd × 53⅓ yd (160 ft)**; playing field 100 yd + two 10-yd endzones. The differences that must be parameterized:

| Parameter | NFL | NCAA | NFHS (HS) |
|---|---|---|---|
| Hash-mark gap | **18 ft 6 in** (5.6388 m) | **40 ft** (12.192 m) | 40 ft (some sources cite 53'4" historically — verify) |
| Hash → nearest sideline | 70 ft 9 in | 60 ft | 60 ft (if 40-ft gap) |
| Hash rows (half-width from center, yards) | **3.0833 yd** | **6.6667 yd** | 6.6667 yd |
| Goal-post width | 18 ft 6 in | 18 ft 6 in | 23 ft 4 in |
| Endzone depth | 10 yd | 10 yd (parameterize — some college venues deviate) | 10 yd |

Sources: https://coversports.com/resources/field-guides/college-football-field-dimensions-guide · https://www.metroleague.org/college-vs-nfl-hash-marks/ · https://athlonsports.com/college-football/how-long-football-field

**Template design:** `competition ∈ {NFL, NCAA, NFHS}` selects `hash_half_width_yd`, `endzone_depth_yd`, `goalpost_width_ft`, `numbering_style`. Yard lines every 5 yd full-width; hash ticks every yard on both rows; numbers every 10 yd near sidelines. In a 0–120 yd x-frame, goal lines at x=10 and x=110.

**Why it matters for the pipeline:** the hash rows are the primary correspondence source. Using an NFL template on NCAA footage shifts every hash keypoint by **3.58 yd** — a silent, systematic bias in all trajectories. Competition must be an explicit, validated input, not inferred.

---

## 6. Typical accuracy — published numbers and sane QC thresholds

### Published benchmarks (soccer; no football public benchmark found — treat as reference)

| Method | JaC5 | JaC10 | CR | Dataset |
|---|---|---|---|---|
| Broadcast2Pitch (WACV'26) | **69.38** | **92.84** | — | SoccerNet-GSR; also MRE **4.47 px**, MedRE **2.21 px** |
| NeRF-guided calib (CVPRW'25) | 75.8 | 86.9 | 78.3 | WC14 |
| BroadTrack | 75.3 | 86.8 | 69.8 | WC14 |
| NBJW (CVPRW'24) | 73.7 | 86.7 | 77.5 | WC14 |
| TVCalib | 52.9 | 73.4 | 66.5 | WC14 |
| PnLCalib | — | — | — | **78.6 final score** SN22-test-center @960×540 |

- **JaC_γ** = % of field markings reprojected within γ px (JaC5 strict, JaC10 standard). **CR** = % of frames/images with a valid estimate.
- IoU_part medians for SOTA: ~95–97% on WC14.
- Sanity floor from a classical pipeline: 94% of frames successfully registered on 12 multi-stadium sequences (oa.upm.es).
- One football-CV dissertation reports **92.4% of frames with valid projection** on a 30-s broadcast clip (Simo-03/football-player-detection).

Metric definitions: https://orbi.uliege.be/bitstream/2268/317932/1/Magera2024AUniversal.pdf (ProCC) · Broadcast2Pitch: http://openaccess.thecvf.com/content/WACV2026/papers/Oo_Broadcast2Pitch_Game_State_Reconstruction_from_Unconstrained_Soccer_Videos_WACV_2026_paper.pdf

### Recommended QC gates (scale linearly with vertical resolution; values at 720p)

| Gate | Threshold | Rationale |
|---|---|---|
| Min correspondences | **≥ 6–8, non-collinear, vertically spread** (never 4-on-one-line) | DLT stability; conditioning (§1) |
| RANSAC reprojection | **≤ 10 px** inlier threshold | Nie et al. standard |
| **Held-out mean reprojection error** | **< 5 px** @720p | ≈ JaC5 criterion; SOTA MRE 4.47 px |
| Inlier ratio | **≥ 0.6** | Nie et al. homography-consistency IoU 0.6 |
| Frame-to-frame H jump | reject updates shifting field points > ~170 px @1080p | kills cut-through/false fits |
| Completeness rate (per shot) | report; target **CR > 90%** on live-play shots | SOTA soccer CR 78–94% on harder mixes |

Procedure: fit on ≥6 points, **withhold ≥2–3 extra landmarks and score the fit on them** — never QC on the training set.

---

## 7. Failure modes and robust handling

| Failure mode | Why it breaks registration | Handling |
|---|---|---|
| **Occluded yard lines** (piles, players, officials) | Correspondences lost or hallucinated on jerseys/numbers | RANSAC + inlier-ratio gate; player-masking before line detection; gap → interpolate |
| **Night / rain games** | Specular glare, wet-paint reflections, low contrast | Learned segmentation degrades gracefully vs. white-paint thresholds; widen RANSAC tolerance slightly, tighten inlier-ratio gate; drop shots below gate |
| **Endzone-camera angles** | Low oblique view, near-degenerate, few parallel lines | Full (K,R,t) PnP rather than planar-only; expect lower accuracy — flag `low_confidence`; heavy-zoom endzone → null |
| **Non-standard stadiums** (alt turf color e.g. blue turf, painted endzones, non-10-yd endzones) | Color priors break; template mismatch | Color-agnostic line detection (luminance/edge); **endzone depth as template parameter**; competition + venue override config |
| **Graphics overlays** (stat cards, wipe-ins, score bugs) | Cover lines; virtual lines are not real | Mask persistent bug regions; transient full-screen graphics → calibration gap; never ingest the virtual 1st-&-10 line |
| **Heavy zoom between numbers** | No line identity (numbers out of frame) | Propagate identity temporally from last anchored frame (seed-at-ref + bidirectional propagation); if identity never established → fail-loud, manual keyframe fallback |
| **Replays / non-field shots** | Wrong view or duplicate play | Shot classifier; replay-duplicate matching; drop |

### Standard failure policy (consensus across sources)
1. **Gate per frame**: `< min_correspondences` or RMS above threshold → registration `None` (a gap), never a guess.
2. **Bridge short gaps** (a few frames) by interpolating H between valid fits; **long gap runs → fail-loud** naming the frame range (never silently wrong calibration).
3. **Report per-frame confidence** — a weighted score is good practice, e.g. `0.30·inlier_ratio + 0.25·min(line_count/15,1) + 0.20·parallel_line_score + 0.15·temporal_stability + 0.10·field_coverage` (football-iq pattern).
4. **Report completeness rate** per shot/game; downstream kinematics must consume the validity flag (no speed computed on null frames).
5. Keep a **manual keyframe fallback**: an operator clicks 6–8 landmarks on one clean frame; tracking propagates from there.

Sources: https://github.com/sumedhk0/nflgsplat/blob/HEAD/docs/superpowers/specs/2026-06-21-auto-field-registration-design.md · https://github.com/sumedhk0/nflgsplat/blob/HEAD/docs/superpowers/specs/2026-06-22-hinted-field-registration-design.md

---

## Recommended homography sub-pipeline design

```
INPUTS
  frames (decoded video) · competition ∈ {NFL, NCAA, NFHS} · venue overrides (endzone depth)
  field template generated from competition params (§5)

STAGE A — shot segmentation
  TransNetV2 (MIT) primary, PySceneDetect (BSD-3) fallback; merge shots < 1 s.
  OUTPUT: shot list [start, end, boundary_type]

STAGE B — shot triage (per shot)
  Classify: live-sideline / endzone / all-22 / replay / non-field.
  Replay-duplicate match to suppress replays of the same play.
  OUTPUT: keep/drop per shot; only kept shots enter registration.

STAGE C — per-shot field registration
  1. Landmark detection, hybrid: learned keypoint model for LINE IDENTITY
     (Roboflow football-field-key-points-mvmjf or fine-tuned YOLO-pose on a
     football keypoint dataset) + classical white-paint/Hough for GEOMETRY.
  2. Correspondences → normalized DLT + RANSAC (10 px @1080p, scale w/ res).
  3. Anchor frame: first clean frame of the shot; seed identity, propagate
     bidirectionally across pan/zoom.
  OUTPUT per frame: H (3×3, field→image), or None.

STAGE D — temporal tracking
  9-DoF Kalman on vec(H_t); process noise regime-tuned
  (fixed cam σ_q≈0.001, moving/follow cam σ_q≈0.02).
  EMA fallback (α≈0.35) + jump rejection (>~170 px @1080p).
  Interpolate short gaps only between valid fits; null otherwise.
  Hard reset at every shot boundary.
  OUTPUT per frame: smoothed H, validity flag, confidence score.

STAGE E — projection
  Player ground-contact point (bbox bottom-center) → field (x, y) yards via H⁻¹.
  Airborne ball NEVER through the ground-plane map.

QC GATES (per frame; 720p reference)
  ≥6–8 non-collinear, vertically-spread correspondences · RANSAC ≤10 px ·
  inlier ratio ≥0.6 · held-out reprojection mean <5 px · jump gate.
  Frame failing any gate → None + gap handling. Long gap run → fail-loud with
  frame range; manual-keyframe fallback available.

OUTPUTS (per frame)
  H (3×3 float64) · valid: bool · confidence: float[0,1] · shot_id ·
  reproj_error_px · inlier_ratio · correspondences_used
  + per-shot/per-game completeness rate and mean held-out error for the log.

COST / LICENSE NOTES
  TransNetV2 MIT · PySceneDetect BSD-3 · TVCalib MIT (segmentation weights
  downloadable) · PnLCalib license UNVERIFIED — check before use ·
  Roboflow football keypoint model — Universe terms, verify before commercial use ·
  Nie et al. / SportsFields — no confirmed public weights; re-implement pattern.
  Build a small football keypoint dataset (200–500 labeled broadcast frames,
  NFL + NCAA) — the highest-leverage investment; no public equivalent of
  SoccerNet-Calibration exists for American football.
```

**Top open risks for the implementation spec:** (1) no public football keypoint dataset — budget labeling or adapt soccer models; (2) hash-band conditioning — mandate sideline/endzone correspondences in the detector spec; (3) competition misconfiguration — NFL template on NCAA data is a silent 3.58-yd hash bias, so competition must be validated input; (4) virtual first-down line ingestion — explicitly excluded in the landmark spec.
