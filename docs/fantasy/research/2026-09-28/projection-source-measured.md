# Projection source: the data is already there (2026-09-28)

**Bucket: fantasy** (the unlock is season-long roster decisions; the measurement
was taken read-only against Neon `gse-postgres` branch `main`, role `hermes_ro`).

**Why this file exists.** `SURF-2` has carried the phrase "there is nothing in
the database to rank on" since it was filed, and that phrase has been quoted
back to me as the reason rankings cannot start. It is **wrong**, and the
correction is the cheapest unblock available on this project.

## What SURF-2 measured, and what it missed

SURF-2 looked for a `Projection` model and a `PlayerSignal` model in
`schema.prisma`, found neither, and concluded from that absence that no
forward-looking per-player data existed.

That inference only holds if projections can only live in a table named
`Projection`. They do not. The historical base for a projection is
`player_game_stats`, and that table is large, current, and fully populated.

## Measured, this session

```
player_game_stats        35,490 rows | 1,436 distinct players | season 2026
2026 by week             wk1 360 players, wk2 364, wk3 344
avg fantasyPointsPpr     7.54 (wk1)  7.03 (wk2)  7.66 (wk3)
```

Coverage on the 1,068 rows of season 2026, the columns a projection model needs:

| Column | Populated |
|---|---|
| `targetShare` | 1,068 / 1,068 (100%) |
| `targets` | 1,068 / 1,068 (100%) |
| `rushingYards` | 1,068 / 1,068 (100%) |
| `receivingYards` | 1,068 / 1,068 (100%) |

`receivingEpa` and `rushingEpa` also exist. So the raw material for a real
projection is present, current, and free of the licence problem that would come
from a commercial feed.

## What the source actually is

**nflverse, by ingestion rather than by contract.** The data reached
`player_game_stats` through the existing `packages/data-ingestion` nflverse
pipeline, which is CC-BY-4.0. It was never a choice anyone made; it is what
happened when the ingest was wired. That is fine, and it is also exactly the
decision `rankings-program.md` 6 demands be made explicitly, so this file makes
it explicit and cites the measurement.

## Why this unblocks rankings, concretely

`apps/web/lib/integrations/projections.ts` wants `proj`, `floor`, `ceiling` per
player. The split:

- **`proj`** is available now. A recency-weighted mean of `fantasyPointsPpr`
  over a player's own 2026 history, split by position, is a legitimate
  projection baseline and it is derived from measured data, not invented.
- **`floor` and `ceiling`** are yours to compute and are the part no feed
  supplies well. Per-player variance from the same history gives a defensible
  interval. A competitor who buys the same feed will not have your variance
  model, which is the part worth owning.

So the blocker is no longer data. It is the founder naming the source, which is
one sentence, and I have recommended nflverse above on the evidence.

## What I did NOT do

- Did not create a `Projection` model, migration, or seed. AGENTS.md law 7 bars
  schema changes and law 3 bars moving a founder-owned flag.
- Did not register a provider, set `PROJECTIONS_PROVIDER`, or write a
  projection. The provider hook is a founder tap and the derivation is a
  calibration decision.
- Did not fit anything. Three weeks of 2026 data is a thin base for a rest-of-
  season model, and the era split in `ranking-basis-census-legacy-split.md` is
  the standing reminder that pooling eras contaminates a fit.

## Honest limits on this measurement

- It counts rows. It does not establish that a projection built on them beats a
  rolling average, because that requires a backtest, and the honest answer to
  "will this model be better" is not yet known.
- 1,436 distinct players across all seasons is a wide historical base, but the
  2026 season itself has three weeks. Season-long ROS projections on three weeks
  of current data are a modelling risk worth naming, not a blocker.
- `fantasyPointsPpr` is a PPR scoring assumption baked into the feed. A
  non-PPR scoring setting is a different column and is not covered here.
