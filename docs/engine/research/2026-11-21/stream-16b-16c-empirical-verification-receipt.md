# Streams 16B & 16C + GSI ADR-0003 Empirical Verification Receipt (`2026-11-21`)

All metrics below were measured out-of-sample on `feat/overnight-goal-2026-11-21` using strictly causal `week < as_of_week` (`2026` REG Weeks `4–10`) cleared CC-BY-4.0 `nflverse` play-by-play parquets (`2024`, `2025`, `2026`). `data/engine/sources/pfr_2026_punting.csv` (`32` teams) was used solely for read-only alignment audit and never leaked into walk-forward evaluation.

---

## 1. Stream 16B: Prior-Play Sequencing, Opponent-Adjusted Ridge Bradley–Terry & Punting (`evaluate_causal_16b_walkforward_oos`)
- **Causal Dropback EPA Disruption Weight (`2024+2025`):** `beta_hit = -0.4945`, `beta_sack = -1.9717` $\implies$ `w_hit = 0.2508` (`arXiv:2604.01491v2` Eq. 3–4 adaptation).
- **Unit-Matchup Ridge Bradley–Terry (`lam = 150.0`):** Jointly solves 64 centered OL pass-protection and DL rush-disruption parameters per week across prior + causal 2026 dropbacks (`n = 204` team matchups): **`base MSE = 0.002522 -> BT MSE = 0.002248` (`oos_corr = +0.3300`)** — beating both raw offense (`r = 0.2441`) and raw defense (`r = 0.1263`) unadjusted disruption rates.

| Component | `n` | Prior / `k` | Baseline MSE | Raw MSE | EB / BT MSE | OOS `r` | Status & Prod Weight |
|---|---:|---|---:|---:|---:|---:|---|
| `off_2nd10_pass_after_inc` | 198 | `0.45 / 12` | `0.118276` | `0.138195` | **`0.114804`** | `+0.1612` | **PROMOTED (`1.0`)** |
| `off_behind_los_share` | 204 | `0.45 / 6` | `0.006754` | `0.006539` | **`0.005920`** | `+0.3462` | **PROMOTED (`1.0`)** |
| `def_behind_los_allowed` | 204 | `0.45 / 6` | `0.006754` | `0.007310` | **`0.006484`** | `+0.1908` | **PROMOTED (`1.0`)** |
| `off_clean_pocket_epa` | 204 | `0.25 / 6` | `0.079180` | `0.079719` | **`0.074681`** | `+0.2456` | **PROMOTED (`1.0`)** |
| `def_clean_pocket_epa` | 204 | `0.45 / 6` | `0.079180` | `0.081452` | **`0.075990`** | `+0.2119` | **PROMOTED (`1.0`)** |
| `trench_bt_disruption` | 204 | `lam = 150` | `0.002522` | — | **`0.002248`** | **`+0.3300`** | **PROMOTED (`1.0`)** |
| `def_punt_ret_epa` | 202 | `0.45 / 12` | `0.213640` | `0.268399` | **`0.210836`** | `+0.1171` | **PROMOTED (`1.0`)** |
| `off_punt_epa` | 202 | `0.45 / 12` | `0.213640` | `0.255444` | `0.213845` | `+0.0829` | **NULL HOLD (`0.0`)** |
| `off_2nd10_pass_after_run` | 111 | `0.45 / 35` | `0.140045` | `0.191035` | `0.141927` | `+0.0308` | **NULL HOLD (`0.0`)** |
| `off_punt_net_yds` | 202 | `0.45 / 35` | `36.428429` | `41.968630` | `36.904915` | `+0.0070` | **NULL HOLD (`0.0`)** |
| `off_punt_in20_rate` | 202 | `0.45 / 35` | `0.083652` | `0.096687` | `0.083043` | `+0.0459` | **NULL HOLD (`0.0`)** |

- **All Promoted Beat Baseline Gate:** `True` (`7/7` promoted beat baseline; `4/4` null holds enforced strictly at `production_weight = 0.0`).
- **Pre-Sim Swap & Antisymmetry Gate:** `verify_and_wire_all_layers_before_sim.py` **PASS** (`max_wk = 10`, `keys = 142`, `swap_sym = True`, `sims = 0`).

---

## 2. 13-Stream (`15P..16B`) Joint Orthogonal Stacking & Frozen Ablation (`Weeks 5–10`, `n = 85`)
- **Stream `16B` Collinearity:** Orthogonal to primary efficiency stack (`max |r|` with `15Q_pressure = 0.6211`, `15Z_ol_half = 0.4916` vs `15V↔15X = 0.8272`).
- **OOS Benchmark Gains (13-stream vs 12-stream `16A`):**
  - `ridge_orthogonal_stack`: `Brier = 0.225275`, **`LogLoss = 0.641108`** (vs `0.642293` in 12-stream), **`ECE = 0.107906`** (vs `0.115781`), **`Composite = 0.439505`** (vs `0.444436`).
  - `market_85_plus_ridge_15`: `Brier = 0.200969`, `LogLoss = 0.590696`, `ECE = 0.107867`, **`Composite = 0.402577`** (vs `0.403686`; closing market alone `0.418860`).
  - `baker_mchale_kelly_vs_close`: `35` bets placed, `total_staked = 0.0308`, **`net_pnl = +0.0242`** (vs `+0.0220` in 12-stream).

---

## 3. Stream 16C & Isolated GSI ADR-0003 Kinematics Mirror
1. **Correlated QB Completions + Passing Yards (`evaluate_correlated_qb_comp_yds_walkforward_oos`):**
   - Across `206` OOS QB games (`>= 15` att, Weeks `4–10`; full `Wks 1–10` `n = 304` `r = 0.7616`), empirical causal correlation **`rho = 0.7575`**.
   - Joint `(comp > med_c & yds > med_y)` **`correlated_brier = 0.240645` vs `independent_brier = 0.248845` (`+0.008200` Brier improvement)**.
2. **Bayesian Parameter-Uncertainty Kelly (`Beta(29, 21)`, `odds = 1.95`):**
   - `plugin_kelly_stake = 0.05` (`plugin_ruin_prob = 0.0160`) $\to$ **`bayesian_kelly_stake = 0.0083` (`shrinkage = 0.166`, `bayesian_ruin_prob = 0.0000`)**.
3. **Noisy-Input Abstention & Spatial Evaluators:** Fail-closed on `injury_noise_score > 0.75` or `NaN`; counterfactual `NFL Ghosts` EPV integration (`ci_lo <= value <= ci_hi`) and `Step-and-Turn` hierarchical Gamma + step-conditioned von Mises rollouts verified.
4. **Isolated GSI ADR-0003 Bilateral Cut-Kinematics (`evaluation/gsi/biomechanical_step_turn_kinematics.py`):** Zero AST imports from `intelligence`/`scripts`/`apps`; `return_to_play_clearance_permitted` strictly `False` on both symmetric (`ratio = 1.0127`, `LSI = 0.9916`) and asymmetric (`ratio = 1.6935`, `LSI = 0.8279`) profiles.
