# Stream 15T: Causal Red-Zone Compression & 4th-Down Efficiency Engine (2026-11-20)

## Scope & Cleared CC-BY-4.0 Data Sources
- **Play-by-Play:** `data/nflverse/pbp_2026_w1_w10.parquet` (`week < as_of_week` strictly causal slicing; 2,913 red-zone scrimmage plays across 975 red-zone drives; 2,155 classified 4th-down decisions; 427 4th-down go plays).
- **Historical 4th-Down Prior:** `data/nflverse/hf_4th_downs_1999_2025_zone1.parquet` (`season >= 2023`, 2024–2025 situational go-for-it cells `(ydstogo_bin, yardline_bin, trailing)` and 2023–2025 conversion distance cells `ydstogo_bin`).
- **2025 Team Efficiency Prior:** `data/nflverse/stats_team_week_2025.parquet` (full-play offensive and defensive EPA per snap prior, shrunk with `k = 140` plays).

## Walk-Forward OOS Evaluation (`eval_weeks = 4..10`)

| Component | Sample Size | Cell Baseline Brier | Candidate Brier | Cell Baseline Log-Loss | Candidate Log-Loss | Verdict |
|---|---:|---:|---:|---:|---:|---|
| `rz_only_unregularized` (naive RZ residual) | 655 drives | `0.238723` | `0.238961` | — | — | **NULL HOLD (`0.0` weight)** |
| `rz_td_full_prior` (full-play EPA + `k=80` RZ residual) | 655 drives | `0.238723` | `0.237168` | `0.670352` | `0.667870` | **PROMOTED (`+0.35`)** |
| `fourth_down_go_aggression` (situational cell + `k=50` EB) | 1,508 plays | `0.103641` | `0.102733` | `0.331239` | `0.328492` | **OOS-VALIDATED (logged in conditioners)** |
| `fourth_down_conversion` (`ydstogo` prior + `k=45` off/def EB) | 312 go plays | `0.220319` | `0.219431` | `0.631953` | `0.630422` | **PROMOTED (`+0.25`)** |

## Structural Lesson & Simulator Wiring
- Consistent with NFL empirical literature on red-zone scoring regression to the mean, an offense/defense's ~30–40 red-zone trips within half a season carry high execution noise (`0.238961 > 0.238723` when used raw/unregularized standalone), whereas full-play offensive/defensive EPA shrunk at `k=140` snaps combined with heavily shrunk (`k=80`) red-zone residuals strictly improves both OOS Brier (`-0.001555`) and Log-Loss (`-0.002482`).
- Wired strictly causally into `scripts/ops/gse_coach_mind_simulator.py`, `scripts/ops/gse_connected_game_workflow.py`, `scripts/ops/verify_and_wire_all_layers_before_sim.py` (swap symmetry & antisymmetry checked), and `tests/verify_out_of_sample_calibration.py --enforce-gate`.
- `stream_15t_away_rz_only_null_edge` / `stream_15t_home_rz_only_null_edge` are explicitly held at `0.0` weight in the simulator EPA loop.
