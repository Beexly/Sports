# Walk-Forward Calibration & Ablation Receipt (`2026-11-20`, Cycle F1)

All metrics below are observed outputs from `scripts/calibration/run_frozen_ablation_ladder.py`, `scripts/calibration-offline/run.mjs`, and `tests/verify_out_of_sample_calibration.py --enforce-gate` using immutable frozen calibration metrics (`evaluation/frozen/score_walkforward_calibration_v1.py`).

## 1. Frozen JSON Ablation Ladder (`configs/ablation_ladder/*.json`)

| Slice | `test_n` | Config | Brier | Log-Loss | Equal-Width ECE | Equal-Mass ECE | Mean VA Width | EB LCB vs Raw |
|---|---:|---|---:|---:|---:|---:|---:|---:|
| `synthetic_settled` | 120 | `ladder_0_raw` | `0.245036` | `0.689468` | `0.145714` | `0.197624` | `0.034963` | `0.0` |
| `synthetic_settled` | 120 | `ladder_1_temp_scale` (`T=0.88`) | `0.241727` | `0.679802` | `0.140465` | `0.189939` | `0.050372` | `-0.146288` |
| `synthetic_settled` | 120 | `ladder_2_conformal_shrink` (`s=0.04`) | `0.240048` | `0.675122` | `0.138285` | `0.185539` | `0.049708` | `-0.147667` |
| `synthetic_settled` | 120 | `ladder_3_venn_abers_shrink` | **`0.235476`** | **`0.662980`** | **`0.114529`** | **`0.173708`** | `0.049424` | `-0.149245` |
| `real_moneyline` | 488 | `ladder_0_raw` | `0.252942` | `0.704238` | `0.147008` | `0.186352` | `0.002950` | `0.0` |
| `real_moneyline` | 488 | `ladder_1_temp_scale` | `0.250349` | `0.697049` | `0.123745` | `0.178554` | `0.003000` | `-0.034883` |
| `real_moneyline` | 488 | `ladder_2_conformal_shrink` | `0.249012` | `0.693450` | `0.113160` | `0.174150` | `0.001962` | `-0.034803` |
| `real_moneyline` | 488 | `ladder_3_venn_abers_shrink` | **`0.243992`** | **`0.683236`** | **`0.109380`** | **`0.163770`** | `0.002641` | `-0.030669` |
| `real_spread` | 318 | `ladder_0_raw` | `0.299175` | `0.851818` | `0.218491` | `0.225346` | `0.010957` | `0.0` |
| `real_spread` | 318 | `ladder_1_temp_scale` | `0.291939` | `0.824402` | `0.203441` | `0.213910` | `0.009351` | `-0.049928` |
| `real_spread` | 318 | `ladder_2_conformal_shrink` | `0.287460` | `0.785403` | `0.194203` | `0.207174` | `0.007553` | `-0.047276` |
| `real_spread` | 318 | `ladder_3_venn_abers_shrink` | **`0.267039`** | **`0.730026`** | **`0.143496`** | **`0.172123`** | `0.007721` | `-0.036425` |
| `real_total` | 260 | `ladder_0_raw` | `0.271874` | `0.746523` | `0.175038` | `0.201654` | `0.027680` | `0.0` |
| `real_total` | 260 | `ladder_1_temp_scale` | `0.267543` | `0.734574` | `0.161229` | `0.195076` | `0.028186` | `-0.065012` |
| `real_total` | 260 | `ladder_2_conformal_shrink` | `0.265119` | `0.728098` | `0.153227` | `0.193118` | `0.024331` | `-0.064324` |
| `real_total` | 260 | `ladder_3_venn_abers_shrink` | **`0.254596`** | **`0.704870`** | **`0.116034`** | **`0.176843`** | `0.027979` | `-0.060061` |
| `nflverse_2026_wr_te_rec_38_5` | 330 | `ladder_0_raw` | `0.229944` | `0.653971` | `0.076274` | `0.152913` | `0.027710` | `0.0` |
| `nflverse_2026_wr_te_rec_38_5` | 330 | `ladder_1_temp_scale` | `0.229697` | `0.652384` | `0.079021` | `0.152475` | `0.026161` | `-0.054178` |
| `nflverse_2026_wr_te_rec_38_5` | 330 | `ladder_2_conformal_shrink` | `0.229708` | `0.651815` | `0.072598` | `0.152374` | `0.027088` | `-0.055476` |
| `nflverse_2026_wr_te_rec_38_5` | 330 | `ladder_3_venn_abers_shrink` | **`0.226767`** | **`0.645323`** | **`0.038073`** | **`0.143216`** | `0.026995` | `-0.054856` |

## 2. Offline CIR / PAVA Holdout (`scripts/calibration-offline/run.mjs`)

| Fixture | Total `n` | Test `n` | Raw ECE | PAVA ECE | CIR ECE | ECE Degraded | CLV Samples | Kelly Gate Status |
|---|---:|---:|---:|---:|---:|---|---:|---|
| `synthetic-settled.jsonl` | 300 | 90 | `0.1340` | `0.0722` | `0.0694` | `false` | 300 | Armed (`deflator=0.3`, stakes `x rhoClv`) |
| `real-moneyline.jsonl` | 1,219 | 366 | `0.1483` | `0.0249` | `0.0277` | `false` | 0 | `DISARMED` (`< 50` CLV samples) |
| `real-spread.jsonl` | 795 | 239 | `0.2126` | `0.0191` | `0.0311` | `false` | 0 | `DISARMED` (`< 50` CLV samples) |
| `real-total.jsonl` | 648 | 195 | `0.2138` | `0.1060` | `0.1104` | `false` | 0 | `DISARMED` (`< 50` CLV samples) |

## 3. Epistemic Out-of-Sample Walk-Forward Gate (`tests/verify_out_of_sample_calibration.py --enforce-gate`)

| Candidate Kernel | `n` | Brier (Base -> Adv) | Log-Loss (Base -> Adv) | ECE (Base -> Adv) | Equal-Mass ECE | Paired EB-LCB | Status |
|---|---:|---:|---:|---:|---:|---:|---|
| `eager_split_pass_epa_and_poisson_td` | 172 | `0.25053 -> 0.23735` | `0.72181 -> 0.66737` | `0.11624 -> 0.03002` | `0.11813 -> 0.12653` | `-0.116755` | `APPROVED` |
| `veroulis_eager_weak_link_oline_sack_rate` | 153 | `0.28084 -> 0.24846` | `0.86324 -> 0.69446` | `0.22230 -> 0.14266` | `0.25179 -> 0.18773` | `-0.126077` | `APPROVED` |
| `congelio_per_carry_ryoe_deconfounding` | 211 | `0.33016 -> 0.23712` | `0.99582 -> 0.67339` | `0.27023 -> 0.07550` | `0.29456 -> 0.21076` | `-0.037879` | `APPROVED` |
| `davidson_pilon_empirical_bayes_receiving_props` | 761 | `0.34999 -> 0.24884` | `1.01280 -> 0.69062` | `0.26312 -> 0.02714` | `0.30558 -> 0.19074` | **`+0.049940`** | `APPROVED` |
| `alam_crosswind_drag_outdoor_15mph_plus` | 66 | `0.30194 -> 0.24087` | `0.87953 -> 0.68841` | `0.29699 -> 0.20672` | `0.32342 -> 0.24008` | `-0.251384` | `APPROVED` |
| `quarantined_pinn_navier_stokes_and_ocular_proxy` | 761 | `0.24884 -> 0.26527` | `0.69062 -> 0.73235` | `0.02714 -> 0.10209` | `0.19074 -> 0.21094` | `-0.053198` | `REJECTED` |

- `research_gated_zero_weight_invariant`: 4 quarantined modules verified at `production_weight = 0.0` (`all_zero_weight = True`).
- `stream_15p_causal_pos_vuln_walkforward`: `n_player_family_obs = 2109`, `weighted_mse_baseline_mean = 0.162390`, `weighted_mse_raw_unadjusted_dvp = 0.172101`, `weighted_mse_stream_15p_l_rapm = 0.157941`, `oos_pred_actual_corr = 0.197186`, `beats_raw_dvp_and_baseline = True` (`7/7` weeks).
- Negative-control check (`--test-reject-exit-code`) returned exit code `1`.
