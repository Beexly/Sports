# NFL Expected Metrics Validation — season 2025 (REG)

Generated 2026-07-16T04:07:23.277Z by `scripts/validation/nfl-expected-metrics-validation.ts`.

## Provenance

| field | value |
|---|---|
| source | nflverse `pbp` (release tag `pbp`) |
| season | 2025 (REG) |
| source URL | https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.csv |
| served by | https://github.com/nflverse/nflverse-data/releases/download/pbp/play_by_play_2025.csv (attempts: 1) |
| fetched at | 2026-07-16T04:07:03.776Z |
| license | CC-BY-4.0 |
| attribution (ingestion registry) | Data via nflverse (nflverse-data), licensed CC BY 4.0. |
| attribution (rights registry) | Data from nflverse (https://github.com/nflverse), CC-BY-4.0 |
| rights snapshot captured | 2026-07-16T04:07:00.521Z (reviewed 2026-06-10) |
| source rows | 48771 (REG kept: 46452) |
| columns projected | 40 of ~372 (FTN/participation columns used: 0) |

## Model fits (fit-on-load)

| model | version | method | sample | feature schema hash |
|---|---|---|---|---|
| EP | gse-ep-v1 | multinomial-ovr-logistic | 38841 | dd4831b9 |
| WP | gse-wp-v1 | logistic-regression | 38673 | 5678f5c9 |

## Calibration vs nflverse referee columns

| family | n | pearson | spearman | rmse | mae | bias | verdict | reason |
|---|---|---|---|---|---|---|---|---|
| EP (vs `ep`, non-terminal mask) | 36510 | 0.9615 | 0.9671 | 0.4679 | 0.3656 | 0.0064 | graduated | Pearson 0.9615 ≥ 0.9 over 36510 players — reproduces ground truth. |
| EPA (vs `epa`, paired transitions; graded under the `ep` family) | 36075 | 0.9373 | 0.9112 | 0.4367 | 0.32 | -0.0251 | graduated | Pearson 0.9373 ≥ 0.9 over 36075 players — reproduces ground truth. |
| WP (vs `wp`, full play grain) | 38673 | 0.9255 | 0.9219 | 0.1146 | 0.0853 | 0.0033 | graduated | Pearson 0.9255 ≥ 0.9 over 38673 players — reproduces ground truth. |
| WPA (vs `wpa`) | 35738 | 0.8056 | 0.8329 | 0.0226 | 0.0127 | -0.0011 | informational (no gate) | Informational only — WPA carries no graduation gate in v1. |

> n counts paired plays; engine reason strings say 'players' at every grain.

## Success rate (deterministic rule, no fit)

Teams: 32 · qualified players (>=20 plays): 336 · model gse-success-v1

| split | plays | successes | rate |
|---|---|---|---|
| down:4 | 882 | 489 | 0.5544 |
| down:1 | 14267 | 7311 | 0.5124 |
| down:2 | 10864 | 5141 | 0.4732 |
| down:3 | 6801 | 2715 | 0.3992 |
| situation:early_short | 2068 | 1354 | 0.6547 |
| situation:late_short | 2604 | 1582 | 0.6075 |
| situation:early_medium | 4057 | 2113 | 0.5208 |
| situation:early_long | 19006 | 8985 | 0.4727 |
| situation:late_medium | 2298 | 968 | 0.4212 |
| situation:late_long | 2781 | 654 | 0.2352 |

## Drives (deterministic partition, no fit)

| field | value |
|---|---|
| drives | 5745 |
| plays partitioned | 46452 |
| partition invariant | holds |
| mean points / drive | 2.1095 |
| mean drive success rate | 0.4006 |
| mean start yardline_100 | 52.525 |
| yardline fills (display only) | 3365 |

| result | drives |
|---|---|
| PUNT | 1933 |
| TD | 1329 |
| FG | 931 |
| TURNOVER | 599 |
| END_OF_HALF | 424 |
| TURNOVER_ON_DOWNS | 362 |
| MISSED_FG | 154 |
| SAFETY | 12 |
| OTHER | 1 |

## Scope

Historical, descriptive measurement of agreement between our fitted EP/WP surfaces and
the nflverse referee columns. Referee values are used only as the y-axis of a correlation
and are not served. Nothing here is a projection, pick, betting-performance figure, or
product claim.
