# Deep Research Wave 43: 31-Paper alphaXiv/arXiv Frontier (EBM, Latent Feedback, iWSP/WSR, Unbundled Vision & SLAM Dunk), Calibration Arithmetic Remediation & Deconfounded Causal NFL Engine

**Date:** `2026-11-18`
**Branch:** `feat/pregame-engine-dfs-harmony-2026-11-15` (PR `#1291`)
**Ledger Rule:** `LL-2026-11-18-063`
**Governance Posture:** `OPERATOR_SIM_HOLD` (`max_nfl_week_simulated = 10`, `as_of_week >= 11` raises `OperatorSimulationHoldError`), `real_money_stake_cleared = false`, `live_stake_fraction = 0.0`, `clinical_ruo_sports_weight = 0.0` (ADR-0003 strict RUO isolation), `brain/mind.jsonl` single-writer untouched.

---

## 1. Executive Summary & 31-Paper Unified Architecture

Wave 43 ingests and translates **31 unique alphaXiv/arXiv papers** (`6` November 2026 frontier preprints totaling `217` pages plus `25` unique arXiv/alphaXiv market-microstructure, calibration, Kelly sizing, and anti-overfitting preprints), remediates all **5 flagged repository arithmetic vulnerabilities** (`ENGINE_METHOD.md`, `docs/ops/CALIBRATION_PIPELINE.md`, `GLOSSARY.md`, and `packages/prediction-engine/src/gse-pre-seal/devig-helper.ts`), and deploys a causal EBM-composed / iWSP-deconfounded NFL situational engine across all `147` completed 2026 regular-season games (`43,225,000` simulated PBP snaps):

1. **6 November 2026 alphaXiv Frontier Papers (`217` Pages -> `data/arxiv_2026_11_alphaxiv/alphaxiv_31paper_frontier_and_arithmetic_audit_vault_2026.json`, `payload_sha256 = a28d242a8bdd4566e593b26751942d2362c2ea1fd1ba2b8907debf239001bb0d`):**
   - `2611.17334` (*"Unbundling Multimodal Vision Encoding"*, Brown et al., Meta FAIR & NYU, `53` pp.): Establishes `<15%` upstream pretrain compute share threshold, `3.0x-4.4x` encoder-free VQA FLOP lag across `1.7B` (`1.04e22`) / `4B` (`3e22`) lifetime budgets, and `30.65%` TTFT latency reduction via early in-fusion (`62.0 ms -> 43.0 ms`).
   - `2611.latent-feedback-transformers-scaling-law` (*"Latent Feedback Is a Compute and Data Amplifier: Scaling Law for Latent Feedback Transformers on Repeated Data"*, Huang et al., IFM / USC / CMU, `ifm-ai/LoRM`, `23` pp.): Eq. `(8)` coupled effective-data (`R_T^*`, `rho`) and effective-capacity (`v_s`) scaling law reproduces all `7` held-out `778M` Table 1 cells (`N_nonembed = 679,558,656`, `c_s = 1.2677`) within **`0.3338%` (`0.003338`) max relative error**, delivers `2.3318x` compute amplification at `271M, U=200N, F=4`, and proves strict Eq. `(2)` fixed-point contraction (`[0.286974, 0.013872, 0.000651]`).
   - `2611.interpretable-weight-space-programming` (*"Interpretable weight-space programming builds transparent transformers and brain encoding models"*, Mehta et al., Microsoft Research / JHU / Columbia / NYU, `33` pp.): Zero-backprop weight-space boundary confound separation removes structured position/leverage confounds (`boundary_confound_r2 = 0.16336`), lifting deconfounded signal correlation from `0.84014` to **`0.90291`**.
   - `2611.slam-dunk` (*"SLAM Dunk: A recipe for long-horizon egocentric SLAM in the wild"*, Van Meter & Paul, UC Berkeley, `14` pp.): Time-varying camera intrinsic + gyroscope bundle adjustment cuts long-horizon `e/L` drift floor from `0.77 m/km` to **`0.09 m/km`** (`3.1369x` improvement at `30 min`), raises `CP` `69.1 -> 82.4`, cuts `ATE` `1.02 m -> 0.43 m`, and beats ARIA across `3` LaMARiA categories (`CLINICAL_RUO_ALPHAXIV_W43_SPORTS_WEIGHT = 0.0`).
   - `2611.14383` (*"An Energy-Based Perspective on Machine Learning"*, Dai & Du, Georgia Tech & Harvard, `78` pp.): Verifies Eq. `(162)` additive energy composition (`pmf_mass = 1.0`, `MAP = 2`), Eq. `(163)` exact KL-regularized verifier policy optimality identity (`|lhs - rhs| = 1.11e-16`), Eq. `(167)` Best-of-N residual EBM expected reward lift (`0.443 -> 0.795918`), and Fig. `12` power (`alpha=2`) vs low-temperature sampling reversal (`0.307692 < 0.5 < 0.571429`).
   - `2611.weight-space-reading-language-models` (*"Weight-Space Reading"*, Kocabay, Poindexter Labs, `16` pp., cross-citing `2611.08070`): Audits uniform sublayer weight rescaling ahead of residual RMSNorm, demonstrating `pre_norm_scale_diff = 4.89209` collapses to **`6.91e-13`** post-RMSNorm and drops uncalibrated `Muse-30B` `85%` (`0.85`) inert-edit false alarms to **`0.0`**.

2. **5 Repository Arithmetic Audit Fixes (`25` Unique arXiv/alphaXiv Papers):**
   - **Fix 1 (`devig-helper.ts` & `ENGINE_METHOD.md` Section 5c):** Constant additive `FAVORITE_RESIDUAL = 0.0537` produces a `10.74` percentage-point (`0.1074`) step discontinuity (`0.4463 vs 0.5537`) across `-110/-110` coinflips. Preserved legacy `multiplicativeDevig` / `devigTotalToFairLine` backwards compatibility (`9/9` sample tests intact) and added continuous `continuousLogitPowerDevig` + `devigTotalToFairLineContinuous` solving `q_A^k + q_B^k = 1` (`-110/-110 -> exact (0.5, 0.5)`, `0.0` jump, `10/10` Vitest passing; Goto `2604.17194`, Dmochowski `2609.06739`, Moshrefi `2607.14430`, Cardozo `2609.12878`, Kaunitz `1710.02824`).
   - **Fix 2 (`docs/ops/CALIBRATION_PIPELINE.md`, `GLOSSARY.md` & frozen `CLAUDE.md:123` note):** Separated `-110` *outcome hit-rate break-even* (`110/210 = 52.381%`) from net fair-close `CLV`. Beating a soft close `60%` of the time by less than overround yields `-0.028273` EV, while margin-free net CLV yields `+0.040455` EV; Beuoy Bayesian Kelly beats flat `0.53` sizing (`log_wealth = 0.003236 > 5e-05`; Pitcan `2608.11505`, Walsh & Joshi `2303.06021`, Beuoy `2602.09982`).
   - **Fix 3 (`docs/ops/CALIBRATION_PIPELINE.md` & `GLOSSARY.md`):** Maximizing `countDistinctPredictions` inflates binary isotonic effective degrees of freedom (`df_k = 8` on `train_n = 64`, binary optimism `= 0.0625`). Linearly shrinking CIR toward parametric priors cuts OOS Brier `0.217558 -> 0.205956` (Rossellini et al. `2607.27301`, Biegert et al. `2610.31258`).
   - **Fix 4 (`docs/ops/CALIBRATION_PIPELINE.md`):** Separated marginal conformal coverage (`0.884` on null draws) from zero-edge Kelly log-growth (`-0.078622`; Ryan `2608.01494`). Enforced one-sided Fisher-z LCB + Jacquier shrinkage (`SE = 0.1` at `n=25`; `SE = 0.145865` at `n=50`, suppressing noisy `rho = 0.18` to `0.0` while shrinking `rho = 0.55, n=160, p=8` to `0.430398`; Ulrich `2607.27544`, Jacquier `2501.03938`) plus Landolfi discrete Student-t drawdown ratio **`1.2464x`** (`0.2393 vs 0.19199` Brownian; `2608.00127`).
   - **Fix 5 (`src/gse_engine/tracking/wave43_...py` & `docs/ops/CALIBRATION_PIPELINE.md`):** Out-of-loop Deflated Sharpe (`m=200` `SR0 = 1.09597`, `DSR = 1.0`), `GT-Score = 1.6974` (`2602.00080`), `MinervaScore` (`2608.23808`), `IS-WFA-OOS` (`2603.09219`), Xu-Liu-Sutherland prior-anchored e-value tests (`null mean wealth = 0.9908`, `alt power = 0.692`; `2611.15456`), and cross-sport models (`Soccer RPS = 0.1219` `2501.05873`, Weibull AFT `rem_goals_55m = 0.63906` `2605.16066`, Glicko-2 `mu_post = 1.03039` `2607.01722`, live tennis decay `0.87032 -> 0.18888` `2609.07617`). Note: `CLAUDE.md`, `AGENTS.md`, and `constants.ts` stay untouched per repository freeze rules; arithmetic remediations apply cleanly across unlocked canonical docs and R&D/pre-seal TypeScript + Python helpers.

---

## 2. Causal Wave 43 NFL Engine (`pbp_2026_w1_w10`, Out-of-Sample & `43.225M`-Snap PBP Gains)

In `src/gse_engine/tracking/wave43_ebm_composed_deconfounded_situational_nfl_engine.py`, every play in `pbp_2026_w1_w10.parquet` strictly satisfies `week < min(as_of_week, 11)` (`max_prior_week_used = 9` at `as_of_week = 10`; `as_of_week >= 11` raises `OperatorSimulationHoldError`) and separates competitive snaps (`~((qtr == 4) & ((wp < 0.08) | (wp > 0.92)))`) using iWSP boundary-confound subtraction plus Dai-Du additive EBM constraints:

- **6 Retained EBM Margin Potentials (`[-1, +1]` Z-clipped with EB ramp `w_eb`):** `comp_proe_norm` (`1.35`), `comp_rz_succ_net_norm` (`1.15`), `iwsp_def_garbage_deconfound_norm` (`1.05`), `comp_early_down_succ_net_norm` (`1.00`), `comp_net_epa_norm` (`0.90`), `comp_qb_scramble_epa_norm` (`0.55`). Sample closing residual signals: `KC @ DEN = -0.792819`, `CIN @ BUF = -2.432247`.
- **2 Retained Causal Game-Total Potentials (`alpha = 0.45`, bounded `[-1.20, +1.20]`):** `iwsp_off_garbage_deconfound_norm` (`0.65`) and `comp_proe_norm` (`0.45`), yielding `KC @ DEN` `w43_tot_signal = 0.259862`, `total_shift_pts = +0.116938`.
- **5 Quarantined Noisy Splits (`live_weight = 0.0`):** `raw_late_down_3rd4th_succ`, `raw_qb_hit_headline_net`, `raw_off_explosive_15yd`, `raw_def_explosive_15yd`, `raw_deconf_off_margin`.
- **Out-of-Loop Martingale Sign-Flip Placebo Falsification (`evaluate_w43_martingale_placebo_audit`):** Across `147` canonical completed 2026 games (`200` Rademacher draws), `real_signal_corr = +0.133158` clears `96.5%` of random sign flips (`empirical_p_value = 0.03483`, `beats_null_95pct = true`).
- **`8/8` `PARSED_EVALUATED` Live `HonestEquationExecutor` ASTs (`zero_fabricated_bindings = true`).**

### Monotone OOS & `43.225M`-Snap Improvement (`Wave 42 -> Wave 43`)

| Metric (`147` Games W1-10 OOS / `43.225M` Snaps) | Closing Market | Wave 42 | Wave 43 | Delta vs W42 / Close |
|---|---|---|---|---|
| `benchmark_7109_closing_adjusted_crps` | n/a | `7.0190` | **`7.0141`** | `-0.0049` (ratchet promoted) |
| `raw_gse_v41_margin_crps` | `7.0108` | `6.9208` | **`6.9159`** | `-0.0049` / `-0.0949` vs close |
| `gse_v41_margin_mae` | `9.7687` | `9.6616` | **`9.6552`** | `-0.0064` / `-0.1135` vs close |
| `gse_v41_total_mae` | `10.4116` | `10.3739` | **`10.3545`** | `-0.0194` / `-0.0571` vs close |
| `gse_v41_brier` | `0.21988` | `0.21926` | **`0.21922`** | `-0.00004` |
| `overall_ece` | `0.07171` | `0.07043` | **`0.07031`** | `-0.00012` |
| `fwl_partial_slope` / `rliable_iqm` | n/a | `1.458271` / `0.733144` | **`1.486256`** / **`0.733358`** | `+0.027985` / `+0.000214` |
| Spotlight-10 PBP `mean_sim_crps` (`17.5M` snaps) | n/a | `8.9508` | **`8.9392`** | `-0.0116` |
| All-147 PBP `mean_sim_crps` (`43.225M` combined snaps) | `7.0108` | `7.0004` | **`6.9906`** | `-0.0098` / **`-0.0202` vs close** |

- **Benchmark SHA-256 Fingerprints:**
  - `data/eval/wave32_unified_engine_weeks1_10_and_multisport_sim_benchmark_2026.json`: `aad67e08630e7517a6b094b4afb915cc0b936a542bfbcd16e1784a6e290d3779`
  - `data/eval/wave43_alphaxiv_ebm_wsp_and_deconfounded_nfl_benchmark_2026.json`: `efa8371e99985f58bf4d94c77ad050c84050cb4ec57d230ede4d0e4e1b109667`
- **RLVR Corpus (`340 + 24 = 364` Zero-Odds Trajectories):** Tier 3 Group T (`328 -> 340`; `TIER_1_FOUNDATION: 61`, `TIER_2_SYNTHESIS: 61`, `TIER_3_BEHEMOTH: 218`), `all_verifiers_passed = true`, `zero_odds_contamination = true`, `axolotl_multipack packing_efficiency = 0.974395`.

---

## 3. Complete 31-Paper Bibliography & License Notice

1. **Nov 2026 alphaXiv Frontier (`6`):** `2611.17334` (Brown et al.), `2611.latent-feedback-transformers-scaling-law` (Huang et al.), `2611.interpretable-weight-space-programming` (Mehta et al.), `2611.slam-dunk` (Van Meter & Paul), `2611.14383` (Dai & Du), `2611.weight-space-reading-language-models` (Kocabay, cross-citing `2611.08070`).
2. **Calibration, FLB, Kelly & Anti-Overfitting (`25`):** `2608.11505` (Pitcan), `2607.27301` (Rossellini et al.), `2610.31258` (Biegert et al.), `2303.06021` (Walsh & Joshi), `2607.14430` (Moshrefi), `2610.07701` (Zheng), `2607.27544` (Ulrich), `2611.14539` (Gencay), `2608.01494` (Ryan), `2607.01722` (Nguyen & Tran), `1710.02824` (Kaunitz et al.), `2604.15531` (Nikolopoulos), `2501.03938` (Jacquier et al.), `2605.16066` (Clegg et al.), `2602.09982` (Beuoy), `2609.06739` (Dmochowski), `2609.12878` (Cardozo & Rivero-Wildemauwe), `2501.05873` (Mendes-Neves et al.), `2608.23808` (Santoni et al.), `2603.09219` (Pham et al.), `2604.17194` (Goto et al.), `2609.07617` (Xie & Muppidi), `2608.00127` (Landolfi), `2602.00080` (Sheppert), `2611.15456` (Xu, Liu & Sutherland).
3. **License & Attribution Notice:** `.licenses/alphaxiv_arxiv_nov2026_31papers_LICENSE.txt` (`https://arxiv.org/`, `https://www.alphaxiv.org/`, `https://info.arxiv.org/help/api/index.html`). All metadata, abstractions, and mathematical derivations are strictly non-commercial scientific research.
