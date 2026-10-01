---
title: Gse Watch Pipeline
emoji: 🏈
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# gse-watch-pipeline

CV compute brain for the GSE autonomous live watch loop. **Cloud-hosted —
nothing here relies on Garrett's local workspace or the GSE VM for compute.**

Flow:

```
Windows watcher → POST /process-frame (JPEG) → this Space
    → YOLO detection → tracklet association → field homography
    → derived metrics → JSON → watcher relays JSON to Vercel /api/ops/watch-ingest
    → Neon (watch.* tables)
```

Raw frames are never stored and never leave the request lifecycle.

## Hardware

Docker SDK Space. Recommended hardware: **ZeroGPU** (serverless NVIDIA
compute; the Vercel scheduler warm-pings `/health` every 3 minutes during
game windows so it never cold-starts mid-drive). If ZeroGPU quotas prove
flaky in testing, the documented fallback is a paid always-on CPU tier
during game windows only — see
`packages/prediction-engine/src/watch/README.md`.

Set hardware in the Space settings (Settings → Hardware). ZeroGPU billing
is per-second of actual inference.

## API

- `GET /health` → `{status, model, detect_width, games_tracked}`
- `POST /process-frame` (multipart):
  - `frame`: JPEG bytes (720p, q~60, ≤2MB)
  - `game_id`: ESPN event id, e.g. `401872964`
  - `ts`: frame timestamp, epoch seconds (float)
  - `fps`: capture fps for this frame (`1.0` idle / `5.0` burst)
  - `burst`: bool
  - `homography` (optional): JSON 3×3 px→yards matrix. When absent,
    `x_yd`/`y_yd` are null (v1 hand-seed per broadcast view; auto
    field-landmark detection is the open research gap).

Returns detections, active/finished tracklets, per-frame derived metrics
(field positions, separation proxies, break-angle proxies), and timing.

## Per-game state

Tracklet association is incremental and in-process, keyed by `game_id`
(evicted after 6h idle). **Run exactly one worker** (see Dockerfile) — state
must not shard across replicas.

## Local test

```bash
pip install -r requirements.txt
python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
uvicorn app:app --port 7860
curl localhost:7860/health
```

## License

Proprietary — GalaxySportsEdge internal. Model weights: Ultralytics YOLOv8n
(AGPL-3.0; used as an unmodified inference dependency, no distribution of
modified model code).
