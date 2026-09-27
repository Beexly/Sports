# Engine dashboard — 2026-09-27

Every number below is followed by the path it came from. No hit-rate projection, no units, no
public win rate. Where a number is null it is null, not zero.

## Module ledger

Source: `data/reasoning/module-ledger.jsonl` (63 rows)

| status | count |
|---|---:|
| catalogued | 59 |
| blocked | 4 |
| wired | 0 |
| measured_zero | 0 |
| dark | 0 |
| absent | 0 |

The four `blocked` directories are `engine` (contains `reasoning-surface.ts`), `experimental`
(4 GLMF files), `props-dfs`, and `signals` (contains `opponent-adjusted-epa.ts`). None was
opened. The ledger is produced by `scripts/overnight/scan-modules.mjs`, which cannot emit
`wired` or `measured_zero`; those statuses require a number a person or an agent computed, so
zero of them is the honest count for a night that fitted nothing into the registry.

## Feature catalog

Source: `data/reasoning/feature-catalog.jsonl` (6 rows, 0 skipped)

| grain_id | tier | direction | sample_count | source |
|---|---|---|---:|---|
| player_contract | player_week | narrative_contract | 35944 | `data/gse-dataset/contracts.jsonl` |
| player_roster | player_week | none | 404653 | `data/gse-dataset/rosters.jsonl` |
| player_game_snap | player_week | on_field_efficiency | 205355 | `data/gse-dataset/snap-counts.jsonl` |
| play_participation | play | none | 382557 | `data/gse-dataset/participation-2018.jsonl` (+7 more) |
| play_fourth_down | play | coaching | 33002 | `data/gse-dataset/fourth-down.jsonl` |
| nflverse_ingest_manifest | meta | none | null | `data/gse-dataset/nflverse-ingest-manifest.json` |

**6 rows against the document's 240.** That is a pass. The 240 was a wish list, and a row
enters the catalog only when a header was actually read. The manifest's sample count is null
and stays null.

## nflverse manifest

Source: `data/gse-dataset/nflverse-ingest-manifest.json`, seasons 2018-2025, `publishes_pick` false.

| file | rows | bytes | sha256 (first 16) |
|---|---:|---:|---|
| contracts.jsonl | 35944 | 5551974 | `58f16653c7489e0a` |
| rosters.jsonl | 404653 | 84324943 | `c6bbf48d45e76545` |
| snap-counts.jsonl | 205355 | 47343479 | `bf3423a2ffab001c` |
| participation-2018.jsonl | 47875 | 21047372 | `9a5d18d4bc69f09f` |
| participation-2019.jsonl | 48034 | 21146293 | `ac9cf0b0d4658fe3` |
| participation-2020.jsonl | 48513 | 21338122 | `bac369225065bbc7` |
| participation-2021.jsonl | 50714 | 22302524 | `8a34ef0184647cc8` |
| participation-2022.jsonl | 50150 | 22062934 | `33c77f30fcd23b26` |
| participation-2023.jsonl | 46168 | 28394109 | `9a4644db629d4c7a` |
| participation-2024.jsonl | 45919 | 28162165 | `c3b8164691b0194f6` |
| participation-2025.jsonl | 45184 | 27835609 | `18871d87ca888754` |
| fourth-down.jsonl | 33002 | 4575209 | `4a394829346b72e2` |

Full 64-character hashes are in the audit and in the manifest. `read == kept + refusals` holds
for every dataset. Participation is eight files because one file would be 183 MB; no season
was dropped, and the parts sum to 382557.

## Scalarizer verdicts

Source: `data/reasoning/dark-candidates.jsonl`

| family | n | r | slope | se | g | verdict |
|---|---:|---:|---:|---:|---:|---|
| coaching | 285 | 0.0346098177800266 | 0.7166085172924505 | 1.2300681449666506 | 0.5 | DARK, winning term f1 |

New this night, and corrected after review. f1 fails on both bars: `|r|` 0.0346 is under
0.08, and `|slope|` 0.71661 is not greater than `se` 1.23007. The 2025 holdout is scored
against coefficients fitted on 2018-2024 only, frozen before scoring.

A first run reported r=-0.0346, slope=-0.2952, se=0.5067. Those were a 2025 refit rather than
a walk-forward: the regressor handed to the fitter was the raw feature instead of the frozen
model's prediction. The verdict did not change, but the statistics did, including the sign of
r. The corrected row is appended to `data/reasoning/dark-candidates.jsonl` with a
`supersedes` field; the incorrect row was not rewritten.

The instructive detail that survives: in sample the slope cleared its standard error (0.412
against 0.178), and scored out of sample it does not. The old stored row had `|r|` 0.014 and no
slope or standard error at all, so it could not have passed f1 even in principle.

## LAC edge

Source: `data/reasoning/parts-registry.jsonl`, 8 rows, unmodified this night.

Recomputed sum of `weight * signed` is `0.30259224777263855`, exactly equal to the documented
value at full double precision. No LIVE part was added, so the edge did not move.

## Price archive

Source: `packages/prediction-engine/src/edge-lab/decision-time-price-archive.ts`

21 of 21 tests pass from `packages/prediction-engine`. The archive is append-only and validates
every field before writing, so a refused row never creates the file and never adds a line. A
caller's edge that is not `model_probability - devigged_market_prob` within 1e-9 is refused
rather than repaired. `priced` is still `false` and `pricePropAgainstMarket` is unmodified and
still has no `fs` import.

## entryOdds guard

Source: `packages/prediction-engine/src/pick-proof-receipt.ts:165`

The band guard already existed and is committed: `isPlausibleEntryOdds` with
`ENTRY_ODDS_MIN_ABS = 100`, applied in the live path at
`packages/ingestion-pipeline/src/process-sport.ts:1522`, 13 tests passing. The gap closed
tonight was `scripts/backfill/historical-settlement-backfill.ts`, whose receipt condition
tested only `entryOdds !== null`; an historical pick carrying `-33` would have created a new
receipt holding it. That path is create-once, so the guard cannot rewrite a frozen receipt.

## ai.txt

Source: `apps/web/app/ai.txt/route.ts`, unchanged.

The route already builds its redirect from `absoluteUrl`. Verified live: HTTP 308 with
`Location: https://www.galaxysportsedge.com/llms.txt`, resolving 200. The 2026-09-08 localhost
bug is not present in the deployed environment.

## What stayed DARK

- `officials` — unchanged. 2025 holdout n=113, r=-0.092574, slope=-0.010072, se=0.010282.
- `weather_physics` — unchanged. Wind slope does not clear its standard error.
- `narrative_contract` — unchanged. Contracts are on disk for 8 seasons but no walk-forward
  fit was run against them, so the family has not been re-tested.
- `coaching` — re-measured this night, still DARK. Numbers above.

## What was refused

- No push, no force-push, no rebase, no amend of a pushed commit.
- No `publishes_pick: true`, no public win rate, no ROI, no units. The calibration page stayed dark.
- No `priced: true` anywhere.
- No `SignalFamily` widening; the catalog is 6 rows, not 240.
- No second `from-bridge.ts` and no second `reasonAbout`; both already existed.
- No invented row, no invented season, no invented `gsis_id` on snap data.
- No fit on 2025; the holdout was scored by pre-2025 coefficients.
- No loosening of `|r| >= 0.08` or `|slope| > se`.
- No `npm install` with `--ignore-scripts`, and no edit to `.gitignore`.
