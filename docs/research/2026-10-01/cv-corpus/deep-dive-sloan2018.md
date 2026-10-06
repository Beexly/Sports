# Deep Dive — Sloan 2018 Paper #5571: "Using Computer Vision and Machine Learning to Automatically Classify NFL Game Film and Develop a Player Tracking System" (Omar Ajmeri Ali Shah)

## What was actually read + how obtained

- **FULL TEXT READ** — the complete 9-page paper, all sections: 1. Introduction, 2. Data, 3. Formation Identification (3.1 Player Locations, 3.2 Formation Prediction, 3.2 Play-by-play data), 4. Player Tracking, 5. Conclusion (5.1 Summary, 5.2 Limitations, 5.3 Future Work). All tables (1–6) and the worked speed-calculation example.
- **Source (legitimate):** public PDF downloaded from two independent hosts and cross-checked identical (9 pages each):
  - `https://fourtverts.s3.amazonaws.com/assets/usingcomputervisionforfootballtracking.pdf` (public S3 asset surfaced by web search; byte-identical content to the Sloan submission)
  - `https://cdn.prod.website-files.com/68d6be744d7efccc2207f571/68d6be744d7efccc22080647_Using Computer Vision and Machine Learning to Automatically Classify NFL Game Film_2018poster.pdf` (the Sloan Sports Analytics Conference's own CDN)
- The sloansportsconference.com research-paper page itself carries only the abstract — the full text came from the alternates above. Text extracted locally with `pdftotext` (349 lines).
- **Confidence: HIGH** — complete document, method-level detail, all numbers transcribed from the extracted text.

## METHOD (clean-room description, in my own words)

Pipeline input: screenshots of NFL "All-22" game film (Washington Redskins home games), captured at 5 frames/second. No labeled film existed, so the authors built the dataset manually.

**Stage 1 — Geometric standardization.**
1. Run a Hough line transform over the screenshot to find straight line segments. Many detections are spurious, so heuristic filters keep only the long, full-field white yard lines.
2. Identify the line of scrimmage (LOS) as the yard line nearest the offensive line's position.
3. Compute the camera's rotation relative to the field from the LOS direction and a perpendicular to it, using an arccosine formulation: the angle between the detected line direction and the image axes gives the rotation needed to make yard lines axis-aligned. Rotate the image so lines are perpendicular/parallel.
4. Crop extraneous regions (notably the NFL logo in the bottom-right corner).

**Stage 2 — Player localization (pre-snap).**
Players are found by jersey-color analysis (burgundy for the Redskins case) seeded near the LOS. Each player's image X/Y is recorded relative to the quarterback (marked with a blue square in their figures). Extra handling was added for tightly clustered offensive linemen (merged color regions). This produced an auto-tagged training set of 500+ formation images with player coordinates.

**Stage 3 — Formation classification (two levels).**
- Level 1 (component features): five classifiers compared on coordinate features to predict sub-components — QB position (Shotgun / Under Center / Pistol), RB/WR/TE counts and locations. Results (QB position accuracy): CART 86.5%, Naive Bayes 67.5%, SVM 56.1%, k-NN 49.8%, Logistic Regression 42.9%. Classification report for CART: Center precision 0.82 / recall 0.92; Shotgun 0.90 / 0.84; Pistol 0.50 / 0.12 (Pistol starved of training data); averages 0.84 / 0.85.
- Level 2 (formation): components summed into a formation label (29 formations). CART again best: 72.3% accuracy (NB 68.8%, SVM 64.6%, kNN 64.1%, LR 55.6%). Top-5 formations by sample: Singleback Ace (P 0.86 / R 0.90), Singleback Ace Pair Slot (0.84 / 0.74), Spread Center (0.81 / 0.88), Spread Gun (0.81 / 0.86), Empty Trips Gun (0.76 / 0.70).
- CART won both levels — worth noting for GSE: on small, coordinate-feature datasets, a tuned tree beat SVM/kNN.

**Stage 4 — Play-by-play fusion.**
NFL Gamepass play descriptions were parsed into structured fields (down, distance, LOS, time, play type, direction, run location/pass type, completion, intended receiver, yards). LOS yard line was standardized to a 1–99 scale (own 1-yard line = 1 … opponent's 20 = 80). Example analysis: Sean McVay's 2015 play-calling tendencies filtered by down/distance/field/time, e.g. ~60% more likely to run on 1st-&-6+ on his own half with 2+ min left; Singleback Ace Pair Slot splits (65% of runs right; 81% of passes short; 4.6 yds/pass vs 2.5 yds/run).

**Stage 5 — Player tracking + speed.**
- Track each player's X/Y across the 5-fps frames through the play; distance via Euclidean distance d(p,q) = sqrt((q1−p1)² + (q2−p2)²).
- **Per-screenshot yard calibration:** the pixel distance of one yard is derived *individually for each screenshot* from the spacing between full-field white lines (which are known to be 5 yards apart). In their worked example, 5 yards ≈ 410 coordinate units, so 1 yard ≈ 82 units.
- **Camera-follow drift correction:** the image coordinate of the highest point of a full-field white line in the *first* frame is saved as a reference anchor; every subsequent frame's player coordinates are adjusted against that anchor so the panning camera doesn't inflate/deflate distances.
- **Speed:** distance(yards) / elapsed(seconds) → yd/s → ft/s (×3) → mph (÷5280, ×3600). Worked example for DeSean Jackson: 215.5 units / 0.2 s × (1 yd / 82 units) = 12.8 yd/s = 26.2 mph. The authors explicitly note this reads high vs. Next Gen Stats and should be used only for *relative* comparisons (e.g., Jackson 22.4 mph vs. Maurice Harris 19.3 mph in the first 0.6 s off the line; Pierre Garçon's comeback route ran 1.3 fewer yards than Jackson's because of a tighter 180° break).
- Throughput claim: labeling formations for a full game (~50 offensive plays) in under 5 minutes.

**Limitations (authors' own):** small training set (expect accuracy to scale with data); jersey-color RGB tracking is fragile to shadows/sunlight; no RFID ground truth to validate against.

**Future work (authors'):** defensive formations; kickoff/punt coverage; NCAA and high-school with stationary cameras.

## DATASETS

- Washington Redskins home-game All-22 screenshots at 5 fps, hand-built; 500+ auto-tagged formation images. **Not publicly released** (no link in the paper; built from NFL Gamepass footage, so redistribution would be an NFL rights issue).
- No license; treat as unavailable. GSE must replicate the *method* on its own footage.

## GSE APPLICATION

- **Gap (c) — automatic 2D field-landmark detection for homography (PRIMARY).** This paper is the closest public recipe for what `cv-homography.ts` needs: its DLT works, but the branch notes it "FAILS on yard-lines-only input, needs true 2D landmarks." Sloan's Stage 1 *is* a yard-line-to-geometry front end: Hough → full-line filter → LOS-by-proximity → arccosine rotation rectification → per-screenshot yard scale from 5-yard line spacing. Two direct transfers:
  1. **Yard-line landmark extractor** — detect full white yard lines, intersect them with the detected field boundary/sidelines, and emit those intersections as 2D correspondences (yard-line endpoints are *true 2D landmarks*, not just lines). This converts "yard-lines-only" input into DLT-usable points.
  2. **Affine failsoft fallback** — when <4 landmarks survive, fall back to a similarity/affine map built from the per-screenshot yard scale (Sloan's 1-yard ≈ 82-unit derivation) plus the arccosine rotation. The pipeline already documents `fitHomographyFromYardlines()` as a scale/offset approximation; Sloan's rotation-aware version is strictly better and costs one Hough pass.
- **Gap (b) — motion-aware association (SECONDARY).** The frame-1 reference-anchor drift correction is a poor-man's camera-motion compensation and validates the design already in `cv-pipeline.ts` (`estimateCameraMotion`/`compensateCameraMotion`): anchor-based correction is *less* general than dense motion fields, so Sloan corroborates our approach rather than replacing it. Adoptable detail: anchor on the highest point of a detected full white line as a cheap global-shift estimator for clips where dense flow is unreliable.
- **Gap (a) — detector recall on piles (TERTIARY).** Their "tweaks for closely clustered offensive linemen" = splitting merged color blobs — the classical ancestor of a pile-splitting post-processor. Their color-based team assignment also maps to GSE's `teamHint` field on `Detection`: a jersey-color check inside a detection box is a cheap, explainable team prior before any learned re-ID.

## IMPLEMENTATION SPEC

### Kernel S1 — `cv-field-lines.ts` (NEW): Hough yard-line detector → rotation + yard scale
Pseudocode (clean-room, my own formulation):
```
function detectFieldLines(gray: GrayscaleFrame): FieldLines
  // 1. Edge map (Canny or Sobel threshold; parameters in options)
  edges = edgeDetect(gray, opts.cannyLow, opts.cannyHigh)
  // 2. Hough line transform -> (rho, theta) accumulator peaks
  raw = houghLinesP(edges, rhoRes=1, thetaRes=PI/180, voteThreshold)
  // 3. Keep only long, near-horizontal (in field terms) full-width lines:
  //    length >= 0.55 * imageWidth, angle within ±8° of dominant orientation
  full = filterFullYardLines(raw, imageWidth)
  // 4. LOS = full line with min pixel distance to offensive cluster centroid
  //    (offensive cluster = detections with teamHint == offense near center)
  // 5. Rotation: theta = arccos( dot(lineDir, imageXAxis) ); rectify
  // 6. Yard scale: median spacing between adjacent parallel full lines / 5.0
  return { lines: full, los, rotationRad, pixelsPerYard }
```
- Repo files: CREATE `packages/prediction-engine/src/tracking/cv-field-lines.ts`; CREATE `cv-field-lines.test.ts`; wire into `cv-pipeline.ts` as an optional pre-pass feeding `fitHomographyDLT()` correspondences (intersections of yard lines with field-boundary lines) and as the affine-fallback input.
- TEST ASSERTIONS:
  - Synthetic 1280×720 field image, 6 yard lines, camera rotation 7.3°: `rotationRad` within ±0.5° of 7.3°; `pixelsPerYard` within 1% of ground truth; all 6 lines detected, 0 false positives.
  - Known homography reprojection check (ties to existing `cv-homography.test.ts` style): on synthetic image with known H, landmarks from `detectFieldLines` → `fitHomographyDLT` reprojection error < 2.0 px.
  - LOS proximity: synthetic offensive cluster centered at y=400; LOS selected is the yard line nearest y=400.
- Done/verified: all three assertions green; runs on a real broadcast frame fixture without throwing (accuracy on real frames logged, not gated).

### Kernel S2 — frame-1 anchor drift correction (in `cv-movement-primitive.ts` or new `cv-anchor-correction.ts`)
Pseudocode:
```
function anchorDriftCorrection(frames: FramePoint[][], anchors: Point[]): FramePoint[][]
  // anchors[i] = highest point of a tracked full white line in frame i
  ref = anchors[0]
  return frames.map((pts, i) => pts.map(p => ({...p, xPx: p.xPx - (anchors[i].x - ref.x),
                                                     yPx: p.yPx - (anchors[i].y - ref.y)})))
```
- TEST: synthetic 10-frame pan of exactly 120 px in x; player stationary at (500,300). After correction, player's world xM within 2 px of frame-1 value across all frames.
- Done/verified: assertion green; documented as the cheap fallback when `estimateCameraMotion` confidence is low.

### Kernel S3 — color-based team prior for `teamHint` (extends detector post-processing)
Pseudocode: for each detection box, sample the jersey region (upper third of box), compute median hue; assign `teamHint` by nearest of the two known team hue centroids (learned per game from pre-snap frames). Pile-adjacent use: when two boxes overlap with IoU > 0.6 and hues differ, keep both (prevents NMS from merging cross-team pile detections).
- TEST: fixture frame with 2 known team hues (e.g., burgundy 350° vs white); 20 synthetic boxes → teamHint accuracy 100%; overlapping cross-team pair both survive.
- Done/verified: assertions green; clearly labeled as a *hint* (downstream may override).

### Kernel S4 — CART-over-coordinates formation sub-classifier (experiment, NOT wired to production)
Replicates their Level-1 finding on GSE's own labeled formation set: decision tree on (QB-relative X/Y of 11 offensive players) → personnel/QB-position. Purpose: cheap baseline to beat before any learned formation model.
- TEST: on GSE's formation fixture set, CART accuracy ≥ 60% on QB-position 3-class (paper: 86.5% on their data; our bar is "beats chance + margin" as a sanity baseline).

## IMPROVEMENT PATH (beyond the paper)

1. Replace RGB jersey-color with a learned team-embedding (or even the paper's own weakness: shadows/sunlight) — color stays only as the `teamHint` prior, never as identity.
2. Upgrade Hough lines to a learned field-marking segmentation (e.g., a small U-Net or YOLO-seg on field lines); Hough remains the CPU-cheap fallback. The paper's heuristic line filtering is the brittle part — learned segmentation removes it.
3. Their 5-fps All-22 pipeline assumed a static camera; GSE's broadcast feed needs the dense camera-motion compensation we already have — keep Sloan's anchor method strictly as fallback.
4. Their speed numbers were inflated (26.2 mph) because pixel noise × per-frame differencing amplifies error; GSE should smooth trajectories (Savitzky–Golay or Kalman) *before* differencing — the paper never smooths.
5. Validate against any available RFID/NGS-style ground truth before trusting absolute speeds (their own stated limitation); ship only relative metrics until then.

## Confidence + evidence

- **HIGH** — full 9-page text read from two legitimate public hosts; every number above (86.5%/72.3% CART, 29 formations, 500+ images, 5 fps, 1 yd ≈ 82 units, 26.2 mph worked example, 5-minute/game claim) transcribed directly from the extracted text. Method paraphrased clean-room; no text or code copied.
