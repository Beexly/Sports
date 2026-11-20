-- gcp/bigquery/schema_and_bqml_baseline.sql
-- Time-partitioned warehouse tables + SQL-only BigQuery ML baseline (free-tier friendly).

CREATE SCHEMA IF NOT EXISTS `gse_analytics`
OPTIONS (location = "US");

CREATE TABLE IF NOT EXISTS `gse_analytics.game_events` (
  event_id STRING NOT NULL,
  league STRING NOT NULL,
  game_id STRING NOT NULL,
  event_type STRING NOT NULL,
  event_ts TIMESTAMP NOT NULL,
  ingested_at TIMESTAMP NOT NULL,
  source STRING,
  payload_json JSON
)
PARTITION BY DATE(event_ts)
CLUSTER BY league, game_id, event_type;

CREATE TABLE IF NOT EXISTS `gse_analytics.team_game_features` (
  season INT64 NOT NULL,
  week INT64 NOT NULL,
  game_id STRING NOT NULL,
  home_team STRING NOT NULL,
  away_team STRING NOT NULL,
  srs_diff FLOAT64,
  to_pct_diff FLOAT64,
  pts_per_drive_diff FLOAT64,
  rz_td_pct_diff FLOAT64,
  exp_pts_diff FLOAT64,
  home_win INT64
)
CLUSTER BY season, week;

-- Baseline logistic regression model trained directly in BigQuery ML (zero external GPU/infra)
-- Run once historical rows are loaded into gse_analytics.team_game_features:
/*
CREATE OR REPLACE MODEL `gse_analytics.nfl_win_prob_baseline`
OPTIONS (
  model_type = 'LOGISTIC_REG',
  input_label_cols = ['home_win'],
  auto_class_weights = TRUE
) AS
SELECT
  srs_diff,
  to_pct_diff,
  pts_per_drive_diff,
  rz_td_pct_diff,
  exp_pts_diff,
  home_win
FROM `gse_analytics.team_game_features`
WHERE home_win IS NOT NULL;
*/
