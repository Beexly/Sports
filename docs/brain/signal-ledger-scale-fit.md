# Signal ledger — per-key scale and fitted weight

**Status:** shipped. **Fit date:** 2026-09-30. **Population:** `signals`, 118,462
rows, seasons 2020-2026.

## The defect

`signals` shipped with `weight = 1` and `confidence = 1` on every row of every
key, while the ten persisted keys sit on ten incomparable raw scales:

| key | raw sd | key | raw sd |
| --- | --- | --- | --- |
| `pgs.target_share` | 0.093 | `ngs.avg_separation` | 1.020 |
| `injury.availability` | 0.500 | `ngs.yac_above_expectation` | 1.951 |
| `ngs.air_yards_to_sticks` | 2.321 | `pgs.rushing_epa` | 2.726 |
| `pgs.receiving_epa` | 3.296 | `pgs.fantasy_ppr` | 8.017 |
| `ngs.cpoe` | 7.820 | `pgs.passing_epa` | 9.626 |

A **103x** spread in units across keys a uniform weight treats as
interchangeable. The composite was an unweighted mean of ten different units, so
whichever key carried the largest raw magnitude dominated it: a `pgs.passing_epa`
reading of ±35 carried ~100x the influence of a `pgs.target_share` reading of
±0.067. The score was arithmetically real and semantically meaningless.

The `value` column was also written raw, which contradicts the schema's own
comment on the field ("normalized directional reading (+ good / − bad) for the
composer"). `composeLedger` was therefore blending raw source units.

## What replaced it

**1. A shared scale.** Each key's raw reading is normalized onto -1..1 by its
measured anchor and spread. `value` is the normalized reading; `valueRaw` keeps
the source column verbatim so the transform stays auditable and reversible.

**2. A fitted weight.** Per key, from the within-player correlation against a
settled outcome, evidence-scaled by distinct fixtures.

## Why within-player, and not the obvious number

The naive between-player correlation is 4x to 36x larger, and almost all of the
gap is player **identity** rather than forecast:

| key | between-player r | within-player r | inflation |
| --- | --- | --- | --- |
| `pgs.fantasy_ppr` | 0.373 | 0.094 | 4.0x |
| `pgs.target_share` | 0.293 | 0.091 | 3.2x |
| `pgs.receiving_epa` | 0.096 | 0.025 | 3.8x |
| `pgs.passing_epa` | 0.084 | 0.002 | 36.1x |
| `pgs.rushing_epa` | 0.041 | 0.004 | 11.3x |
| `injury.availability` | 0.071 | 0.063 | 1.1x |

In 2024 alone `pgs.target_share` measures between-player 0.314 against
within-player 0.0046 — a 68x gap. Weighting by the between-player number would
advertise predictive power the data does not contain. The weight is fitted on
the residual (player fixed effect removed), which answers the only question a
weight can legitimately answer: on a week this player looks unusually good, do
they do unusually well next week?

## The fitted table

| key | weight | within r | fixtures | verdict |
| --- | --- | --- | --- | --- |
| `pgs.fantasy_ppr` | 0.105064 | 0.0940 | 125 | earned |
| `pgs.target_share` | 0.101859 | 0.0911 | 125 | earned |
| `pgs.receiving_epa` | 0.028479 | 0.0255 | 125 | earned |
| `pgs.rushing_epa` | 0.004009 | 0.0036 | 125 | earned |
| `pgs.passing_epa` | 0.002593 | 0.0023 | 125 | earned |
| `injury.availability` | 0 | 0.0626 | 23 | insufficient-fixtures |
| `ngs.cpoe` | 0 | — | 0 | unjoinable-outcome |
| `ngs.avg_separation` | 0 | — | 0 | unjoinable-outcome |
| `ngs.yac_above_expectation` | 0 | — | 0 | unjoinable-outcome |
| `ngs.air_yards_to_sticks` | 0 | — | 0 | unjoinable-outcome |
| `snap.offense_pct` | 0 | — | 0 | unjoinable-outcome |
| `snap.st_pct` | 0 | — | 0 | unjoinable-outcome |
| `snap.defense_pct` | 0 | — | 0 | unjoinable-outcome |

Note what the fit does to the two keys the uniform weight had backwards:
`pgs.target_share` (sd 0.093) had ~1/100th the influence of `pgs.passing_epa`
(sd 9.63) and now outranks it **39:1**. `pgs.passing_epa` has the widest raw
scale in the ledger and the weakest signal in it, and the fit is what stops a
±35 EPA reading from dominating a composite it has no demonstrated claim on.

**Eight of thirteen keys earn weight 0, and that is the finding, not a gap.**
Each for its own measured reason:

- **`ngs.*` (4 keys)** — the writer keys NGS rows by `gsisId` while every settled
  outcome is keyed by `playerId`, and **0 of 380** distinct gsis match a playerId.
  No join, no fit, no weight. The crosswalk does not exist in this repo.
- **`snap.*` (3 keys)** — never persisted at all. All **31,100** `snap_counts`
  rows have a NULL `playerId`, so the writer has no entity to attach a reading
  to. Their anchors are measured on the source table so the scale is on record
  the day the ids land.
- **`injury.availability`** — only **23** independent fixtures carry a joinable
  settled outcome, below the 100-fixture floor. Its within-player r of 0.063 is
  the strongest of any key here and it is still refused: a correlation off 23
  games is not separable from noise.

Weight 0 means present, honest, and currently not allowed to move a score. Not
dropped, and never back-filled with a plausible-looking constant.

## The injury encoder bug this surfaced

The previous encoder was `(reportStatus ?? practiceStatus ?? "").toUpperCase()`.
`??` falls through only on null/undefined — **not on an empty string** — and on
prod every one of the 6,812 `injuries` rows stores `reportStatus` as `''` rather
than NULL (`reportStatus IS NULL` matches 0 rows; `reportStatus = ''` matches
3,744). So `??` never fired, the encoder saw `""`, and the row was dropped.

Measured consequence: **2,955 rows whose `practiceStatus` was "Full
Participation in Practice"** — the healthiest reading in the table — were
discarded, and only 3,068 of 6,812 injuries ever became a signal. Every
persisted `injury.availability` value was `-1` or `0`; the `+1` case had never
once been written, so the key could report bad news and never good news.

The fix falls through on a blank string, not just a null one, and prefers the
finer-grained practice report over the coarser injury report. It encodes 6,065
of the same 6,812 rows and restores the `+1` case.

Related: the declared ordinal scale is `{anchor: 0, spread: 0.5}`, **not** spread
1. `normalizeReading` maps anchor ± 2·spread onto -1..+1, so a spread of 1 would
map the ordinal onto ±0.5 and halve every injury reading. (The read-only census
path in `signal-ledger-loader.ts` declares spread 1 and does halve it; that path
writes nothing, so nothing downstream is affected today.)

## The outcome, and why not team win/loss

The weight is fitted against **next-week `player_game_stats.fantasyPointsPpr`
above the population median** (base rate 0.4966, median 6.10 — a balanced
target, so the correlation is not inflated by class imbalance).

Team win/loss was the preferred outcome and is not joinable:
`player_game_stats.team` joins **0 of 32** distinct strings to
`games.homeTeamName`/`awayTeamName`, and `games` carries no season or week
column, so there is no join path to a score at all.

Evidence is counted in **distinct fixtures** (season x week), never rows —
24,497 `pgs.fantasy_ppr` rows come from 125 independent games, and the rows
inside one game are one observation of evidence, not 200. This is the same
fixture-not-row law as `tune-signal-weights-grouped.ts`.

## Files

| file | role |
| --- | --- |
| `packages/prediction-engine/src/signal-scale-fit.ts` | the fit law (pure, db-free, deterministic) |
| `packages/prediction-engine/src/signal-scale-table.ts` | the committed measured table |
| `packages/prediction-engine/src/__tests__/signal-scale-fit.test.ts` | 12 tests |
| `apps/web/lib/ops/signal-ledger-writer.ts` | projects onto the scale, writes the fitted weight |
| `apps/web/scripts/fit-signal-scales.mjs` | read-only reproduction of the table |

## Reproducing / re-fitting

```
DATABASE_URL=... node apps/web/scripts/fit-signal-scales.mjs           # print
DATABASE_URL=... node apps/web/scripts/fit-signal-scales.mjs --write   # rewrite
```

A refit is a reviewed diff, not a chore: the script refuses any statement that
is not a single `SELECT`, and a refit that moves a weight is a claim change that
belongs in review.

## What this does NOT do

- No published projection, gate, floor, or `MODEL_VERSION` was touched.
- No signal was wired into a published pick score. `signals` is still not read
  by any production consumer — the only reader is `/api/ops/signal-ledger-state`,
  which counts rows and deliberately selects no values.
- Rows written before this change keep their raw `value` and weight 1 until the
  writer next visits them. The write is an upsert on the unique tuple, so
  re-running converges.
