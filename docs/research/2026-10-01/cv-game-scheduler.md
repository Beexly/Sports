# CV game-window scheduler + per-game learning store (2026-10-01)

## Intent

The watch loop runs during **every NFL game**, not just when Garrett happens
to watch. It knows the schedule, arms itself for each broadcast window, and
learns from every game it sees. NFL only for now (NBA/MLB/soccer later).

## Schedule source (verified live 2026-10-01)

ESPN scoreboard API, no key required:
`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYYMMDD`
(nflverse schedules as fallback). Verified tonight and Sunday:

- **Tonight:** event `401872964`, PIT@CLE, 2026-10-02T00:15Z = **7:15 PM CT**
- **Sun 10-04:** 14 games — 8:30 AM CT international (IND@WSH), 8× 12:00 PM CT,
  4× 3:05/3:25 PM CT, SNF 7:20 PM CT (DET@CAR)
- Pattern: TNF Thu 7:15 PM CT, Sun 12:00 / 3:05 / 3:25 / 7:20 PM CT,
  MNF Mon 7:15 PM CT, occasional Saturday (late season) and 8:30 AM CT
  international games. All converted to America/Chicago for the scheduler.

## Game-window scheduler (spec)

A small service — it does NOT run 24/7. A cron (every 10 min) wakes it; it
computes windows and ensures the ingest worker is up only when needed.

**Per game:**
- `windowStart = kickoff − 15 min` (arm: client connects, worker warm)
- `windowEnd = final + 30 min` (stand down; "final" from polling the
  scoreboard `status.type.name == "STATUS_FINAL"` every 5 min in-window)
- State per game: `{espnEventId, season, week, away, home, kickoffTs,
  windowStart, windowEnd, status}` — persisted so restarts don't lose it.

**Wake logic (each cron tick):**
1. Pull today's + tomorrow's scoreboard; compute windows.
2. If any window is active now or starts within 15 min → ensure the ingest
   worker is running and the capture client is armed (push notification to
   Garrett's phone if the client isn't reporting — his tap is the one human
   input in the loop).
3. If no window is active → worker stays down. Nothing runs between games.

**Multi-game windows:** the scheduler arms for ALL in-window games. With one
capture input, v1 runs two modes (see `cv-live-watch-loop.md`):

- **(a) Priority-game mode:** tune to one game (highest engine edge, or
  Garrett's preset priority list). Full film for that game.
- **(b) RedZone/multiview mode:** tune to NFL RedZone — one feed whips
  around every game's key plays, so a single capture input learns from ALL
  games' scoring plays simultaneously. Frames tagged by game (v1: scheduler
  time-range heuristics; v1.5: OCR the score bug).

**International windows are first-class, starting THIS Sunday:** the early
window is not a late-season edge case. Sun 2026-10-04 opens with
Colts vs Commanders from London, kickoff 13:30 UTC = **8:30 AM CT**
(event `401872965`, verified via ESPN API). The scheduler treats any
kickoff time as a normal window — arm at kickoff−15 min regardless of hour.
This Sunday's windows: **8:30 AM CT (London) → 12:00 PM CT (9 games) →
3:05/3:25 PM CT → 7:20 PM CT (SNF)**.

**Next-day deep study (NFL+ All-22 lane):** NFL+ Premium posts All-22
coaches film after games — a legit paid product, the highest-quality
learning data (full-field view, no broadcast cuts). Same auto-tune +
capture machinery, pointed at NFL+ replay the morning after: automated
pull of All-22 for every game → formation/coverage extraction into
`watch.plays` / `watch.formations` / `watch.tendencies`. Live Sunday is
the RedZone/priority feed; Monday is All-22 study for all games. This is
where the real film knowledge accumulates.

Reference sketch (the ~60-line core; not yet built):

```ts
// watch-scheduler.ts — run every 10 min via cron
const games = await fetchScoreboard(dates);          // ESPN API
const now = Date.now();
for (const g of games) {
  const ws = g.kickoff - 15 * 60e3;
  let we = g.live ? await finalPlus30(g) : g.kickoff + 4.5 * 3600e3; // ~4.5h fallback
  upsertGameWindow({ ...g, windowStart: ws, windowEnd: we });
}
const active = getWindows().filter(w => w.windowStart <= now && now <= w.windowEnd);
if (active.length) ensureWorkerUp(active); else ensureWorkerDown();
```

## The one-input constraint (explicit)

**v1 has one capture input: the autonomous watcher on Garrett's Windows
box.** The scheduler auto-tunes it per window — no human in the loop — so
on single-game windows (TNF/SNF/MNF/London) it simply watches that game.
On multi-game Sunday windows it runs priority-game or RedZone mode (above),
and each ingested frame is tagged with the game ID so the learning store
stays correctly keyed.

**True all-games-simultaneously coverage needs more capture inputs** than
one box: extra machines/tuners feeding the ingest endpoint, one stream per
game. That is a hardware/money decision for Garrett later — not this build.
The ingest endpoint and learning store are already multi-game keyed, so
scaling is additive, not a redesign.

## Per-game learning store (spec)

Postgres (Neon; throwaway-branch rule for all testing). Everything the loop
extracts is keyed by game ID — the engine accumulates film knowledge game
over game.

```sql
-- games: one row per scheduled/windowed game
CREATE TABLE watch.games (
  game_id      TEXT PRIMARY KEY,          -- ESPN event id, e.g. '401872964'
  season       INT NOT NULL, week INT NOT NULL,
  away         TEXT NOT NULL, home TEXT NOT NULL,
  kickoff_ts   TIMESTAMPTZ NOT NULL,
  window_start TIMESTAMPTZ NOT NULL, window_end TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled|live|final
  frames_ingested INT NOT NULL DEFAULT 0
);

-- frames: per-frame detections (raw JPEGs NOT stored beyond a 24h debug window)
CREATE TABLE watch.frames (
  game_id  TEXT REFERENCES watch.games(game_id),
  frame_ts TIMESTAMPTZ NOT NULL,
  frame_idx INT NOT NULL,
  detections JSONB NOT NULL,             -- detector-contract detections[]
  PRIMARY KEY (game_id, frame_idx)
);

-- tracklets: association output
CREATE TABLE watch.tracklets (
  game_id TEXT REFERENCES watch.games(game_id),
  tracklet_id TEXT NOT NULL,
  start_ts TIMESTAMPTZ NOT NULL, end_ts TIMESTAMPTZ NOT NULL,
  n_frames INT NOT NULL,
  PRIMARY KEY (game_id, tracklet_id)
);

-- field_positions: the film-knowledge gold — projected (x, y) in yards
CREATE TABLE watch.field_positions (
  game_id TEXT NOT NULL, tracklet_id TEXT NOT NULL,
  t TIMESTAMPTZ NOT NULL, x_yd REAL NOT NULL, y_yd REAL NOT NULL,
  PRIMARY KEY (game_id, tracklet_id, t),
  FOREIGN KEY (game_id, tracklet_id) REFERENCES watch.tracklets(game_id, tracklet_id)
);

-- v2+: watch.plays, watch.formations, watch.tendencies
```

All CV-derived signals land at **weight 0 (shadow)** per the standing
research → wire → weight → calibrate → test → polish order. Retention:
positions/tracklets/detections kept for the season; raw frames dropped after
24h.

## Tonight: Steelers @ Browns, 7:15 PM CT — autonomous readiness

**What runs autonomously by kickoff (no Garrett involvement):**

1. ✅ Schedule known — event `401872964`, window 7:00 PM → ~10:45 PM CT.
   (Verified via ESPN API 2026-10-01.)
2. ✅ Detector ready — YOLOv8n weights local, `yolo-detect.py` working,
   48/48 tests green, real-footage eval done (P=1.00, R=0.74).
3. ❌ **Autonomous watcher (tune + capture + relay)** — spec'd
   (`cv-live-watch-loop.md`), not built.
4. ❌ **VM ingest endpoint + worker** — sketched, not built.
5. ❌ **Scheduler armed for tonight's window** — spec'd; the core is
   ~60 lines, but it doesn't exist yet.
6. ⚠️ **Homography** — hand-seed fallback per broadcast view (~30s,
   one-time); auto field-landmark detection is the research gap.
7. ⚠️ **Association fragments on broadcast pace** (52 tracklets / ~6
   players) — counts and heatmaps work tonight; per-player tracking doesn't.

**What Garrett does exactly once (setup, not per-game):** leave the Windows
box on, logged into his YouTube TV / NFL app / NFL+ subscriptions, with the
watcher installed as a boot service. After that he never touches it — the
scheduler auto-tunes per window, including tonight.

**Cost/hardware picture (v1):** his existing Windows box + subscriptions he
already pays for (YouTube TV Sunday Ticket / NFL app / NFL+). No new
purchases, no new subscriptions. Full simultaneous all-game film (every
snap of every game) would need extra capture inputs later — his call, not
this build.

**Bottom line:** the sensing math is measured and ready; the three builds
(watcher, ingest + worker, scheduler) are spec'd but unbuilt. Nothing is
blocked on anything except build time + Garrett's one-time setup. The
honest v1 for tonight, if the builds landed: detections + counts +
field-position heatmaps at weight 0, hand-seeded homography, zero human
input after setup.
