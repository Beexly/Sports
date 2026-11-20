# Cycle F3: Gibbs-Candes Online ACI Calibration & Stream 15R Kicker Air-Density Physics (`2026-11-20`)

## 1. Strictly Sequential Gibbs-Candes Adaptive Conformal Inference (`ladder_4_aci_online`)
Added `adaptive_conformal_online_calibration(...)` to `evaluation/frozen/score_walkforward_calibration_v1.py` (`configs/ablation_ladder/ladder_4_aci_online.json`). At step `t`, `alpha_t` and logit drift `eta_t` depend strictly on realized errors `< t` (zero lookahead).

| Slice | `test_n` | Raw Brier / ECE | Venn-ABERS (`ladder_3`) | Online ACI (`ladder_4`, `gamma=0.05`) |
|---|---:|---:|---:|---:|
| `synthetic_settled` | 120 | `0.245036` / `0.145714` | `0.235476` / `0.114529` | **`0.229576` / `0.081704`** |
| `real_moneyline` | 488 | `0.252942` / `0.147008` | `0.243992` / `0.109380` | **`0.237359` / `0.027185`** |
| `real_spread` | 318 | `0.299175` / `0.218491` | `0.267039` / `0.143496` | **`0.251186` / `0.072188`** |
| `real_total` | 260 | `0.271874` / `0.175038` | `0.254596` / `0.116034` | **`0.243304` / `0.072331`** |
| `nflverse_2026_wr_te_rec_38_5` | 330 | `0.229944` / `0.076274` | **`0.226767` / `0.038073`** | `0.227469` / `0.039502` |

Finding: under drifting historical betting distributions (`real_moneyline`, `real_spread`, `real_total`), sequential ACI cut ECE down to `0.027-0.072` cleanly, while stationary `nflverse` props matched `ladder_3` within `0.0007` Brier.

## 2. Stream 15R: Kicker ISA Barometric Air Density, Wind & EB Skill (`kicker_air_density_weather_hazard_engine.py`)
- Grounded in Johnson (MIT Sloan) multivariate FG logistic hazard + ISA atmospheric density ratio `exp(-elev_ft / 27800) * (288.15 / temp_K)` across all 32 home stadium elevations (DEN 5,280 ft .. sea level).
- **Walk-forward OOS (`eval_weeks = 4..10`, `n = 436` real 2026 FG attempts):**
  - Distance-only logistic baseline: Brier `0.120132`, Log-Loss `0.383614`, ECE `0.023924`
  - **Stream 15R (Distance + Air Density + Outdoor Wind + EB Kicker Residual):** Brier **`0.119948`**, Log-Loss **`0.383116`**, ECE **`0.022839`** (`beats_distance_baseline = True`).
- Wired live into `gse_coach_mind_simulator.py`, `gse_connected_game_workflow.py`, `verify_and_wire_all_layers_before_sim.py`, and `intelligence/coaching/__init__.py` with strict swap symmetry & net antisymmetry.
