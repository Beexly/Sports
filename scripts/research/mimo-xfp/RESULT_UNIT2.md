# Unit 2 result: catchable vs raw air yards = INCONCLUSIVE (not an edge)

Date measured: 2026-09-18
Preregistration: PREREGISTRATION_UNIT2.md (written before this run)
Artifact: results/unit2_holdout.json
Attribution: FTN Data via nflverse, CC BY-SA 4.0; nflverse CC BY 4.0.

## OBSERVATION (measured)

| Field | Value |
|---|---|
| n_holdout_pairs | 983 |
| spearman_catchable | 0.111301 |
| spearman_raw | 0.076337 |
| delta_rho | +0.034964 |
| week-bootstrap 95% CI | [-0.021572, 0.090841] |
| mae_catchable_map | 27.271998 |
| mae_raw_map | 27.404233 |
| train | 2022-2023 |
| holdout | 2024-2025 |
| population | WR/TE, targets >=4 both weeks, consecutive weeks |
| receiver-week air-yard rows | 18150 |
| train pairs | 1991 |
| bootstrap | 2000 season-week reps |
| exit code | 2 |

Join: ftn.nflverse_game_id + nflverse_play_id to pbp.game_id + play_id,
receiver_player_id. Catchable air yards = sum air_yards where FTN
is_catchable_ball is true. Raw = sum air_yards on all targets.

## Verdict (binding)

INCONCLUSIVE: point estimate favors catchable air yards, but the week-bootstrap
CI includes 0. Per the kill line this is NOT an edge. We do not claim that the
catchable split improves receiving-yard floor reads over raw air yards.

Secondary MAE slightly favors catchable (27.27 vs 27.40). Not the kill metric.

## Program consequence

Unit 2 does not graduate a validated input into Unit 1 (already FAIL) or into
props language. Unit 3 remains the decisive unit and still requires closing prop
lines to measure projection-gap vs closing-line error.

## Reproduce

```powershell
$py = $env:MIMO_PYTHON
$wt = "C:\Users\Garrett\Sports-worktrees\mimo-xfp-2026-09-18"
$data = "C:\Users\Garrett\XiaomiMiMoProjects\.mimo-sessions\2026-09-18\mimo-xfp-data"
Set-Location $wt
& $py scripts/research/mimo-xfp/pull_data_unit2.py $data
& $py scripts/research/mimo-xfp/unit2_air_yards.py $data scripts/research/mimo-xfp/results
```
