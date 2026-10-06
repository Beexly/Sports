# Ported results — 2026-09-27

Two agents ran the same work order on the same night against the same branch lineage, and
both reached main with overlapping but non-identical work. This branch carries the results
that only one of them produced, rebased onto the layout the other one made canonical. No
implementation was replaced.

## What was ported

| result | status before this branch |
|---|---|
| 2026 application season ingested | absent — main's manifest ended at 2025 |
| `narrative_contract` STORED, f1 cleared | never attempted on main |
| week-3 application command, proven | absent |
| `coaching` re-measured with full statistics | main still carried the stale `\|r\| 0.014` row with no slope and no standard error |

Main already had the officials re-measurement, the per-season data layout, the player-id
crosswalk, the bridge benchmark and its own harness. Those were left alone.

## The finding

`narrative_contract` cleared honesty. On the 2025 holdout, scored by coefficients fitted on
2018-2024 only:

```
n=285   r=0.24637068951161498   |r| >= 0.08
slope=0.8304928047049019   se=0.19420308361768532   |slope| > se
```

f1 = 0, f2 = 0, f3 = 1 because the target game has no week-3 row, so `g = 0.2` and the verdict
is **STORED**.

It reproduces. The other lane reached the same verdict from a different data layout with no
player-id crosswalk: `r` 0.2336, `slope` 1.1071, `se` 0.2739, also `honesty_cleared`. Two
independent data paths agreeing is evidence the result is a property of the football and not
of either implementation.

## The path to LIVE is proven, not described

`scripts/overnight/compute-week3-narrative.mjs` applies the frozen coefficients. On
`2026_03_ATL_GB`, the one 2026 week-3 game nflverse has published:

```
feature gap -1.260807041693968
signed      -0.0882792023245994
model p      0.45189782884207563
selectPart: LIVE, g = 0, winning term none
```

So when `2026_03_LAC_BUF` week-3 snap rows publish, one command produces the row, f3 becomes
0, and the family is LIVE with **no re-fit**. The coefficients are sealed in
`data/reasoning/stored-candidates.jsonl`.

## The sign is against LAC

Measured from the latest sealed rows — 2026 weeks 1 and 2, and `is_week_3_row` is `false`, so
this is explicitly not the locked week-3 value:

```
LAC mean APY  7.51068815816024   over 3370 matched snaps
BUF mean APY 10.65846376323198   over 3552 matched snaps
feature gap  -3.1477756050717405
signed       -0.22040098946402953
model p       0.3197760417026455
```

Buffalo carries the higher contract intensity, so this family points **against** LAC and at
its existing 0.03 prior would pull the LAC edge down by roughly 0.0066, not up. The other
lane measured the same direction at about half the magnitude, from fewer matched snaps
because it had no crosswalk.

Nothing was written to `data/reasoning/parts-registry.jsonl`. It is unmodified at 8 rows, the
LAC edge still recomputes to exactly `0.30259224777263855`, and `publishes_pick` is false.

## Ingest change

`INGEST_SEASONS` now ends at 2026, and the participation loop records an unpublished season
as a refusal instead of aborting the run. nflverse has 2026 snaps, rosters and nfl4th; it does
not have 2026 participation, which ships after a season ends, and that is recorded with the
release's own message.

Three assertions in `rows.test.ts` changed meaning when 2026 entered the window — the same
trap that moved 2022 when the window first widened. They now assert against 2017 and 2027,
which are still genuinely outside, and a new one pins that a 2026 snap row is kept.

## Verification

- `verify-shape.mjs` and the data-ingestion suites run clean on this branch
- `rows.test.ts` 5 passed, `tsc --noEmit` 0 errors
- `narrative_contract` and `coaching` both re-measured and both verdicts recorded
- registry unmodified, `publishes_pick` false
