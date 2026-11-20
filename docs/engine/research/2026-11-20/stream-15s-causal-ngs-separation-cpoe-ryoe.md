# Stream 15S: Causal Next Gen Stats (NGS) CPOE, RYOE & Separation/YACOE (`2026-11-20`)

## 1. Architecture & Strict Causality
- Built cleanly over cleared CC-BY-4.0 nflverse Next Gen Stats parquets (`ngs_passing_2025_2026_w1_w10.parquet` 866 rows, `ngs_receiving_2025_2026_w1_w10.parquet` 1,970 rows, `ngs_rushing_2025_2026_w1_w10.parquet` 896 rows; `week >= 1` verified with zero `week=0` summary leakage).
- Combines decayed 2025 seasonal priors (`0.35`) with strictly `week < as_of_week` 2026 opportunity-weighted Empirical-Bayes estimates:
  - Passing: CPOE (`K0 = 180` attempts) + time-to-throw discipline.
  - Rushing: RYOE/att + efficiency (`K0 = 55` player / `130` team carries).
  - Receiving: Separation + YACOE (`K0 = 36` player / `120` team targets).

## 2. Observed Walk-Forward OOS Results (`eval_weeks = 4..10`, Predicting `stats_player_week_2026` EPA/Opp)
| Family | `n` | Baseline Mean wMSE | Unshrunk Raw wMSE | Stream 15S EB+NGS wMSE | OOS `r` | Verdict & Simulator Weight |
|---|---:|---:|---:|---:|---:|---|
| **QB `pass_cpoe`** | 207 | `0.073151` | `0.073745` | **`0.065867`** | `+0.323472` | **PROMOTED** (`+0.35` logit weight; beats baseline & raw) |
| **RB `rush_ryoe`** | 343 | `0.049399` | `0.057173` | **`0.048352`** | `+0.142419` | **PROMOTED** (`+0.30` logit weight; beats baseline & raw) |
| **WR/TE `rec_sep_yacoe`** | 973 | `0.351432` | `0.459736` | `0.355064` | `-0.005399` | **NULL / HOLD (`0.0` weight)** — logged in conditioners only |
