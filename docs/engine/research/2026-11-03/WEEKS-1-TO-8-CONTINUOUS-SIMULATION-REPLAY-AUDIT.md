# Weeks 1–8 Continuous Simulation Replay Audit

Generated: 2026-11-03T17:48:58+00:00 · seed `20261103`
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
| 2 | 11,224 | 0.211736 | 0.612738 | 0.024264 |
| 3 | 11,224 | 0.211735 | 0.612736 | 0.024363 |
| 4 | 11,224 | 0.211735 | 0.612735 | 0.024368 |
| 5 | 11,224 | 0.211734 | 0.612734 | 0.024371 |

Secondary — EPA ridge RMSE on the final held-out week: `1.376543`

## Determinism

expanding-window walk-forward, lbfgs solver, fixed seed; no stochastic step feeds reported metrics.
