# Weeks 1–8 Continuous Simulation Replay Audit

Generated: 2026-11-03T16:36:45+00:00 · seed `20261103`
Source: `C:\c\wt-week8-forensic\intelligence\coaching\data\play_by_play_2026.parquet` (13,131 plays)
Weeks available: [1, 2, 3, 4, 5, 6, 7]

## Coverage caveat

Week 8 play-by-play is **not** in the source parquet. This run does not fabricate
week-8 rows — the replay covers weeks 1–7 and the gap is reported rather than
papered over. Extend with `--week8-rows` once real week-8 PBP is on disk.

## Epoch-by-epoch calibration (P(pass), expanding window)

| Epoch | Plays graded | Brier | Log-Loss | ECE |
|---|---|---|---|---|
| 1 | 11,224 | 0.212546 | 0.614978 | 0.031889 |
| 2 | 11,224 | 0.211515 | 0.612204 | 0.022971 |
| 3 | 11,224 | 0.211362 | 0.611843 | 0.022344 |
| 4 | 11,224 | 0.211302 | 0.611702 | 0.023347 |
| 5 | 11,224 | 0.211270 | 0.611627 | 0.023519 |

Secondary — EPA ridge RMSE on the final held-out week: `1.376584`

## Determinism

expanding-window walk-forward, lbfgs solver, fixed seed; no stochastic step feeds reported metrics.
