# PFR Advanced-Stats Persistence Scan (2018-2023)
Source: `data/nflverse/pfr_advstats/*.csv.gz`. Gate: minimum attempts/targets/carries per season (see config). Correlation ≠ predictive edge.
Method: season-level mean aggregated; Spearman r between t and t+1 aligned by season shift.

## Results

| Metric | Key | Years | Pairs | Spearman r | Stable (r>0.5 + n>=4) |
|---|---|---|---|---|---|
| REC ybc_r | ybc_r | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | 0.900 | YES |
| REC adot | adot | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | 0.900 | YES |
| Rush yac_att | yac_att | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | 0.900 | YES |
| Def yds_tgt | yds_tgt | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | 0.700 | YES |
| Def cmp_percent | cmp_percent | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | 0.100 | No |
| Rush ybc_att | ybc_att | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | -0.100 | No |
| Pass bad_throw_pct | bad_throw_pct | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | -0.300 | No |
| REC yac_r | yac_r | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | -0.300 | No |
| Pass pocket_time | pocket_time | 2018, 2019, 2020, 2021, 2022, 2023 | 5 | -0.500 | No |

## Interpretation / Falsifier Priority
Stable metrics (r>0.5, meaningful n) are candidates for future covariate binds. Unstable metrics suggest low year-to-year persistence and may not reward falsifier runs.
Disclaimer repeated: correlation ≠ predictive edge; descriptive persistence only.

## QBR Team Persistence & Margin Correlation (ESPN qbr_week_level.csv, REG only, 2018+)

Method: scripts/ops/build-qbr-harness.py produces data/nflverse/qbr_harness_rows.jsonl (team-week QBR, 4269 rows, REG only, season>=2018). Year-over-year TEAM persistence: mean season QBR t vs t+1 aligned by season shift; same-season QBR vs point-margin uses pbp score_differential_post averaged per team-season.

Results (correlation disclaimers MANDATORY):
- QBR persistence Spearman ρ = 0.3736, Pearson r = 0.3792 (223 pair shifts, 2019-2024).
- QBR vs point-margin: Pearson r = 0.7829, Spearman ρ = 0.7692 (n=90 pairs). Strong descriptive association; no predictive-edge claim.
- Caveats: REG only; ESPN proprietary metric; team-level aggregation only; no cross-vendor validation; correlation ≠ predictive edge; SCAN ONLY.
