# Measured constants — derivation record

2026-10-28. Records the SPESE formula and its play count, and the QPTSR derivation and its
verification. Neither is re-derived from scratch; both are read out of the code that already
produces them.

## SPESE

**Derivation:** `artifacts/gap-metrics-derivation-2026-10-28.py`, the same script that produces TOR
and the SII cells. It is the existing derivation; nothing new was written.

**Steps, as implemented:**

1. Filter the 2026 pbp to special-teams play types. The filter is
   `ST_TYPES = ["punt", "field_goal", "kickoff", "extra_point"]`. `extra_point` was added during the
   metrics review; before that the count was 1,743 and extra points were excluded. They stay in.
2. Drop rows whose box is NaN. This is the derivation's existing null policy, unchanged.
3. Aggregate per team.

**The aggregation, verbatim from the script (line 69):**

```python
spese[team] = {"st_plays": int(len(g)), "epa_per_play": round(float(g["epa"].mean()), 4)}
```

A plain unweighted mean of the `epa` column over the filtered, non-NaN special-teams plays for that
team. No weights, no shrinkage, no opponent adjustment. The kernel receives the mean and the count
and does no further arithmetic beyond a finite check and a floor.

**The count:** 2,815 special-teams plays survive both filters. That is the denominator the per-team
means were computed over. It is a count, not a rate and not an expected-points number. It comes from
the 2026 pbp and the filter, not from FTN, not from PFR, not from PlayerProfiler.

**Re-run check:** if the derivation is re-run on the same pbp with the same filter and reports 2,815,
the input has not changed. A different number means the pbp or the filter moved and the difference is
to be recorded, not smoothed.

**Re-run result (2026-10-28):** the derivation was re-run from the committed script. It reported
**2,815 ST plays**, identical to the recorded count, and **zero of 32 teams differed** in emitted
`epa_per_play`. **SPESE derivation re-run matches bound constants; ST plays 2,815; no update
required.** The kernel binds no SPESE rate constant — it takes `stEpa` and `stPlays` as inputs and
applies only `SPESE_MIN_PLAYS = 10`, which is a floor, not a measurement.

### The count, decomposed

The 1,743 → 2,815 jump is **two changes, not one**. Both were verified by re-running the same
script with one variable moved at a time:

| pbp window | extra_point in filter | ST plays |
|---|---|---|
| weeks 1–5 | no | **1,743** |
| weeks 1–7 | no | 2,326 |
| weeks 1–7 | yes | **2,815** |

- 1,743 is the pre-extra_point count **on the weeks 1–5 pbp**. It reproduces exactly on that window.
- The pbp was later refreshed to weeks 1–7, which alone takes the same filter from 1,743 to 2,326.
- Adding `extra_point` takes it from 2,326 to 2,815 — a difference of 489, against 495 extra_point
  plays in the pbp, the other 6 dropping on the NaN box.

So the brief's before/after pair spans a window change as well as the filter change. The filter
change is the real one and it is in place; the window change is separate and also real.

**Filter, verbatim:** `ST_TYPES = ["punt", "field_goal", "kickoff", "extra_point"]`. `extra_point`
is present. **NaN boxes are dropped** at line 31, before the filter. **Path read:**
`intelligence/coaching/data/play_by_play_2026.parquet` joined to
`intelligence/coaching/data/pbp_participation_2026_reconstructed.parquet` on
`nflverse_game_id` + `play_id`. SPESE reads no FTN column.

### Constants the derivation emits

Per-team `epa_per_play` over the filtered, non-NaN ST set, as emitted on the current pbp. These are the values the kernel receives; none is bound as a constant.

| Team | ST plays | epa_per_play |
|---|---|---|
| ARI | 106 | 0.0092 |
| ATL | 91 | -0.0661 |
| BAL | 98 | 0.0928 |
| BUF | 79 | 0.2849 |
| CAR | 82 | 0.0688 |
| CHI | 85 | 0.1878 |
| CIN | 80 | 0.2323 |
| CLE | 99 | 0.1111 |
| DAL | 73 | 0.0389 |
| DEN | 96 | 0.1 |
| DET | 86 | 0.1682 |
| GB | 88 | -0.0239 |
| HOU | 100 | 0.1446 |
| IND | 95 | 0.2492 |
| JAX | 74 | 0.274 |
| KC | 76 | 0.0392 |
| LA | 89 | -0.1175 |
| LAC | 80 | -0.0429 |
| LV | 97 | 0.0474 |
| MIA | 73 | -0.0561 |
| MIN | 76 | 0.2624 |
| NE | 85 | 0.0511 |
| NO | 97 | -0.0674 |
| NYG | 91 | 0.0559 |
| NYJ | 89 | 0.0772 |
| PHI | 81 | 0.2295 |
| PIT | 99 | 0.1628 |
| SEA | 88 | 0.3786 |
| SF | 89 | 0.1484 |
| TB | 97 | 0.2153 |
| TEN | 87 | 0.0314 |
| WAS | 89 | 0.1039 |

**Caveat that stands:** raw nflverse `epa` does not share a sign convention across punt, kickoff and
field goal (punt −0.0317, kickoff +0.2306, field goal +0.2237). The per-team number ranks teams; it
does not sum into a scoreline.

## QPTSR

**Derivation:** `packages/prediction-engine/src/nfl/pressure-timing.ts`. The derivation is the
bucket counts recorded in that file's header; the constants are bound in the same file.

**It is not derived from the 2026 pbp.** It is fitted on BDB 2023–2025 tracking: 3,644 pressured
plays, 435 sacks. The brief assumed the 2026 pbp; the file says otherwise and the file is the
derivation.

**Filter:** pressured plays with a measured time-to-pressure, bucketed at <2.0 s, 2.0–2.4, 2.5–2.9,
3.0 s+.

**Aggregation:** conversion rate per bucket, sacks over pressures, base 11.9%.

**Verification — re-derived the rates from the recorded counts:**

| Bucket | Count | Rate | Bound | Match |
|---|---|---|---|---|
| immediate | 56/355 | 0.1577 | 0.158 | yes |
| fast | 104/858 | 0.1212 | 0.121 | yes |
| mid | 97/961 | 0.1009 | 0.101 | yes |
| late | 178/1470 | 0.1211 | 0.121 | yes |

Counts sum to exactly 3,644, matching the header. **QPTSR derivation re-run matches bound constants;
no update required.** The FTN swap does not touch it — QPTSR reads no FTN column.

## Constants currently bound

| Constant | Value | Source |
|---|---|---|
| `CONVERSION_BY_BUCKET` | 0.158 / 0.121 / 0.101 / 0.121 | pressure-timing.ts, BDB 2023–2025 |
| `PRESSURE_WEIGHT` | 1.56 / 1.2 / 1.0 / 1.2 | same, mid as reference 1.0 |
| `BASE_CONVERSION` | 0.119 | same |
| `FINISH_STABILITY_R` | 0.236 | same, split-half across 32 defences |
| `TOR_LEAGUE_LOST_RATE` | 0.4603 | pooled, 252 fumbles, weeks 1–7 |
| `SPESE_MIN_PLAYS` | 10 | floor, not a measurement |
| `SII_MOTION_MARGINAL_EPA` | −0.0021 | weeks 1–7, re-derived this pass |
| `SII_STACKED_BOX_MOTION_GAP` | −0.2 | prior-season replication, 2024 −0.199 / 2025 −0.212 |

`PROB_PER_POINT = 0.033` lives in `constants.ts` as the single shared binding and is not re-declared
in any kernel.
