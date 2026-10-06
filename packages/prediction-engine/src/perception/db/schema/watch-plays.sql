-- ============================================================================
-- GSE watch film knowledge base — play database schema
-- ============================================================================
-- BRANCH-ONLY TESTING RULE (Garrett, HARD 2026-09-28):
--   Writer and migration tests run ONLY on throwaway Neon branches
--   (auto-expire 7d). NEVER apply this schema to the default branch from
--   an agent session. Creating the throwaway branch needs a Neon API key
--   (founder-gated); until then this file is documentation + review.
--
-- WHAT THIS STORES: intelligence, never raw frames. One row per perceived
-- play: game state at the snap, formation, route combination, result.
-- Raw video lives transiently on the capture box's rolling buffer only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS watch_games (
  game_id       TEXT PRIMARY KEY,
  season        INTEGER NOT NULL,
  week          INTEGER NOT NULL,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  kickoff_ts    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watch_plays (
  play_id       TEXT PRIMARY KEY,              -- play_<gameId>_<n>
  game_id       TEXT NOT NULL REFERENCES watch_games(game_id),
  qtr           INTEGER,                       -- 1-4, 5 = OT
  clock_sec     INTEGER,                       -- seconds remaining in quarter
  down          INTEGER,                       -- 1-4
  distance_yd   INTEGER,                       -- 0 = goal-to-go
  yard_line_own INTEGER,                       -- 0..100 from possessing team's goal
  score_diff    INTEGER,                       -- possession score minus opponent
  possession    TEXT,                          -- offense team abbrev
  personnel     TEXT,                          -- "11", "12", "21", ...
  backfield     TEXT,                          -- under-center | pistol | shotgun | empty
  distribution  TEXT,                          -- trips-left | 2x2 | bunch-right | ...
  routes        JSONB,                         -- [{trackletId, route, confidence, depthYards}]
  separation    JSONB,                         -- [{trackletId, route, breakAngleDeg, sepAtBreakYd, sepAtCatchYd}]
  route_combo   TEXT,                          -- canonical sorted combo, e.g. "go+out+slant"
  play_type     TEXT NOT NULL DEFAULT 'unknown', -- pass | run | play-action | screen | unknown
  result_yards  REAL,
  epa           REAL,                          -- placeholder; fitted later, NULL until then
  commentary    JSONB,                         -- {mentions: [...], text: "..."}
  source        TEXT NOT NULL DEFAULT 'cv',
  weight        REAL NOT NULL DEFAULT 0,       -- shadow-only until validated
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watch_plays_game      ON watch_plays (game_id);
CREATE INDEX IF NOT EXISTS idx_watch_plays_poss_down ON watch_plays (possession, down);
CREATE INDEX IF NOT EXISTS idx_watch_plays_dist      ON watch_plays (distribution);
CREATE INDEX IF NOT EXISTS idx_watch_plays_combo     ON watch_plays (route_combo);
CREATE INDEX IF NOT EXISTS idx_watch_plays_type      ON watch_plays (play_type);

-- Production mirrors of the TypeScript tendency queries (cv-tendencies.ts).
-- Run/pass rate by team × down × distance bucket.
CREATE OR REPLACE VIEW v_runpass_tendency AS
SELECT
  possession AS team,
  down,
  CASE
    WHEN distance_yd <= 3 THEN 'short'
    WHEN distance_yd <= 7 THEN 'medium'
    ELSE 'long'
  END AS bucket,
  COUNT(*) AS n,
  SUM(CASE WHEN play_type = 'run' THEN 1 ELSE 0 END)::REAL / COUNT(*) AS run_rate
FROM watch_plays
WHERE play_type IN ('run', 'pass', 'play-action', 'screen')
  AND possession IS NOT NULL AND down IS NOT NULL AND distance_yd IS NOT NULL
GROUP BY 1, 2, 3;

-- Route-combination frequency by team × formation distribution.
CREATE OR REPLACE VIEW v_route_combo_freq AS
SELECT
  possession AS team,
  distribution,
  route_combo,
  COUNT(*) AS n
FROM watch_plays
WHERE route_combo IS NOT NULL AND distribution IS NOT NULL
GROUP BY 1, 2, 3;
