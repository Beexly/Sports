# CV watch-loop: scheduler + learning store

Cloud side of the autonomous watch loop. The compute brain is the
`gse-watch-pipeline` HF Space (`spaces/gse-watch-pipeline/`); the capture
client is `watcher/` (Windows box). This package owns the schedule and the
Vercel wiring between them.

## Components

- `watch-scheduler.ts` — ESPN scoreboard → `GameWindow[]`. Arm at
  kickoff−15 min, stand down at final+30 min (kickoff+4.5h fallback).
  Cron-woken; exposes `getActiveWindows()` / `nextWindow()`.
- `watch-schema.sql` — `watch.*` DDL (games, frames, tracklets,
  field_positions, derived_metrics, scheduler_runs). **Branch-only testing
  rule: agents never apply this to the default Neon branch.** A founder
  applies it when the loop goes live.
- Vercel routes (in `apps/web`):
  - `POST /api/ops/watch-ingest` — receives the Space's JSON (relayed by
    the watcher), persists to `watch.*`. CRON_SECRET-gated. `?dryRun=1`
    validates without writing.
  - `GET /api/cron/watch-scheduler` — every 10 min: fetch windows, upsert
    `watch.games`, heartbeat `watch.scheduler_runs`, warm-ping the Space
    when a window is active/arming.
  - `GET /api/cron/watch-warm` — every 3 min: warm-ping the Space's
    `/health` during active windows so ZeroGPU never cold-starts mid-drive.

## Coverage doctrine (honest)

One box = one stream. The scheduler arms for ALL in-window games, but the
watcher can only watch one feed. Sunday 12:00 PM CT has ~10 simultaneous
games; no single household subscription watches all of them live.

- **Priority windows** — TNF, SNF, MNF, London, Garrett's fantasy-relevant
  games: full-film live watch.
- **Simultaneous windows** — RedZone/multiview whip-around: one feed,
  every game's key plays.
- **The rest** — next-day All-22 backfill via the same machinery pointed
  at NFL+ replay.

Nobody downstream may claim "every game live." Full simultaneous film
needs more capture inputs — a hardware/money decision for Garrett later.

## Efficiency math

Per game, worst case (all burst, no idle):

| Item | Value |
|---|---|
| Frame size (720p, JPEG q60) | ~50 KB |
| Blind 5 fps × 3.5 h | 63,000 frames ≈ 3.2 GB upstream |
| Adaptive (1 fps idle / 5 fps burst, ~40% live) | ~2.6 fps mean ≈ 1.6 GB upstream |
| Between games | 1 fps sampled locally, nothing uploaded |

- **Compute:** adaptive gating cuts Space inferences ~2× vs blind 5 fps;
  idle windows (halftime, pre-game) run at 1 fps. YOLOv8n at 640px is
  ~10 ms/frame on ZeroGPU — a full game is ~9 GPU-minutes worst case.
- **ZeroGPU:** billed per-second of actual inference; the 3-min warm ping
  keeps the container warm during windows at negligible cost. Fallback if
  quotas flake: paid always-on CPU tier during windows only.
- **Storage:** JSON only — detections, tracklets, field positions, derived
  metrics. ~63k frames × ~2 KB JSON ≈ 130 MB/game worst case, typically
  far less (burst-only persistence is a v2 optimization).

## Derived metrics direction

The CV lane builds what NGS won't give us: formation recognition, route
shapes, separation-at-break/catch, break angles. Not a worse NGS — the
engine already ingests nflverse/NGS-derived data.

## Env vars (Vercel)

- `GSE_WATCH_SPACE_URL` — e.g. `https://beexly-gse-watch-pipeline.hf.space`
- `CRON_SECRET` — gates the ingest route and both crons (existing)
