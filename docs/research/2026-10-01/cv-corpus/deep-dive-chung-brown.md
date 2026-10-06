# Deep Dive: John Chung (Brown, May 2024) — Field Mapping for Formation Extraction

**Source:** `https://cs.brown.edu/media/filer_public/2b/77/2b7792b0-3559-44fa-b7d9-f7572e1c3db5/chungjohn.pdf`
**What was read:** Full PDF, 30 pages, TeX-produced (pdfTeX 1.40.25), ~770 lines of extracted text.
Sections read in full: Abstract; Ch 1 Introduction; Ch 2 Related Work; Ch 3 Methods in full —
3.1 Data Collection (3.1.1 play-by-play, 3.1.2 images), 3.2 Pre-processing (3.2.1 pre-snap features,
3.2.2 image preprocessing: score-bug removal, field-boundary detection), 3.3 Logistic Regression,
3.4 Transfer Learning with VGG-16, 3.5 Formation Extraction in full — 3.5.1 YOLOv3 player
detection, 3.5.2 yard-line detection via Hough, 3.5.3 hash-mark line detection via LoG blobs +
Hough, 3.5.4 yard-line labeling (both failed attempts); Ch 4 Results; 4.1 Limitations; 4.2 Future
Work; Ch 5 Conclusion; full Bibliography (21 refs). Figure captions 3.1–3.11 and 4.1 read;
figures themselves not visible in text extraction (captions carry the method evidence).

**License note:** © 2024 John Chung, Brown University honors thesis — copyrighted, not
open-licensed. This file is a clean-room method description: no text or code copied.

**Relevance to GSE gap (c):** HIGHEST of the three sources. This is the only source that
produces *automatic 2D field landmarks* (yard lines + hash marks → intersections as
correspondence points) from broadcast video, and it documents exactly where the pipeline
breaks (yard-line labeling). It is also the only one whose preprocessing order answers the
score-bug question.

---

## METHOD (step by step, with the math)

### Stage 0 — Data collection (context for the pipeline's operating conditions)

- Source footage: 8 Notre Dame home games, 2021–2022 seasons, downloaded from NFL-Video
  (televised broadcast replays) via JDownloader. Broadcast (not All-22): Skycam + sideline
  cameras, moving/zooming — the same regime as GSE's broadcast input.
- Play-by-play from SportsDataStuff (124 raw features → 6 pre-snap features after filtering).
- **Frame selection via OCR on the score bug:** the broadcast score bug sits at the bottom of
  the frame. The author manually located the quarter/clock region **once per video**
  (bug position is constant within a match), cropped each frame to that region, ran OCR,
  and used the extracted (quarter, time-remaining) as the image filename. Frames the OCR
  could not parse were discarded (no score bug ⇒ camera not on the field ⇒ irrelevant).
- Because the play clock pauses, many frames share the same clock reading; the author saved
  the **penultimate** frame of each stopped-clock window (last frame ≈ ball snap; pre-snap
  only). Matching to play-by-play: look up the play's (quarter, clock) filename; if missing,
  scan forward up to 40 s (play-clock window) or up to the next play's start, first match wins.
- All images manually verified afterward; unmappable plays dropped. Final: **450 images**.

### Stage 1 — Preprocessing (score-bug + field-boundary masking)

Exact pipeline order, which matters:

1. **Score-bug removal first:** crop the image at the score-bug region (coordinates located
   once per video during collection, §3.2.2: "we assumed that any visual elements important
   to the game would be situated above the score bug"). Rationale: the bug contains white
   text and graphics that would inject false votes into every downstream line detector.
2. **Field-boundary detection:**
   a. Filter for white in HSV color space (no numeric HSV range given — see Parameter Gap).
   b. Canny edge detection on the white mask.
   c. Hough line transform on the edges.
   d. **Angle filtering: keep near-horizontal lines** (the near sideline runs horizontally in
      broadcast side views) to separate the boundary from yard lines.
   e. If multiple boundary candidates: **take the average line**.
   f. Mask the original image with this line — everything below/above the boundary (stands,
      sideline personnel, coaches) is removed. (Fig. 3.6 shows bug + off-field content removed.)

### Stage 2 — Yard-line detection (§3.5.2)

Same white→Canny→Hough procedure as boundary detection, but the angle filter is flipped:
**keep near-vertical lines**, because yard lines run vertically across the field in broadcast
side views (Fig. 3.9 shows detected yard lines overlaid in blue).

### Stage 3 — Hash-mark line detection (§3.5.3) — the key technical contribution

Direct Hough fails on hash marks: the marks are short segments separated by gaps, so the
Hough accumulator's collinear-point count is noise-dominated, and white-jerseyed opposing
players near the marks skew the fit. The thesis's fix:

1. **Laplacian-of-Gaussian (LoG) blob detection** on the image first. The LoG operator
   (∇² of a Gaussian-smoothed image) responds strongly to compact bright/dark regions at
   the scale of the Gaussian σ — it finds *blobs*, not edges.
2. **Radius filtering: keep only small-radius blobs.** Hash marks are small relative to
   players and other field markings, so small-radius blobs isolate hash-mark candidates
   while rejecting players and yard lines (Fig. 3.10).
3. **Hough transform over the filtered blobs**, with **angle filtering for horizontal
   lines** (hash marks run perpendicular to yard lines). The surviving line is the
   hash-mark line (Fig. 3.11).

In clean-room pseudocode:

```
mask      = hsvWhiteFilter(frame)              # white field paint
edges     = canny(mask)
yardLines = houghLines(edges) |> keepIf(angle ≈ vertical)
blobs     = logBlobDetect(frame) |> keepIf(radius < R_SMALL)
hashLine  = houghLines(blobsAsPoints) |> keepIf(angle ≈ horizontal)
landmarks = { yardLines, hashLine }
```

### Stage 4 — Correspondence points (§3.5, following ref [19])

With yard lines and the hash-mark line known, **each yard-line ∩ hash-mark-line
intersection is a correspondence point** between the image and a canonical field model.
These are true 2D correspondences (non-colinear by construction — this is exactly what
breaks the degeneracy in our DLT), suitable for a perspective/homography transform that
produces a bird's-eye view for formation extraction. The author proved feasibility by
**manually** computing one such homography and extracting the formation (Fig. 4.1).

### Stage 5 — Yard-line labeling (§3.5.4) — DOCUMENTED FAILURE

Labeling (which detected line is the 30 vs. the 40) is required to map intersections to
field coordinates. Two attempts, both failed:

1. **Template matching of yard numerals:** gathered per-game templates of the painted
   numerals 10–50, ran template matching per play image. **Failed** because broadcast
   views rotate/scale the numerals and template matching is invariant to neither.
2. **Line-of-scrimmage anchoring:** used the play-by-play LOS yard value; assumed the LOS
   sits at the image region of highest y-gradient (dense linemen ⇒ high gradient).
   **Failed** due to noise.

**Thesis's own proposed fix (§4.2):** detect the broadcast **first-down line** (the yellow
graphic), whose yard value is computable from play-by-play (LOS + yards-to-go), then label
detected yard lines by relative distance from it.

### Results and documented failure modes (Ch 4 / 4.1)

- Models (10-fold CV, n=450, 52% run base rate): logistic regression 59.7%; VGG-16 on
  images 66.67%; VGG-16 + play-by-play 68.89%.
- **Hough lines were "often skewed as they were affected by other objects within the
  scene"** — noise never fully eliminated.
- **YOLOv3 missed players, especially offensive linemen**, due to dense clustering in
  formations (player location = midpoint of the bottom edge of each box).
- Because labeling failed, **no automated homography was ever computed** — the pipeline
  stops one step short of gap (c). One manual homography demonstrates the geometry works.

### PARAMETER GAP (honest accounting)

The thesis gives **no numeric parameters** anywhere in the field-mapping chapters. Verified
by full-text search: no rho/theta accumulator resolution, no Hough vote threshold, no
minLineLength/maxLineGap, no Canny low/high thresholds, no Gaussian σ for the LoG, no blob
radius cutoffs, no HSV white-range bounds, no angle-filter tolerances. Any numbers in our
implementation spec below marked [DERIVED] are our engineering choices, not the thesis's.
Confidence in the *method structure* is high; confidence that any specific numeric value
came from Chung is zero — there are none to extract.

---

## DATASETS

- 450 pre-snap broadcast frames (Notre Dame home games, 2021–2022, via NFL-Video
  replays + JDownloader), each mapped to a play via OCR'd score-bug clock; manually
  verified. Not released with the thesis; footage is televised broadcast (rights held by
  broadcasters) — **GSE must not redistribute it; we re-implement the method on our own
  footage**.
- Play-by-play: SportsDataStuff, all college games 2021–2022, filtered to 6 pre-snap
  features (quarter, down, seconds remaining, yards from end zone, yards to go).
- Labels: run/pass from play outcomes; 10-fold CV.

## GSE APPLICATION (gap c: automatic 2D field landmarks for homography)

This is the gap-(c) kernel source. The correspondence-production recipe:

1. **Correspondences produced:** yard-line ∩ hash-mark-line intersections.
   Each intersection is a true 2D point correspondence: image pixel (x, y) ↔ field
   template (x_m, y_m). Unlike yard-lines-only input (all colinear ⇒ DLT degenerate),
   adding the hash-mark line gives a second direction ⇒ non-colinear ⇒
   `fitHomographyDLT` in `cv-homography.ts` receives valid input.
2. **Feed into `cv-homography.ts`:** the intersections map directly onto the existing
   `Correspondence { xPx, yPx, xM, yM }` interface; `fitHomographyDLT()` is unchanged.
   What changes is the *producer*: today the hand-seed; after this, the landmark detector.
3. **What the thesis does NOT solve (and we must):** labeling. Two GSE-native options:
   - (a) LOS anchoring done right: our pipeline *knows* the line of scrimmage (play
     context / tracklet geometry), unlike Chung's gradient heuristic. The detected yard
     line nearest the projected LOS gets the LOS yard value; others follow at 5-yard
     intervals (NFL yard lines are spaced 5 yards; only every 10 is numbered).
     Ambiguity (which side of the 50) resolves via play direction + which goal line /
     end zone is visible.
   - (b) Thesis's own future work: detect the yellow first-down-line graphic; label =
     LOS + yards-to-go; propagate to neighbors.
   - (c) Numeral reading with a rotation-normalized digit classifier (fixes the
     rotation/scale weakness that killed Chung's template matching).
4. **Preprocessing order to adopt:** score-bug mask FIRST (bug text = white Hough
   false votes), then field-boundary mask (kills stands/sideline clutter), then
   white-filter → Canny → Hough. This order is directly transferable to
   `cv-pipeline.ts`'s frame intake.

## IMPLEMENTATION SPEC

New file: `packages/prediction-engine/src/tracking/cv-field-landmarks.ts`

```ts
// Types
export interface ImageLine { rho: number; theta: number; p1: Pt; p2: Pt }
export interface FieldLandmarks {
  yardLines: ImageLine[];      // near-vertical, in image coords
  hashMarkLine: ImageLine;     // near-horizontal, in image coords
  boundary: ImageLine;         // near sideline
  scoreBugRect: Rect;          // masked before everything
}
export interface LabeledLandmarks extends FieldLandmarks {
  yardValues: Map<number, number>; // yardLines[i] -> field yard line number (10..50 scale)
}

// Pipeline (clean-room, after Chung)
export function maskScoreBug(frame: Frame, bugRect: Rect): Frame
export function detectFieldBoundary(whiteMask: Mask): ImageLine   // Hough + horizontal filter + average
export function detectYardLines(whiteMask: Mask, boundary: ImageLine): ImageLine[]
export function detectHashMarkLine(frame: Frame): ImageLine       // LoG blobs, small-radius filter, Hough + horizontal filter
export function intersectYardLinesWithHash(lm: FieldLandmarks): Pt[]  // raw 2D intersections
export function labelYardLines(lm: FieldLandmarks, anchor: { losYard: number; losImageX: number }): LabeledLandmarks
export function landmarksToCorrespondences(lm: LabeledLandmarks): Correspondence[]
  // maps each (intersection pixel) -> (xM, yM) on the field template:
  // xM = (yardValue - goalLineOffset) * 0.9144, yM = hash-mark lateral offset (NFL: 18 ft 6 in from sideline => fixed constant)
```

Parameter starting points [DERIVED — tune on our footage, not from the thesis]:
- HSV white: S < 40, V > 200 (8-bit); tune per stadium lighting.
- Canny: low=50, high=150, aperture 3.
- HoughLines (standard, not probabilistic): rho=1 px, theta=π/180, votes threshold
  scaled to image height (start 0.35 × image-height votes).
- Angle filters: boundary/hash horizontal within ±12° of image horizontal; yard lines
  within ±12° of image vertical. (Pre-deskew with the Sloan rotation correction —
  see deep-dive-fourtverts-sloan.md — to make these tolerances tight.)
- LoG: σ pyramid {2, 3, 4} px at 720p; keep blobs with radius < 8 px [DERIVED].
- Duplicate-line merging: lines within Δrho < 6 px and Δtheta < 2° merge (average).

Files to touch:
- CREATE `packages/prediction-engine/src/tracking/cv-field-landmarks.ts` (+ `.test.ts`)
- MODIFY `packages/prediction-engine/src/tracking/cv-pipeline.ts`: replace the
  hand-seed homography path with `landmarksToCorrespondences → fitHomographyDLT`;
  keep hand-seed as fallback when landmark detection reports degenerate/insufficient.
- MODIFY `packages/prediction-engine/src/tracking/cv-homography.ts`: add the
  non-degeneracy guard (see Mendez deep dive) — the landmark module must call it
  before emitting correspondences.

TEST ASSERTIONS (implement first, in `cv-field-landmarks.test.ts`):
1. **Synthetic broadcast frame, known homography H_gt:** render a synthetic field (6
   yard lines + hash marks + noise blobs + a fake score bug) through H_gt.
   Assert: detector returns ≥ 4 intersections; `||H_est − H_gt||` reprojection error
   **< 2.0 px mean over 20 test points**; all correspondences non-colinear per the
   Mendez guard.
2. **Yard-lines-only synthetic:** assert the guard REJECTS (throws
   `DegenerateCorrespondencesError`) instead of emitting a garbage H. This is the
   regression test for the current DLT failure mode.
3. **Score-bug ablation:** same frame with/without synthetic bug text; assert yard-line
   count is unchanged with the bug masked, and degraded (false lines ≥ 1) without
   the mask — proves mask-before-Hough ordering.
4. **Hash-mark noise test:** scatter 40 white player-like blobs near the hash marks;
   assert the detected hash line angle stays within 3° of ground truth (LoG
   small-radius filtering doing its job).

"Done and verified" = all four assertions green + `cv-pipeline.ts` runs end-to-end on
one real broadcast clip with zero hand-seeded points, reprojection error of projected
yard-line intersections < 3 px on held-out frames.

## IMPROVEMENT PATH (beyond Chung)

1. **Temporal smoothing:** landmarks are quasi-static within a camera shot — track
   yard-line (rho, theta) across frames with exponential smoothing; re-detect fully
   only on shot change. Kills per-frame Hough jitter.
2. **Multi-frame RANSAC:** accumulate intersections over N frames, RANSAC the
   homography — outliers (mis-detected lines) get voted out.
3. **Labeling via broadcast graphics:** yellow first-down line + LOS graphic detection
   (Chung's own future work) as the labeling anchor; numeral OCR with
   rotation-normalized digit CNN as backup.
4. **Hash-mark ticks as extra correspondences:** individual hash ticks (not just the
   fitted line) give dense 2D points along the field axis — more correspondences,
   better conditioning.
5. **Endzone/sideline corner detection:** when visible, goal-line ∩ sideline corners
   are the highest-quality correspondences available (large, unambiguous).

## Confidence

- **High:** method structure (white→Canny→Hough→angle-filter; LoG→small-blob→Hough
  for hash marks; intersections as correspondences; score-bug-first preprocessing
  order; both labeling failures and why). Fully read, 30 pages.
- **High:** that no numeric parameters exist in the source (verified by search).
- **Medium:** GSE transfer details (NFL vs. college hash-mark geometry, broadcast
  vs. Skycam view mix) — needs validation on our footage.
