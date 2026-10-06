# Deep-Dive: Harsh Raj (LinkedIn) — "Tracking American Football Players with Computer Vision"

**Source:** https://www.linkedin.com/posts/harsh-sportstech_sportstech-americanfootball-computervision-activity-7480258482940739584-DYpc
**What was read (2026-10-01):** the full public post text via `browser.open` (52 lines, "2mo Edited" — ~August 2026). Post body, stack list, hashtags all read. **Comments were NOT readable** — the "See more comments" fetch failed with LinkedIn HTTP 999 (rate-limit/block); one attempt made, no retry per policy. The embedded video clip (team view → player-level tracking from the 7th second, 3D meshes) could not be watched — described only via the post text.
**License:** practitioner writeup, no code published — method intel only. Component licenses noted below are for later verification, not claims about this post.
**Confidence:** HIGH on every verified claim (verbatim text); the gating boundary is explicit.

---

## 1. CLAIM-BY-CLAIM VERIFICATION (prior pass vs. visible text)

| # | Prior-pass claim | Visible text says | Verdict |
|---|---|---|---|
| 1 | ~30 semi-supervised Roboflow frames | "around 30 frames annotated semi-supervised on Roboflow" | ✅ VERIFIED |
| 2 | RF-DETR segmentation as the per-frame seer | "RF-DETR segmentation handles the seeing on every frame" | ✅ VERIFIED |
| 3 | SAM 2 with adapted memory bank for pile-ups | "Meta's SAM 2, adapted with a better behaved memory bank for when bodies pile up" | ✅ VERIFIED (adaptation details undisclosed) |
| 4 | OpenCV classical geometry for camera-motion cancellation | "OpenCV classical geometry to cancel the camera motion, no neural net, no training" | ✅ VERIFIED |
| 5 | Jersey-digit OCR on sharp crops for long-gap re-ID | "a small OCR pass on a few sharp crops for the long-gap reappearances, nothing built for jerseys" | ✅ VERIFIED |
| 6 | 3D mesh rebuild + joint angles frame by frame | "each of them rebuilt as a 3D mesh on the field, joint angles computed frame by frame" | ✅ VERIFIED (method undisclosed) |
| 7 | Appearance-based ReID is a dead end; identity from motion + continuity | "Appearance was the first dead end. Everything I tested confuses two same-uniform players... So identity came from motion and continuity instead." | ✅ VERIFIED |
| 8 | Follow pixels through pile-ups instead of re-recognizing after | "a player buried in a pile-up never left the frame, so follow his pixels through it instead of trying to recognize him after" | ✅ VERIFIED |
| 9 | Works on broadcast footage; All-22 is the easy case | "Team and player level tracking on broadcast footage... This was broadcast footage, the hardest possible angle. Now imagine All-22 coaching film instead... That's the easy case for this pipeline." | ✅ VERIFIED |
| 10 | Next: opening frames (worst camera motion), then longer footage | "Next up: the opening frames, where the camera motion is at its worst. Then longer and harder footage, end to end." | ✅ VERIFIED |

**Nothing was demoted** — every prior claim checks out against the visible text. The post's own stated limitation is that the opening frames (worst camera motion) are still future work. What the post does NOT establish: any code, any numeric metrics (no mAP, no ID-switch counts), the exact SAM-2 memory-bank adaptation, the 3D-mesh method, or the camera-cancellation algorithm details. **Therefore: do not rank this source #1 as an implementation reference** — it is the best *directional* blueprint in the corpus, but it is not a spec. The kernels below are clean-room derivations of the described ideas, not transcriptions.

---

## 2. METHOD (as described, with the mechanics made explicit)

The stack, in the author's order, with what each component must do:

1. **Perception (RF-DETR segmentation, ~30 annotated frames).** A real-time detection transformer doing *instance segmentation* on every frame — masks, not boxes. The 30-frame semi-supervised annotation budget is the key number: a mask-based seer is reachable with a tiny labeling effort. (RF-DETR is Apache-2.0 — verify at adoption.)
2. **Camera-motion cancellation (OpenCV classical geometry, no learning).** Estimate the camera's motion between frames from the static background (field plane), then warp detections into a stabilized frame. Concretely: detect field-plane features (lines, texture), match frame-to-frame, fit the inter-frame transform (homography of the field plane, RANSAC-robust), invert it to express all detections in a camera-still coordinate system.
3. **Identity from motion continuity (the core insight).** In the stabilized frame, each player's reachable region between frames is bounded by max sprint speed — "every player's path tells you where he could be and where he couldn't." Association = reachable-set gating, not appearance matching. Verbatim principle: *"You can't confuse two identical twins if you never took your eyes off one of them."*
4. **Through-pile pixel following (SAM 2, adapted memory bank).** When bodies merge, propagate the player's segmentation mask forward through the pile (memory-conditioned tracking) instead of terminating the tracklet and re-identifying after. The "better behaved memory bank" adaptation is undisclosed — treat as an R&D item, not a recipe. (SAM 2 is Apache-2.0 — verify at adoption.)
5. **Long-gap re-ID (digit OCR on sharp crops).** For players who leave the frame / fully disappear: crop the torso at the sharpest available frame (sharpness-gated), run digit OCR, match against the roster number set, stitch identity. "A small OCR pass... nothing built for jerseys" — it is deliberately minimal.
6. **3D mesh + joint angles per frame.** Output layer; method undisclosed. For GSE this is downstream of gaps (a–c) — note as the shape of the eventual product, not a current build item.

---

## 3. DATASETS / LICENSES
- No dataset released; no code released. **Method intel only.**
- Component licenses for later: RF-DETR (Apache-2.0), SAM 2 (Apache-2.0), OpenCV (Apache-2.0) — all permissive, but **verify the exact version licenses at adoption time** before pulling weights/code.

---

## 4. GSE APPLICATION — gaps (a)/(b)/(c)

**Gap (b) — motion-aware tracklet association — DIRECT, the single best practitioner answer in the corpus.** Our `buildTracklets` (cv-tracklet-association.ts) is greedy IoU on raw pixel boxes with `minIou: 0.3`, `maxGapFrames: 5` — exactly the approach this source replaces. It fragments to 52–65 tracklets from ~6 players (0.6–0.8s median life) because broadcast pan breaks IoU between frames. The fix, per this source:
- **Stage 1:** cancel camera motion → stabilized foot points (we already use `footPoint()` as the field-plane point — good, keep it).
- **Stage 2:** replace IoU matching with **reachable-set gating**: predict each active tracklet's next position with a constant-velocity model in the stabilized frame; the match gate is a radius = `v_max * dt` (v_max ≈ 10 m/s sprint), not an IoU threshold.
- **Stage 3:** through occlusions, *coast* the tracklet (keep it alive, no new detections required) for up to a pile-persistence window instead of retiring at `maxGapFrames: 5`.

**Gap (a) — DIRECT (two plays):** (i) RF-DETR segmentation as the per-frame seer — masks handle body-merges better than boxes; a 30-frame annotation budget makes it the cheapest architectural experiment; (ii) SAM-2-style mask propagation through piles — the temporal answer to pile recall.

**Gap (c) — partial:** the camera-cancellation transform *is* a field-plane homography estimated per frame pair — the same math family as our DLT homography, but used for motion compensation rather than pixel→yard mapping. Landing it gives us (c)'s machinery as a side effect.

---

## 5. IMPLEMENTATION SPEC

### 5.1 Motion-compensated association (gap b) — the Tier-1 build

**Target files:**
- Modify: `packages/prediction-engine/src/tracking/cv-tracklet-association.ts` — add a second association pass; keep greedy IoU as the fallback/legacy path (flag-gated).
- New: `packages/prediction-engine/src/tracking/cv-camera-compensation.ts` — inter-frame field-plane transform estimation (feature-based, RANSAC; pure math, no weights).
- Test: extend `packages/prediction-engine/src/tracking/cv-tracklet-association.test.ts`; new `cv-camera-compensation.test.ts`.

**Pseudocode (clean-room):**

```
# --- cv-camera-compensation.ts ---
function estimateCameraMotion(prevFrame, currFrame): Mat3
  # field-plane features: white line pixels (field mask), matched by local descriptors
  # or dense: phase correlation on the field-masked grayscale pair
  ptsPrev, ptsCurr = matchFieldFeatures(prevFrame, currFrame)
  H = ransacHomography(ptsPrev, ptsCurr, inlierThresh=3px)  # field-plane H: prev -> curr
  return H

function stabilize(detections, H): StabilizedDetections
  # express foot points in the previous frame's camera coordinates
  return detections.map(d => ({ ...d, stab: applyHomography(inverse(H), footPoint(d)) }))

# --- cv-tracklet-association.ts (new pass) ---
function associateMotionAware(frames, H /* per frame pair */, options):
  V_MAX = 10.0        # m/s, sprint ceiling — in PIXELS: vMaxPx = V_MAX * pxPerMeter * dt
  COAST_FRAMES = 15   # keep coasting through pile occlusions (up from maxGapFrames 5)
  for each frame t (after stabilizing with H[t-1 -> t]):
    for each active tracklet: predict pos' = pos + vel*dt  (constant velocity in stab frame)
    cost(i, j) = euclidean(predicted_i, stab_j) ; gate: cost <= vMaxPx*dt*1.5
    Hungarian/greedy assignment on gated costs
    unmatched tracklets: coast (gap++, keep velocity); retire only after COAST_FRAMES
    unmatched detections: birth new tracklets
  # velocity update: vel = 0.7*vel + 0.3*(newPos - oldPos)/dt  (exponential smoothing)
```

**Test assertions with expected values:**
1. **Broadcast-pan fixture:** 6 players moving with constant velocity, camera panning at 120 px/s (synthetic frames, known ground truth). Greedy IoU path → assert tracklet count ≥ 20 (reproduces the fragmentation bug: 52–65 observed in prod). Motion-aware path → assert tracklet count === 6 and each tracklet's frame count === total frames (no fragmentation), median tracklet life === full play duration.
2. **Pile-coast fixture:** player A's detections missing for 10 consecutive frames mid-play (simulated pile), then resuming on the constant-velocity path. Assert with `COAST_FRAMES=15`: single tracklet survives (tracklet count for A === 1); with legacy `maxGapFrames=5`: count === 2 (documents the improvement).
3. **Camera-compensation unit test:** two synthetic frames related by a known translation (dx=40, dy=-15 px) with field-line features → assert estimated H's translation within 2 px of (40, -15); pure-rotation fixture → rotation angle within 0.5°.
4. **Gate test:** two players crossing (paths intersect); assert no ID switch — tracklet IDs before and after the crossing frame are identical (the reachable-set gate + velocity continuity disambiguates; an IoU-only matcher would swap).

**Done/verified criteria:** on the real broadcast eval clip, tracklet count drops from 52–65 toward ~6–12 per play and median tracklet life rises from 0.6–0.8s to >3s; the pan fixture test pins the regression.

### 5.2 Jersey-digit OCR re-ID (gap b, long tail)

**Target files:** new `packages/prediction-engine/src/tracking/cv-jersey-ocr.ts` (+ test). Engine choice at build time (e.g., PaddleOCR — Apache-2.0 — verify then).

**Pseudocode:**
```
function reidentifyAfterGap(deadTracklet, newTracklet, rosterNumbers): boolean
  crops = sharpestFrames(newTracklet, k=3)           # Laplacian variance ranking
  for crop in crops:
    digits = ocrDigits(torsoRegion(crop))            # digits only, no jersey detector
    if digits in rosterNumbers and digits == deadTracklet.jerseyNumber (if known):
      return true
  return false
# stitch: newTracklet.id = deadTracklet.id ; record provenance {method: 'jersey-ocr', digits, cropSharpness}
```

**Test assertions:** fixture with a known jersey number rendered as digits on a synthetic crop → assert OCR stub returns the digits and stitching fires; fixture with unreadable crop (blur below sharpness threshold) → assert no stitch (fail-closed, never guess).

### 5.3 RF-DETR segmentation eval (gap a)

Experiment doc only (no repo code until weights are vetted): fine-tune RF-DETR-seg on ~30 annotated pile frames (Roboflow, same semi-supervised loop the author used), compare mask-based person recall vs our YOLOv8n boxes on the pile subset. **Decision rule:** promote to the detector contract only if pile-subset recall beats the v2 box detector by ≥ 5 points at comparable FPS.

---

## 6. IMPROVEMENT PATH
1. **Now:** land 5.1 (motion-compensated association) — it is the highest-leverage change in the corpus for gap (b) and needs no new weights.
2. **Next:** 5.2 (OCR re-ID) for the long-gap tail; 5.3 (RF-DETR eval) for the pile-recall head.
3. **Later:** SAM-2-style mask propagation through piles (the "better behaved memory bank" is an R&D item — start from stock SAM 2 video prediction, Apache-2.0, and measure; the adaptation detail is the author's undisclosed IP, so we re-derive rather than replicate).

---

## 7. EVIDENCE / CONFIDENCE
- **Confidence: HIGH** that the post says what the verification table records (verbatim quotes). **MEDIUM** on implementation transfer: the post gives the architecture and the principles, not the algorithms' internals — the pseudocode above is our clean-room derivation, and the honest-limits paragraph in §1 is the reason this source is a *blueprint*, not a spec.
- GATED portion: comments (HTTP 999, one attempt) — anything in the discussion (follow-up details, author replies) is unknown.
