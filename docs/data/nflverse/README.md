# NFL schedules plus derived columns, 2015-2025

`nfl-schedules-derived-2015-2025.csv` - 2,895 rows x 71 columns, regular and post season.

## Attribution (required)

Columns 1-46 are nflverse `load_schedules()` output, field for field.

> Data from **nflverse** (https://github.com/nflverse), licensed CC-BY 4.0.

This credit is a licence condition, not a courtesy. Any surface that publishes
figures derived from these columns carries it.

## What is verified, and what is not

**Verified.** Two rows were checked against real NFL history on 2026-09-18:

| game_id | date | result | total | matches reality |
|---|---|---|---|---|
| `2015_01_PIT_NE` | 2015-09-10 | PIT 21 at NE 28, margin 7 | 49 | yes |
| `2021_01_DAL_TB` | 2021-09-09 | DAL 29 at TB 31, margin 2 | 60 | yes |

The file carries zero cross-sport contamination: a grep for `Bellator|UFC|Orthodox|KO/TKO|ODI|T20|PGA|ATP|WTA` returns 0 hits.

**NOT verified.** Columns 47-71 are derived, and the audit that produced this
file marks them VERIFIED without naming a source FILE per column. "NFL home
injury data" is a description, not a source. Before anything trains on these,
each one needs its provenance named:

`qClose`, `home_win`, `rest_diff`, `home_hc_new`, `away_hc_new`, `home_alt`,
`away_road_streak`, `away_road2`, `cold_windy`, `home_qb_rev`, `away_qb_rev`,
`home_qb_rook`, `away_qb_rook`, `home_qb_backup`, `away_qb_backup`,
`h_out`, `h_doubt`, `h_q`, `h_np`, `a_out`, `a_doubt`, `a_q`, `a_np`,
`h_burden`, `a_burden`.

## What was removed alongside this file, and why

Two sibling CSVs on the source branch carried 62 further columns that were not
NFL data at all: combat-sport fighter reach and stance, cricket batting
averages and bowling economy, golf greens-in-regulation and driving distance,
tennis court surface and set scores. Every one of the 2,895 NFL rows carried
them. The 2015 Week 1 Steelers at Patriots row held an MMA stance, a Bellator
tag, a cricket ODI format, a PGA entry and a 2-0 tennis set score.

Those values were generated, not sourced, which rule 8 forbids anywhere in this
repository. They were removed rather than relabelled, because a fabricated
column that merely carries a warning is still a fabricated column, and the next
reader will not find the warning.

The source branch's own later audit reached the same conclusion independently
and produced this clean 71-column file. That self-correction is why this data
survived at all.
