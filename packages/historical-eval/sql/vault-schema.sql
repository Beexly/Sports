CREATE TABLE IF NOT EXISTS hist_odds_snapshot (
  id BIGSERIAL PRIMARY KEY,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  game_id TEXT NOT NULL,
  market TEXT NOT NULL,
  bookmaker TEXT,
  fetched_at TIMESTAMPTZ NOT NULL,
  home_price DOUBLE PRECISION,
  away_price DOUBLE PRECISION,
  spread DOUBLE PRECISION,
  raw_json JSONB,
  UNIQUE (game_id, market, bookmaker, fetched_at)
);

CREATE TABLE IF NOT EXISTS hist_feature_snapshot (
  id BIGSERIAL PRIMARY KEY,
  as_of TIMESTAMPTZ NOT NULL,
  game_id TEXT NOT NULL,
  feature_version TEXT NOT NULL,
  features JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS hist_replay_decision (
  id BIGSERIAL PRIMARY KEY,
  replay_run_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  decision_time TIMESTAMPTZ NOT NULL,
  stratum_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  reasons TEXT[] NOT NULL DEFAULT '{}',
  p_lo DOUBLE PRECISION,
  p_hi DOUBLE PRECISION,
  q DOUBLE PRECISION,
  edge_lcb DOUBLE PRECISION,
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hist_odds_game_time ON hist_odds_snapshot (game_id, fetched_at);
CREATE INDEX IF NOT EXISTS hist_replay_run ON hist_replay_decision (replay_run_id);
