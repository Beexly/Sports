# Stream 15X: Causal Differential Air-vs-YAC Pass Shrinkage & Rush Success Engine (2026-11-20)

## Scope & Cleared CC-BY-4.0 Data Sources
- **Play-by-Play:** `data/nflverse/pbp_2026_w1_w10.parquet` (`week >= 1`, strictly causal `week < as_of_week`).
  - Pass dropbacks (`pass_attempt == 1 and qb_scramble == 0`) decomposed into `air_epa` (`k_air = 4` games shrinkage) vs high-variance `yac_epa` (`k_yac = 14` games shrinkage).
  - Non-sack rushes (`rush_attempt == 1 and sack == 0`) evaluated via shrunk `epa` and `success` rate (`k = 8`).
- **2025 Efficiency Priors:** `data/nflverse/stats_team_week_2025.parquet` (passing & rushing EPA per attempt/carry).

## Walk-Forward OOS Evaluation (`eval_weeks = 4..10`, `n = 204` Team-Games)

| Family | League Baseline MSE | Unshrunk Raw MSE | Homogeneous EB MSE | Stream 15X Diff / Shrunk MSE | OOS Corr | Verdict |
|---|---:|---:|---:|---:|---:|---|
| Passing Air-vs-YAC Diff (`pass_air_yac_diff`) | `0.076217` | `0.077135` | `0.066523` | **`0.065206`** | `+0.377542` | **PROMOTED (`+0.30`)** |
| Rushing EPA / Success (`rush_eff_and_success`) | `0.029119` | `0.034999` | — | `0.028226` (EPA) / `0.028263` (SR) | `+0.163251` / `+0.228867` | **PROMOTED (`+0.20`)** |
| Raw Unshrunk Pass / YAC Residual (`yac_raw_null`) | — | `0.077135` | — | — | — | **NULL HOLD (`0.0` weight)** |

## Simulator Wiring & Guards
- Wired strictly causally into `intelligence/coaching/__init__.py`, `scripts/ops/gse_coach_mind_simulator.py`, `scripts/ops/gse_connected_game_workflow.py`, `scripts/ops/verify_and_wire_all_layers_before_sim.py`, and `tests/verify_out_of_sample_calibration.py --enforce-gate`.
- `stream_15x_away_yac_raw_null_edge` / `stream_15x_home_yac_raw_null_edge` stay strictly at `0.0` simulator EPA weight.
