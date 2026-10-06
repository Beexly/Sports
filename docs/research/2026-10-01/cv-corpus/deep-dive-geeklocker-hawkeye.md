# Deep-Dive: Geeklocker (Substack) — "The Math Behind the NFL's Decision to Call First Downs with Computer Vision"

**Source:** https://geeklocker.substack.com/p/the-math-behind-the-nfls-decision
**What was read (2026-10-01):** full article via `browser.open` — all 206 lines in two reads (0–147, 147–206). Accuracy ladder, technology-class summaries, the NFL Hawk-Eye deployment estimate with its arithmetic, the calibration/triangulation method description, frame-rate math, and the line-to-gain vs ball-spotting distinction all read in full.
**License:** newsletter — intel only; no code or data to ingest.
**Confidence:** HIGH — the article's numbers are its author's estimates from cited league/academic sources; each number below is labeled as the article's claim vs. the article's own arithmetic.

---

## 1. THE ACCURACY LADDER (article's numbers, from league internal testing / academic studies)

| System | Accuracy (article's claim) |
|---|---|
| MLB ball/strike calling (2020) | ±0.25" average |
| Wimbledon Hawk-Eye (2020) | ±0.10" mean error |
| FIFA semi-automated offside (2024) | est. ±1.6" |
| NFL Zebra RFID ball tracking (2024, per the NFL) | ±6" |
| CV in general (article's technology summary) | ~0.1" at up to 300+ fps |

Technology classes (article's 2-sentence summaries):
1. **GNSS** (GPS etc.): ~12" max accuracy, 10–18 Hz refresh. Low accuracy, low cost.
2. **LPS** (UWB beacons, e.g. Zebra): ~4" max, 10–20 Hz. Medium/medium.
3. **Computer vision:** accuracy "highly dependent on the cameras," ~0.1" up to 300+ fps. High accuracy, variable (generally medium) cost.

---

## 2. THE NFL HAWK-EYE DEPLOYMENT — THE ARTICLE'S ARITHMETIC, SHOWN

Deployment facts (from the NFL's press release, per the article): **Sony Hawk-Eye**, **six 8K cameras per stadium**, ring pattern at high elevation, angled down.

The article's theoretical-accuracy estimate, step by step:
1. Assume each camera covers ≤ **75 yards** of horizontal field so six cameras overlap length-wise from both sides.
2. 75 yards = **2,700 inches** of field width per camera frame.
3. 8K = **7,680 horizontal pixels**.
4. 2,700 / 7,680 = **≈ 0.35 inches per pixel** — the theoretical accuracy/precision floor.
5. The NFL told ESPN it expects **"half an inch"** — consistent with the 0.35" estimate (same order, margin for calibration error).

Cost note: 8K closed cameras cost **>$8,000 each**; 16K would be "extremely expensive today," plus bandwidth/networking — the article's explicit **cost-vs-accuracy tradeoff**.

## 3. CALIBRATION + TRIANGULATION METHOD (as described)

- A 3D CV tracking system needs **≥3 cameras** that can see the target (most use more).
- **Calibration:** operators correlate individual pixels (or pixel sets) in each frame to **known, fixed locations in the field of view** and record each camera's position.
- **Detection:** screen for specific color values / color changes between pixels, or object detectors like **YOLO**.
- **Position:** measure pixel distance between target and calibrated points; **multiple cameras triangulate** the 3D position.
- **Frame sync is critical:** all cameras must capture the *same exact moment*; otherwise the system analyzes contradicting images. Timing fluctuation, inter-frame position estimation, camera shake, and imperfect calibration all widen the uncertainty envelope — countered with **redundant views + advanced algorithms**.
- **Velocity:** compare positions across frames (distance / direction over time).

## 4. THE HONEST-LIMIT DISTINCTIONS

1. **Line-to-gain ≠ ball spotting.** The NFL is deploying Hawk-Eye *only* to measure first downs ("line-to-gain measurements") on a **static ball with clear multi-camera view** — *not* to spot the ball. The chain gang stays on the sideline as backup. The beachhead use case (static ball, clear view) is deliberately the easy one.
2. **Motion breaks the static math.** A player at max ~20 mph ≈ **350 inches/second**; at 100 FPS the camera sees the ball **once every ~3 inches**, requiring interpolation; and "those cameras might not even be able to see the ball at all for an extended period of time due to occlusion by players or refs."
3. **Why the NFL chose LPS first:** UWB radio "can travel through bodies and other objects (like pads)" — **no line of sight needed**, which is exactly what visual systems lack in a pile. The article's long-term call: a **hybrid CV + UWB** system for true ball-spotting.
4. **Object size vs. field of view:** "tracking smaller objects is more difficult because they occupy fewer pixels" — the dart-in-the-rafters extreme case. Applies directly to our distant-player recall problem.

---

## 5. GSE APPLICATION — calibration doctrine + gap (c) context

1. **The 0.35"/pixel arithmetic is the template for our homography error budget.** For our broadcast homography: `meters_per_pixel = field_width_covered / frame_width_px`, computed per frame from the estimated homography itself. Any GSE claim about tracking precision must be expressed as a multiple of this floor — never better than it. (This becomes K11 in the corpus: the accuracy ladder for calibration claims.)
2. **Frame-sync warning transfers to our multi-angle future:** if we ever fuse broadcast + All-22 angles, the sync requirement is the first thing to verify, before any triangulation math.
3. **The occlusion argument (UWB vs CV) is the strongest external validation of our gap-(a) priority:** the article independently concludes that line-of-sight occlusion is *the* hard problem for visual tracking in football — which is why our detector-recall-on-piles work outranks marginal association tuning.
4. **"Hawk-Eye measures line-to-gain, not ball spotting"** is the honest-limit kernel for any officiating-adjacent GSE claims (K12).

---

## 6. IMPLEMENTATION SPEC

**Target files:**
- New: `packages/prediction-engine/src/tracking/cv-calibration-report.ts` — computes and reports the per-frame theoretical accuracy floor from the estimated homography; attaches it to every tracklet batch as provenance.
- Test: `packages/prediction-engine/src/tracking/cv-calibration-report.test.ts`.
- Consumes the `Homography` type from `cv-movement-primitive.ts` and correspondences from `cv-homography.ts`.

**Pseudocode (clean-room):**

```
function accuracyFloor(H: Homography, frameWidthPx: number): { metersPerPixel: number; inchesPerPixel: number }
  # sample the homography's scale at frame center: how many field-meters one pixel spans
  p0 = applyHomography(H, { xPx: frameWidthPx/2, yPx: frameHeight/2 })
  p1 = applyHomography(H, { xPx: frameWidthPx/2 + 1, yPx: frameHeight/2 })
  metersPerPixel = hypot(p1.xM - p0.xM, p1.yM - p0.yM)
  return { metersPerPixel, inchesPerPixel: metersPerPixel * 39.3701 }

function calibrationReport(H, frameWidthPx, correspondences): Report
  floor = accuracyFloor(H, frameWidthPx)
  # reprojection error of the correspondences actually used in the DLT fit
  reprojErr = mean over correspondences of |applyHomography(H, px) - field|  (meters)
  # honest claim: never state precision better than max(floor, reprojErr)
  claimablePrecision = max(floor.metersPerPixel, reprojErr)
  return { metersPerPixel, reprojectionErrorM: reprojErr, claimablePrecisionM: claimablePrecision,
           cameraCount: 1, note: 'single broadcast camera — no triangulation; sync N/A' }
```

**Test assertions with expected values:**
1. Synthetic homography mapping 1920 px → 53.3 yards wide (sideline view): assert `metersPerPixel ≈ 48.74/1920 = 0.02539` m/px (tol 1e-6) and `inchesPerPixel ≈ 1.0` (tol 0.01) — the sanity anchor: a full-width sideline shot gives ~1 inch per pixel.
2. Perfect correspondences (4 points exactly consistent with H) → `reprojectionErrorM === 0` (tol 1e-9), `claimablePrecisionM === metersPerPixel`.
3. Noisy correspondences (±0.5 m noise) → `claimablePrecisionM >= 0.5` (the noise dominates the pixel floor — the honest-limit behavior).
4. Report includes the literal string `'single broadcast camera'` in the note field (documents the no-triangulation limit).

**Done/verified criteria:** report attached to pipeline output in `cv-pipeline.ts`; every published speed/distance number carries its `claimablePrecisionM`; a test pins the 1-inch-per-pixel sideline sanity anchor.

---

## 7. IMPROVEMENT PATH
1. **Now:** land the calibration report — it converts the article's doctrine into a computed, test-pinned guarantee.
2. **Next:** extend to two-angle fusion if All-22 becomes available — the article's sync requirement becomes the acceptance test (timestamp alignment verified before triangulation).
3. **Later:** the hybrid CV+UWB argument is a strategic note, not a build item — we don't have UWB; our answer to occlusion is the detector + association work, and the article tells us that's the right fight to pick.

---

## 8. EVIDENCE / CONFIDENCE
- **Confidence: HIGH.** Every number above is the article's stated claim or its shown arithmetic (2,700/7,680 = 0.3516 → "roughly 0.35""). The article's own caveats (simplifying assumptions, "generous" coverage estimate) are preserved.
- No code or text copied.
