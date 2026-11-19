# Wave 49 Architecture & Empirical Report: Live arXiv, OpenAlex, Kaggle BDB 2027 & Causal NGS/PFR AdvStats Engine

- **Date**: 2026-11-19
- **Branch**: `feat/pregame-engine-dfs-harmony-2026-11-15`
- **Status**: WIRED ACROSS ALL 6 CORE LAYERS (`400 + 24 = 424` ZERO-ODDS RLVR)
- **Holds Intact**: `OperatorSimulationHoldError` (`as_of_week >= 11` unless explicit `env_override`), `REAL_MONEY_STAKE_CLEARED = False`, `LIVE_STAKE_FRACTION = 0.0`, `CLINICAL_RUO_W49_SPORTS_WEIGHT = 0.0`, `brain/mind.jsonl` untouched.

---

## 1. Live Multi-API Vault Harvesting (arXiv, OpenAlex, Kaggle API + `kagglehub`)

Executed via `scripts/ops/harvest_wave49_arxiv_openalex_kaggle_bdb27.py`:

1. **Live arXiv Atom API (`https://export.arxiv.org/api/query`)**:
   - Retrieved `45` brand-new unique preprints with `0` cross-wave overlap against prior Waves 43-46 (`184` unique prior IDs; `248` total across all five `data/arxiv_2026_11_alphaxiv/*.json` files).
   - Anchor preprints: `2610.36183` (*Learning Human Sports Motion Feasibility via Quantile Regression on Tracking Data*), `2609.33664` (*Pass-Protection Probabilistic Assignments in American Football*), and `2607.00164` (*Verifiable Rewards for Calibrated Probabilistic Forecasting*).
2. **Live OpenAlex REST API (`https://api.openalex.org/works`)**:
   - Harvested `75` peer-reviewed works (`140,565` cumulative citations) spanning eccentric deceleration mechanics (`W2972466551` -- `786` cites; `W1948300859` -- `287` cites), wearable monitoring & head kinematics (`W2966516178` -- `454` cites; `W2103691499` -- `147` cites), and sports analytics methodology (`W4400728177` -- `151` cites).
3. **Live Kaggle API v1 + `kagglehub` (`data/kaggle_bdb27/`)**:
   - Indexed `55` live catalog entries via `https://www.kaggle.com/api/v1/datasets/list` and mirrored `4` compact CC0 CSV benchmark files (`88,619` bytes total) covering `510` BDB27 Combine-to-NFL prospects across `5` position channels and `5` scouting tiers.
   - Sealed with canonical SHA-256 digests and attribution files under `.licenses/`.

---

## 2. Wave 49 Science & Conformal/Sinkhorn Mathematics Engine

Implemented in `src/gse_engine/science/wave49_arxiv_openalex_bdb27_kinematic_and_conformal_engine.py`:

1. **Kaggle BDB 2027 Combine-to-NFL LODCO Ridge Benchmark (`n = 1,176` player-seasons, `2023-2025`)**:
   - Multi-kinematic ridge (`three-cone`, `short-shuttle`, `broad_jump`, `vertical`, `weight`, `forty`, `log(draft_ovr)`) strictly outperforms the `40`-yard stopwatch-only baseline out of sample: `kinematic_ridge_rmse = 54.3026` vs `stopwatch_only_rmse = 65.0941` (`-10.7915` improvement; Pearson `r = 0.5588` vs `0.1091`).
2. **Split-Conformal Quantile Regression (CQR) Motion Envelope (`arXiv:2610.36183`)**:
   - Fitted and calibrated causally on `2025` REG NGS receiving tracking (`n_fit = 606`, `n_cal = 607`) and evaluated out of sample on `2026 W1-10` (`n = 688`, nominal `0.85`): achieved `oos_2026_empirical_coverage = 0.8939` (`conformal_margin_yards = 0.021`).
3. **Sinkhorn-Knopp Doubly-Stochastic 5x5 Pass-Protection Kernel (`arXiv:2609.33664`)**:
   - Converged in `290` iterations to `max_marginal_l1_error = 1e-12` (`mean_diagonal_assignment_prob = 0.9242`, `entropy_reduction_bits = 1.8264`).
4. **Verifiable Brier & Logarithmic RLVR Rewards (`arXiv:2607.00164`)**:
   - Strict properness verified across `400` trials: Bayes-honest predictions outperform `0.95/0.05` extreme overconfidence (`brier_strict_proper_gap = +0.06718`, `log_strict_proper_gap = +0.34687`).
5. **OpenAlex Biomechanics RUO Isolation (`CLINICAL_RUO_W49_SPORTS_WEIGHT = 0.0`)**:
   - Tracks eccentric deceleration (`0.7934`) and rotational TBI surveillance (`0.4750`) strictly under ADR-0003 RUO quarantine with `0.0` live prediction or stake weight.

---

## 3. Strictly Causal NGS, PFR AdvStats & BDB27 Team-Week Engine

Implemented in `src/gse_engine/tracking/wave49_ngs_pfr_advstats_and_bdb27_athletic_engine.py`:

- **Alias Normalization & Causality**: Maps `LA -> LAR`, `JAC -> JAX`, `WSH -> WAS`, `OAK -> LV`, `SD -> LAC`, `STL -> LAR` across NGS, PFR AdvStats, and BDB27 tables (`32` canonical franchises; `W1 max_prior_week_used == 0`, `W10 max_prior_week_used == 9`). Uses `0.88` EWMA decay, `+/- 2.0` robust MAD Huber clipping, and `k_prior = 3.5` MemTX Bayes shrinkage.
- **7 Margin Signals + Causal BDB27 Agility**: `ngs_xcomp_norm`, `pfr_def_blitz_norm`, `ngs_sep_norm`, `ngs_fast_ttlos_norm`, `ngs_ryoe_rev_norm`, `ngs_cushion_norm`, `ngs_cpoe_rev_norm`, plus `bdb27_agility_norm` (`<= 2025` snap-weighted agility).
- **Game-Total Blitz/Pressure/Box Shift**: Combines `pfr_def_blitz_norm`, `pfr_rush_ybc_norm`, `pfr_def_press_norm`, `ngs_box8_norm`, `pfr_def_pr_allowed_norm`, and `pfr_rec_drop_pct_norm` into `total_shift_pts` bounded to `[-0.85, +0.85]`.
- **500-Draw Rademacher Martingale, BAITBENCH & AST Verification**:
  - Margin OOS correlation (`n = 147`): `r = +0.204772` (`p = 0.00599 <= 0.05`).
  - Total OOS correlation (`n = 148`): `r = +0.258291` (`p = 0.00200 <= 0.015`).
  - Five quarantined noise probes remain pinned at `0.0` weight (`shortcut_max_output_perturbation = 0.0`).
  - `8/8` `HonestEquationExecutor` AST evaluations (`PARSED_EVALUATED`, `zero_fabricated_bindings = True`).

---

## 4. 147-Game OOS Ablation Improvements & RLVR Flywheel (`400 + 24 = 424`)

Coupled conservatively in `walk_forward_ablation.py` with `alpha_m = 0.12` and unit total shift (`total_shift_pts`), Wave 49 strictly improves all seven OOS metrics over Wave 48:

| Metric | Wave 48 Baseline | Wave 49 (`alpha_m = 0.12`, `alpha_t = 1.0`) | Closing Market |
|---|---:|---:|---:|
| Normalized Margin CRPS (`7.109` ref) | `7.0051` | `7.0017` | `7.1090` |
| Raw Margin CRPS (`n = 147`) | `6.9069` | `6.9035` | `7.0108` |
| Margin MAE (pts) | `9.6415` | `9.6350` | `9.7687` |
| Game Total MAE (pts) | `10.2730` | `10.2308` | `10.4116` |
| Win-Prob Brier Score | `0.21915` | `0.21912` | `0.21988` |
| Overall Calibration ECE | `0.07017` | `0.07016` | `0.07171` |
| `rliable` IQM Skill | `0.733604` | `0.733633` | `-` |

- **RLVR Group Z (`388 -> 400`, `+ 24 = 424`)**: Compiled across all three checked-in trainer-ready JSONL feeds with `all_verifiers_passed = True` and `zero_odds_contamination = True`.
- **Benchmark SHA-256 (`data/eval/wave49_arxiv_openalex_bdb27_and_ngs_pfr_benchmark_2026.json`)**: `558c473485bd6eff709ead7799d993ea8fb9ed4f707f9d915f2373fabbd34490`.
