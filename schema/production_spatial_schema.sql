-- Spatio-Temporal B-Tree Clustered & BRIN Telemetry Schema (Weeks 1-8 Backtest Topology)
-- Note:
--   1. Never mutate raw tracking coordinates (x, y) by scalar multipliers for turf upgrades;
--      store surface parameters on game_context instead.
--   2. Never mutate postmaster-level buffer settings on Neon Serverless;
--      use session-level SET work_mem = '256MB' instead.
--   3. Never CLUSTER a table on a BRIN index (PostgreSQL raises ERROR: access method does not support clustering);
--      CLUSTER strictly on a B-tree index (idx_telemetry_btree_order), then maintain the BRIN summary index.

SET work_mem = '256MB';

CREATE TABLE IF NOT EXISTS game_context (
    game_id TEXT PRIMARY KEY,
    season_year INTEGER NOT NULL,
    week INTEGER NOT NULL,
    home_team_id TEXT NOT NULL,
    away_team_id TEXT NOT NULL,
    surface_type TEXT DEFAULT 'standard',
    turf_shear_yield_multiplier DOUBLE PRECISION DEFAULT 1.00
);

CREATE TABLE IF NOT EXISTS telemetry_tracking_fact (
    game_id TEXT NOT NULL,
    play_id INTEGER NOT NULL,
    frame_id INTEGER NOT NULL,
    assigned_node_idx INTEGER NOT NULL,
    player_id TEXT NOT NULL,
    role TEXT NOT NULL,
    x DOUBLE PRECISION NOT NULL,
    y DOUBLE PRECISION NOT NULL,
    vx DOUBLE PRECISION NOT NULL,
    vy DOUBLE PRECISION NOT NULL,
    weight_lbs DOUBLE PRECISION DEFAULT 235.0
);

CREATE INDEX IF NOT EXISTS idx_telemetry_btree_order
ON telemetry_tracking_fact (game_id, play_id, frame_id);

CLUSTER telemetry_tracking_fact USING idx_telemetry_btree_order;

CREATE INDEX IF NOT EXISTS idx_telemetry_brin_spatiotemporal
ON telemetry_tracking_fact
USING BRIN (game_id, play_id, frame_id)
WITH (pages_per_range = 32);

-- UNLOGGED disables WAL overhead for temporary backtest staging; use pg_prewarm('telemetry_live_memory_cache_buffer', 'buffer')
-- when pinning pages into PostgreSQL shared buffers.
CREATE UNLOGGED TABLE IF NOT EXISTS telemetry_live_memory_cache_buffer AS
SELECT * FROM telemetry_tracking_fact
WHERE game_id IN (
    SELECT game_id FROM game_context
    WHERE season_year = 2026 AND week BETWEEN 1 AND 8
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mem_cache_fast_lookup
ON telemetry_live_memory_cache_buffer (game_id, play_id, frame_id, assigned_node_idx);

ANALYZE telemetry_live_memory_cache_buffer;
