# CV detector eval — first real-footage numbers (2026-10-01)

## What this is

The **detector-validation stepping stone** toward the live watch loop
(see `cv-live-watch-loop.md`). It answers one question: *does the real
detector see players in real football footage?* It is not the product, and
nothing here is published, licensed, or redistributed — the eval clips are
short, internal-only, and deleted after evaluation.

## Setup

- **Detector:** YOLOv8n (open weights, COCO person class), via the new
  `packages/prediction-engine/src/tracking/yolo-detect.py`, emitting the
  detector-contract JSONL consumed by the new `yolo-adapter.ts`.
  Confidence threshold 0.35, 5 fps sampling (the watch-loop v1 cadence).
- **Clips (internal only, ~10s each, 640×360):** 3 broadcast-angle
  ("Best Play From EVERY Team In Week 3" + "Top Sunday Plays" reels) and
  2 cinematic NFL Films shots. 251 frames total processed.
- **Method:** detections run through the REAL `buildTracklets` (IoU 0.3,
  maxGap 5) via an esbuild bundle; precision/recall by manual audit of 8
  annotated frames (57 visible people) — model-assisted auto-labels were
  tried first and rejected as too noisy (crowd confusion, degenerate
  whole-image boxes).

## Results

### Detection (YOLOv8n person class, conf ≥ 0.35)

| clip | frames | dets/frame (mean) | notes |
|---|---|---|---|
| et_b (CBS broadcast) | 50 | 5.8 | matches ~6 on-field players |
| et_a (Prime sideline) | 50 | 5.1 | players + sideline staff |
| et_c (FOX broadcast) | 50 | 7.2 | |
| nflfilms (cinematic) | 101 | 2.1–6.5 | close-ups, few people |

**Manual audit (8 frames, 57 visible people): precision 1.00 (42/42),
recall 0.74 (42/57).** Zero false positives. Misses concentrate in:
tackle piles / players on the ground (non-upright poses, heavy occlusion),
edge partials, and one merged box covering two adjacent players.

**Caveats:** 360p source — the watch loop captures at 960px+, which should
lift recall. Person-class includes sideline staff/coaches (4 of 6 detections
in one sideline frame); player-vs-staff separation is follow-up work.

### Tracklet association (real buildTracklets, defaults)

| clip | detections | tracklets | median len | max len | ≤3-frame tracklets |
|---|---|---|---|---|---|
| et_a | 253 | 53 | 3 (0.6s) | 15 | 30 |
| et_b | 291 | 52 | 4 (0.8s) | 12 | 22 |
| et_c | 359 | 65 | 3 (0.6s) | 26 | 40 |
| nflfilms_a/b | 107/323 | 14/35 | 4/6 | 18/32 | 5/11 |

**Finding: heavy fragmentation on broadcast footage.** ~6 concurrent players
produce 52–65 tracklets; median tracklet life is 0.6–0.8s. The cinematic
clips (slow camera) associate far better. Diagnosis: at 5 fps, sprinting
players move >70% of their box width between frames and broadcast camera
pans shift every box — pure-IoU linking at minIou 0.3 cannot hold. The
pipeline's camera-motion compensation exists but `buildTracklets` doesn't
use it; motion-aware association (predict + compensate, or higher fps) is
the fix. Usable today for counts/heatmaps; not yet for per-player tracking.

### Homography (real fitHomographyDLT)

**Negative result, and an important one.** Fitting on yard-line × frame-edge
intersections from a real broadcast frame failed: the solver threw
"singular normal equations (degenerate correspondences?)". All usable points
lay on just two image lines (top/bottom frame edges) — a degenerate
configuration for DLT, which needs correspondences spanning the image plane.

**Design consequence:** the watch loop cannot bootstrap field mapping from
yard lines alone. It needs true 2D field landmarks — yard-line ∩ sideline
intersections, hash marks — i.e., the open sub-problem is *field-landmark
detection*, not just line detection. v1 fallback: hand-seed the homography
per broadcast view (one-time per game, ~30s of Garrett's time or a preset
per network camera angle).

The DLT math itself is proven on fixtures (unit tests green); the gap is
purely on the correspondence-supply side.

## Code landed (this branch)

- `packages/prediction-engine/src/tracking/yolo-detect.py` — real detector
- `packages/prediction-engine/src/tracking/yolo-adapter.ts` — contract adapter
- `packages/prediction-engine/src/tracking/yolo-adapter.test.ts` — 4 tests
- **Tests: 48/48 green under real vitest** (44 existing + 4 new).

## Bottom line for the watch loop

Detector: ready. Association: works, fragments on broadcast pace (known fix
direction). Homography: math ready, correspondence supply is the research
gap. The eval did its job — it converted "CV pipeline" from scaffolding into
measured reality with named gaps.
