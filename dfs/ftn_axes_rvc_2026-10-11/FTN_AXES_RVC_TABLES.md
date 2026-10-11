# FTN Pressure/Coverage Axes — Residual-vs-Close Tables

**Date:** 2026-10-11T12:43:04Z
**Branch:** `research/rating-atlas-2026-10-09-packet`
**Data:** `dfs/eq_harvest/raw/nflverse-data/ftn_charting_2026.parquet` (10,996 plays × 29 cols)
**Manifest:** `dfs/team_week_ats_2026.csv` (130 team-weeks, frozen)
**Label:** DIAGNOSTIC — nothing promoted.

## Method

For each of 13 FTN pressure/coverage axes, aggregated to team-week:
1. Pearson r to **next-week ATS residual** (n=98 pairs)
2. Week-to-week **persistence** of the axis itself
3. **Held-out tercile test**: fit cell means on odd weeks, evaluate on even weeks vs naive (close-only MSE)
4. **2000× bootstrap CI** on the MSE delta

**CANDIDATE** requires bootstrap CI95 entirely above 0 AND positive delta. Otherwise **REFUSE**.

## Results: All 13 Axes REFUSE

| Axis | r→next ATS | Persistence | ΔMSE | CI95 | Verdict |
|------|-----------|-------------|------|------|---------|
| blitz_mean | +0.1976 | +0.1786 | +0.48 | [-20.76, +20.24] | REFUSE |
| blitz_rate | +0.1886 | +0.1599 | -5.32 | [-16.19, +4.81] | REFUSE |
| rushers_mean | +0.0110 | +0.0435 | -1.12 | [-3.56, +1.27] | REFUSE |
| box_mean | +0.2321 | -0.0549 | +8.39 | [-2.87, +20.65] | REFUSE |
| catchable_rate | -0.0965 | -0.0728 | -9.33 | [-32.64, +13.87] | REFUSE |
| contested_rate | -0.1172 | +0.0083 | -7.89 | [-28.91, +14.77] | REFUSE |
| pa_rate | +0.1435 | +0.0773 | -1.81 | [-18.33, +13.72] | REFUSE |
| screen_rate | +0.0050 | +0.1163 | -5.03 | [-14.83, +4.67] | REFUSE |
| rpo_rate | -0.1418 | +0.2053 | +4.57 | [-5.26, +14.44] | REFUSE |
| oop_rate | -0.0224 | +0.1324 | -3.40 | [-26.87, +22.11] | REFUSE |
| throwaway_rate | -0.0134 | +0.0014 | +1.90 | [-13.38, +18.27] | REFUSE |
| int_worthy_rate | +0.2817 | +0.0563 | +28.67 | [-0.01, +58.16] | REFUSE |
| drop_rate | -0.0347 | +0.0155 | -7.05 | [-19.06, +4.76] | REFUSE |

## Closest Call

**int_worthy_rate** (interception-worthy throw rate):
- Correlation to next-week ATS: +0.2817 (highest of all axes)
- Held-out ΔMSE: +28.67 (helps)
- Bootstrap CI95: [-0.01, +58.16] — **lower bound contains zero**
- Verdict: REFUSE (not significant)

## Notable Refusals

- **box_mean**: highest correlation (+0.2321) but persistence is **-0.0549** — teams facing heavy boxes one week don't face them the next. The signal doesn't persist, so it can't predict.
- **catchable_rate**: negative correlation (-0.0965), **hurts** held-out MSE by -9.33. Higher catchable-throw rate predicts *worse* next-week ATS.
- **contested_rate**: negative correlation (-0.1172), hurts held-out MSE by -7.89.
- **blitz_mean**: CI [-20.76, +20.24] — far too wide to conclude anything at n=98.

## Accumulating Lesson (6th Confirmation)

Raw situational edges shrink against the close. FTN pressure/coverage axes — even with 10,996 plays of charting data — do not predict next-week ATS better than the closing spread alone. The remaining edge lives in conditional cells, tail shapes, and player-resolution.

## Reopen Conditions

1. **Larger sample**: 98 pairs is thin for 13 axes. Re-test at 200+ pairs (full 2026 season).
2. **Player-level join**: team-week aggregation may wash out QB-specific pressure effects. Re-test at QB-week granularity when the NGS/FTN/PFR name mapping is built.
3. **int_worthy_rate solo**: re-test as a pre-registered single axis (not 1-of-13) to avoid the multiple-testing penalty. The +0.2817 correlation deserves one clean shot.
4. **Prop closes**: test axes against completion/catchable-throw prop closes instead of ATS, if prop close snapshots become available on a frozen manifest.

## Provenance

- Every number traces to `ftn_charting_2026.parquet` (SHA 9c732ae25377) or `team_week_ats_2026.csv`.
- Script: `dfs/ftn_axes_rvc_2026-10-11/ftn_axes_rvc.py` (this directory)
- Raw results: `ftn_axes_rvc_raw.json`
- Stamp: `FTN_AXES_RVC_STAMP.json`
- Zero fabrication. Nothing promoted. All DIAGNOSTIC.
