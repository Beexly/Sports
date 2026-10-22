# Frontier expansion — ESPN hidden endpoints (new target)

Chosen from the Phase 3 priority list (league property with open JSON). All anonymous.

## Confirmed open
- `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` — 200, 254 KB,
  14 events with ids, kickoff times, status, competitors.
- `.../nfl/teams` — 200, 149 KB (all 32 teams, ids, logos, records).
- `.../nfl/injuries` — 200, **8.7 MB**, 800 records over 32 teams (player, status, dates).
- `.../nfl/summary?event={id}` — 200, 128 KB pre-game. Carries:
  * `predictor` — ESPN Matchup Predictor: `homeTeam.gameProjection` / `awayTeam.gameProjection`
    as percentages (CHI 59.4 vs NE 40.3), i.e. a proprietary win-probability output.
  * `pickcenter` — DraftKings `spread` (-3.0), `overUnder` (50.5), `details`.
  * boxscore, leaders, lastFiveGames, againstTheSpread, news.
  Post-kickoff the same call also returns `plays`, `drives` and `winprobability`;
  pre-game summary has none of the three (empty arrays).

## Snapshot
`extracted_data/espn_nfl_gamesleep_2026-10-22.csv` — 14 games with ESPN predictor inputs joined
to live injury counts (800 records / 32 teams, 14/14 rows annotated, 0 misses).

## Blocks met and recorded
- **PrizePicks** `api.prizepicks.com/projections` -> 403 DataDome captcha
  (`geo.captcha-delivery.com`). Needs a browser pass or a datadome cookie.
- **Underdog** `api.underdogfantasy.com/beta/v5..v6/over_under_lines` -> 426
  `upgrade_required` ("A new version is required to continue"); v7/v8 404. Needs the current
  client version header.
- propsoptimizer.com / betfully.com / trackwiz.com (LineStar siblings) all 200 but marketing
  shells — no API host or `/api` path in the HTML.

## Re-validation of earlier bypasses (all still live)
propfinder `/nfl/trends` anonymous 200 / 2.83 MB; LineStar `GetSalariesV5` 200 / 741 KB;
ESPN scoreboard 200.
