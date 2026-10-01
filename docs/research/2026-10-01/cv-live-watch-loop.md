# GSE CV live watch loop — architecture spec (2026-10-01)

## The vision (Garrett's correction, 2026-10-01)

There is **no licensing step**. The CV system watches football the way Garrett
watches it: live, on his own screen, like a person sitting on the couch. It
observes **his viewing** — his own paid TV/stream on his own Windows box —
and turns what it sees into engine signals in real time. Nothing is scraped
from anyone's servers, nothing is redistributed, nothing is published.

```
Garrett's Windows box (viewing machine)          This Linux VM (GSE engine)
─────────────────────────────────────          ──────────────────────────
Game on screen (his paid TV/stream)
        │  1-5 fps screen grab
        ▼
 capture client (Python + mss/OpenCV)
        │  JPEG frames → HTTPS POST
        ▼                                      ┌ ingest endpoint
                                               ▼
                                        frame buffer → YOLO detector
                                                     → tracklet association
                                                     → field homography
                                                     → movement metrics
                                                     → engine signals (weight 0, shadow)
```

## Windows capture client (v1 spec)

Minimal Python service on Garrett's Windows viewing machine. No kernel
drivers, no HDMI capture hardware for v1 — plain screen capture of the
display/region showing the game.

- **Capture**: `mss` (fast, pure-ctypes) or OpenCV; grab the game window or a
  configured screen region at **1–5 fps** (v1 default 2 fps — enough for
  movement features, light on bandwidth).
- **Preprocess**: downscale to ≤960px wide, JPEG quality ~70. A 960×540 JPEG
  at q70 is ~60–100 KB → at 2 fps ≈ 200 KB/s upstream. Trivial.
- **Transport**: `POST /api/ops/watch-frame` on the VM with a shared secret
  header (same `CRON_SECRET` pattern the ops routes use). Body: multipart
  JPEG + JSON `{clientTs, fps, width, height, source: "screen"}`. Retry with
  backoff; local ring buffer if the VM is unreachable (drop oldest — live
  data goes stale fast, never backfill screen frames).
- **Footprint**: one `pip install mss opencv-python-headless requests`
  service, ~80 lines. Runs as a user-level script Garrett starts on game day;
  a tray toggle / hotkey pauses capture (bye week, non-game content).
- **Privacy**: captures only when Garrett starts it, only the configured
  region. Frames are ephemeral — the VM keeps detections/tracklets, not raw
  screen images, beyond a short debug window.

Reference implementation sketch (not yet built — v1 build task):

```python
# watch_capture.py — run on Garrett's Windows box on game day
import time, io, requests, mss
from PIL import Image

VM_URL = "https://<vm>/api/ops/watch-frame"
SECRET = "<CRON_SECRET>"   # Garrett's, never committed
FPS, WIDTH = 2, 960

sct = mss.mss()
mon = sct.monitors[1]  # or a configured region dict
while True:
    t0 = time.time()
    img = sct.grab(mon)
    pil = Image.frombytes("RGB", img.size, img.bgra, "raw", "BGRX")
    pil.thumbnail((WIDTH, WIDTH * 9 // 16))
    buf = io.BytesIO(); pil.save(buf, "JPEG", quality=70)
    try:
        requests.post(VM_URL, headers={"x-ops-secret": SECRET},
                      files={"frame": ("f.jpg", buf.getvalue(), "image/jpeg")},
                      data={"clientTs": str(time.time()), "fps": str(FPS)},
                      timeout=5)
    except Exception:
        pass  # drop frame, keep cadence
    time.sleep(max(0, 1 / FPS - (time.time() - t0)))
```

## VM ingest endpoint (sketch)

New ops route, same protection pattern as the other `/api/ops/*` routes:

- `POST /api/ops/watch-frame` — accepts the JPEG + metadata, verifies the
  shared secret, pushes the frame into an in-memory ring buffer
  (e.g. last ~300 frames ≈ 2.5 min at 2 fps) keyed by arrival timestamp.
- A worker (cron every N seconds, or a lightweight long-running process)
  drains new frames through the existing pipeline:
  1. **Detect** — `yolo-detect` (YOLOv8 person class) on the JPEG.
  2. **Associate** — `buildTracklets()` (IoU, already in-repo).
  3. **Homography** — per-broadcast field mapping. v1: fit once per
     broadcast view from detected yardlines and reuse while the camera view
     is stable; re-fit on scene change. (Yardline detection is the open
     sub-problem — see gaps.)
  4. **Metrics** — `deriveMovementMetrics()` → per-player distance/top speed.
  5. **Signals** — write to the `signals` table at **weight 0** (shadow):
     e.g. `cv.watch.player_speed_p95`, `cv.watch.play_tempo`. Published
     outputs never read them until weighting + calibration are done, per
     the standing research → wire → weight → calibrate → test → polish order.
- `GET /api/ops/watch-status` — frames ingested, detections/frame, tracklet
  count, last pipeline run, drop rate. The health readout for game day.

## What v1 does NOT do

- No recording of full games, no redistribution, no publishing of clips —
  the 2–4s transformative-clip doctrine still governs anything public.
- No reading of anyone else's stream or server — the only input is pixels
  from Garrett's own screen, captured locally with his machine running it.
- No published picks or projections change: every CV-derived signal lands
  at weight 0 in shadow until validated.

## Relation to the detector eval (2026-10-01)

The short-clip YOLO evaluation in `cv-detector-eval-2026-10-01.md` is the
**detector-validation stepping stone**, not the product. It answers "does
the detector see players in real football footage?" The watch loop answers
"does the whole chain work live on Garrett's screen?" The eval clips are
internal-only and are not published, licensed, or redistributed.

## Schedule-driven operation

The loop runs during EVERY NFL game, not just when Garrett happens to watch:
see `cv-game-scheduler.md` for the game-window scheduler (ESPN scoreboard
API, arm at kickoff−15 min, stand down 30 min after final, wakes on cron —
no 24/7 process), the per-game learning store schema (all extracts keyed by
game ID), the one-screen constraint (v1 watches whatever is on his display;
all-games-simultaneously needs more capture inputs — Garrett's call later),
and the readiness checklist for Steelers @ Browns tonight (7:15 PM CT).

## Open gaps (largest first)

1. **Yardline/field-marking detection for the homography.** The DLT math is
   proven on fixtures, but a live broadcast view needs automatic
   correspondences (yardline ∩ sideline intersections). v1 options: line
   detection (Hough) + field-color masking, or a tiny keypoint model. Until
   this exists, homography is hand-seeded per broadcast view.
2. **Capture client is specced, not built.** Needs Garrett's Windows box and
   his tap to run on game day.
3. **Detector at broadcast distance.** 360p eval footage shows YOLOv8n finds
   near players but misses small/distant ones (see eval numbers). The watch
   loop captures at 960px+, which helps; a larger model (v8m/v8s) is the
   fallback if recall is short.
4. **Ingest endpoint + worker not built.** Straightforward; gated behind
   the capture client existing.
5. **Identity/team association.** Tracklets are anonymous boxes; jersey-color
   clustering for team assignment is follow-up work.
