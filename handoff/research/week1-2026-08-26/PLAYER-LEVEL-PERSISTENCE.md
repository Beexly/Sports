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
- **Attribution (required):** Data from nflverse (https://github.com/nflverse), CC-BY-4.0.
- **Clearance, on the record:** `checkClearance()` run 2026-08-26 —
  `nflverse` **allowed=true** (attribution warning only). The direct site
  `nextgenstats.nfl.com` returns **allowed=false / SOURCE_NOT_REGISTERED**, as do
  `pro-football-reference.com` and `predictions.draftkings.com`. Nothing was
  scraped; this is the licensed mirror the registry already prescribes, and it
  carries ten seasons / nine t→t+1 pairs versus the direct site's eight/seven.
  Memo: `reports/rights/2026-08-26-scraped-sources-clearance-memo.md`.

## Population bound — NGS is threshold-filtered

NGS publishes a weekly row only for player-weeks clearing a volume threshold.
Measured: the minimum weekly `targets` value in the entire file is **5**, and
there are **no zero-target rows**. Two consequences, both stated rather than
discovered later:

1. The league baseline (μ, σ) is that of **qualified** receivers, not the league.
   `modelProb` is scoped to the qualified population accordingly. This is close
   to aligned with the spec — sub-threshold players are exactly where
   `n < minimum_n` should return `null` — but it is a real distributional bound.
2. It is also why the "15% weighting improvement" was wrong: for 93.2% of
   player-seasons the weekly rows do not sum to the season total, so both
   reconstructions carried the same missing-week error. See the corrected
   trap-2 table above.

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

Target-weighting reduces mean absolute error by **15.0%** across all 1,251.

**CORRECTED after adversarial recompute — 15.0% understates it.** NGS emits a
weekly row only for weeks a player cleared a threshold (minimum weekly targets
observed = 5; no zero-target weekly rows exist), so for 93.2% of player-seasons
the weekly rows do not sum to the season total and BOTH reconstructions carry
the same missing-week error. On the **85 player-seasons (6.8%) whose weekly rows
actually do sum to the summary**, target-weighting is **exact**:

| aggregation | mean abs err (n=85) |
|---|---|
| target-weighted | **0.00017** (float rounding) |
| unweighted mean-of-means | 0.0523 |
| reduction | **99.68%** |

So NGS's week-0 summary IS the target-weighted mean. The trap is real and the
handling is right; the original 15% figure was measuring missing weeks, not
weighting.

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
pairs.** Neither is dropped. Independently recomputed by an adversarial red team
from the raw gz with no shared code path: +0.5878 / +0.5038, every pair matching
to 4 decimal places. Robustness checks it ran that failed to break the result:
tie handling (targets is 89.1% tied; ordinal vs midrank moves the mean 0.0018),
position confound (WR-only: sep +0.5739, targets +0.5146, so not a WR-vs-TE
artifact), and Fisher-z vs arithmetic averaging (immaterial).

**BOUND THIS NUMBER — it describes a survivor subpopulation, not receivers.**
Season-*t* qualifiers are joined to season *t+1* only when the player is ALSO in
NGS's qualified set that year; 32.8% are not (760 of 1,131 survive). Adding back
the 197 dropouts who do have *t+1* weekly data:

| population | avg_separation | targets |
|---|---|---|
| qualified-survivor join (reported above) | **+0.588** (n 76-89) | +0.504 |
| survivorship-corrected | **+0.512** (n 101-114) | +0.541 |
| unfiltered weekly population | **+0.427** (n 136-153) | — |

Persistence is real at every level, but it decays as the population widens. Use
+0.512 for a corrected player-level figure and +0.427 for the full receiver
population — not +0.588, which is the most flattering of the three.

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
