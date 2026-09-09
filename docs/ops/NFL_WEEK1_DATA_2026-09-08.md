# NFL Week 1 data completeness — measured 2026-09-09

Agent 5 (NFL Specialist), branch `claude/agent-nfl`. Filename kept as
`NFL_WEEK1_DATA_2026-09-08.md` per the dispatch handoff even though the
measurement below was run 2026-09-09 (the dispatch's "kickoff in ~24h" window).

**No production database access was used for this measurement** — this agent
has no `DATABASE_URL` and law 3/7 forbid searching for one or writing to a
database. Every cell below is either (a) a read-only curl of the public,
explicitly-authorized `/api/ops/public-surface-truth` endpoint, (b) a
read-only curl of ESPN's public scoreboard API, (c) a read-only curl of the
public `nflverse-data` GitHub release assets (the same URLs
`packages/data-ingestion/src/nflverse-source.ts` fetches), or (d) static
code reading with file:line citations. Any cell that would require a
production DB read is marked **NOT RUN (no DB access)**, not guessed.

## Commands run (exact, so any cell is reproducible)

```bash
# 1. Live truth surface
curl -sS https://www.galaxysportsedge.com/api/ops/public-surface-truth
# generatedAt 2026-09-09T00:09:32.298Z

# 2. ESPN public scoreboard, one call per Eastern-anchored UTC date 09-09..09-16
curl -sS "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=YYYYMMDD"

# 3. nflverse-data public release assets (HEAD for existence, GET for row counts)
curl -sSI -L "https://github.com/nflverse/nflverse-data/releases/download/<tag>/<file>"
```

Fetched 2026-09-09T00:04–00:20 UTC.

## Section A — Every NFL game in the next 7 days (2026-09-09 through 2026-09-16)

Source: ESPN public scoreboard, one query per date. 16 games total (2 already
in the 72h window the truth surface reports on, 13 on the Sunday slate, 1
Monday-night closer).

| Date (UTC kickoff) | Matchup | ESPN event id | Schedule row | Odds books observed (ESPN inline) | Spread / O-U |
|---|---|---|---|---|---|
| 2026-09-10T00:20Z | NE @ SEA | 401872656 | ESPN-listed ✓ | 1 (DraftKings) | SEA -3 / 44.5 |
| 2026-09-11T00:35Z | SF @ LAR | 401872657 | ESPN-listed ✓ | 1 (DraftKings) | LAR -3.5 / 48.5 |
| 2026-09-13T17:00Z | TB @ CIN | 401872925 | ESPN-listed ✓ | 1 (DraftKings) | CIN -3.5 / 50.5 |
| 2026-09-13T17:00Z | NO @ DET | 401872923 | ESPN-listed ✓ | 1 (DraftKings) | DET -7 / 49.5 |
| 2026-09-13T17:00Z | NYJ @ TEN | 401872924 | ESPN-listed ✓ | 1 (DraftKings) | TEN -1.5 / 39.5 |
| 2026-09-13T17:00Z | BAL @ IND | 401872659 | ESPN-listed ✓ | 1 (DraftKings) | BAL -3.5 / 47.5 |
| 2026-09-13T17:00Z | ATL @ PIT | 401872658 | ESPN-listed ✓ | 1 (DraftKings) | PIT -3.5 / 42.5 |
| 2026-09-13T17:00Z | CHI @ CAR | 401872661 | ESPN-listed ✓ | 1 (DraftKings) | CHI -3 / 46.5 |
| 2026-09-13T17:00Z | CLE @ JAX | 401872922 | ESPN-listed ✓ | 1 (DraftKings) | JAX -8.5 / 40.5 |
| 2026-09-13T17:00Z | BUF @ HOU | 401872660 | ESPN-listed ✓ | 1 (DraftKings) | BUF -1.5 / 44.5 |
| 2026-09-13T20:25Z | MIA @ LV | 401872928 | ESPN-listed ✓ | 1 (DraftKings) | LV -3.5 / 41.5 |
| 2026-09-13T20:25Z | GB @ MIN | 401872927 | ESPN-listed ✓ | 1 (DraftKings) | MIN -1.5 / 46.5 |
| 2026-09-13T20:25Z | WSH @ PHI | 401872929 | ESPN-listed ✓ | 1 (DraftKings) | PHI -5.5 / 44.5 |
| 2026-09-13T20:25Z | ARI @ LAC | 401872926 | ESPN-listed ✓ | 1 (DraftKings) | LAC -9.5 / 47.5 |
| 2026-09-14T00:20Z | DAL @ NYG | 401872930 | ESPN-listed ✓ | 1 (DraftKings) | DAL -3 / 48.5 |
| 2026-09-15T00:15Z | DEN @ KC | 401872931 | ESPN-listed ✓ | 1 (DraftKings) | KC -2.5 / 43.5 |

**"Schedule row" is ESPN-listed status only** — whether each row is actually
persisted in the `games` table is a DB read this agent could not make; the
code path that would persist it (`espn-schedule-seed.ts`, C-95) is verified
by static reading and its own test suite, not by a live row count here.
**NOT RUN (no DB access)**: per-game confirmation that a `games` row, both
`Roster` sets, `DepthChartEntry`, `Injury`, and NGS rows exist for each of
the 16 ids above.

**Every game today has exactly one book (DraftKings, via ESPN inline).**
`freeSpine.oddsPath.paidSinglePath = true` on the live truth surface
(fetched 2026-09-09T00:09Z) confirms production is still on the single paid
odds path (`the-odds-api`); PR #724 (the keyless Galaxy/ESPN + Kalshi second
book) is unmerged. With one book, `MIN_BOOKMAKERS = 2`
(`packages/prediction-engine/src/constants.ts`) fails for every market, and
only SPREAD survives because its consensus is the sign of the line, not a
priced-book-count gate (root-caused on PR #725, `docs/ops/NFL_WEEK1_COVERAGE_2026-09-08.md`).
Confirmed live 2026-09-09T00:09Z: `marketCoverage.sports[americanfootball_nfl]`
— games 6 (72h window only), MONEYLINE 0/none, SPREAD 2/covered, TOTAL
0/none. Owner: PR #724 (odds path, second book) + PR #725 (root cause,
hint text) — both draft, both read, neither touched by this agent per the
"coordinate, never duplicate" instruction.

## Section B — Season-level satellite assets (not per-game; nflverse publishes these once per season/week, not once per fixture)

| Asset | Upstream availability (nflverse-data, checked live) | Pipeline ingestion path | Status found |
|---|---|---|---|
| Rosters | `rosters/roster_2026.csv` → HTTP 200, 2,956 rows (incl. e.g. Aaron Rodgers/PIT). Checked 2026-09-09T00:1x UTC. | Fetched **live on demand**, not DB-persisted by a cron (`apps/web/lib/data-sources/nflverse.ts`, `catalog.ts`; no `ingestRosters` cron exists — `git grep` for a rosters-ingesting route returned nothing). | Available. No cron gap — the on-demand path reads whatever nflverse serves, so 2026 rosters are already reachable. |
| Depth charts | `depth_charts/depth_charts_2026.csv` → HTTP 200, 505,423 rows, all teams, `dt` (as-of) timestamp `2026-09-08T11:56:57Z` — updated the day before this measurement. | DB-persisted via `apps/web/lib/ingestion/depth-charts.ts` → `ingestDepthCharts(season)`, called from `/api/cron/refresh-player-stats` only on the daily satellite window (C-244, this session). | **Gap found, see below.** Available upstream now; the cron that would persist it stands itself down today (see Section C). |
| Injuries | `injuries/injuries_2026.csv` → HTTP 200, but only **12 rows, one team (NE)** as of this measurement — the week's official injury reports are still rolling in (practice reports publish Wed–Fri; checked Tue 2026-09-09). | DB-persisted via `apps/web/lib/ingestion/injuries.ts` → `ingestInjuries(season)`, same cron/window as depth charts. | **Gap found, see below**, plus a second, upstream one: even a healthy cron would only capture 1 of 16+ teams' reports today — re-check Thu/Fri before treating an empty injury table as a pipeline defect. |
| Next Gen Stats (passing/receiving/rushing) | `nextgen_stats/ngs_passing.csv.gz` → HTTP 200, but **0 rows with `season == 2026`** (checked passing only; NGS is play-derived and cannot exist before a game is played). | DB-persisted via `apps/web/lib/ingestion/next-gen-stats.ts` → `ingestNextGenStats(season, variant)`, same cron/window. | Expected-empty, not a defect. Will populate after the first games are played (2026-09-10 onward). |
| nflverse REG rows for 2026 (`stats_player_week`, `play_by_play`, `snap_counts`) | All three → HTTP 404 (`stats_player/stats_player_week_2026.csv`, `pbp/play_by_play_2026.csv`, `snap_counts/snap_counts_2026.csv`). 2025 equivalents all HTTP 200. | `resolveFootballStatsSeason()` / `hasRegRows` probe (`packages/data-ingestion/src/nflverse-season.ts:69-83`, wired to a live `PlayerGameStat` probe on PR #725, C-95 item 3, unmerged) is exactly the mechanism that is supposed to flip the **display** season to 2026 once these exist. | Expected-empty (games haven't been played), not a defect. This is also why the display season cannot advance yet — nothing to advance to. |

## Section C — Finding and fix: the C-244 daily satellite window and the roster/depth-chart/injury season could disagree

**Update:** fixed in this PR (commit `f2dfa7bc0`) after Devin Review independently
flagged the same root cause on this PR. Originally recorded below as an
open, unfixed gap; kept as written for the record, with the fix noted at
the end of this section.

`apps/web/app/api/cron/refresh-player-stats/route.ts` (ported this session,
C-244) uses **one `season` variable for all four satellites** — the same one
`ingestPlayerWeeklyStats` resolves, with its own unpublished-season fallback
(`route.ts:75-91`). Verified by static reading, not a live run:

1. `ingestPlayerWeeklyStats(2026)` will read `player_stats.csv.gz`
   (`nflverse-source.ts:75-79`, a combined all-seasons asset) — confirmed
   above that no 2026 player-week rows exist yet, so
   `isUnpublishedSeasonSignal` returns true and `season` falls back to
   `resolved.season` (2025) at `route.ts:87-91`.
2. The C-244 guard I ported today then sets
   `priorSeasonFallback = satelliteDecision.reason === "daily-window" && labelledAttempt !== null`
   (`route.ts:105-106`) — true in this state — which stands the **entire**
   satellite bundle down for the day (`satelliteReason: "skipped-prior-season"`),
   deliberately, to avoid writing stale 2025 depth charts as if current
   (that guard is correct and I am not proposing to remove it).
3. But depth charts and injuries for 2026 are *already published upstream
   right now* (Section B), on a different cadence than player-week stats —
   nflverse ships rosters/depth-charts/injuries pre-season and player-week
   stats/PBP/snap-counts only after games are played. The shared `season`
   variable conflates two different "is this data published" questions into
   one, so the satellites stay dark until `player_stats_week_2026` exists —
   i.e. likely not until after the first games are played
   (2026-09-10/11 for the two early games, 2026-09-14+ for the Sunday
   slate) — even though the depth-chart and injury data they would write is
   correct and available today.

**Fixed, commit `f2dfa7bc0`.** On reflection (and independently confirmed by
Devin Review flagging the same file:line on this PR) the fix is smaller
than first assessed here: each satellite already returns its own
`status`/`rowsWritten`/`error`, so it does not need a *shared* fallback
decision — it needs to stop *inheriting* the primary path's. Each satellite
now targets `labelled` (the true current season) directly instead of the
primary's possibly-demoted `season`. An unpublished satellite reports its
own honest source-error/zero-row status and writes nothing — the exact
outcome the C-198 guard existed to guarantee, so that guarantee still holds
without the old blanket skip — and a satellite whose own asset *is*
published is no longer blocked by an unrelated satellite's lag. Ledger row
**C-264 is DONE**; see `docs/ops/AGENT_LEDGER.md`.

## Section D — Fixture guard (never publish on a game ESPN doesn't list)

C-111 (DONE, `packages/ingestion-pipeline/src/fixture-confirmation.ts`) is
already live on main and covers this: verified by reading the code and its
test suite (`fixture-confirmation.test.ts`), not re-run against these 16
games. No action needed; noted for completeness per the mission's step 4.

## Section E — ESPN schedule seed covers every Eastern day

Already fixed on PR #725 (unmerged): `espnHorizonDateKeys` walks every
Eastern calendar day (C-95 item 2, commit `23d2c3381`). Confirmed by
reading the PR diff and its test suite (`espn-schedule-seed.test.ts`), not
independently re-derived here — duplicating that work was out of this
session's lane per the coordination instruction. My own ESPN queries above
used UTC date buckets for measurement convenience only and independently
found 0 games on 09-11 and 09-12 and games correctly split across 09-09/10
and 09-13/14, consistent with what an Eastern-day walk should produce.

## Section F — Kalshi series map (KXNFLSPREAD / KXNFLTOTAL)

Read-only finding, **not modified** — this file is being actively iterated
on by PR #724 (last push 2026-09-08T23:55Z) and touching it risks a direct
conflict with in-flight work outside this session's lane.

- `packages/data-ingestion/src/kalshi-series.ts` still maps NFL only to
  `KXNFLGAME` in `KALSHI_GAME_SERIES` (line 108) and
  `constructedEventSeriesStem` (line 197) — this map is documented in its
  own comment as "game-winner moneyline fair values only" (line 105), a
  different, independent-referee consumer from the second-book path.
- The actual NFL SPREAD/TOTAL second-book work (ledger C-104, PR #724) does
  **not** go through this map at all: `galaxy-kalshi-book.ts` reads
  `KXNFLSPREAD`/`KXNFLTOTAL` directly. So the literal ask in this session's
  handoff step 5 ("verify kalshi-series.ts maps every Week 1 game for
  KXNFLSPREAD and KXNFLTOTAL") is based on the intel doc's pre-PR-#724
  snapshot and is now moot for that file — the real second-book series
  mapping lives in `galaxy-kalshi-book.ts`, owned by PR #724.
- What PR #724 does still carry as an open, named risk in its own PR body:
  **ESPN vs Kalshi team-abbreviation drift (WSH/WAS, JAX/JAC, LAR/LA) has no
  alias lookup yet** — exactly the C-112 alias lesson this session's
  handoff named. Confirmed still true by reading `galaxy-kalshi-book.ts` on
  `origin/claude/launch-c104-free-two-book-board` (no alias table present).
  Of the 16 games in Section A, the codes that would need an alias check are
  **WSH@PHI** (WSH vs Kalshi's likely WAS) and **LAR** (in SF@LAR and
  MIA@LV's division context) — not fixed here, owned by PR #724 (its own
  "Remaining risk" section already names this).

## Gaps and owners (summary)

| Gap | Owner | Status |
|---|---|---|
| NFL board has 0 MONEYLINE / 0 TOTAL picks (single-book) | PR #724 (second book) + PR #725 (root cause, hint text) | Both draft, unmerged; not this session's lane |
| Satellite ingests never ran on the schedule | This session | **DONE**, C-244, commit `72221ad6e` |
| Satellite season coupled to player-stats availability, silently skipped available roster/depth/injury data | This session | **DONE**, C-264, commit `f2dfa7bc0` |
| nflverse display season stuck at 2025 for 8 sync callers | PR #725 (opened, unclaimed) | Ledger C-262, OPEN, unowned — out of this session's file budget |
| Kalshi team-abbreviation alias drift (WSH/WAS, JAX/JAC, LAR/LA) | PR #724 | Named in that PR's own "Remaining risk"; not duplicated here |
| ESPN schedule seed Eastern-day coverage | PR #725 | DONE on that branch (unmerged) |
| Fixture confirmation guard | main (C-111) | DONE, live |
