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
