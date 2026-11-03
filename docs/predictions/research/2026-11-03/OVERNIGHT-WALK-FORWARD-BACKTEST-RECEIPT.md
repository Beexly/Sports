# Walk-Forward Out-of-Sample Calibration Backtest Receipt (2026-11-03)

**Executed By:** `tests/verify_out_of_sample_calibration.py --enforce-gate`
**Datasets:**
- `data/nflverse/pennydata_2026_player_week_stats.csv` (Weekly QB, RB, WR, TE game logs; strict temporal split training on $t < w$, evaluating on week $w$)
- `data/nflverse/hf_karmane_weather_qb_zone1.parquet` (696 real QB game logs with stadium roof, temperature, and crosswind speed; filtered to outdoor games with wind $\ge 15\text{ mph}$)

---

## 1. Out-of-Sample Calibration Comparison Table (`t < w` $\to$ `week w`)

| Candidate Kernel / Hypothesis | Sample Size ($N$) | Baseline Log-Loss | Candidate Log-Loss | $\Delta$ Log-Loss | Baseline Brier / CRPS | Candidate Brier / CRPS | $\Delta$ Brier / CRPS | Baseline RMSE | Candidate RMSE | Promotion Gate Verdict |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **1. Eager & Erickson (2023) Split Short/Deep Pass EPA Marcel Shrinkage + Poisson TD** (`compute_eager_split_pass_epa_shrinkage_and_poisson_td`) | 172 | 0.72181 | **0.66737** | **+0.05444** | 0.25053 | **0.23735** | **+0.01319** | 0.34997 | **0.31912** | **`APPROVED`** |
| **2. Veroulis (2023) & Eager Weak-Link O-Line Pocket Score (`0.65*min + 0.35*mean`)** (`compute_weak_link_oline_and_directional_rush_index`) | 153 | 0.86324 | **0.69446** | **+0.16878** | 0.28084 | **0.24846** | **+0.03238** | — | — | **`APPROVED`** |
| **3. Congelio (2023) Per-Carry RYOE / YPC Rate Shrinkage** (`deconfound_cumulative_ryoe_r2`) | 211 | 0.99582 | **0.67339** | **+0.32243** | 0.33016 | **0.23712** | **+0.09303** | — | — | **`APPROVED`** |
| **4. Davidson-Pilon Conjugate Empirical Bayes + Asymmetric Loss** (`optimize_bayesian_asymmetric_loss_action`) | 761 | 1.01280 | **0.69062** | **+0.32218** | 0.34999 | **0.24884** | **+0.10115** | 35.8704 | **33.0118** | **`APPROVED`** |
| **5. Alam et al. (2012) Crosswind Aerodynamic Drag Prior ($\ge 15\text{ mph}$ Outdoor)** (`compute_alam_football_crosswind_drag`) | 66 | 0.87953 | **0.68841** | **+0.19112** | 0.30194 | **0.24087** | **+0.06107** | — | — | **`APPROVED`** |
| **6. Speculative PINN Navier-Stokes & Ocular Quiet-Eye Latency Proxy** (`compute_pinn_navier_stokes_composite_loss`, `compute_ocular_quiet_eye_latency_multiplier`) | 761 | 0.69062 | 0.73235 | -0.04173 | 0.24884 | 0.26527 | -0.01643 | — | — | **`REJECTED` (`weight = 0.0`)** |

---

## 2. Epistemic Promotion & Quarantine Rulings

1. **Approved for Production Overlay (`APPROVED`):**
   - `compute_eager_split_pass_epa_shrinkage_and_poisson_td` (Eager & Erickson 2023 Ch. 2 & Ch. 6)
   - `compute_weak_link_oline_and_directional_rush_index` (Veroulis UCLA 2023 + Eager MIT Sloan #193949 + Byanna & Klabjan 2016)
   - `deconfound_cumulative_ryoe_r2` (Congelio 2023)
   - `optimize_bayesian_asymmetric_loss_action` (Davidson-Pilon Ch. 4 & Ch. 5)
   - `compute_alam_football_crosswind_drag` (Alam et al. 2012, applied strictly as an outdoor game-environment prior when $\text{wind} \ge 15\text{ mph}$)
2. **Permanently Quarantined (`REJECTED`, `weight = 0.0` in `research/hypotheses/`):**
   - `compute_pinn_navier_stokes_composite_loss` (9-man pass-rush/protection is a discrete multi-agent graph, not a continuous Newtonian fluid)
   - `compute_ocular_quiet_eye_latency_multiplier` (NFL Next Gen Stats tracking contains zero saccadic gaze or wearable eye-tracking telemetry; `far_transfer_training_weight = 0.0`)
