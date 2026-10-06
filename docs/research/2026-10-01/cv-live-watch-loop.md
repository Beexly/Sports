# GSE CV live watch loop — architecture spec (2026-10-01)

## The vision (Garrett's directive, 2026-10-01 — DECISIVE)

There is **no licensing step** and **no human in the loop**. An autonomous
watcher runs on Garrett's always-on Windows box at home: the game-window
scheduler auto-tunes his viewing app to the game(s) per window — no clicks
from him — captures his own screen at 1–5 fps, and relays frames to this VM,
which runs detection → tracking → homography → per-game learning store,
live, as each game plays. His subscriptions, his hardware, his home; nothing
is restreamed or published anywhere.

Garrett's only involvement is one-time setup (box on, logged into his apps —
setup, not per-game). After that he never touches it.

```
Garrett's Windows box (always-on, his home)          This Linux VM
──────────────────────────────────────────          ─────────────────────
scheduler wakes per game window
  → auto-tunes viewing app (YouTube TV/NFL app/NFL+)
  → screen capture (mss/DXGI), 1-5 fps
  → JPEG frames → HTTPS POST ──────────────→ ┌ ingest endpoint
                                             ▼
                                      frame buffer → YOLO detector
                                                   → tracklet association
                                                   → field homography
                                                   → movement metrics
                                                   → watch.* learning store
                                                     (weight 0, shadow)
```

## Hard lines (do not cross)

- No DRM stripping, no credential sharing/stuffing, no scraping of NFL or
  streaming servers directly, no restreaming or publishing video anywhere.
- Screen capture of his own licensed viewing, on his own machine, for his
  own private analysis only.
- Residual ToS risk: streaming services can flag automated app use; the
  watcher mimics normal viewing patterns (one stream, real cadence) to stay
  boring, but the risk is nonzero and owned, not hidden.

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

## Windows autonomous watcher (v1 spec)

A user-level Python service on Garrett's always-on Windows box. Three jobs:
**tune, capture, relay.** No kernel drivers, no capture hardware for v1 —
plain screen capture of the viewing app.

- **Tune (auto, per game window):** the scheduler tells the watcher which
  game to show. Tuning = launch/focus the viewing app and navigate to the
  game, via deep links where the app supports them (YouTube TV and the NFL
  app both accept launch URLs), falling back to scripted keystrokes.
  Honest caveat: this is the most brittle part — app UI changes break
  scripted navigation, so keep the tune logic tiny, logged, and per-app
  isolated. Retries with backoff; if tuning fails, the watcher captures
  whatever is on screen and flags the window as degraded rather than
  dying silently.
- **Capture:** `mss` (fast, pure-ctypes) or DXGI; grab the app window at
  **1–5 fps** (v1 default 2 fps).
- **Preprocess:** downscale to ≤960px wide, JPEG quality ~70 (~60–100 KB
  per frame → ~200 KB/s upstream at 2 fps). Trivial.
- **Transport:** `POST /api/ops/watch-frame` on the VM with a shared secret
  header (same `CRON_SECRET` pattern as the other ops routes). Body:
  multipart JPEG + JSON `{clientTs, fps, width, height, gameId,
  source: "screen"}`. Retry with backoff; local ring buffer if the VM is
  unreachable (drop oldest — live data goes stale fast, never backfill
  screen frames).
- **Footprint:** `pip install mss opencv-python-headless requests`, ~150
  lines. Runs as a scheduled task / service — starts on boot, no login
  needed beyond the one-time setup.
- **Privacy:** frames are ephemeral — the VM keeps detections/tracklets,
  not raw screen images, beyond a short debug window.

## Sunday coverage: two modes, one input

During the early/late Sunday windows one input can't see 9 games. v1:

- **(a) Priority-game mode:** tune to one game (highest engine edge, or
  Garrett's preset priority list). Full film for that game.
- **(b) RedZone/multiview mode:** tune to NFL RedZone, which whips around
  every game's key plays on a single feed — one capture input learns from
  ALL games' scoring plays simultaneously. The learning store tags each
  segment by game (RedZone's on-screen score bug identifies the game;
  v1.5: OCR the bug, v1: time-range heuristics from the scheduler).

Honest flag: full simultaneous all-game film (every snap of every game)
needs more capture inputs — extra boxes/tuners, one stream per game. That
is a future hardware/money decision for Garrett, not this build. The
ingest endpoint and learning store are already multi-game keyed, so
scaling is additive, not a redesign.

## Next-day deep study: NFL+ All-22 lane

NFL+ Premium posts All-22 coaches film after games — a legit paid product
and the highest-quality learning data (full-field view, no broadcast cuts).
Spec as the film-study lane: automated next-day pull of All-22 for every
game (same auto-tune + capture machinery, pointed at NFL+ replay), full
formation/coverage extraction into `watch.plays` / `watch.formations` /
`watch.tendencies`. Live Sunday is the RedZone/priority feed; Monday is
All-22 study for all games. This is where the real film knowledge
accumulates.

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

- No video retention: frames are analyzed and dropped — the VM keeps
  detections/tracklets/positions, not video. No redistribution, no
  publishing of clips — the 2–4s transformative-clip doctrine still
  governs anything public.
- No reading of anyone else's stream or server — the only input is pixels
  from Garrett's own screen, captured locally on his own machine.
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

## Open gaps (largest first, vs. the autonomous live-watch-loop vision)

1. **Watcher/tune/ingest/scheduler are spec'd, not built.** The autonomous
   chain (auto-tune → capture → relay → ingest → worker) exists on paper.
   None of it is blocked on anything but build time + Garrett's one-time
   setup (box on, logged into his apps).
2. **Field-landmark detection for the homography.** The DLT math is proven
   on fixtures, but a live broadcast view needs automatic 2D
   correspondences (yard-line ∩ sideline, hash marks) — yard lines alone
   are a degenerate configuration (proven in the eval). v1 fallback:
   hand-seed per broadcast view.
3. **Motion-aware association.** Pure-IoU `buildTracklets` fragments on
   broadcast pace (52 tracklets / ~6 players, median life 0.8s). Fix
   direction: camera-motion compensation + prediction, or higher fps.
   Usable today for counts/heatmaps; not per-player tracking.
4. **Detector at broadcast distance.** P=1.00/R=0.74 at 360p (n=57);
   misses concentrate in piles/occlusions. Watch-loop captures at 960px+,
   which should help; larger model (v8m) is the fallback.
5. **Identity/team association.** Tracklets are anonymous boxes; jersey-color
   clustering for team assignment is follow-up work.
6. **RedZone game-tagging.** v1: scheduler time-range heuristics; v1.5: OCR
   the on-screen score bug.
