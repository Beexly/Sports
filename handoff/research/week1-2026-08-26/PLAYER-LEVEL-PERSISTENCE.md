# Player-level persistence of the two falsifier survivors

Session: `claude/gse-week1-launch-bh0nqo`, 2026-08-26.
Every number below was computed in this session from the committed artifact
`data/nflverse/ngs_receiving.csv.gz`. Nothing is inherited.

## Why this measurement was needed

The persistence table circulated in the Week-1 brief (`pfr-persistence-scan.md`)
reports Spearman r ≈ 0.900 for several receiving metrics. Those figures are
**season-level TEAM aggregates over 5 season pairs**. `modelProb` consumes
**player-level** signals, and player-level persistence had never been measured.
A Spearman of 0.9 at n=5 has an enormous confidence interval, so the table was
treated as a priority ordering only, exactly as the brief instructed.

## Source

- Asset: `ngs_receiving.csv.gz`, release tag `nextgen_stats`, repo
  `nflverse/nflverse-data`.
- Resolved URL (from repo code, not guessed — `nflverse-source.ts:26,87-95`
  gives base + tag + `file: (_s, v) => ngs_<v>.csv.gz`):
  `https://github.com/nflverse/nflverse-data/releases/download/nextgen_stats/ngs_receiving.csv.gz`
- Downloaded 2026-08-26, HTTP 200, 981,305 bytes.
- **Rows counted here: 14,731** data rows (+1 header). Seasons 2016–2025.
  season_type: REG 14,104 / POST 627.
- Licence: CC-BY-4.0 via nflverse redistribution (see `nflverse-ngs.ts` header).

## The three traps, measured rather than assumed

**Trap 1 — `week == 0` is the regular-season SUMMARY row.**
Counted: **1,251 of 14,731 rows (8.5%)** carry `week == 0`, spread evenly across
seasons (115–132 per season). Folding weekly and summary rows together
double-counts every player-season. Handled in `ngs-receiving-signals.ts`
(`isWeeklyRow` / `isSeasonSummaryRow`) and covered by a test that fails if a
summary row leaks into weekly aggregation.

**Trap 2 — `avg_separation` is already an average, so it needs a weight.**
Measured against NGS's own `week == 0` summary over **1,251 player-seasons**:

| aggregation | median abs err | p90 | mean abs err |
|---|---|---|---|
| target-weighted (correct) | 0.0673 | 0.3155 | **0.1195** |
| unweighted mean-of-means | 0.0885 | 0.3354 | 0.1407 |

Target-weighting reduces mean absolute error by **15.0%**. The weighting is
measurably right, not merely theoretically right.

**Trap 3 — NGS begins in 2016.** Pre-2016 is absent, not zero.
`aggregateSeasonSignals` throws `NgsSeasonRangeError` rather than letting a
coerced null contribute a zero.

## Join validation — PBP vs NGS `targets` (three-column check)

`targets` is independently derivable from play-by-play, so the join the whole
pipeline rests on can be validated for free. Derived per (player, week) from
`data/nflverse/pbp/play_by_play_2023.csv.gz` (49,665 plays, 2023 only:
REG 47,399 / POST 2,266) and compared against NGS 2023 REG weekly rows.

| column | value |
|---|---|
| NGS 2023 REG player-weeks (week > 0) | 1,295 |
| PBP 2023 REG player-weeks | 4,387 |
| joined on (`player_gsis_id`, `week`) | **1,295** |
| NGS rows that failed to join | **0** |
| exact `targets` match | 1,258 / 1,295 = **97.1%** |
| within ±1 | 1,295 / 1,295 = **100.0%** |
| mean delta (PBP − NGS) | **+0.0286** |
| delta distribution | `{0: 1258, +1: 37}` |

Zero NGS orphans means the player-ID join is exact. The delta is tight,
centred near zero, and **one-directional**: PBP sometimes counts a pass attempt
NGS does not charge as a target (laterals, spikes, penalty-negated plays), never
the reverse. That is the predicted signature of a correct join, not a broken one.
The 3,092 PBP-only rows are receivers below NGS's qualifying threshold.

## RESULT — player-level t → t+1 persistence (Spearman)

NGS REG season summaries, same player in consecutive seasons. **Nine season
pairs**, n = 76–89 players per pair.

| pair | n | `avg_separation` (S1) | `targets` (S2) |
|---|---|---|---|
| 2016→2017 | 85 | +0.603 | +0.582 |
| 2017→2018 | 76 | +0.545 | +0.415 |
| 2018→2019 | 81 | +0.530 | +0.367 |
| 2019→2020 | 88 | +0.532 | +0.437 |
| 2020→2021 | 89 | +0.572 | +0.496 |
| 2021→2022 | 84 | +0.632 | +0.554 |
| 2022→2023 | 83 | +0.556 | +0.676 |
| 2023→2024 | 85 | +0.600 | +0.439 |
| 2024→2025 | 89 | +0.720 | +0.569 |
| **mean** | | **+0.588** | **+0.504** |

**Both survivors persist at player level, and the sign is stable in all nine
pairs.** Neither is dropped.

### The magnitude correction that matters

Measured player-level persistence (**0.588 / 0.504**) is **materially lower**
than the 0.900 season-level team aggregates in the brief's table. The table's
*ordering* is corroborated — these metrics do persist — but its *magnitude* does
not carry to player level, which is the level `modelProb` actually consumes.
Anyone sizing a claim off 0.900 at player level would be overstating it by a
wide margin. Use 0.588 / 0.504.

## Secondary result — PBP-derived signals, within-season split-half

Computed before the NGS file was acquired, retained because it is an
independent corroboration from a different source. 2023 only, weeks 1–9 vs
10–18, so this is **split-half stability, NOT t → t+1**, and split-half is
generally an upper bound on year-over-year (same team, scheme and QB, no
offseason churn).

| min targets/half | n | `targets` | `adot` |
|---|---|---|---|
| 10 | 198 | +0.704 | +0.891 |
| 20 | 129 | +0.645 | +0.854 |
| 30 | 85 | +0.608 | +0.855 |

Spearman implementation validated against known answers before use: perfect
+1 → 1.0, perfect −1 → −1.0, textbook IQ/TV case → −0.175758 (expected
−0.175757), ties → 1.0.

## What is NOT claimed

- No edge. Persistence is not a market edge. `persistence-to-market.md` already
  settled that a *team-level* signal does not beat the *game-level* consensus
  spread. Whether a *player-level* signal beats a *prop* line is a different and
  still-open question — that is the priced test, and it is Q3's job.
- No calibration claim. `modelProb` is uncalibrated; nothing here licenses a
  published probability.
- `MISSING: pfr_advstats/*.csv`, `MISSING: ftn_charting_*.csv`,
  `MISSING: data/nflverse/games.csv`, `MISSING: play_by_play_2024.csv` — all
  four are named in the Week-1 brief's ground-truth block and are absent from
  every origin ref. Only 2023 play-by-play exists.
