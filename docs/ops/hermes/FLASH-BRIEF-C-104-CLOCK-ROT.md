# Flash brief: do not land the obvious fix on galaxy-two-book-acceptance

Read this before editing
`packages/ingestion-pipeline/src/__tests__/galaxy-two-book-acceptance.test.ts`.

The failing test is time-rotted. It is not waiting on an unlanded PredExon
feature. Comment 5733414397 on PR #863 stated the wrong root cause (law 4).
ARCH-13 is being corrected to match the measurement below.

## What is actually red

File: `packages/ingestion-pipeline/src/__tests__/galaxy-two-book-acceptance.test.ts`
Describe: `C-104 acceptance: free two-book NFL board (ESPN inline + Kalshi via PredExon)`
Result: 3 of 3 fail. All three cascade from `board.events` empty, so
`events[0].bookmakers` throws.

Command:

```
cd packages/ingestion-pipeline && npx vitest run src/__tests__/galaxy-two-book-acceptance.test.ts
```

## Root cause, measured

`packages/data-ingestion/src/espn-odds-client.ts` reads the real wall clock
twice and takes no clock injection (options are fetchImpl, maxEvents,
interEventMs, horizonDays, fetchTimeoutMs, secondBook).

At :582-588 it filters events to -6h .. +21d against that clock.

The test pins:

```
const NOW = new Date("2026-09-13T15:00:00.000Z");   // :25
const KICKOFF = "2026-09-14T17:00:00.000Z";         // :26
```

Today is 2026-09-18. KICKOFF is about 100 hours past, outside the -6h floor.
Events are filtered out. The board is empty.

It went red at roughly 2026-09-14T23:00Z, six hours after its own pinned
kickoff.

Ruled out by measurement:

- `americanfootball_nfl` IS in `ESPN_ODDS_SPORT_MAP` (:39)
- `galaxy-espn-inline` carries verdict `use-with-caution`, which IS in
  `INGESTIBLE_VERDICTS`, so `isIngestible` returns true

## The trap

`eventTickerMatchesGame` (`packages/data-ingestion/src/kalshi-client.ts:192-233`,
called from `galaxy-kalshi-book.ts:347`) requires team tokens AND the date
fragment: both abbrs present, adjacent as AWAYHOME or HOMEAWAY, and the
ticker must contain `toKalshiDateFragment(game.dateUtc)` or plus/minus one
day.

The fixture hardcodes `26SEP14` at :99, :100, :103, :106. Moving KICKOFF
alone silently drops the Kalshi book, collapsing bookmakers to
`["espn_public"]`. The third test then passes for the wrong reason while
the first two still fail.

## Correct fix (test-only, zero production change)

```
const NOW = new Date();
const KICKOFF = new Date(NOW.getTime() + 26 * 3_600_000).toISOString();
const FRAG = toKalshiDateFragment(KICKOFF); // America/New_York wall date
```

Build all four tickers from FRAG. The ET requirement is load-bearing: a
kickoff at T01:00Z is the previous ET day.

Keep `status.type.completed: false` (:38). That is a separate gate at
`espn-odds-client.ts:428`.

Repo-native evidence this is the right shape rather than adding injection:
the three sibling tests calling `fetchEspnOddsForSport` all use relative
kickoffs (`espn-odds-client.test.ts:18`, `odds-provider-adapter.test.ts:145`,
`process-sport.test.ts:265`, all `Date.now() + 6h`), and
`apps/web/__tests__/board-gate-slate.test.ts:622-630` documents this exact
failure class in a comment after it already happened once on an untouched
main.

## Acceptance

3 passed, and the first test still asserts two bookmakers:

```
expect(board.events[0]!.bookmakers.map((b) => b.key)).toEqual(["espn_public", "kalshi"]);
```

A green suite with one bookmaker is the wrong-reason pass.

Do not change production client options. Do not add clock injection to
`espn-odds-client.ts` in this fix.
