# CPOE High-Total Cell — Reopen Condition

**Pre-registered cell:** CPOE (all plays) in high-total games (closing total > 46.0)
**Original:** n=266, slope +0.138, t=2.02, p=0.043 (did not survive Holm/Bonferroni across 16 cells)
**This re-test:** single pre-registered hypothesis → no multiple-testing correction → paired t ≥ 1.96 to pass

## Why refused today

The frozen manifest (`dfs/nfl_rvc_manifest.json`) contains 855 games across 2023–2025. Zero 2026 rows.
`dfs/team_week_ats_2026.csv` has 131 rows (weeks 1–4) but no `total_line` and no `cpoe` columns.
No 2026 CPOE file exists anywhere on the branch (code search: 0 hits).

Without closing totals, the high-total tercile cannot be defined. Without CPOE, there is no predictor. The test cannot be run honestly.

## Exact reopen steps

1. **2026 closing totals (weeks 1–4):** extend the frozen manifest or pull from a close archive. Needed to apply the 46.0 cutpoint.
2. **2026 team-game CPOE (weeks 1–4):** compute from nflfastR pbp using the identical definition as `dfs/expected_metric_conditional_rvc/em_conditional_rvc.py`.
3. **2026 next-week ATS (weeks 2–5):** extend `dfs/team_week_ats_2026.csv` with week 5 outcomes after today's games.
4. Join 1+2+3 → filter total_line > 46.0 → OLS next_week_ATS_residual ~ CPOE → paired t.
5. Stamp: PASS if |t| ≥ 1.96, else REFUSE.

## Earliest possible

2026-10-12 (after Week 5 completes). The data joins are the work; the test itself is 20 lines.
