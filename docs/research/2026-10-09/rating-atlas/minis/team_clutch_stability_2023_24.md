# Team Clutch Stability — EQ-3 must-score, 2023 vs 2024

**Spec:** EQ-3 `mustscore_v1` from `invented_equations_stdlib.py`. Must-score = Q4,
trailing 8–16 pts (`score_differential` in [-16,-8]). Metric per team =
mean(EPA | must-score run/pass) − mean(EPA | baseline run/pass). Gates:
n_must ≥ 20, n_base ≥ 100. REG season only. nflverse pbp, computed 2026-10-10.

## League-level (replicates Batch-17 null)

| year | teams | league mean delta | se | t |
|------|-------|-------------------|----|---|
| 2023 | 29 | −0.006 | 0.044 | −0.14 |
| 2024 | 28 | +0.038 | 0.051 | +0.75 |

League-wide clutch delta ≈ 0 in both full seasons. The market prices clutch. Confirmed.

## Team-level dispersion (2023 / 2024)

2023 top: BUF +0.53 (n=35), NE +0.47 (n=86), DEN +0.45 (n=93).
2023 bottom: SF −0.27, SEA −0.37, PIT −0.38.
2024 top: NYG +0.54 (n=94), GB +0.39 (n=31), DET +0.37 (n=21).
2024 bottom: CLE −0.24, LAC −0.55, ATL −0.68.

Note the turnover: 2023's top-3 (BUF/NE/DEN) are nowhere near 2024's top-3
(NYG/GB/DET). BUF didn't even qualify in 2024 (<20 must-score plays —
they were rarely trailing by 8–16 in Q4, which is goodness, not clutch).

## Stability stamp: year-over-year correlation

| pair | n teams | Pearson r | t |
|------|---------|-----------|---|
| 2023 → 2024 | 26 | **+0.066** | +0.33 |

**r = +0.066 is noise.** Teams with large positive clutch deltas in 2023 show
no tendency to repeat in 2024. The enormous team dispersion Batch-17 measured
in 2026 (BUF +0.28 → IND −0.75) is a single-season artifact, not a stable
behavioral identity.

## Verdict: UNSTABLE — stays diagnostic

Team clutch delta does not persist year-over-year (r=+0.07, t=+0.33, n=26).
It does not meet the bar for registry promotion. The "behavioral-identity"
hypothesis is refused by the stability stamp: what looks like identity in one
season is variance across seasons.

Reopen condition: r ≥ +0.40 with t ≥ +2.0 on two consecutive YoY pairs
(e.g., 2024→2025 and 2025→2026 full seasons), minimum n=20 qualifying teams
per year. Until then, team-level clutch stays out of the margin head.

## Files

- `team_clutch_stability.csv` — per-team [clutch_2023, n_2023, clutch_2024,
  n_2024, clutch_2026 (Batch-17, partial), yoy_r]
- Method: exact EQ-3 spec, nflverse `pbp` release CSVs, no pandas
