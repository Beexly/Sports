# Deep Dive: Ajmeri & Shah — "Using Computer Vision and Machine Learning to Automatically Classify NFL Game Film and Develop a Player Tracking System"

**Source:** `https://fourtverts.s3.amazonaws.com/assets/usingcomputervisionforfootballtracking.pdf`
**What was read:** Full PDF, 9 pages (~349 lines extracted text), MIT Sloan Sports
Analytics Conference 2018, Paper Track "Other Sports", Paper ID #5571. Sections read in
full: 1 Introduction; 2 Data (screenshot capture at 5 fps, Hough-lines standardization
pipeline — line detection, heuristics, line-of-scrimmage via O-line proximity, camera
rotation via arccos, NFL-logo removal); 3 Formation Identification (jersey-color player
detection, 3.1 player locations, 5 classifier comparison with Tables 1–2, 3.2 formation
prediction with Tables 3–4, play-by-play merge Tables 5–6, McVay tendency analysis);
4 Player Tracking (Euclidean distance, per-screenshot yard calibration from 5-yard line
spacing, frame-1 reference-point drift correction, the worked DeSean Jackson speed
example, yards→mph conversion chain); 5 Conclusion (5.1 summary, 5.2 limitations —
jersey-color RGB variance under shadows/sunlight, 5.3 future work — defensive
formations, kickoff/punt, RFID). All tables and the speed equation read; figures
referenced via captions/text.

**License note:** Sloan conference paper (authors Omar Ajmeri, Ali Shah). Clean-room
method description — no text or code copied.

**Relevance to GSE gap (c):** MEDIUM. This is **All-22 film** (fixed high sideline
camera), not broadcast — its geometry assumptions do not transfer wholesale. Value is
in three narrow, extractable kernels: (1) **rotation deskew via arccos** as a cheap
preconditioner that makes Chung's angle filters tight and reliable; (2) **per-frame
yard-scale calibration from 5-yard line spacing** as an *independent* cross-check on
any homography we fit; (3) the **frame-1 reference-point drift correction** pattern,
which is the ancestor of the temporal landmark smoothing we want.

---

## METHOD (step by step, with the math)

### 1. Standardization pipeline (§2)

Input: screenshots of All-22 film captured at **5 frames/second** (Washington home
games; 2015 season used for the tendency analysis).

a. **Hough Lines** to find candidate field lines. "Many of the lines we found were often
   superfluous" → **heuristic filtering** to keep only the full-field white lines
   (the paper doesn't publish the heuristic details — longest lines spanning the frame
   is the natural reading; treat as [RECONSTRUCTED]).
b. **Line of scrimmage from O-line proximity:** the LOS is the detected full-field
   line nearest the offensive line's pixel mass. (Same anchoring instinct as Chung's
   failed gradient attempt, but on All-22 the O-line is a clean horizontal band, so it
   works there.)
c. **Camera rotation via arccos:** using the LOS and "the accompanying perpendicular
   line" (the field-axis line — the hash-mark line direction). The paper gives only the
   phrase "arccos(x)".
d. **Extraneous-part removal**, notably the NFL logo in the bottom-right corner
   (a fixed-position mask — same idea as Chung's score-bug mask, different artifact).

### 2. Rotation math (reconstructed — the paper underspecifies)

What the paper states: rotation of the camera relative to the field is computed through
`arccos(x)` using the LOS and its perpendicular companion line. The defensible
reconstruction:

- Let **v_axis** be the unit direction vector of the detected field-axis line (the
  companion perpendicular to the LOS — in practice the hash-mark line direction), in
  image coordinates.
- In canonical orientation the field's long axis is horizontal: e_x = (1, 0).
- Camera roll angle: **φ = arccos(v_axis · e_x)**, with the sign taken from the
  cross product (v_axis × e_x)_z so the deskew rotates the correct way.
- Deskew: rotate the image by −φ about its center. After this, yard lines are
  near-vertical and the hash line near-horizontal — which is exactly the precondition
  Chung's ±12° angle filters assume.

Why use the *pair* of lines rather than one: a single detected line's angle is noisy
(Hough quantization + line-fit skew, which Chung also documents); the perpendicular
pair lets you average two independent angle estimates (φ from the axis line, φ from
LOS − 90°) or enforce consistency between them. [RECONSTRUCTED rationale; the paper
only names arccos and the two lines.]

Honest limitation: this corrects **rotation only** (2D image rotation), not
perspective. It is valid as a *preconditioner* for broadcast side views where the
camera is roughly level; the full projective correction is still the DLT's job.

### 3. Per-screenshot yard calibration (§4) — the cross-check kernel

"the coordinate distance of 1 yard is derived **individually for each screenshot**
using the distance between the full field white lines every 5 yards."

- Yard lines are painted every 5 yards. Detect adjacent full-field lines, measure
  their pixel separation d_5yd, then **px_per_yard = d_5yd / 5**, recomputed per frame.
- In the worked example this calibration is "~82 d" (distance units) per yard.

GSE use: after `fitHomographyDLT` returns H, extract the local scale at the image
center (‖∂(xM,yM)/∂(xPx,yPx)‖ — meters per pixel, invert to px per meter, ×0.9144 →
px per yard) and assert it agrees with the independently measured px_per_yard from
line spacing within tolerance (start: 10% [DERIVED]). A H whose scale disagrees with
the line-spacing measurement is geometrically inconsistent — reject it. This catches
bad fits that pass reprojection on their (possibly mislabeled) fitting points.

### 4. Frame-1 reference-point drift correction (§4)

"the coordinate location of the **highest point in a full field white line in the
first image** is saved as a reference point, and is used to ensure that coordinate
distances of players are not being overrepresented or underrepresented as the camera
follows the play."

Translation: pick a stable field landmark in frame 1; in later frames, subtract its
displacement before measuring player motion — a 2D translation-only camera-motion
compensation. GSE generalization: our per-frame H already absorbs camera motion, but
the *pattern* (anchor on persistent field landmarks, smooth across frames) is the
right one — it becomes the temporal landmark smoothing in our improvement path
(exponentially-weighted yard-line parameters keyed across frames within a shot).

### 5. Speed from tracked positions (§4)

Euclidean distance between successive positions:

```
d(p, q) = √((q1 − p1)² + (q2 − p2)²)
```

Worked example (DeSean Jackson top speed): 215.5 distance-units over 0.2 s (5 fps),
× (1 yard / ~82 d) = 12.8 yd/s; then 12.8 yd/s × 3 ft/yd = 38.4 ft/s; /5280 ft/mi ×
3600 s/hr = **26.2 mph**. (The paper notes this reads high vs. Next Gen Stats and
recommends *relative* comparison across players, not absolute values — an honest
calibration caveat we should inherit: our CV speeds validate *ordering and shape*,
not the absolute number, until calibrated against ground truth.)

Acceleration application: first 0.6 s off the line — Jackson 22.4 mph vs. Harris
19.3 mph — i.e., finite-difference velocity from the same Euclidean machinery. This
is directly reusable as a sanity check on our tracklet velocities in
`cv-tracklet-association.ts`.

### 6. Formation classification results (§3) — context, not gap (c)

Players found by jersey color (burgundy) + LOS-relative coordinates (QB = blue square
reference); 500+ auto-tagged formation images. Classifiers on coordinate features:
CART best — 86.5% QB position (Center/Shotgun/Pistol; Pistol precision .50/recall
.12 on tiny samples), 72.3% formation over 29 classes. Included for completeness;
GSE's formation lane is separate from gap (c).

### 7. Documented limitations (§5.2) — directly relevant warnings

- **Jersey-color tracking breaks under shadows/sunlight RGB variance.** Any
  color-threshold stage in our pipeline (HSV white filter included) inherits this:
  white paint in shadow shifts hue/saturation. Mitigation: adaptive thresholds or
  per-frame white-point normalization — do not hard-code one HSV range for all
  stadiums/times of day.
- Small training sample (500+ images); accuracy expected to scale with data.
- Play-by-play merge standardizes LOS to a 1–99 scale (own 20 = 80) — a convention
  worth mirroring in our template coordinate docs.

---

## DATASETS

- 500+ screenshots at 5 fps from Washington home All-22 film (2015 season for the
  published tendency analysis), auto-tagged with formation coordinates. **Not released**
  with the paper; underlying film is NFL Game Pass content — GSE cannot reuse it,
  only the method.
- Play-by-play scraped from the NFL Game Pass UI (Table 5/6 schema), merged by
  image filename.

## GSE APPLICATION (gap c)

Three narrow kernels, in priority order:

1. **Rotation deskew as a preconditioner for Chung's pipeline.** Run Sloan's
   arccos deskew on the white-mask line set *before* Chung's angle filtering. Effect:
   the "vertical yard line / horizontal hash line" filters can use tight tolerances
   (±6–8° instead of ±12°+), cutting false-line acceptance roughly proportionally.
   Cheap (one Hough pass reused), no new detectors.
2. **Per-frame px/yard as an independent H validator.** `calibrateYardScale()`
   from detected 5-yard spacing; cross-check against the fitted H's local scale.
   Disagreement ⇒ reject H. This is the only *label-free* H validation in the
   corpus besides Mendez's warp overlay — and the two compose (photometric +
   geometric).
3. **Reference-point pattern → temporal smoothing.** Persistent yard-line identity
   across frames within a shot; smooth (rho, theta) with exponential weighting;
   full re-detect on shot change. Directly addresses Chung's "Hough lines often
   skewed by noise" failure mode.

What does NOT transfer: the LOS-from-O-line-proximity step assumes All-22's clean
horizontal O-line band; on broadcast sideline views the O-line is a foreshortened
cluster — use our play-context LOS instead (as in the Chung spec). The jersey-color
player finder is irrelevant to gap (c) and carries the documented RGB-variance
fragility.

## IMPLEMENTATION SPEC

New/changed code in `packages/prediction-engine/src/tracking/`:

- CREATE `cv-rotation-deskew.ts`:
  ```ts
  export function estimateRollAngle(yardLines: ImageLine[], hashLine: ImageLine): number
    // φ = arccos(v_axis · e_x), sign from cross product; average with (φ from LOS − 90°)
  export function deskewFrame(frame: Frame, phi: number): Frame
  ```
  Called in `cv-pipeline.ts` between white-mask extraction and Chung's angle
  filtering. `ImageLine` type imported from `cv-field-landmarks.ts`.
- ADD to `cv-field-landmarks.ts`:
  ```ts
  export function calibrateYardScale(yardLines: ImageLine[]): number  // px per yard, per frame
  ```
- ADD to `cv-homography.ts` (or the guard module):
  ```ts
  export function validateHomographyScale(h: Homography, pxPerYardMeasured: number,
                                          at: Pt, tolerancePct: number): void
    // local scale of H at `at` (image center) vs measured; throw/reject on disagreement
  ```
- MODIFY `cv-pipeline.ts`: pipeline order becomes
  `maskScoreBug → whiteMask → Hough → estimateRollAngle → deskew → Chung angle filters
   → landmarks → guard → fitHomographyDLT → scale cross-check`.

TEST ASSERTIONS (implement first):
1. **Deskew accuracy:** synthetic field rotated by exactly 12° (plus noise lines);
   `estimateRollAngle` recovers φ within **0.5°**; after deskew, all true yard lines
   fall within ±2° of vertical.
2. **Yard-scale calibration:** synthetic with known 96 px per 5-yard spacing →
   `calibrateYardScale` returns 19.2 px/yard within **5%**.
3. **Scale cross-check catches bad H:** fit H on deliberately mislabeled yard lines
   (labels shifted by one 5-yard interval); reprojection on fitting points is small
   but `validateHomographyScale` rejects (scale mismatch > tolerance) — proves the
   check catches what residuals miss.
4. **Shadow robustness (documents the §5.2 limitation):** synthetic frame with a
   shadow gradient halving V in part of the field; assert the white filter stage
   exposes a `lightingVariance` metric and the pipeline *flags* the frame rather
   than silently returning skewed lines.

"Done and verified" = deskew + scale-calibration + cross-check implemented with the
4 assertions green; pipeline logs per-frame px/yard and H-scale agreement on a real
clip.

## IMPROVEMENT PATH (beyond Sloan)

1. **From rotation-only to full projective:** Sloan's deskew is the initializer; the
   DLT does the real work. Log φ per frame — sudden φ jumps are a free shot-change
   detector (reset temporal smoothing there).
2. **Adaptive white filtering:** answer the §5.2 RGB-variance limitation with
   per-frame white-point estimation (e.g., sample known-bright field regions) instead
   of fixed HSV bounds.
3. **Reference-point tracking generalized:** replace the single frame-1 point with a
   small set of persistent landmarks (2–3 yard-line intersections) tracked across
   the shot; use their reprojection drift as a running H quality metric.
4. **Speed sanity harness:** reuse the d(p,q)/fps → yd/s → mph chain as a unit-test
   oracle for tracklet velocities (gap b lane): a synthetic constant-velocity
   tracklet must recover its speed within 5%.

## Confidence

- **High:** pipeline structure (Hough → heuristics → full-field lines → LOS →
  arccos rotation → logo removal), 5 fps capture, per-screenshot 5-yard-spacing
  calibration, frame-1 reference-point drift correction, the Euclidean speed math
  and the full yards→mph conversion chain, the 26.2 mph worked example, classifier
  tables, and both documented limitations. All read in the 9-page paper.
- **Medium:** the arccos reconstruction (exact operands of "arccos(x)" are
  [RECONSTRUCTED] — the paper gives the function and the two lines, not the formula)
  and the superfluous-line heuristic details (not published).
- **High:** the All-22-vs-broadcast caveat — the paper's figures and text describe
  the elevated sideline view throughout; transfer limits are stated, not assumed.
