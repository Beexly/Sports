# Sleeper — open NFL metadata + weekly projections

Found while probing odds/aggregator hosts. Nothing is authenticated.

- `GET https://api.sleeper.app/v1/players/nfl` — 200, **14.7 MB**, 12,229 players with
  `gsis_id`, `espn_id`, `rotowire_id`, `sportradar_id`, `opta_id`, position, team, status,
  injury_status, depth_chart_order, years_exp, age. This is a ready-made **cross-reference
  crosswalk** between every other feed in this KB.
- `GET https://api.sleeper.com/projections/nfl/{season}/{week}?season_type=regular` — 200,
  5.7 MB, 9,418 rows, full stat projections (pass/rush/rec/idp + `adp_dd_ppr`, `pts_ppr`).
- `GET https://api.sleeper.app/v1/players/nfl/trending/add?lookback_hours=24&limit=25` — 200,
  add counts per player (101,218 adds on the top id).

## Extracted
`extracted_data/sleeper_nfl_players_2026-10-22.csv` — 2,426 active rostered players with every
external id.
`extracted_data/sleeper_nfl_week7_projections_2026-10-22.csv` — 3,047 skill-position rows
(QB/RB/WR/TE) with pass/rush/rec stat projections and PPR points.

## Blocks met
- DraftKings `sportsbook-nash.draftkings.com/api/sportscontent/...` -> 403 Akamai Access Denied.
- FanDuel `api.sportsbook.fanduel.com/api/content-managed-page` -> 404 with a stale `_ak`; the
  current `_ak` must be lifted from their JS.
- BetMGM widget API -> 200 with an empty body (needs a widget id that exists).
