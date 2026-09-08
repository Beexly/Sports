# Stored final scores disagree with the source we ingest from

**Measured 2026-09-08 14:20 to 14:45 UTC on production, read-only SELECT plus
public ESPN reads. MLB only, kickoffs 2026-08-29 to 2026-09-08.**

**Status: OPEN. This is a launch blocker for any published performance claim.
No agent can repair it: the fix is database writes plus a root cause that is
not yet established.**

## The finding

**25 of 169 `games` rows that we mark FINAL hold a score that ESPN's own API
contradicts. 54 settled published picks sit on those rows.**

ESPN is not being used here as an outside referee. It is the source this
platform ingests from (`espn_public`, and every one of these rows carries an
`espn:` external id). So the statement is narrower and worse than "a third
party disagrees with us": **our stored value diverged from the feed we
ourselves read it out of.**

### Blast radius on settled picks

| Market | Settled on a contradicted game | Of those, the game's WINNER differs |
|---|---|---|
| MONEYLINE | 16 (11 WIN, 5 LOSS) | 8 |
| SPREAD | 19 (7 WIN, 12 LOSS) | 14 |
| TOTAL | 19 (7 WIN, 11 LOSS, 1 PUSH) | 14 |
| **Total** | **54** | **36** |

"Winner differs" means the home team won under our stored score and lost under
ESPN's, or the reverse. For a MONEYLINE pick that is a flipped result outright:
**8 published moneyline picks are recorded as the opposite of what happened.**

The calibration sample that gates PROVEN is MONEYLINE-only and reads n 475. So
16 of 475 settled rows (3.4 per cent) are graded against a contradicted score,
and 8 of 475 (1.7 per cent) are graded against a flipped one.

## Why this is disqualifying rather than a rounding error

The ECE effect of 8 flipped rows in 475 is small. That is not the point. This
product's stated premise is that it does not lie about its own performance, and
the published record currently contains results that are wrong in the plain
sense: the pick won and we recorded a loss, or the reverse. A calibration
number computed over that record is measuring the wrong thing, however good the
number looks.

## The pattern

When the same two teams play on consecutive days, one game's score appears on
every fixture in the series.

| Series | Our score on each row | ESPN, game by game |
|---|---|---|
| Phillies v Braves, Sep 5 / 6 / 7 | 4-2, 4-2, 4-2 | 4-2 (correct), 4-5, 1-0 |
| Reds v Brewers, Sep 5 / 6 | 7-10, 7-10 | 5-3, 12-8 |
| Mariners v Athletics, Sep 6 (two rows) | 6-7, 6-7 | 2-6, 2-0 |
| Padres v Yankees, Sep 5 / 6 | 3-2, 3-2 | 1-5, 4-3 |
| Astros v Diamondbacks, Sep 5 / 6 | 3-1, 3-1 | 3-4, 2-3 |
| Dodgers v Nationals, Sep 6 / 7 | 5-3, 5-3 | 6-5, 7-5 |

Note that the Sep 5 Phillies row is CORRECT and its two neighbours carry its
score. The corruption spreads from a real result to its siblings.

**A stale in-progress capture is ruled out for most of them.** A score read
mid-game can only be lower than the final. Cleveland v Detroit is stored 0-6
against a 3-2 final, Miami v Cubs 5-6 against 10-3, Kansas City v Toronto 3-4
against 6-1: in each case the stored away score EXCEEDS the final away score,
which no partial reading can produce. These are another game's numbers, not an
early snapshot of this one.

## The platform already has a detector for exactly this, and it has never fired

`apps/web/lib/settlement/zero-sit-lane.ts` carries `isCrossPathScoreMismatch`
and an `RCA` code `SCORE_MISMATCH_CROSS_PATH` whose message reads, verbatim:
"Game row carries FINAL X-Y (row last written ...); the free final reads A-B;
every grader refused to write". That is this defect, named and instrumented,
written before today.

**It has produced zero voids.** Every RCA-coded settlement event in the table:

| RCA code | Voids | First | Last |
|---|---|---|---|
| AMBIGUOUS_TEAM_NAME | 10 | 2026-09-06 09:20 | 2026-09-06 09:20 |
| FIXTURE_NOT_FOUND | 6 | 2026-09-06 16:07 | 2026-09-06 19:07 |

**This corrects the record in AGENTS.md**, which attributes the first cohort to
`SCORE_MISMATCH_CROSS_PATH` ("10 MLB spreads on city-only game rows refused
every cycle as SCORE_MISMATCH_CROSS_PATH"). They were recorded as
`AMBIGUOUS_TEAM_NAME`. The cross-path code has never been emitted.

So the detector did not stop the 54. A plausible mechanism, **not confirmed**,
is that the comparison needs the game to still be on the free scoreboard, and
those boards only carry recent dates: once a corrupted row ages off the board
there is nothing left to contradict it and the stored score is simply used.
That would make the guard a narrow window rather than a net. Confirming it
means reading the grading path, which is the next investigation and not this
one.

## What is NOT established

**The writing path.** The obvious suspect is
`apps/web/lib/data-sources/free-score-persist.ts`, whose header says it matches
on "team+date". Reading it, that is almost certainly NOT the writer. It carries
four guards aimed at this precise failure, several of them added in response to
earlier review rounds on it: `UNRESOLVED_DOUBLEHEADER` refuses when no final
places on this row by the clock, `AMBIGUOUS_MATCH` fails closed when more than
one final survives kickoff narrowing, and `KICKOFF_DRIFT` refuses a final whose
start sits more than `MAX_KICKOFF_DRIFT_MS` (12h) from the row's kickoff, with
a comment stating the bound exists so a final cannot be placed on a game 24h
away in a series. Consecutive MLB games sit 19 to 24 hours apart, well outside
it.

It also **refuses to overwrite an existing FINAL that disagrees**, logging the
contradiction instead. Which means two things: it is a poor candidate for
having written these, and **it cannot repair them either.** A corrupted row is
permanent as far as this path is concerned.

So a different writer is responsible and has not been identified. Note that
`packages/data-ingestion/src/mlb-statsapi-client.ts` exists, so MLB scores can
arrive from a source whose ids do not align with the `espn:` ids these rows are
keyed by; a cross-source join on team and date is the shape that would produce
exactly this. That is a lead, not a finding, and it is written down as a lead.

That is where the investigation stopped rather than guessing. An earlier
episode this session cost two wrong fixes by guessing at a cause before reading
the actual evidence, and the same discipline applies here.

**Scope beyond this window.** MLB only, ten days only, and only rows whose
`externalId` carries an ESPN event id. NFL, NCAAF and MLS are unaudited, as is
anything before 2026-08-29. The 25 out of 169 rate should not be extrapolated
without re-running the check.

## How to reproduce

**There is now a command for it: `npm run ops:verify-scores`.** It is read-only
and DATABASE_URL-guarded, defaults to MLB over ten days, takes
`--sport=nfl --days=21 --json`, and exits 1 when anything disagrees so it can be
wired to an alert later. It repairs nothing.

It reports an `uncomparable` count alongside the mismatches. That number is not
noise: a row whose `externalId` is not the source's, or an event the board is no
longer serving, was not checked at all, and a tool that silently skipped those
would report a clean bill of health it had not earned.

The manual version, which is what produced the numbers above:

1. Pull ESPN finals for the window, one call per date:
   `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=YYYYMMDD`,
   keeping events whose `status.type.name` is `STATUS_FINAL` and reading each
   competitor's `score` by `homeAway`.
2. Join them to our rows on the ESPN event id, which is the third
   colon-separated field of `games.externalId` (this makes `espn:mlb:NNN` and
   `espn:baseball_mlb:NNN` compare identically):
   `split_part(g."externalId", ':', 3)`.
3. Select rows where `status = 'FINAL'` and either score differs.

The whole check is read-only and takes about two minutes.

## What has to happen, and by whom

1. **Founder decision, before any public performance claim:** the settled record
   contains wrong results. Publishing calibration, a win rate, or the PROVEN
   pricing phase off this record is not defensible until the affected picks are
   re-settled against verified scores. This sits alongside, and is more serious
   than, the settlement-health conflict already documented in AGENTS.md.
2. **Root-cause the writer.** Which code path put another game's score on these
   rows, and why the 12h drift bound did not stop it.
3. **Repair the data.** Re-fetch the correct final for each affected row, and
   re-grade the 54 settled picks. Both are writes, so both are owner actions.
4. **Add a standing check.** A daily reconciliation of stored finals against the
   feed they came from would have caught this on 2026-08-30. **Half of this is
   now done:** `npm run ops:verify-scores` exists, is read-only, and exits
   non-zero on any disagreement. What is still open is running it on a schedule
   and surfacing the result, which needs a cron entry in `vercel.json` (frozen
   for agents) or a place on the truth surface. The tool was written so that
   step is a wiring decision rather than new logic.

## One thing that is fine

`stalePendingPicks` is 0 and the two currently overdue picks (a SPREAD and a
TOTAL on the Sep 7 Phillies game) are not a separate defect: they are on one of
the corrupted rows. Grading them against the stored 4-2 would record the spread
as a WIN when the real 1-0 result makes it a LOSS. The zero-sit lane will void
them at 24 hours past kickoff, which is roughly 17:06 UTC today. Voiding them
is the less wrong outcome of the two available, but neither is correct.

This also reframes the settlement-health RED that AGENTS.md attributes to a
structural conflict between three constants. That conflict is real and the
analysis of it stands. But the specific two picks holding health DEGRADED right
now are not "ordinary churn" as recorded there: they are the visible edge of
this. Whatever is holding them back is declining to grade a pick whose game row
we cannot trust, and on today's evidence that refusal is correct.
