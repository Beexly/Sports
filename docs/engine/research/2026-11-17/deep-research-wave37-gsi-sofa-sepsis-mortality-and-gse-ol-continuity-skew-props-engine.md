# Deep Research Wave 37: GSI 6-Organ MIMIC-IV SOFA + Sepsis-3 Mortality & MTU Collagen + GSE 5-Man OL Continuity, Rest/Surface, Trench Stuffing, Draft Pedigree & Skew-Debiased Prop Engine

**Date:** `2026-11-17`
**Branch:** `feat/pregame-engine-dfs-harmony-2026-11-15` (PR `#1291`)
**Ledger Rule:** `LL-2026-11-17-057`
**Governance Posture:** `OPERATOR_SIM_HOLD` (`max_nfl_week_simulated = 10`, Week `11+` simulations held), `real_money_stake_cleared = false`, `live_stake_fraction = 0.0`, `adr0003_rule_in_only_doctrine = true`, `clinical_ruo_sports_weight = 0.0`, `brain/mind.jsonl` single-writer untouched.

---

## 1. Executive Summary

Wave 37 expands Galaxy Science Institute (`GSI`) critical-care multi-organ telemetry & mechanogenetics alongside Galaxy Sports Engine (`GSE`) trench cohesion, draft-capital talent pedigree, pre-kickoff schedule rest/surface physics, and right-skewed prop tail debiasing -- strictly gated to `<= 2026 W10` with zero circular imports and monotone OOS improvement across every metric:

1. **Hydrated 8 Official `nflverse` Datasets (`5.73 MB`, all 2026 feeds strictly `<= W10`):**
   - `data/nflverse/roster_weekly_2026_w1_w10.parquet` (`24,565 x 36`, `0.82 MB`, `max_week = 10`)
   - `data/nflverse/depth_charts_2026_w1_w10.parquet` (`644,688 x 12`, `3.05 MB`, `max_dt = 2026-11-10T15:32:14Z`)
   - `data/nflverse/stats_team_week_2026_w1_w10.parquet` (`300 x 138`, `0.12 MB`, `max_week = 10`)
   - `data/nflverse/espn_qbr_week_through_2026_w10.parquet` (`11,010 x 30`, `0.31 MB`, `max_game_week = 10`)
   - `data/nflverse/espn_qbr_season_through_2025.parquet` (`1,523 x 23`, `0.08 MB`, `max_season = 2025`)
   - `data/nflverse/draft_picks_1980_2026.parquet` (`12,927 x 36`, `0.71 MB`, `max_season = 2026`)
   - `data/nflverse/trades_through_2026_w10.parquet` (`4,975 x 11`, `0.11 MB`, `max_trade_date = 2026-04-17`)
   - `data/nflverse/schedules_games_through_2026_w10.parquet` (`7,426 x 46`, `0.53 MB`, `max_week = 10`)

2. **GSI ADR-0003 6-Organ MIMIC-IV SOFA Mortality Network & Hill-Zajac MTU Collagen Engine (`src/gse_engine/science/wave37_gsi_sofa_sepsis_organ_network_and_mtu_collagen_engine.py`):**
   - Joined all `140` MIMIC-IV ICU stays (`668,862` `chartevents` rows) to `hosp_admissions` (`20` in-hospital mortalities, `base_prevalence_brier = 0.1224`).
   - Evaluated all `6` Vincent/Sepsis-3 `SOFA` organ systems (`Rice S/F = SpO2/FiO2`, platelets, bilirubin, cardiovascular `MAP` + Shock Index, neurological `GCS E+V+M`, renal creatinine) plus `Sepsis-3` Lactic Acid (`44` septic shock stays where `MAP < 65` & `Lactate > 2.0`), `qSOFA >= 2` (`122` stays), and Scheffer Critical Slowing Down (`mean_hr_csd_lag1 = 0.6375`):
     - Non-survivors average `SOFA = 13.35` vs survivors `7.75`
     - Exact Mann-Whitney mortality **`AUROC = 0.7562`** and calibrated mortality **`Brier = 0.1142`** (`< 0.1224` base prevalence Brier)
     - Strict `CLINICAL_RUO_SOFA_SPORTS_WEIGHT = 0.0` and `adr0003_rule_in_only_doctrine = True`
   - Built Hill-Zajac Muscle-Tendon Unit (`MTU`) Type-I/V procollagen remodeling mechanics coupling causal W1-10 offensive snap load, pre-kickoff rest days (`away_rest`, `home_rest`), and playing surface stiffness (`grass = 1.0` vs synthetic turf `1.14`): `KC @ DEN` W10 (`grass`, `collagen_remodeling_readiness = 0.84152`, `KC mtu_strain_energy_ratio = 1.15738`, `DEN = 1.13973`).

3. **GSE W1-10 5-Man OL Continuity, Rest/Surface, Trench Stuffing, Draft Pedigree & Skew-Debiased Prop Engine (`src/gse_engine/tracking/wave37_ol_continuity_rest_stuff_pedigree_and_skew_props_engine.py`):**
   - **Close-Residual Feature Discovery (147 completed games, causal `week < as_of_week`):**
     - **Retained Positive Unpriced Signals:** `schedule_rest_differential` (`r = +0.2968`), `ol_5man_continuity_jaccard` (`r = +0.1961`; e.g., `DEN = 1.0` vs `KC = 0.7381`), `trench_stuff_net_rate` (`r = +0.1854`), `hidden_drive_start_fp_net` (`r = +0.0975`), `screen_rpo_epa` (`r = +0.0972`), `active_draft_pedigree_index` (`r = +0.0832`), `espn_qbr_prior_z` (`r = +0.0367`), and `middle_eight_net_epa` (`r = +0.0101`).
     - **Quarantined Close-Overpriced Signals (`live_weight = 0.0`):** `third_down_conversion_diff` (`r = -0.0759`), `fourth_down_raw_wpa` (`r = -0.0440`), `highlight_explosive_play_rate` (`r = -0.0421`), and `blitz_raw_epa` (`r = -0.0342`).
   - **Skewness-Debiased Prop Tail Calibration (`1,067` Real Sportsbook Backtest Rows):**
     - Receiving Yards (`n = 659`): Empirical Bayes LogNormal-Gaussian mixture slashes mean over-bias from `0.0549` -> **`0.0023`** and cuts Brier **`0.25230` -> `0.24963`**.
     - Passing Yards (`n = 393`): Empirical Bayes debiased head cuts mean over-bias from `0.0666` -> **`0.0213`** and cuts Brier **`0.25459` -> `0.24951`**.
   - **Live `HonestEquationExecutor` ASTs (`6/6` `PARSED_EVALUATED`, `zero_fabricated_bindings = True`):**
     - `sofa_rice_sf_ratio` (`271.428571`), `hill_zajac_mtu_strain_energy` (`1.157297`), `ol_jaccard_continuity` (`1.0`), `draft_pedigree_value` (`0.2`), `trench_net_stuff_edge` (`0.00583`), and `skew_debiased_prop_over` (`0.49839`).

4. **End-to-End OOS Gains & RLVR Expansion (`272 + 24 = 296` Zero-Odds Trajectories):**
   - `147`-Game Walk-Forward Ablation improved across every single metric over Wave 36:
     - `oos_normalized_crps`: `7.0742` -> **`7.0637`** (`-0.0105`)
     - `raw_gse_v41_margin_crps`: `6.9760` -> **`6.9655`** (vs closing market `7.0108`, delta `-0.0453`)
     - `gse_v41_margin_mae`: `9.7417` -> **`9.7297`** (vs closing market `9.7687`, delta `-0.0390` pts)
     - `gse_v41_brier`: `0.21966` -> **`0.21958`** (vs closing market `0.21988`)
     - `overall_ece`: `0.07080` -> **`0.07072`** (vs closing market `0.07171`)
     - `fwl_partial_slope`: `1.411425` -> **`1.423104`** (`+0.011679`)
     - `rliable_iqm`: `0.731802` -> **`0.732125`** (`all_floors_held = true`, `monotone_ratchet_promote = true`)
   - `43,225,000`-Snap NFL PBP Trajectory Simulation Suite (`10,000` worlds x `10` spotlight + `1,000` worlds x `147` W1-10): spotlight `mean_sim_crps` improved `8.9377` -> **`8.9350`** and `147`-game `mean_sim_crps = 6.9866` beats closing market `7.0108`.
   - Expanded compiled RLVR feeds (`brain/feeds/2026-11-16/` & `brain/feeds/2026-11-17/`) from `262` to **`272`** (`272 + 24 = 296` zero-odds trajectories, `all_verifiers_passed = True`, `zero_odds_contamination = True`).
   - Main unified benchmark SHA-256: `b1a05bde7044b5b5b9c04c731a2764ceef00bfb73981e0e3253d7f7cadb8c86a`
   - Wave 37 benchmark SHA-256: `cb18a6b297c1cd5a216fd6aebf3b7f0398857ea7fd42244aa494b1b4e9153977`

---

## 2. Pipeline Wiring & Verification Artifacts

- **Modules & Exports:**
  - `src/gse_engine/science/__init__.py` & `src/gse_engine/science/wave37_gsi_sofa_sepsis_organ_network_and_mtu_collagen_engine.py`
  - `src/gse_engine/tracking/__init__.py` & `src/gse_engine/tracking/wave37_ol_continuity_rest_stuff_pedigree_and_skew_props_engine.py`
- **Connected Across All 6 Production / Evaluation Stages:**
  - `src/gse_engine/observability/walk_forward_ablation.py`
  - `src/gse_engine/compute/wave32_unified_sports_situational_live_fusion.py`
  - `src/gse_engine/compute/corpus_situational_integrator.py` (`wave37_gsi_sofa_and_ol_continuity_wired = True`)
  - `scripts/ops/gse_coach_mind_simulator.py` (`wave37_gsi_sofa_and_ol_continuity_coupled = True`)
  - `scripts/guardrails/pre_sim_total_intelligence_gate.py` (`PRE_SIM_MANDATORY_SIGNAL_MODULES`)
  - `src/gse_engine/memory/knowledge_continuity_and_gsi_rlvr_flywheel.py` (Tier 3 Group N)
- **Artifacts & Tests:**
  - `data/eval/wave37_gsi_sofa_and_ol_continuity_benchmark_2026.json` (`cb18a6b297c1cd5a`)
  - `data/eval/wave32_unified_engine_weeks1_10_and_multisport_sim_benchmark_2026.json` (`b1a05bde7044b5b5`)
  - `tests/unit/test_wave37_gsi_sofa_and_ol_continuity_skew_props_engine.py`
