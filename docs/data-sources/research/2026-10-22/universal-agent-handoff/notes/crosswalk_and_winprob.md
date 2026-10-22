# Dataset refinement — player crosswalk + ESPN in-game expectancy

## Crosswalk built
`extracted_data/PLAYER_CROSSWALK_2026-10-22.csv` — 1,218 source-name rows over 477 distinct
players, each resolved to a Sleeper id plus `gsis_id` / `espn_id` / `rotowire_id` /
`sportradar_id` and team/position. 292 rows carry a GSIS id.

Match rates on first pass (name normalised: lowercase, alnum only):
- propfinder 461/466 (98.9%)
- underdog 361/386 (93.5%)
- prizepicks 396/437 (90.6%)
Remaining misses are suffix/initial variants and players absent from Sleeper's roster snapshot.

This is what makes the KB usable: NGS speaks `gsisId`, ESPN speaks numeric athlete ids, Sleeper and
PrizePicks speak their own, Underdog speaks free text. Before this nothing joined them.

## ESPN in-game expectancy — shape confirmed on a completed game
Kickoff for CHI-NE had not happened yet, so a finished game (WAS@SF, event 401873008) was used to
prove the post-game surface:
- `winprobability` — 179 points of `{playId, homeWinPercentage, tiePercentage}`
- plays — 178, nested under `drives.previous[].plays[]`, each with `start.down/distance/yardLine/
  yardsToEndzone/team`, clock, type, `scoringPlay`, `isTurnover`, and the descriptive text
- the two arrays are keyed by the same `playId`, so win-probability is joinable to play state
  directly

Extracted: `extracted_data/espn_winprob_401873008.csv` (179 rows) and
`extracted_data/espn_plays_401873008.csv` (178 rows).

## Note on live use
`summary` returns `plays: []` and no `winprobability` pre-kickoff; both populate once the game
starts. Tonight's CHI-NE (00:15Z Oct 23) is the live-poll target.
