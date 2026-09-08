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

## What is NOT established

**The writing path.** The obvious suspect is
`apps/web/lib/data-sources/free-score-persist.ts`, whose header says it matches
on "team+date". But it inherits `MAX_KICKOFF_DRIFT_MS = 12h` from
`free-settlement.ts`, whose comment states the bound exists precisely so a
final cannot be placed on a game 24h away in a series. Consecutive MLB games
sit about 19 to 24 hours apart, so that guard should already refuse these.
Either the guard is bypassed on this path, or a different writer is
responsible.

That is where the investigation stopped rather than guessing. An earlier
episode this session cost two wrong fixes by guessing at a cause before reading
the actual evidence, and the same discipline applies here.

**Scope beyond this window.** MLB only, ten days only, and only rows whose
`externalId` carries an ESPN event id. NFL, NCAAF and MLS are unaudited, as is
anything before 2026-08-29. The 25 out of 169 rate should not be extrapolated
without re-running the check.

## How to reproduce

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
   feed they came from would have caught this on 2026-08-30. It belongs beside
   the existing truth surface rather than in a one-off script.

## One thing that is fine

`stalePendingPicks` is 0 and the two currently overdue picks (a SPREAD and a
TOTAL on the Sep 7 Phillies game) are not a separate defect: they are on one of
the corrupted rows. Grading them against the stored 4-2 would record the spread
as a WIN when the real 1-0 result makes it a LOSS. The zero-sit lane will void
them at 24 hours past kickoff, which is roughly 17:06 UTC today. Voiding them
is the less wrong outcome of the two available, but neither is correct.
