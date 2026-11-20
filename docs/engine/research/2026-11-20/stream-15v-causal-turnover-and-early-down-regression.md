# Stream 15V: Causal Early-Down Clean Efficiency & Fumble-Luck Regression (2026-11-20)

## Scope & Cleared CC-BY-4.0 Data Sources
- **Play-by-Play:** `data/nflverse/pbp_2026_w1_w10.parquet` (`week >= 1`, strictly causal `week < as_of_week`).
  - Clean early-down slice: `down in {1, 2}`, non-turnover (`interception == 0 and fumble_lost == 0`), and non-garbage-time WP (`0.10 <= wp <= 0.90`).
- **2025 Structural Prior:** `data/nflverse/stats_team_week_2025.parquet` (`passing_epa + rushing_epa` per scrimmage attempt, blended into `k_eff = 140` shrinkage denominator).

## Walk-Forward OOS Evaluation (`eval_weeks = 4..10`, `n = 204` Team-Games Predicting Held-Out Team-Game EPA/Play)

| Component | OOS MSE | OOS Correlation | Verdict |
|---|---:|---:|---|
| League Mean Baseline | `0.030367` | — | Reference |
| Unshrunk Raw Team EPA | `0.029163` | — | Reference |
| Raw Total-EPA Empirical Bayes | `0.026280` | — | Reference |
| `ed_clean_epa` (early-down non-TO clean EPA + 2025 prior) | **`0.026124`** | **`+0.394687`** | **PROMOTED (`+0.35`)** |
| `ed_success_rate` (early-down non-TO success rate EB) | `0.028227` | `+0.327989` | **PROMOTED (`+0.15`)** |
| `fumble_luck_residual` (de-meaned fumble bounce variance) | `0.030157` | `+0.057443` | **NULL HOLD (`0.0` weight)** |

## Simulator Wiring & Guards
- Wired strictly causally into `intelligence/coaching/__init__.py`, `scripts/ops/gse_coach_mind_simulator.py`, `scripts/ops/gse_connected_game_workflow.py`, `scripts/ops/verify_and_wire_all_layers_before_sim.py`, and `tests/verify_out_of_sample_calibration.py --enforce-gate`.
- `fumble_luck_residual` (`stream_15v_*_fumble_luck_null_edge`) stays strictly at `0.0` weight in the trajectory simulator EPA sum.
