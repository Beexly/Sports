# LineStar slate grid — 2026-10-13 (Week 6, DraftKings)

- source: https://www.linestarapp.com/DailyDashboard/Sport/NFL/Site/DraftKings
- endpoints:
  - `POST /DesktopModules/DailyFantasyApi/API/Fantasy/GetReportGridBoxes` body `{"Sport":1,"Site":1,"PeriodId":412}`
  - `GET /DesktopModules/DailyFantasyApi/API/Fantasy/GetDefenseVsPosMatchupV2?sport=1&periodId=412`
  - `GET /DesktopModules/DailyFantasyApi/API/Fantasy/GetFootballOpponentMatchupWithNumOpponents?siteId=1&sport=1&periodId=412&numOpponents=17`
- auth: anonymous — no login, no API key, no cookies
- generated_utc: 2026-10-14T00:33:26.839922+00:00

## The headline: the free-tier truncation is PER-ENDPOINT, not per-account

`GetSalariesV5` returned **12** salaries and set `IsTruncated=true` (`TruncatedSalaryCount=714`).
`GetReportGridBoxes` returns **746 players with salary** on the same anonymous session.
The truncation was never an account limit — it is that endpoint's teaser behaviour. This is the
single most important correction to the earlier LineStar note in this directory.

## Counts

| measure | value |
|---|---|
| players in the grid | **746** |
| players with salary | 746 |
| games | **14** |
| games carrying a Vegas total | 14 |
| games carrying wind speed | 14 |
| games with hourly weather slices | 10 |
| team defense-vs-position rows | 32 |
| opponent-matchup rows | 240 |
| salary range | 2000 – 8700 |

Position enum observed: `1=QB, 2=RB, 4=WR, 8=TE, 16=DST, 32=K, 2048=LS`.

## Injury designations — keyless, in-season, with salary attached

261 **Out**, 32 **Questionable**,
5 **Doubtful**, 448 healthy — **298 designations total**, each on a row that also carries
the player's salary and opposing rank. That is a second, independent injury source alongside the ESPN
feed, and it is keyed to LineStar's own `PlayerId`.

## Vegas + weather per game — no ESPN scrape needed

Every game row carries `VegasLineAway`, `VegasLineHome`, `VegasMoneyLineAway`, `VegasMoneyLineHome`,
`VegasTotals`, `WindSpeed`, `WindDirection`, `Temp`, `Humidity`, `RainAmount`, `IsDome`,
`PostponeChance`, `WeatherIsLocked`. Sample game row keys: ['away', 'dateUtc', 'event', 'gameId', 'home', 'humidity', 'isDome', 'postpone_chance', 'rain', 'temp', 'vegas_line_away', 'vegas_line_home', 'vegas_ml_away', 'vegas_ml_home', 'vegas_total', 'weather_locked', 'wind_dir', 'wind_speed'].

`Weather[].WeatherSlices[]` gives **hourly** `Temperature`, `WindSpeed`, `WindDirection`,
`Precipitation`, `WeatherIcon`, `DateUtc` — the direct input for an air-density / wind-elasticity
calculation, already aligned to the stadium and the kickoff hour.

## What is still zeroed

`SiteProjection` is **0.0 for all 746 players** — the projection column is the part the
anonymous tier withholds here. Salary, injury status, opposing rank, Vegas lines and weather are all
real. Treat projections as absent (named gap), never as "0 projected points".

## Repeatable recipe

```bash
curl -sS 'https://www.linestarapp.com/DesktopModules/DailyFantasyApi/API/Fantasy/GetReportGridBoxes' \
  -H 'Content-Type: application/json; charset=utf-8' \
  -H 'Accept: application/json' \
  -H 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36' \
  --data '{"Sport":1,"Site":1,"PeriodId":412}' -o grid.json

curl -sS 'https://www.linestarapp.com/DesktopModules/DailyFantasyApi/API/Fantasy/GetDefenseVsPosMatchupV2?sport=1&periodId=412' \
  -H 'Accept: application/json' -o dvp.json
```

Route discovery method: the Angular bundle set under `/DesktopModules/.../*.js`
(`betfully.ownership.js`, `fantasysportsco.reportGrid.js`, `fantasysportsco.layout.js`,
`fantasysportsco.footballOpponentMatchup.js`, `fantasysportsco.basketballTeamMatchup.js`)
names every route and its parameter contract. `GetReportGridBoxes` is **POST**, not GET — that is
why the GET probe returned 404 for the page names.

## Signal mapping — `intelligence/reasoning/signals.py`

| field | domain | metric | verification |
|---|---|---|---|
| `Salary` | `dfs` | `dfs_salary` | `REPORTED` |
| `InjuryStatusAbbreviation` | `injuries` | `lineup_status` | `REPORTED` |
| `StartingOrder` / `StartingPosition` | `depth_chart` | `depth_slot` | `REPORTED` |
| `OpposingRank` / `TotalOpposingRank` | `matchup` | `opposing_def_rank_vs_pos` | `REPORTED` |
| `VegasTotals`, `VegasLine*`, `VegasMoneyLine*` | `markets` | `implied_total`, `implied_spread` | `REPORTED` |
| `WeatherSlices[].WindSpeed/Temperature/Precipitation` | `weather` | `wind_mph`, `temp_f`, `precip` | `MEASURED` (observation) |
| `GetDefenseVsPosMatchupV2` per-position stat block | `matchup` | `def_vs_pos_<stat>` | `REPORTED` |
| `GetFootballOpponentMatchupWithNumOpponents` `fp`/`fpavg` | `dfs` | `opponent_fp_avg` | `REPORTED` |

Cross-check rule: LineStar's `VegasTotals` is a third anchor beside the ESPN inline DraftKings numbers
already in-repo. Where they disagree by more than the de-vig margin, name the disagreement — do not
average them silently.

## Honest gaps

1. `SiteProjection` zeroed anonymously (above).
2. `GetPeriodInformation` returned **404** on this base path — its real route name is **UNVERIFIED**.
3. `GetTeamDefenseReport`, `GetSalaryChanges`, `GetPerfect`, `GetSalaryComparison`, `GetDailyDashboard`
   are **not** separate API routes: the bundle shows them resolving to `GetReportGridBoxes`
   (`ReportGridBoxes[]` = "Injury Replacement", "Salary Changes", "Perfect Lineup - Past 30 Days",
   "Hot/Cold Players") — i.e. grid sub-views, not new endpoints. Recorded so no one hunts for routes
   that do not exist.
4. `GetDefenseVsPosMatchupV2` returns `OppAbbrev: null` / `OppTeamId: 0` for the team row sampled —
   opponent resolution needs the `Opponents[]` sub-array, not the top-level field.
5. ToS not read; robots permits the API path. Free tier only — no auth bypass, no parameter guessing
   beyond the contracts printed in the bundles.
