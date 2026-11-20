# Streams 15P–15X Joint Meta-Stacking, Collinearity Audit & Frozen Calibration Ablation (2026-11-20)

## Experimental Protocol
- **Dataset:** Cleared `data/nflverse/schedules_games_through_2026_w10.parquet`, 2026 `REG` Weeks 4–10 (`n = 102` total games, `101` non-tie decided games, strictly causal `as_of_week = week` feature extraction across all 9 Streams `15P..15X` excluding null/rejected sub-components).
- **Walk-Forward Stacking:** Strict expanding out-of-sample predictions for Weeks 5–10 (`n = 85` games, fitting L2-regularized Ridge weights `lambda = 45.0` exclusively on `week < eval_wk`) benchmarked through the immutable scorer `evaluation/frozen/score_walkforward_calibration_v1.py`.

## Top Multi-Stream Collinearity Pairs (`|r| >= 0.70`, Weeks 4–10)
- `15V_early_down` ↔ `15X_air_rush`: **`r = 0.8272`** (exposes ~68% shared team-strength variance — confirming why Ridge / Jacobian orthogonalization is mandatory to prevent naive double-counting).
- `15W_hfa_rest` ↔ `15X_air_rush`: `r = 0.8026`
- `15P_pos_vuln` ↔ `15X_air_rush`: `r = 0.7905`
- `15P_pos_vuln` ↔ `15T_rz_4th`: `r = 0.7197`
- `15T_rz_4th` ↔ `15V_early_down`: `r = 0.7154`
- `15V_early_down` ↔ `15W_hfa_rest`: `r = 0.7134`
- `15P_pos_vuln` ↔ `15W_hfa_rest`: `r = 0.7015`

*(Notably, `15Q_pressure`, `15R_kicker`, and `15U_pace_vol` stay `< 0.35` correlation across all pairs, delivering orthogonal variance.)*

## Walk-Forward Out-of-Sample Game Benchmarks (`Weeks 5–10`, `n = 85`)

| Model / Strategy | Brier | Log-Loss | ECE | Equal-Mass ECE | Composite Obj |
|---|---:|---:|---:|---:|---:|
| `coin_flip_050` | `0.250000` | `0.693147` | `0.088235` | `0.088235` | `0.467404` |
| `equal_weight_z_stack` (zero market) | **`0.226975`** | **`0.646426`** | `0.124396` | **`0.148761`** | `0.450780` |
| `ridge_orthogonal_stack` (zero market, `lambda=45`) | `0.229185` | `0.648013` | **`0.089825`** | `0.200726` | **`0.436101`** |
| `closing_market_devig` (ML close) | **`0.199401`** | **`0.588434`** | `0.144701` | **`0.177336`** | `0.418860` |
| `market_85_plus_ridge_15` | `0.201404` | `0.591550` | **`0.109770`** | `0.180367` | **`0.404176`** |

- **Honest Ablation Note:** Second-half (`Weeks 8–10`, `n = 43`) ACI (`ladder_4_aci_online`) achieved the lowest ECE (`0.118345` vs `0.129492` raw) on Ridge probabilities, while `ladder_0_raw` held lowest Brier (`0.199449`) on that 43-game slice. Neither raw statistical model alone beats closing-line Brier (`0.199401`), underscoring Stage 5 Closing-Line Anchor respect.
- **Baker-McHale Kelly Audit (`sigma_p = 0.045`, `max_stake = 0.05`):** Placed `33` micro-stakes (`0.0352` total staked, net `+0.0312` units), automatically damping low-sample estimation variance.

## Addendum: 11-Stream Extension (`15P–15Z`, Cycle F13)
- Extending the strict causal feature matrix with `15Y_box_chart` (`max |r| = 0.5521` vs prior streams) and `15Z_ol_half` (`max |r| = 0.6554`) lowered both standalone OOS zero-market model Brier (`equal_weight_z_stack`: `0.226975 -> 0.225365`, `ridge_orthogonal_stack`: `0.229185 -> 0.225715`, `log_loss`: `0.648013 -> 0.641596`) and the market-blended stack (`market_85_plus_ridge_15`: `0.201404 -> 0.201129`, `ECE`: `0.109770 -> 0.109297`, `Composite`: `0.404176 -> 0.403540`).
- Second-half (`Weeks 8–10`, `n = 43`) frozen ladder `ladder_0_raw` reached `Brier = 0.190796` (`Log-Loss = 0.566253`, `Composite = 0.384286`); Baker-McHale Kelly vs close placed `33` micro-stakes (`0.0286` staked, `+0.0228` net units).
