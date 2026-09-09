# NFL Week 1 board coverage, measured 2026-09-08 (C-261, C-95, C-118)

Branch `claude/launch-nfl-week1-coverage`, base `origin/main` 8cc0695. Every number
below traces to a command run in this session and output seen; where the session
could not observe something it says so. This session had no database access: the
production evidence is the public truth surface, ESPN's public scoreboard and the
public picks teaser, all read-only.

## 1. What was measured

### 1a. Truth surface, `GET /api/ops/public-surface-truth`, generatedAt 2026-09-08T19:07:38Z

`marketCoverage`, 72h window 2026-09-08T19:07:38Z to 2026-09-11T19:07:38Z:

| sportKey | game rows | MONEYLINE | SPREAD | TOTAL |
|---|---|---|---|---|
| americanfootball_nfl | 6 | 0 | 2 | 0 |
| americanfootball_ncaaf | 2 | 0 | 1 | 1 |
| baseball_mlb | 36 | 27 | 19 | 18 |
| soccer_usa_mls | 16 | 4 | 12 | 13 |

Degraded hints as served: NFL MONEYLINE "No MONEYLINE picks while americanfootball_nfl
games are scheduled in the window; check the odds feed for this sport." NFL TOTAL
"... Known cause: the zero-key signal slate is moneyline-only and ESPN's
single-bookmaker odds fail MIN_BOOKMAKERS=2, so totals need a live odds feed
(THE_ODDS_API_KEY or TheRundown) ..."

The same payload, same instant:

| field | value |
|---|---|
| oddsInserting.lastSuccessAt | 2026-09-08T18:52:42Z (15 min old, within the 240 min SLA) |
| oddsInserting.oddsInserted / sport | 453 rows, soccer_usa_mls (the last sport in the cycle) |
| dualPath.oddsKeyPresent / matchedEnv | true, THE_ODDS_API_KEY |
| dualPath.rundownKeyPresent | true |
| credits remaining / used / dailyBudget | 13,306 / 6,694 / 600, paceOk false, projected exhaustion 2026-10-02 |
| selectiveRuntime.delta | 0.12 |
| rankingPauseApply | durable ON, 2 paused groups (operatorHint: MLB ML and SPREAD), plan lists 6, none of them NFL |
| calibrationEligibility.bySport NFL | n 28, ECE 0.267 |
| freeSpine.oddsPath | paidSinglePath true, 7 sport cells requireSpend via the-odds-api |
| schedulerLiveness | healthy, last cron success 7 min old |
| deployment.sha | 8cc069585871d8a316714ce93bf1022a31b892eb |

So the key is present, the paid feed inserted rows fifteen minutes earlier, and the
TOTAL hint named a missing key as the known cause. That is the first defect (section 3).

### 1b. ESPN public scoreboard, `football/nfl/scoreboard?dates=20260908-20260915&limit=300`

16 events, all `pre`, each with one DraftKings line. Inside the 72h window there are
exactly two:

| ESPN id | kickoff (UTC) | matchup | DraftKings |
|---|---|---|---|
| 401872656 | 2026-09-10T00:20Z | New England Patriots at Seattle Seahawks | SEA -3, o/u 44.5 |
| 401872657 | 2026-09-11T00:35Z | San Francisco 49ers at Los Angeles Rams | LAR -3.5, o/u 48.5 |

The other fourteen kick off 2026-09-13 17:00Z or later (Sunday and Monday) and are
outside the window the truth surface measures. Lines on that slate run from -1.5
(TEN, BUF, MIN) to -9.5 (LAC); totals 39.5 to 50.5.

Two fixtures against `games: 6` is the second defect (section 3): three feed rows per
contest were being counted as three games.

### 1c. Public picks teaser, `GET /api/picks?sport=americanfootball_nfl&date=...`

The anonymous surface is the FREE tier (two picks a day, no confidence), so it cannot
show the full board. It did show, for 2026-09-13: TOTAL "OVER 44.7" on Houston v
Buffalo (stored line 44.7272..., an eleven-book average) and SPREAD "Los Angeles
Chargers -9.6" (line -9.636...), both with generatedAt 2026-05-22. These are
book-priced rows created in May and refreshed every cycle since (the fractional line
is a live multi-book average, not a May number). For 2026-09-09 and 2026-09-10 the
teaser returned zero rows although the truth surface counts two NFL SPREAD picks in
that window. This session could not tell why (candidates, all read-time filters in
`apps/web/app/api/picks/route.ts`: the selective delta from
`apps/web/lib/calibration/selective-publish-runtime.ts`, the game
`dataQualityScore >= MIN_PUBLIC_PICK_DATA_QUALITY_SCORE` filter at route.ts:94-95, or
the teaser's Eastern-day and tier filters). Recorded as observed, not explained.

## 2. Stage-by-stage trace for the two in-window NFL games

Both games are traced the same way because the truth surface reports the same
outcome for both: a SPREAD pick exists, no MONEYLINE, no TOTAL. Where the session
could not read production state it says INFERRED and states what the inference rests
on; the frozen scorer was run locally (`scoreGame`, packages/prediction-engine) on
inputs shaped like these fixtures to find which gate binds.

| stage | file:line (main 8cc0695) | MONEYLINE | TOTAL | SPREAD | verdict |
|---|---|---|---|---|---|
| refresh-odds sport list, paid fetch | packages/ingestion-pipeline/src/refresh-odds.ts:93-107; process-sport.ts:331-334 (`paidCallJustified("odds")`, `client.getOdds(sport.key, MARKETS)` with `MARKETS = ["h2h","spreads","totals"]`, data-ingestion config.ts:101) | passes | passes | passes | INFERRED from the two SPREAD picks: a spread needs at least two books pricing both sides, so the paid fetch returned multi-book NFL rows and they were inserted. The key is present and the insert clock is 15 min old. |
| upstream freshness gate | process-sport.ts:547-590 | passes | passes | passes | INFERRED, same evidence. |
| fixture confirmation guard (C-111) | process-sport.ts:795-875 | passes | passes | passes | INFERRED: both fixtures are on ESPN's scoreboard for their date (1b) and a pick was written. |
| one-book-set rule (C-135) | scoring.ts:399-402 (spreads), :689-703 (totals), :943-946 (h2h) | passes with the paid feed | see next row | passes | The rule requires MIN_BOOKMAKERS=2 books pricing BOTH sides of the market. ESPN's single book alone fails it; the paid feed clears it. |
| scorer, MONEYLINE fair-probability floor | scoring.ts:965 `if (fairProb < 0.58) return null` | DROPS | | | DESIGN. A -3 favourite prices around -150 / +130; de-vigged that is 0.580, sitting on the floor. |
| scorer, MONEYLINE confidence floor | scoring.ts:1029-1033 (`MIN_PUBLISH_CONFIDENCE` 50) | DROPS | | | DESIGN. Measured on the frozen scorer: -150/+130 at 2, 5 and 11 books, null at every depth; -180/+155 (a -3.5 favourite) null at every depth (composite about 44 at 11 books: consensus 7 + depth 20 + edge 7 + 10, the de-vigged edge against the book price is negative by the vig); -400/+320 publishes only at 11 books (51). Tight Week 1 lines cannot clear both floors. |
| scorer, TOTAL priced set | scoring.ts:681, :703 | | DROPS if fewer than 2 books price both sides | | DESIGN. Cannot be read for these fixtures without the odds table. |
| scorer, TOTAL vote | scoring.ts:715-737 (legacy tiebreak: a book votes OVER when overPrice <= underPrice; consensus must reach 0.55) | | DROPS on a split | | DESIGN. Measured: 5 books at -110/-110 vote unanimously (consensus 1.00, confidence 57, publishes); 3 books shading over and 2 shading under gives consensus 0.60 but confidence about 30, null. |
| scorer, TOTAL confidence floor | scoring.ts:801-811 | | DROPS under 4 unanimous books | | DESIGN. Measured: 3 books all -110 null (47.5), 4 books 50 (publishes on the edge), 5 books 57, 8 books 63. A Week 1 total publishes only when at least four both-sided books all shade the same way. Which of the three TOTAL gates bound for these two fixtures cannot be read without the odds table; all three are the frozen model doing its job. |
| scorer, SPREAD | scoring.ts:409-418 (consensus from the SIGN of each book's line) | | | publishes | Every book favours the same side by construction, so consensus is 1.00 and the composite lands 57 to 71 across 5 to 11 books. This is why SPREAD survives where MONEYLINE and TOTAL do not. |
| write, pause groups | apps/web/lib/calibration/ranking-pause-apply.ts (read-time) | not a factor | not a factor | not a factor | The durable pause set holds two MLB groups; no NFL group is paused. |
| zero-key signal slate (MONEYLINE only) | generate-signal-slate.ts:135-357 (independents required; own delta `Math.abs(trueProb - 0.5) < 0.1` skips; MIN_PUBLISH_CONFIDENCE) | no NFL row written | n/a | n/a | DESIGN / NOT MEASURED. The slate needs an independent estimate for the fixture (Elo from results, FPI which is gated fail-closed while ESPN_POWERINDEX_LICENSED is unset, Kalshi via PredExon which is default OFF). Whether NFL Week 1 had independents, and whether they cleared the slate's delta, cannot be read from this session. The truth surface shows no NFL MONEYLINE row in the window. |
| read-time selective delta | apps/web/lib/calibration/selective-publish-runtime.ts, applied in `apps/web/app/api/picks/route.ts:15,163` | | | may hide | The 0.12 delta removes rows at read time; it does not change what is stored, so it is not the cause of the truth surface's zero counts. It may be why the teaser showed no Sep 9/10 spread (1c). Not measured. |
| C-213 basis gate | not found | | | | `grep -rn "C-213"` over the repository at 8cc0695 returns nothing; the gate is not on main and cannot be a production factor today. |

Summary: on the two in-window NFL games the MONEYLINE and TOTAL drops are the frozen
scorer's own gates (the 0.58 fair-probability floor, the 0.55 vote floor, and the 50
confidence floor, all with book counts and vig as measured above) acting on tight
Week 1 lines. Nothing in the path has a wrong key, a wrong sport id, a stale season,
or a query that never ran. MODEL_VERSION is frozen and law 9 forbids moving any of
these floors; none were touched.

## 3. Defects found and fixed (each one commit, each with a test that was red first)

| defect | fix | test red / green |
|---|---|---|
| The TOTAL hint asserted "Known cause: ... THE_ODDS_API_KEY or TheRundown" while the key was present and rows were inserting. The classifier reads pick and game counts only; it cannot see the environment. | `apps/web/lib/board/market-coverage.ts` hints now name the scorer gates in order (MIN_BOOKMAKERS, the 0.55 vote, the 0.58 moneyline floor, MIN_PUBLISH_CONFIDENCE 50, imported from the engine) and point at `oddsInserting`; they assert no cause they cannot observe. | 4 failed / 6 passed on the old copy; 10/10 after. |
| `games: 6` for two fixtures: the loader counted every non-tombstoned game row, and every odds feed writes its own row (The Odds API id, `espn:nfl:<id>`, TheRundown). | The loader selects the collapse identity fields and applies `collapseGameRowsToFixtures` (the C-172 guard the board lanes and the slate already use). Picks are not collapsed; each hangs off one row. | 1 failed / 11 passed on the old loader (six rows read as six games); 12/12 after. |

The redeployed truth surface will read NFL `games: 2` for this window, and the hints
will describe the gates rather than a missing key.

## 4. C-95 follow-ups (Week 1)

| item | change | test |
|---|---|---|
| Free grader and stale backfill stamp the line-archive CLOSE after a successful settle. Until now `settle-sport.ts:867` (paid) was the only caller. | `apps/web/lib/settlement/close-stamp.ts` helper, called AFTER the transaction commits (never inside it: a failed statement aborts an interactive Postgres transaction and a line tag must never cost a grade); wired in `free-settlement-runner.ts` and `settle-backfill.ts`; `markClosingSnapshotsIfEnabled` exported from the pipeline index. Hard-gated on LINE_ARCHIVE_ENABLED as before. | Runner driven end to end and backfill through its own default persister: 2 failed / 26 passed unwired, 28/28 wired. |
| hasRegRows probe so the nflverse display season advances to 2026 once REG rows land. Every production caller omitted the probe, so the resolver could only answer the floor. | `resolveFootballStatsSeasonAsync` (same candidate order, lazy probe, agrees with the sync resolver on every answer set), `playerGameStatRegRowsProbe` on `PlayerGameStat` REG rows, wired into the refresh-player-stats cron which now reports `regRowsProbed` and `regRowsProbeErrors`. The eight sync display callers of `currentNflSeason()` are unchanged (follow-up row). | 6 + 3 resolver/adapter cases; route case 1 failed / 14 passed unwired, 15/15 wired. |
| ESPN schedule seed covers every Eastern day in the horizon. It stepped three UTC days at a time and filed late-evening ET fixtures under the next UTC day. | `espnHorizonDateKeys` walks every Eastern calendar day from now through the horizon instant on a DST-safe noon-UTC cursor. ESPN's `dates=A-B` range form was measured and rejected: `20260912-20260918&limit=300` returned 84 events for a span whose Saturday alone returns 80. Requests per sport per seed run rise from 8 to 22 (21-day default). | 5 failed / 4 passed on the old stepper; 9/9 after. |

## 5. C-118 verification

`git merge-base --is-ancestor 2f9f7d90e origin/main` exits 0: the fix is on main.
`process-sport.ts` at 8cc0695 has seven `sport: sport.key` assignments and no
`sport.name` at an OddsInput site. A new test drives `processSport` with the real
scorer: eleven books at -400/+320 write a MONEYLINE under americanfootball_nfl
(control) and write none under soccer_usa_mls (display name "MLS") with a priced draw.
With line 1065 temporarily flipped back to `sport.name` the soccer case fails and the
control passes; restored. Not remediated, by founder decision (C-114 family): the 148
soccer MONEYLINE picks the ledger records as published before the fix (read-only SQL,
2026-09-06); the truth surface today reports `provenPathExclusions.three_way_market`
128.

## 6. What this session could not do, and what would settle it

- Read the `odds` table for the two fixtures to say which TOTAL gate bound (priced
  set, vote, or confidence). One read-only query per fixture on `Odds` where
  `market = 'TOTALS'` and `fetchedAt` in the last cycle would answer it.
- Read `Pick` rows for the window to confirm the two SPREAD rows are on the canonical
  game rows and to see their `rankingP` against the 0.12 delta.
- Confirm the six-rows-for-two-fixtures reading from the `games` table itself (the
  arithmetic, three feeds times two fixtures, is the inference; the fix is correct
  either way because it collapses to contests).
