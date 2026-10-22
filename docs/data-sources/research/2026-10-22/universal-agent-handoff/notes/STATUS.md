# STATUS — endpoint validation matrix (cycle 14, 2026-10-22 ~08:10Z)

All documented GET endpoints re-hit. No regressions.

| target | endpoint | result |
|---|---|---|
| scores24.live | bundle, /graphql, MatchHeaderOdds, TrendList | 200 |
| linestarapp.com | ownership page, GetSalariesV5, GetPeriodInformation, GetReportGridBoxes | 200 (with params) |
| propfinder.app | page, /api/health, /nfl/trends (anon) | 200 |
| propfinder.app (authed) | /nfl/props, /nfl/power-ratings | 401 anon — expected, free token required |
| espn.com | scoreboard, teams, injuries, summary | 200 |
| api.underdogfantasy.com | /v1/over_under_lines | 200 |
| partner-api.prizepicks.com | /projections | 200 |
| api.sleeper.app / api.sleeper.com | players/nfl, projections/{season}/{week} | 200 |
| api.thescore.com | teams/{id}/injuries, teams/{id}/players | 200 |
| sportsbook.fanduel.com | page (config disclosure) | 200; API edge still 404 |

Bare calls that 404/400 are parameter-dependent, not broken: `GetSalariesV5` and
`GetPeriodInformation` need `periodId/site/sport`, sleeper projections need `{season}/{week}`,
espn summary needs `event`.

## Freshness probe — both live feeds are static at this distance
- scores24 moneylines, ~65 min apart: **zero movement** (BAL 1.93/1.85, DET 1.56/2.40,
  HOU 1.18/4.70 identical to the earlier snapshot). At 2-3 days out the single book on the free tier
  is cached, not ticking.
- LineStar `GetSalariesV5`, same interval: **byte-identical** response (741,243 B), 0 of 61
  ownership percentages changed. Also note `Ownership.Projected` returned 61 rows this time versus
  282 earlier from the same call — the ownership vector size itself varies by call.

Implication for polling cadence: hourly polls of these two yield nothing on a Thursday for a Sunday
slate. Kickoff-day polling (and the ESPN live surface) is where the signal is.
