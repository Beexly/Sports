# Film Pilot 1 — Real-Footage CV Pipeline Test (2026-10-01)

**Status:** MEASURED — pipeline stages 3–6 FAIL on broadcast footage in current form.
Stage 2 (detection) PASSES. Film remains UNCALIBRATED, weight zero, shadow-only.

## Test material

- Official Kansas City Chiefs clip: "Patrick Mahomes finds Rashee Rice wide open
  downfield for a 34-yard gain" (Week 3, 2026, Chiefs vs Dolphins)
- Source: https://www.chiefs.com/video/patrick-mahomes-finds-rashee-rice-wide-open-downfield-for-a-34-yard-gain
- 22.08 s, 1280x720, ~30 fps, H.264. 14.5 MB.
- Known ground truth: 34-yard reception by Rashee Rice (2nd & 11, 4th Q, KC 17–MIA 10).
- Internal speed anchor: NGS Week-3 2026 fastest ball carrier 21.03 mph
  (Jaylen Warren, PIT). No CV-measured top speed on Week-3 film should exceed
  ~24 mph (ceiling + margin).

## Method

1. **Detection (Stage 2):** repo's real `tracking/yolo-detect.py` (Ultralytics
   YOLOv8n, COCO person class, conf 0.35, 5 fps) on the actual clip.
   Output: 110 frames, 975 detections, JSONL in the detector-contract shape.
2. **Pilot harness** (`workspace/_scratch/replay-corpus/pilot1.py`, not production
   code): mirrors the TS math exactly —
   `footPoint` (detector-contract), greedy-IoU `buildTracklets` (tracklet-association),
   median-flow camera compensation + scale/offset `fitHomographyFromYardlines`
   + `deriveMovementMetrics` (movement-primitive).
3. **Calibration:** single-frame field scale from visual grounding on a mid-play
   frame (t=5 s): blue 50-yard line → right white 40-yard line = 650 px per
   10 yards (x-scale 0.01407 m/px); painted "40" digit height (6 ft = 2 yd) =
   28.8 px (y-scale 0.0635 m/px, capturing ~4.5x depth foreshortening at this
   broadcast camera angle). Scale applied uniformly; perspective drift across
   the pan/zoom NOT corrected — stated uncertainty ±30%.

## Results

| Metric | Value |
|---|---|
| Frames / detections | 110 frames, 975 detections, 8.9 det/frame (min 1, max 17) |
| Detection confidence | mean 0.68 (min 0.35, max 0.92); zero empty frames |
| Tracklets (len>=3) | **98** from ~22 visible people |
| Tracklet median life | **1.0 s**; 71/98 die < 2 s; **0 survive 8 s** |
| Median foot displacement between 5 fps samples | 52.5 px (= 37 mph equivalent in y-scale) — camera-dominated |
| Tracklets above NGS plausibility ceiling | **81/98** (top speeds 111–275 mph — garbage) |
| Longest tracklet distance | 57.9 yd vs known 34-yd play outcome |

## Diagnosis (quantified)

1. **Association collapse (primary).** Greedy IoU at 5 fps cannot survive broadcast
   camera motion: median nearest-neighbor foot displacement between samples is
   52.5 px, far beyond the IoU match radius. Tracklets fragment into ~1 s shards;
   ID switches inject phantom jumps that become 100+ mph spikes.
2. **Camera compensation inadequate.** Median-flow estimate cannot remove fast
   pan/tilt/zoom residuals. Uncompensated camera motion reads as player speed.
3. **Foreshortening amplification.** Depth axis is 4.5x compressed (y-scale
   0.0635 vs x-scale 0.01407 m/px); every pixel of residual/noise in y becomes
   4.5x meters. This is physical, not a bug — it demands per-frame homography,
   not a single scale.
4. **Single-frame homography invalid across the clip.** The broadcast camera pans
   and zooms; one scale/offset fit cannot hold.

## What this proves

- ✅ Stage 2 detector works on real broadcast film (sane counts, confidences,
  no empty frames). The YOLOv8n + detector-contract path is viable.
- ❌ Stages 3–6 as currently implemented do NOT produce usable measurements on
  broadcast footage. The failure is measured, not suspected.
- The repo's `associateMotionAware` (motion-aware association) and
  `fitHomographyFromYardlines` were NOT exercised here — the harness used the
  greedy path. They remain untested on real film.

## Engineering requirements (from the data)

1. Real video stabilization: feature-based (ORB/RANSAC) per-frame-pair
   homography, not median flow. Target: residual camera motion < 3 px/sample.
2. Motion-aware association on stabilized coordinates, and/or higher sample
   rate — 5 fps is below the operating point for this camera motion.
   (10 fps re-run in progress to find the knee.)
3. Per-frame (or per-segment) field homography from detected yard lines —
   requires building the yard-line detector (does not exist yet).
4. Identity persistence (re-ID or jersey-number OCR) — 98 tracklets for ~22
   people means K7 tracklet-to-player identity is even further off than assumed.
5. Speed plausibility gate: reject/flag any tracklet top speed above the
   rolling NGS-derived weekly ceiling (internal only).

## Honest limits

- Pilot harness is Python mirroring TS logic, NOT the TS code itself. Running
  the full TS pipeline on real detections needs a workspace npm install (queued).
- Calibration is manual (visual grounding) on ONE frame — not a production path.
- One clip, one play, one camera angle. Nothing here generalizes yet.
- Film features remain UNCALIBRATED, weight zero, shadow-only.

## Next pilots

- Pilot 2: same clip at 10 fps (running) — does sample rate rescue association?
- Pilot 3: full-game Chiefs–Dolphins highlights (official, chiefs.com) —
  multi-play corpus with nflverse play-by-play anchors.
- Pilot 4: stabilization prototype (ORB/RANSAC) before re-measuring.
