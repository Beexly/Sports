# Stream 15U: Causal Neutral-Script Pace, Play Volume & Penalty Discipline (2026-11-20)

## Scope & Cleared CC-BY-4.0 Data Sources
- **Play-by-Play:** `data/nflverse/pbp_2026_w1_w10.parquet` (`week >= 1`, strictly causal `week < as_of_week`).
  - Neutral-script pace filter: consecutive same-drive, same-quarter, same-offense scrimmage snaps (`pass` / `run`) in Q1–Q3 with `|score_differential| <= 7`, `half_seconds_remaining > 120`, and `3s <= dt <= 45s` (`6,485` neutral snaps).
- **2025 Play-Volume Prior:** `data/nflverse/stats_team_week_2025.parquet` (`attempts + carries` offensive and opponent plays per game).

## Walk-Forward OOS Evaluation (`eval_weeks = 4..10`, `n = 204` Team-Games)

| Component | Baseline MSE | Unshrunk Raw MSE | Stream 15U EB MSE | OOS Corr | Verdict |
|---|---:|---:|---:|---:|---|
| `neutral_pace` (`k_pace = 180` neutral snaps) | `13.728016` | `14.611296` | **`13.625350`** | `+0.083818` | **PROMOTED (`+0.20`)** |
| `off_play_volume` (`k_off = 8`, 2025 prior blend) | `67.128462` | `67.929603` | **`65.521425`** | `+0.156724` | **PROMOTED (`+0.25`)** |
| `team_penalty_rate` (`k_pen = 10` games) | `0.002969` | — | `0.003049` | `-0.052373` | **NULL HOLD (`0.0` weight)** |

## Simulator Wiring & Guards
- Wired strictly causally into `intelligence/coaching/__init__.py`, `scripts/ops/gse_coach_mind_simulator.py`, `scripts/ops/gse_connected_game_workflow.py`, `scripts/ops/verify_and_wire_all_layers_before_sim.py`, and `tests/verify_out_of_sample_calibration.py --enforce-gate`.
- `verify_and_wire_all_layers_before_sim.py` asserts swap symmetry across away/home pace, play-volume, and penalty-null conditioners, antisymmetry of `stream_15u_net_tempo_volume_diff`, and strict swap-invariance of `stream_15u_game_expected_plays_delta`.
- `team_penalty_rate` (`stream_15u_*_penalty_null_edge`) is held honestly at `0.0` simulator EPA weight.
