# Film Pilot 2 — Stabilization + Motion-Aware Association (2026-10-01)

**Clip:** official Chiefs video, `patrick-mahomes-finds-rashee-rice-wide-open-downfield-for-a-34-yard-gain`
(30fps, 660 frames, 22.0s). Same clip as Pilot 1.

**Question:** does camera stabilization before association fix the tracking
fragmentation and phantom speeds Pilot 1 measured?

## Experiments

| # | Sampling | Association | Coordinates | Tracklets/IDs | Median life | Max continuous | Speed plausibility |
|---|----------|-------------|-------------|---------------|-------------|----------------|-------------------|
| P1 | 5fps | greedy IoU | raw (52.5px camera motion) | 98 | 1.0s | ~2s | 81/98 implausible; phantom 100–275 mph |
| 2a | 5fps | constant-velocity gated NN | stabilized (0.48px residual) | 97 | 1.0s | ~1.6s | **0/97 implausible; max 18.9 mph** |
| 2b | 30fps | BoT-SORT (Kalman + re-ID) | raw | 175 | 0.57s | 8.9s | — |
| **2c** | **30fps** | **BoT-SORT (Kalman + re-ID)** | **stabilized (0.97px residual)** | **33** | **0.47s** | **4.1s** | — |

Detector throughout: YOLOv8n, conf 0.35, person class (975 detections at 5fps,
8.9/frame — identical to Pilot 1).

## Stabilizer

`packages/prediction-engine/src/tracking/stabilize.py` (local, unpushed at
time of writing): ORB features (2000) + Hamming BFMatcher + Lowe 0.75 +
RANSAC homography (3.0px), top/bottom 12% masked (score bug/ticker), chained
current-to-reference transforms on detection foot points.

- 5fps: 104/110 pairs OK, **median residual 0.48px** (gate was <3px)
- 30fps: 658/660 pairs OK, median residual ~0.97px
- vs Pilot 1 raw camera motion: **52.5px/sample → 0.48px (109× reduction)**

## Findings

1. **Stabilization is solved.** 0.48px residual crushes the <3px gate.
   Phantom speeds are eliminated as a direct consequence: with camera motion
   removed, the worst measured speed is 18.9 mph (below the 21.03 mph NGS
   Week-3 ceiling) vs 100–275 mph phantoms in Pilot 1. The speed-measurement
   problem was camera motion, full stop.

2. **A motion model alone does NOT fix fragmentation.** Experiment 2a
   (constant-velocity prediction + gated nearest-neighbor on stabilized
   coords) produced 97 tracklets vs Pilot 1's 98 — statistically identical.
   Camera motion was not the binding constraint on continuity; detection
   intermittency (occlusions, missed detections, ID switches at crossings)
   is.

3. **Stabilization + a real MOT tracker is the combination that works.**
   BoT-SORT on raw footage: 175 IDs (worse than greedy IoU on count, though
   one 8.9s track). BoT-SORT on stabilized footage: **33 IDs for ~22 visible
   people**, only 2 single-frame tracks, 2 tracks over 3.3s continuous.
   The stabilizer gives the tracker's motion model a stationary world to
   reason about — that is where the 5× ID reduction comes from.

4. **Median tracklet life is still short (0.47s).** Football is adversarial
   for tracking: pile-ups, occlusions, identical uniforms, players leaving
   and re-entering frame. 33 IDs is honest progress, not a solved problem.

## Scale note (honest, documented)

px→yards estimated from yard-line spacing in the stabilized reference frame:
40L→50 measured 576px/10yd; 50→40R measured 392px/10yd (perspective
foreshortening is real). Speeds use a linear-in-x scale model,
`scale(x) = 57.6 − 0.038·(x − 395.5)` px/yd, clamped at 20px/yd. Continuity
stats need no scale. A full field calibration (4+ surveyed correspondences
per camera angle) is still owed before any yard-denominated metric leaves
shadow.

## Status

Film remains **UNCALIBRATED, shadow-only, weight zero**. The pipeline order
is now: stabilize → detect → BoT-SORT-class tracker on stabilized coords →
field calibration → metrics. The next build step is wiring this sequence
into the watch pipeline (the HF Space still runs IoU association on raw
coords).

## Artifacts

- `stabilize.py` — ORB/RANSAC stabilizer (to be pushed)
- `pilot2-eval.py` — motion-aware association + Pilot 1 comparison evaluator
- `write-stabilized-video.py` — stabilized video writer (experiment 2c)
- `det-rice-34yd.jsonl`, `stab-rice-34yd.jsonl` — 5fps detection + stabilization
- `det-rice-30fps.jsonl`, `stab-rice-30fps.jsonl` — 30fps detection + stabilization
- `rice-34yd-stabilized.mp4` — camera-still video (25MB, internal only)
