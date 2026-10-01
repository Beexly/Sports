# CV Corpus 2026-10-01 — Top Kernels

Ranked by expected impact on the three open gaps in the CV lane (PR #986, `motif/cv-pipeline-2026-09-30`):
**(a)** detector recall on piles/ground players · **(b)** motion-aware tracklet association for broadcast pace · **(c)** automatic 2D field-landmark detection for homography.

All kernels are method descriptions for clean-room re-implementation. No code was copied from any source. License notes inline; anything flagged RESEARCH-only stays out of the repo until its license is verified.

---

## Tier 1 — build next

### K1. Motion-continuity identity + camera-motion cancellation for tracklet stitching → gap (b)
**Source:** #10 (Harsh Raj, LinkedIn 2026) — practitioner stack working on broadcast footage today.
**The kernel:** appearance-based ReID is a dead end when both teams wear identical uniforms. Instead: (1) cancel camera motion with classical geometry (OpenCV, no learning) so every detection lives in a stabilized coordinate frame; (2) associate by motion continuity — each player's path constrains where he *could* be next frame, which disambiguates identical-looking players; (3) through pile-ups, follow pixels (segmentation mask propagation) instead of re-recognizing after the pile.
**Why it matters:** our IoU association fragments into 52–65 tracklets from ~6 players with 0.6–0.8s median life. IoU-only association is exactly the approach this kernel replaces. The camera-cancellation step also directly serves gap (c)'s motion model.
**Implementation sketch:** replace/augment the IoU matcher with a two-stage pass — stage 1: estimate per-frame camera motion (feature-match the static field plane, RANSAC), warp detections into the stabilized frame; stage 2: greedy/BiLSTM motion-gated matching on stabilized centroids + velocity, with a "coast" allowance through occlusion intervals instead of terminating the tracklet.
**License:** method intel only (no code published). Clean-room implementable.

### K2. Jersey-number OCR on sharp crops for re-ID after long gaps → gap (b)
**Source:** #10 (Harsh Raj).
**The kernel:** for long-gap reappearances (player leaves frame, pile fully occludes), run a *small* OCR pass on a few sharp crops — not a jersey-detection system, just digit OCR where the crop is good. Identity snaps back without appearance matching.
**Why it matters:** our fragmentation has two causes — short occlusions (K1's motion continuity handles) and long disappearances (nothing handles). OCR gives a sparse but high-precision re-ID signal for the long tail.
**Implementation sketch:** on tracklet birth after a >N-frame gap, crop the torso region at the sharpest available frame (Laplacian variance), run digit OCR, match against the roster number set; on match, stitch to the dead tracklet with that number.
**License:** method intel only. OCR engine choice (e.g., PaddleOCR — Apache-2.0) to be verified at build time.

### K3. Automatic yard-line + hash-mark detection → gap (c)
**Source:** #18 (Chung, Brown 2024 thesis) — the missing machinery for our homography gap.
**The kernel:** yard lines via Hough transform on the white-filtered binary image; hash marks via Laplacian-of-Gaussian blob detection followed by Hough; yard-line labeling to index which line is which. Preprocessing: mask the score bug and field boundary *before* line detection — broadcast graphics poison Hough.
**Why it matters:** our DLT homography fails on yard-lines-only because parallel yard lines give no true 2D correspondences — the colinearity failure (#14 documents the same failure mode). Yard lines + hash marks + line labeling = automatic 2D point correspondences = no more ~30s hand-seed.
**Implementation sketch:** hand-seed v2 pipeline — white-filter → Hough yard lines → LoG hash blobs → label lines (nearest-number OCR or sideline-number association) → build 2D↔field correspondences (hash marks give the along-field coordinate) → DLT with a colinearity pre-check (reject near-colinear sets, per #14).
**License:** ⚠️ © 2024 John Chung, method intel only — RESEARCH-only; re-implement from the description, do not copy figures/text.

### K4. Colinearity guard + 120×53.3 yard template → gap (c)
**Source:** #14 (miguel-mendez-ai.com homography tutorial).
**The kernel:** NFL pitch template 120×53.3 with 1px = 1 yard; OpenCV `findHomography` needs 4 non-colinear points; near-colinear point sets silently produce garbage — check *before* DLT and fall back to the hand-seed rather than emitting a bad matrix.
**Why it matters:** converts our homography failure from "wrong projection, discovered downstream" into "detected at estimation time, falls back cleanly."
**License:** tutorial — method intel only.

### K5. Occlusion-stratified error analysis + two-stage detector eval → gap (a)
**Source:** #7 (AWS SageMaker blog) + #9 (Roboflow helmet dataset) + #3 (the-playmakers).
**The kernel:** (i) stratify our 57-frame eval by occlusion / size / aspect / camera angle / contrast — the AWS finding is that Faster-RCNN beats YOLO/SSD specifically on small objects, and error stratification is what tells you *where* recall dies; (ii) the Roboflow set's Helmet-Blurred/Difficult/Partial classes are pre-labeled hard positives for pile/occlusion training; (iii) the-playmakers' 503 images / 8 position classes is the closest public analog to our hand-labeled set.
**Why it matters:** our 0.74 recall is a single number — stratification tells us whether the misses are piles (occlusion), small players (size), or angles, which decides between "more data" and "different architecture."
**License:** AWS blog + Roboflow page are method/data intel; ⚠️ the-playmakers images are **license-UNKNOWN (RESEARCH-only)** until the missing LICENSE is resolved — do not ingest into training yet.

## Tier 2 — schedule after Tier 1

### K6. Per-screenshot yard calibration + frame-1 drift reference → gaps (b)/(c)
**Source:** #1/#19 (Sloan 2018, Paper #5571).
**The kernel:** derive the pixel→yard scale *per screenshot* from 5-yard line spacing (robust to zoom changes mid-play); anchor a reference point (highest full-field-line point in frame 1) and measure all subsequent positions relative to it to cancel camera-follow drift. Speed = Euclidean distance / frame-rate → yards → mph.
**Why it matters:** gives scale-stable speed/distance metrics even before full homography lands — and the drift-correction trick is directly reusable inside K1's camera-cancellation.
**Also from this source:** break-angle precision as a measurable trait (Garçon 1.3 fewer yards than Jackson on mirrored comebacks) — a GSE derived-metric shape, consistent with the @fieldcoachai reel intel already adopted.
**License:** competition paper — method intel only.

### K7. RF-DETR segmentation as the per-frame seer → gap (a)
**Source:** #10 (Harsh Raj).
**The kernel:** RF-DETR (real-time detection transformer) doing *segmentation* on every frame, trained from ~30 semi-supervised annotated frames on Roboflow. Masks handle piles better than boxes.
**Why it matters:** our YOLOv8n boxes fragment exactly where bodies merge; a mask-based seer with a tiny annotation budget is the cheapest architectural experiment for pile recall.
**License:** method intel only; RF-DETR itself is Apache-2.0 (verify at adoption time) — no license blocker anticipated.

### K8. SAM 2 with adapted memory bank for through-pile pixel following → gap (a)
**Source:** #10 (Harsh Raj).
**The kernel:** adapt SAM 2's memory bank behavior for pile-ups so a player's pixels are *followed through* the pile rather than re-detected after it.
**Why it matters:** attacks the same recall gap as K7 from the temporal side; pairs with K1's "never take your eyes off him" principle.
**License:** method intel only; SAM 2 is Apache-2.0 (verify at adoption time).

### K9. Formation→play two-stage classification with per-frame voting → downstream tendency layer
**Source:** #8 (zacyauney Madden classifier) + #18 (Chung: images + play-by-play beats either alone) + #12 (THI: YOLOv8 + OCR + XGBoost → 74.13% test on run/pass).
**The kernel:** stage 1 classifies formation (Inception-style / coordinate CART — #1 got 72.3% on 29 formations with CART); stage 2 classifies the play from per-frame predictions voted across the sequence (Inside Zone / Y-Sail / Mesh Spot / scramble); fuse visual features with play-by-play text (XGBoost) for run/pass.
**Why it matters:** this is the tendency-model blueprint that consumes the tracking output once gaps (a–c) close. Related-work accuracy anchors: 75% (Craig, 130k NFL plays), 80% (Goyal), 85% formation on Madden data (Newman), 67% on real footage (Atmosukarto).
**License:** ⚠️ #12 (THI thesis) is all-rights-reserved — method intel only, RESEARCH-only.

### K10. Position-label coarsening (12→8) for small-data training → gap (a)
**Source:** #13 (MDPI Electronics 12(3):726).
**The kernel:** group 12 fine positions into 8 training labels; >90% detection/labeling, 84.8% formation ID over 25 classes (5 families × 5).
**Why it matters:** our 57-frame labeled set is tiny — coarser labels train more robustly, and the-playmakers' 8-class scheme (#3) independently converged on the same granularity.
**License:** MDPI open access (verify CC BY on the article page before reusing figures).

## Calibration / honesty kernels (adopt as doctrine)

- **K11. Accuracy ladder for tracking claims** (#21): GNSS ±12" / LPS-UWB ±4" / CV ±0.1" @300+fps / Zebra RFID ±6". Use when stating GSE tracking precision — never claim better than the ladder supports.
- **K12. Hawk-Eye measures line-to-gain, not ball spotting** (#21): the honest limit to cite whenever officiating-adjacent claims come up.
- **K13. Jersey-color tracking breaks under shadows/sunlight RGB variance** (#19): documented failure mode — our color-based fallbacks need the same caveat.

## Explicitly NOT adopted
- HuddleVision / Genius Sports broadcast-CV (#5, #11): proprietary, no method — competitive intel only.
- NGS pose-estimation architecture (#16) / Digital Athlete camera rig (#17): NFL-internal data and hardware — ceiling reference, not replicable from broadcast.
- ResearchGate review (#23): downstream analytics (safe-target EPA), not the CV lane — routed to the passing-model notes, not PR #986.
