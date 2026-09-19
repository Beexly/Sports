# Historical backtest harness

## Why this exists

The live engine has only ever scored games forward, in real time. Per
AGENTS.md: 2,641 settled picks total, 72.5% MLB, and NFL has about 70
settled picks *ever* — not enough to calibrate anything, so every proposed
signal dies for lack of evidence. Historical closing lines are free and
legal to obtain (see **Data sources** below). Replaying scoring over
history turns n=70 into tens of thousands of graded decisions, without
touching the production database, without flipping a gate, and without
waiting for a season to settle.

## What this is, and is not

This is a **pure, offline, deterministic** grading harness:

- `types.ts` — the row contract and the `Scorer` interface.
- `grading.ts` — WIN / LOSS / PUSH for spread, total, and moneyline.
- `validate.ts` — refuses a malformed row rather than coercing it.
- `harness.ts` — `runBacktest(rows, scorer)`: the whole pure core.
- `loader.ts` — the *only* file here that touches a filesystem. Everything
  else takes parsed rows in and returns graded results out. No network, no
  database, no environment flags, no clock reads, anywhere in the core.

It is **not** a data source. It ships with no historical corpus. Someone
has to legally obtain one (see below) and shape it into the row contract.
It is **not** the live scoring engine — see "Wiring the real scorer" for
exactly what stands between this harness and `scoring.ts`.

## Row contract

One row = one settled game with its closing lines. Canonical column names
(e.g. for a CSV or a data pipeline) are `snake_case`; the TypeScript type
(`HistoricalGameRow` in `types.ts`) uses the matching `camelCase` names.

| Column                | Type                | Notes                                                        |
|------------------------|---------------------|---------------------------------------------------------------|
| `season`               | integer             | e.g. `2024`                                                   |
| `week`                 | integer >= 0        |                                                                 |
| `kickoff_utc`          | ISO-8601 string     | UTC, e.g. `2025-09-07T17:00:00Z`                               |
| `home_team`            | string              | must differ from `away_team`                                  |
| `away_team`            | string              |                                                                 |
| `home_score`           | non-negative integer | **outcome column** — see leakage below                       |
| `away_score`           | non-negative integer | **outcome column** — see leakage below                       |
| `closing_spread_home`  | number              | applied to the home team; negative = home favored             |
| `closing_total`        | number > 0          | combined-score line                                            |
| `closing_ml_home`      | non-zero number     | American price                                                 |
| `closing_ml_away`      | non-zero number     | American price                                                 |
| `source_url`           | non-empty string    | citable provenance for this row's scores/lines                |

A row missing any field, or with a value out of range, is refused (see
"Refuses, never invents" below) — not defaulted, not coerced.

## Data sources (legal, free)

- **nflverse schedules** (`nflreadr`/`nflreadpy`, `load_schedules()`) carry
  closing spread and total for essentially every NFL game back to 1999,
  under **CC-BY 4.0** — credit **"nflverse"** on anything built from it.
  This is also cited elsewhere in this repo's AGENTS.md as the engine's
  legal data foundation.
- **spreadspoke** (`spreadspoke_scores`, widely mirrored, e.g. on Kaggle)
  carries NFL scores and lines back to **1978**. Verify its license terms
  for the specific mirror used before redistributing it; treat it as a
  research input, same as every other scraped/mirrored source this repo
  already uses under its "public reading is not redistribution" posture.

Neither source is committed to this repo. `loader.ts` reads a local JSON
file shaped like the row contract above; adapting either source into that
shape (a season, one row per game) is the loader's caller's job, not this
harness's.

## Pushes: never averaged into a win rate

A PUSH is only mathematically possible when the graded line is an integer,
because scores are integers — `grading.ts` doesn't special-case this, it
falls straight out of the arithmetic (`margin + line === 0` can only ever
be true when `line` is a whole number). A moneyline PUSH is a tie (rare,
but real in some sports).

`runBacktest`'s aggregates report `wins`, `losses`, and `pushes`
separately, and `decidedWinRate` is **`wins / (wins + losses)` only** — a
push is never counted as half a win, a full win, or a loss. This repo has
already been burned once by averaging a push into a published win rate
(AGENTS.md, "record accuracy"); this harness is built so that mistake is
structurally harder to make, not just remembered.

## The leakage test (mandatory, and it is a real behavioral test)

`Scorer` receives `PreGameInputs`, which is `HistoricalGameRow` minus
`homeScore` and `awayScore`. `toPreGameInputs()` builds this by object
destructuring, so the object a scorer receives literally does not carry
those two keys at runtime — this isn't just a TypeScript-level guarantee
that a cast could defeat.

`harness.test.ts` proves this two ways:

1. **Structural.** A spy scorer records `Object.keys()` of the object it
   was called with, for every row. The test asserts `homeScore` and
   `awayScore` never appear.
2. **Behavioral.** A deterministic scorer that only reads pre-game fields
   is run once against the real rows and once against the same rows with
   `homeScore`/`awayScore` mutated to arbitrary, very different values.
   The two runs must produce byte-identical selections. If they don't,
   the harness is leaking outcome data into scoring, and the harness is
   void — per this task's explicit instruction, that is treated as a hard
   failure, not a warning.

## Refuses, never invents

`runBacktest` and `parseHistoricalRowsJson` both throw rather than run on
an empty, non-array, or malformed corpus. A malformed row is described in
the thrown error (which row index, which field, what was found) so the
fix is finding the real data, never patching around a gap with an
invented value. Synthetic rows are used **only** inside `harness.test.ts`,
clearly constructed as test fixtures — never presented as a real corpus.

## Wiring the real scorer later

The live engine's `scoreGame(input: OddsInput, fetchedAt?: Date):
ScoredPick[]` (`../scoring.ts`) was checked, and it is **not called
directly** from this harness. Reason, stated plainly so wiring it later is
a one-line change and not a rediscovery:

`OddsInput` requires `bookmakerOdds: BookmakerOddsInput[]` — **per-book**
spread/total/moneyline prices, plus an optional `GameContextInput` for
rest/travel/injury-style factors. The row contract above only carries a
single **consensus closing line** per market, because that is what
nflverse and spreadspoke actually publish. Synthesizing a fake multi-book
spread around a single closing number to satisfy `OddsInput`'s shape would
be inventing data (rule 1: "No fake data"), not backtesting.

Instead this harness defines a narrow `Scorer` interface
(`(game: PreGameInputs) => BacktestSelection | null`) that any scoring
strategy can implement — including, eventually, a real adapter that:

1. Builds a single-bookmaker `OddsInput` from `PreGameInputs` (labeled
   honestly as a single synthetic consensus book, not real per-book data),
   or, better, is fed real historical per-book odds once such a corpus is
   sourced;
2. Calls `scoreGame` (or the specific scorer function under test);
3. Maps the resulting `ScoredPick[]` back into a `BacktestSelection` (or
   `null` if the engine declined to publish, matching `Scorer`'s existing
   null-means-decline contract).

That adapter is new code, deliberately not written here, because it needs
a real decision (what to do about missing per-book granularity and missing
game-context inputs) that belongs to whoever sources the corpus and wires
the real engine in — not to this harness.

## Usage sketch

```ts
import { runBacktest } from "./harness.js";
import { loadHistoricalRowsFromJsonFile } from "./loader.js";
import type { Scorer } from "./types.js";

const rows = loadHistoricalRowsFromJsonFile("/path/to/corpus.json");

// Replace with a real strategy, or the adapter described above.
const homeFavoriteScorer: Scorer = (game) => ({
  pickType: "SPREAD",
  side: game.closingSpreadHome < 0 ? "HOME" : "AWAY",
  line: game.closingSpreadHome,
});

const report = runBacktest(rows, homeFavoriteScorer);
console.log(report.byPickType, report.overall);
```
