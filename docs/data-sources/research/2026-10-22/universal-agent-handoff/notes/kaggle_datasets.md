# Kaggle datasets route (token) — two pulls

With the access token in place, `kaggle datasets list -s nfl` opens the dataset side of Kaggle, not
just competitions. Two taken:

## tobycrabtree/nfl-scores-and-betting-data — CC-BY-NC-SA-4.0
`spreadspoke_scores.csv`: **14,371 games**, 17 cols — date, season, week, playoff flag, teams,
scores, **spread_favorite, over_under_line**, stadium, neutral-site flag, temperature/wind/humidity
and weather detail. Coverage runs to Super Bowl LX (Feb 2026).
This is the historical odds anchor the KB was missing: closing spread and total per game, with the
weather covariates already alongside.

## philiphyde1/nfl-stats-1999-2022 — CC0-1.0
4 files, 397 MB unpacked, nflfastR-shaped aggregates:
- `weekly_player_stats_offense.csv` — 76,287 rows × **678 columns**
- `weekly_team_stats_offense.csv` — 7,658 rows × **424 columns** (shotgun, no_huddle, qb_dropback,
  scrambles, pass/complete/incomplete …)
- yearly equivalents for players and teams
`player_id`/`pfr_player_id` join the crosswalk; `game_id` joins everything.

Stored unpacked under `extracted_data/kaggle/` and gitignored (too large for the repo); the betting
CSV is small enough to stay useful on disk.

## Note on scope
Both are historical, not live. They complement rather than duplicate the live feeds: closing lines
for calibration, season aggregates for baselines, while Action Network remains the live price source.
