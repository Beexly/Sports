# Engine dashboard

Generated 2026-09-27T04:39:04.903Z by `node scripts/overnight/build-dashboard.mjs`.
Every number below is read from the file printed beside it.
No hit-rate projection, no units, no public win rate. The calibration page stays dark.

## Module ledger, counts by status

Source: `data/reasoning/module-ledger.jsonl` (63 rows).

| status | directories |
|---|---:|
| blocked | 4 |
| catalogued | 57 |
| dark | 1 |
| wired | 1 |

`wired` = 1: `reasoning`.
Rows naming a real data file: 1 of 63.

## Feature catalog, counts by status

Source: `data/reasoning/feature-catalog.jsonl` (11 rows).

| status | grains |
|---|---:|
| catalogued | 3 |
| dark | 3 |
| wired | 5 |

By tier: play 2, player_week 2, meta 3, game 3, market 1.

The upstream document lists 240 family labels. This catalog holds **11**. That is the measured count, and a count well under 240 is the correct outcome: a label that was never found in code or on disk does not belong here, and adding one with a plausible status is the failure this section exists to prevent.

## nflverse ingest manifest, row counts and hashes

Source: `data/gse-dataset/nflverse-ingest-manifest.json`. Seasons 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025. `publishes_pick` is **false**.

| dataset | rows | bytes | sha256 (first 16) |
|---|---:|---:|---|
| `contracts` | 35,944 | 5,551,974 | `58f16653c7489e0a` |
| `rosters-2018` | 55,341 | 11,490,417 | `a212535892b687b7` |
| `rosters-2019` | 54,743 | 11,374,247 | `d438ca49a3a665a2` |
| `rosters-2020` | 47,191 | 9,826,741 | `89cf5679f479de49` |
| `rosters-2021` | 49,630 | 10,338,440 | `7df6d22a36304528` |
| `rosters-2022` | 49,269 | 10,240,480 | `78c44750e6be031c` |
| `rosters-2023` | 48,739 | 10,182,440 | `ac89a37708a0b44b` |
| `rosters-2024` | 49,787 | 10,397,320 | `d250f693acd9dae3` |
| `rosters-2025` | 49,953 | 10,474,858 | `f0fcc557f7fc0591` |
| `snap-counts-2018` | 23,877 | 5,506,077 | `4b24036a15268056` |
| `snap-counts-2019` | 23,862 | 5,502,724 | `7ed621ec143287f9` |
| `snap-counts-2020` | 24,999 | 5,764,566 | `8c07bf57ac70b354` |
| `snap-counts-2021` | 26,468 | 6,101,524 | `5789770e88295fd7` |
| `snap-counts-2022` | 26,381 | 6,080,190 | `9221c5794629b5d0` |
| `snap-counts-2023` | 26,540 | 6,117,865 | `04a639422c8e18a6` |
| `snap-counts-2024` | 26,615 | 6,136,111 | `db8532109c75a038` |
| `snap-counts-2025` | 26,613 | 6,134,422 | `8253a3395e75a359` |
| `participation-2018` | 47,875 | 21,047,372 | `9a5d18d4bc69f09f` |
| `participation-2019` | 48,034 | 21,146,293 | `ac9cf0b0d4658fe3` |
| `participation-2020` | 48,513 | 21,338,122 | `bac369225065bbc7` |
| `participation-2021` | 50,714 | 22,302,524 | `8a34ef0184647cc8` |
| `participation-2022` | 50,150 | 22,062,934 | `33c77f30fcd23b26` |
| `participation-2023` | 46,168 | 28,394,109 | `9a4644db629d4c7a` |
| `participation-2024` | 45,919 | 28,162,165 | `c3b8164691b0194f` |
| `participation-2025` | 45,184 | 27,835,609 | `18871d87ca888754` |
| `fourth-down` | 33,002 | 4,575,209 | `4a394829346b72e2` |

26 datasets, 1,061,511 rows total.
Datasets over the 90 MB ceiling: 0.
Datasets where disk rows differ from kept: 0.
Datasets carrying recorded refusals: 10 (`contracts`, `rosters-2018`, `rosters-2019`, `rosters-2020`, `rosters-2021`, `rosters-2022`, `rosters-2023`, `rosters-2024`, `rosters-2025`, `fourth-down`).

## Join report

Source: `data/gse-dataset/join-report.json`, a full pass over seasons 2018-2025.

| join | key | total | matched | rate |
|---|---|---:|---:|---:|
| snaps -> rosters | `pfr_player_id + season` | 205,355 | 135,808 | 0.6613 |
| contracts -> rosters | `gsis_id (no season on a contract, so multi-season players are ambiguous)` | 35,944 | 35,138 | 0.9776 |
| participation -> rosters | `gsis_id + season derived from the play game id` | 7,952,525 slots | 3,019,631 | 0.3797 |

**Identifier break.** nflverse changed the participation player identifier mid-range. 2023+ carries GSIS ids; earlier seasons carry a bare numeric id. The two spaces share no key, so earlier-season personnel CANNOT be joined to a roster at all.

GSIS-format slots 3,019,631, non-GSIS 4,932,894. Matched equals the GSIS count exactly, so every joinable slot joined and no unjoinable slot was quietly filled.
GSIS seasons: 2023, 2024, 2025. Non-GSIS seasons: 2018, 2019, 2020, 2021, 2022.

A roster-dependent measurement may only use the GSIS seasons. Building a crosswalk would mean inventing a join key, which is forbidden; the mapping is NOT on disk tonight.

## Scalarizer verdicts

LIVE parts: 8, from `data/reasoning/parts-registry.jsonl`.

Families recorded DARK in `data/reasoning/dark-candidates.jsonl`: coaching, narrative_contract, officials, weather_physics.

Each is DARK because honesty failed (f1), not because a cell was empty:

- **coaching** —  (16 recorded attempts).
- **narrative_contract** —  (16 recorded attempts).
- **officials** —  (16 recorded attempts).
- **weather_physics** —  (16 recorded attempts).

## Calibration

Source: `data/reasoning/calibration-holdout-2025.json`.

| quantity | value |
|---|---:|
| games scored (2025 holdout) | 285 |
| Brier, model | 0.223743 |
| Brier, always base rate | 0.249848 |
| Brier, always 0.5 | 0.250000 |
| log loss | 0.636548 |
| ECE (10 bins) | 0.051868 |
| Brier skill vs base rate | 0.026105 |
| 95% CI on that skill | [0.010734, 0.041393] |

Verdict: beats the base-rate benchmark on this holdout. The interval excludes zero, so this is not sampling noise.

Sample floor met: true. ECE ceiling met: true. `probabilityClaimsAllowed` is **false**.

probabilityClaimsAllowed stays false regardless of the numbers. This is a context model whose direction duplicates the LIVE historical_strength family, and the calibration page remains dark by policy.

## Decision-time price archive

Tests live in `packages/prediction-engine/src/__tests__/decision-time-price-archive.test.ts`. Accumulation only: a row records a price seen at a decision time, not that CLV can be settled. `priced` stays false on every result and the recorder cannot flip it.

## What stayed DARK

`officials`, `weather_physics`, `narrative_contract` and `coaching` are all DARK on honesty (f1). A named referee does not flip officials, a forecast does not flip weather, a contract file existing does not flip narrative, and nfl4th does not flip coaching. The flip is a new holdout that clears both bars.

## What was refused

- No push, on any branch.
- No public win rate, ROI, units, or hit-rate projection, and no calibration page.
- No widening of `SignalFamily`; it has eight members on purpose.
- No `from-bridge.ts` or `reasonAbout` created. Both already exist under `packages/ingestion-pipeline/src/reasoning-trace.ts`; the upstream prompt's claim that they do not is false.
- No `priced: true` anywhere.
- No invented rows, and no invented join key. The 2018-2022 participation ids were left unjoinable rather than crosswalked to a guess.
- No fitting on 2025. 2025 is the holdout.
- No loosening of `|r| >= 0.08`, `|slope| > se`, `minSampleCount` or `maxECE`.
