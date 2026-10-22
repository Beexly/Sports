# Kaggle Big Data Bowl 2027 — coverage labels and routes (the big one)

Kaggle access via `~/.kaggle/access_token` (KGAT_…). The account already holds entry to
`nfl-big-data-bowl-2027`, so competition files download directly with `kaggle competitions download`,
one `-f nfl-big-data-bowl-2027/<file>` per call (multiple `-f` only fetch the first; bare names 404).

## Downloaded (to `extracted_data/bdb2027/`)
| file | size | what |
|---|---|---|
| `player_play.csv` | 147 MB | **314,197 player-play rows** |
| `players.csv` | 47 KB | 510 players, nfl_id + draft facts |
| `combine_results.csv` | 41 KB | 510 rows, 40-yd/splits/jumps/measures |
| `player_career_successes.csv` | 14 KB | career snaps, starts, All-Pro/Pro Bowl |
| `games.csv` | 43 KB | 1,002 games, season/week/teams |

Not pulled: `game_tracking_2023/2024/2025.csv` (335 MB / 718 MB / 1.02 GB) and
`combine_tracking.csv` (84 MB) — disk sat at ~265 MB free.

## Why this is the coverage wall coming down
`player_play.csv` carries the labels the whole mission assumed were paywalled:

- `team_coverage_man_zone` — MAN_COVERAGE 77,427 / ZONE_COVERAGE 197,851
- `team_coverage_type` — 8 values: COVER_1_MAN 56,381 · COVER_4_ZONE 43,685 · COVER_2_ZONE 32,999 ·
  COVER_3_ZONE 97,938 · and four more
- `route_ran` — 12 values: GO 9,715 · HITCH 8,816 · CROSS 6,756 · IN 5,582 · …
- `in_motion_at_ball_snap` — 3,417 true
- `offense_formation` (7), `receiver_alignment` (15)
- plus `expected_points`, `expected_points_added`, win-probability pre/post,
  `home_team_win_probability_added` — i.e. label-grade EPA/WPA on the same rows

That gives supervised targets for coverage classification, route classification and motion decoding
in a single file, with player ids that join the crosswalk and games that join everything else.

## Modelling note
This is a *career-outcome* competition (combine + tracking → career success), so the labels above are
courtesy data rather than the scored target — but they are exactly what the HMM/RF coverage work
needs. 314k rows at ~4:1 zone:man also quantifies the class imbalance any decoder must handle.
