-- GSE CV watch-loop learning store.
--
-- HARD RULE (Garrett, 2026-09-28): no agent tests DB work on the default
-- Neon branch. Writers/migrations/backfills run on throwaway copy-on-write
-- branches only (auto-expire 7d). This DDL is documentation + review artifact;
-- it must NOT be applied to the default branch by any agent. A founder
-- applies it (or a migration derived from it) when the watch loop goes live.
--
-- Everything the loop extracts is keyed by game_id (ESPN event id) so the
-- engine accumulates film knowledge game over game. Raw frames are NEVER
-- stored here — only detections, tracklets, field positions, and derived
-- metrics (JSON). Raw frames live transiently on the capture box's rolling
-- buffer (~30 min, for debugging) and are never uploaded to the cloud.
--
-- All CV-derived signals land at weight 0 (shadow) per the standing
-- research -> wire -> weight -> calibrate -> test -> polish order.

CREATE SCHEMA IF NOT EXISTS watch;

-- One row per scheduled/windowed game.
CREATE TABLE IF NOT EXISTS watch.games (
  game_id         TEXT PRIMARY KEY,            -- ESPN event id, e.g. '401872964'
  season          INT NOT NULL,
  week            INT NOT NULL,
  away            TEXT NOT NULL,
  home            TEXT NOT NULL,
  kickoff_ts      TIMESTAMPTZ NOT NULL,
  window_start    TIMESTAMPTZ NOT NULL,
  window_end      TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'scheduled',  -- scheduled|live|final
  mode            TEXT NOT NULL DEFAULT 'priority',   -- priority|redzone|all22
  frames_ingested INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Per-frame detector output (detector-contract JSON). No pixels.
CREATE TABLE IF NOT EXISTS watch.frames (
  game_id   TEXT NOT NULL REFERENCES watch.games(game_id),
  frame_ts  TIMESTAMPTZ NOT NULL,
  frame_idx INT NOT NULL,
  fps       REAL NOT NULL,                     -- capture fps for this frame (1 or 5)
  burst     BOOLEAN NOT NULL DEFAULT FALSE,    -- true when captured in 5fps burst
  detections JSONB NOT NULL,                   -- Detection[] per detector contract
  PRIMARY KEY (game_id, frame_idx)
);
CREATE INDEX IF NOT EXISTS watch_frames_ts_idx ON watch.frames (game_id, frame_ts);

-- Tracklet association output.
CREATE TABLE IF NOT EXISTS watch.tracklets (
  game_id     TEXT NOT NULL REFERENCES watch.games(game_id),
  tracklet_id TEXT NOT NULL,                   -- e.g. 'trk-0001' (per-game)
  start_ts    TIMESTAMPTZ NOT NULL,
  end_ts      TIMESTAMPTZ NOT NULL,
  n_frames    INT NOT NULL,
  team_hint   TEXT,
  role        TEXT,
  PRIMARY KEY (game_id, tracklet_id)
);

-- The film-knowledge gold: projected field positions, yards.
-- Field coordinates: x = 0..120 (goal line to goal line + end zones),
-- y = 0..53.3 (sideline to sideline).
CREATE TABLE IF NOT EXISTS watch.field_positions (
  game_id     TEXT NOT NULL,
  tracklet_id TEXT NOT NULL,
  t           TIMESTAMPTZ NOT NULL,
  x_yd        REAL NOT NULL,
  y_yd        REAL NOT NULL,
  speed_yds   REAL,                            -- derived speed, yards/sec
  PRIMARY KEY (game_id, tracklet_id, t),
  FOREIGN KEY (game_id, tracklet_id)
    REFERENCES watch.tracklets(game_id, tracklet_id)
);

-- Derived CV metrics aimed at what NGS does NOT give us: formation
-- recognition, route shapes, separation at break/catch, break angles
-- (the fieldcoachai metric shapes). Computed per tracklet-segment.
CREATE TABLE IF NOT EXISTS watch.derived_metrics (
  game_id     TEXT NOT NULL,
  tracklet_id TEXT NOT NULL,
  segment     TEXT NOT NULL,                   -- e.g. 'route', 'post-snap'
  metric      TEXT NOT NULL,                   -- 'break_angle_deg' | 'sep_at_break_yd' | ...
  value       REAL NOT NULL,
  t           TIMESTAMPTZ,
  PRIMARY KEY (game_id, tracklet_id, segment, metric),
  FOREIGN KEY (game_id, tracklet_id)
    REFERENCES watch.tracklets(game_id, tracklet_id)
);

-- Window heartbeats from the scheduler cron (liveness signal for game day).
CREATE TABLE IF NOT EXISTS watch.scheduler_runs (
  run_ts        TIMESTAMPTZ NOT NULL DEFAULT now(),
  active_games  TEXT[] NOT NULL DEFAULT '{}',
  next_game_id  TEXT,
  next_kickoff  TIMESTAMPTZ,
  space_warmed  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (run_ts)
);
