# Unit 1 result: xFP / FPOE holdout KILL LINE = FAIL

Date measured: 2026-09-18
Worktree: C:\Users\Garrett\Sports-worktrees\mimo-xfp-2026-09-18
Branch: mimo/mimo-xfp-2026-09-18 @ f67631363
Preregistration: scripts/research/mimo-xfp/PREREGISTRATION.md (written before this run)
Artifact: scripts/research/mimo-xfp/results/unit1_holdout.json
Attribution: Data via nflverse (nflverse-data), CC BY 4.0.

## OBSERVATION (measured output, not estimated)

| Field | Value |
|---|---|
| n_pairs | 6022 |
| spearman_xfp | 0.210119 |
| spearman_naive (raw FP_t) | 0.226608 |
| delta_rho | -0.016489 |
| week-bootstrap 95% CI on delta_rho | [-0.039590, 0.008622] |
| rmse_xfp | 8.696999 |
| rmse_naive | 10.271886 |
| train | seasons 2009-2019 opportunity rates |
| holdout | seasons 2020-2025 |
| filter | >=8 opportunities in week t AND week t+1, consecutive weeks |
| bootstrap | 2000 reps over season-week clusters |
| scoring | standard PPR (nflverse fantasy_points_ppr preferred) |
| exit code | 2 |

## Verdict (binding, pre-registered)

FAIL: xFP does not beat naive raw FP on holdout Spearman.

rho(xFP) = 0.2101 < rho(raw FP) = 0.2266. Delta is negative and the week-bootstrap
CI includes 0. Per the kill line, the FPOE/xFP stack is NOT validated as better
than raw last-week fantasy points for next-week rank prediction.

This is a complete, publishable negative result at n=6022. It is worth more than
a fitted claim we cannot support.

## Secondary observation (NOT a pass)

RMSE favors xFP (8.70 vs 10.27). That is a different loss function. The
pre-registered primary metric was Spearman. We do not re-rank the kill line after
seeing RMSE. Record it; do not promote it.

## Program consequence

Unit 1 fails its acceptance. We do not publish buy/sell language from this
decomposition as if it were out-of-sample validated edge support.

Units 2 and 3 remain independent hypotheses and are allowed to run with their
own pre-registered kill lines. Unit 4 is blocked until Unit 3 returns a verdict.

## Reproduce

```powershell
$py = $env:MIMO_PYTHON
$wt = "C:\Users\Garrett\Sports-worktrees\mimo-xfp-2026-09-18"
$data = "C:\Users\Garrett\XiaomiMiMoProjects\.mimo-sessions\2026-09-18\mimo-xfp-data"
Set-Location $wt
& $py scripts/research/mimo-xfp/pull_data.py $data
& $py scripts/research/mimo-xfp/xfp_unit1.py $data scripts/research/mimo-xfp/results
# expect EXIT=2 and the JSON above
```
