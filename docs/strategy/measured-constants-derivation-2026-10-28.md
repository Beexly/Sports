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
