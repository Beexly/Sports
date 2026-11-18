# Deep Research Wave 36: GSI ADR-0003 MIMIC-IV ICU Hemodynamic & Glenohumeral Chain + GSE Full W1-W10 (`26,246`-Snap) 360-Board Engine

**Date:** `2026-11-17`
**Branch:** `feat/pregame-engine-dfs-harmony-2026-11-15` (PR `#1291`)
**Ledger Rule:** `LL-2026-11-17-056`
**Governance Posture:** `OPERATOR_SIM_HOLD` (`max_nfl_week_simulated = 10`, Week `11+` simulations held), `real_money_stake_cleared = false`, `live_stake_fraction = 0.0`, `adr0003_rule_in_only_doctrine = true`, `clinical_ruo_sports_weight = 0.0`, `brain/mind.jsonl` single-writer untouched.

---

## 1. Executive Summary

Wave 36 expands both Galaxy Science Intelligence (`GSI`) and Galaxy Sports Engine (`GSE`) across previously unhydrated official `nflverse` `2026` Weeks `1..10` feeds and clinical physiological monitoring tables while enforcing strict pre-snap causality (`week < as_of_week`), honest AST formula evaluation (`HonestEquationExecutor`), zero fabricated bindings, and monotone out-of-sample (OOS) walk-forward verification:

1. **Hydrated 10 Official `nflverse` Datasets (`14.42 MB`, `week <= 10` on all 2026 files):**
   - `data/nflverse/pbp_2026_w1_w10.parquet` (`26,246 x 372`, `11.87 MB`, `max_wk = 10`)
   - `data/nflverse/ftn_charting_2026_w1_w10.parquet` (`25,310 x 29`, `max_wk = 10`)
   - `data/nflverse/stats_player_week_2026_w1_w10.parquet` (`10,446 x 150`, `max_wk = 10`)
   - `data/nflverse/snap_counts_2026_w1_w10.parquet` (`14,004 x 16`, `max_wk = 10`)
   - `data/nflverse/advstats_week_pass_2026_w1_w10.parquet` (`317` rows, `max_wk = 10`)
   - `data/nflverse/advstats_week_rush_2026_w1_w10.parquet` (`1,093` rows, `max_wk = 10`)
   - `data/nflverse/advstats_week_rec_2026_w1_w10.parquet` (`2,180` rows, `max_wk = 10`)
   - `data/nflverse/advstats_week_def_2026_w1_w10.parquet` (`3,928` rows, `max_wk = 10`)
   - `data/nflverse/officials_through_2026_w10.parquet` (`22,012 x 9`, `max_2026_wk = 10`)
   - `data/nflverse/historical_contracts.csv.gz` (`31,893 x 24`, `1.19 MB`)
   - Dedicated `*_w1_w10` and `officials_through_2026_w10` targets preserve legacy `play_by_play_2026.parquet`, `ftn_charting_2026.parquet`, and `pennydata_2026_player_week_stats.csv`.

2. **GSI ADR-0003 MIMIC-IV ICU Critical-Care Early Warning & Fleisig Glenohumeral Kinetic Chain (`src/gse_engine/science/wave36_gsi_icu_hemodynamic_hypoxia_and_shoulder_kinetic_engine.py`):**
   - Parsed `668,862` ICU `chartevents` rows across `140` stays and `4,506` ICD diagnosis records from the local MIMIC-IV clinical vault (`clean_checkout_fallback = false`).
   - Computed Allgower Shock Index (`SI = HR / SBP`), Modified Shock Index (`MSI = HR / MAP`), mean vitals (`HR = 91.122 bpm`, `SBP = 114.69 mmHg`, `MAP = 76.355 mmHg`, `SpO2 = 96.811%`, `RR = 19.953 bpm`), Hill/Severinghaus oxyhemoglobin dissociation curve (`n_H = 2.7`, `P_50 = 26.6 mmHg`, `estimated_pao2_mmhg = 94.161 mmHg`), and Baxley anytime-valid martingale (`E_t >= 20.0`).
   - Observed `112` compensated shock stays (`SI >= 0.90`), `106` hypotensive stays (`MAP < 65`), `453` hypoxic readings (`SpO2 < 92%`), `82` Baxley rule-in stays (`E_t >= 20.0`), and a `8.6013x` steepness amplification on the Hill oxyhemoglobin cliff (`0.004049/mmHg` at `90%` vs `0.000471/mmHg` at `98%`).
   - Enforces `CLINICAL_RUO_ICU_SPORTS_WEIGHT = 0.0` and `adr0003_rule_in_only_doctrine = true`.
   - Built the Fleisig/Escamilla glenohumeral throwing kinetic chain anchored to `19` real QB shoulder surgical cases (`kaggle_qb_shoulder_injuries_zone1`, mean age `27.385`, mean experience `4.579` seasons) and causal `2026` weekly arm-injury records (`KC @ DEN` W10: `KC deep_pass_velocity_retention_mult = 0.9825`, `high_pitch_q4_accuracy_mult = 0.9875`).

3. **GSE Full W1-10 (`26,246`-Snap) 360-Board, Officials, Special Teams, QB Read-Progression & IDP Engine (`src/gse_engine/tracking/wave36_360_board_officials_special_teams_progression_and_idp_engine.py`):**
   - Quantified close-residual signal discovery across `147` completed W1-10 NFL games:
     - **Retained Unpriced Positive Signals (`w36_close_residual_signal`):** Play-action EPA (`r = +0.1278`), halftime `2H - 1H` coaching surge (`r = +0.0868`), 2nd/3rd/checkdown progression `read2_progression_epa` (`r = +0.0727`), OL non-QB-fault `ol_clean_sack_rate` (`r = +0.0698`), Special Teams `kicker_fgoe_per_att` (`r = +0.0670`), team penalty discipline (`r = +0.0446`), and `punt_inside20_rate` (`r = +0.0345`).
     - **Quarantined Close-Overpriced Signals:** 1st-read `read1_epa` (`r = -0.0550`) and raw defensive havoc (`r = -0.0416`) carry negative close residuals and are strictly excluded from live margin adjustments.
   - Indexed `17` active NFL referee crews across `22,012` official rows joined via `old_game_id` (`league_mean_penalty_yds_per_game = 101.66`; high-flag crews Alex Moore `130.94`, Adrian Hill `120.75`, Shawn Hochuli `118.61`; low-flag crews Brad Allen `81.06`, Land Clark `85.12`, Alan Eck `89.5`).
   - Verified `4,784` strictly causal Weeks `2..10` OOS player-week evaluations across all 5 full-board suites (`all_5_suites_beat_naive = true`), including Kickers and Defensive IDP (`0.5+` half-sack milestones):
     - `QB Passing Yards` (`n = 250`): Naive `64.542` -> Wave 36 EB `57.997` (`-10.14%`)
     - `RB Rushing Yards` (`n = 364`): Naive `26.590` -> Wave 36 EB `24.774` (`-6.83%`)
     - `WR/TE Receiving Yards` (`n = 1,141`): Naive `26.211` -> Wave 36 EB `24.429` (`-6.80%`)
     - `Kicker Total Points` (`n = 263`): Naive `3.302` -> Wave 36 EB `2.979` (`-9.77%`)
     - `IDP Combined Tackles` (`n = 2,766`): Naive `1.623` -> Wave 36 EB `1.551` (`-4.49%`), with `613` `0.5+` half-sack events (`0.1873` hit rate)
   - Completed OTC `31,893`-row contract-year audit (`AGENTS.md` `5B` backtest-or-cut gate: `LOGGED_EVIDENCE_ONLY`, `live_spread_weight = 0.0`) and `6/6` `PARSED_EVALUATED` live `HonestEquationExecutor` ASTs (`zero_fabricated_bindings = true`).

4. **End-to-End Pipeline Improvement & RLVR Expansion (`262 + 24 = 286` Zero-Odds Trajectories):**
   - `147`-Game Walk-Forward Ablation improved every metric monotonically over Wave 35:
     - `oos_normalized_crps`: `7.0761` -> **`7.0742`**
     - `raw_gse_v41_margin_crps`: `6.9779` -> **`6.9760`** (vs. closing market `7.0108`)
     - `gse_v41_margin_mae`: `9.7443` -> **`9.7417`** (vs. closing market `9.7687`)
     - `gse_v41_brier`: `0.21967` -> **`0.21966`** (vs. closing market `0.21988`)
     - `overall_ece`: `0.07084` -> **`0.07080`** (vs. closing market `0.07171`)
     - `fwl_partial_slope`: `1.411127` -> **`1.411425`** (`all_floors_held = true`, `monotone_ratchet_promote = true`)
   - `43,225,000`-Snap NFL PBP Trajectory Simulation Suite (`10,000` worlds x `10` spotlight games + `1,000` worlds x `147` completed W1-10 games): `mean_sim_crps = 6.9854` (down from Wave 35 `6.9913`, beating `mean_mkt_crps = 7.0108` by `-0.0254`).
   - Added `+10` Tier 3 Group M RLVR reasoning trajectories (`3` GSI ICU/shoulder + `7` GSE 360-board/officials/ST/IDP), expanding the compiled RLVR feed to `262` (`262 + 24 = 286` total zero-odds trajectories).
   - Main unified benchmark SHA-256: `0b4cb4077b17b98d56c15978f5ac1a8e9d69281a3a5b0a20b465c88260cf7ce8`
   - Wave 36 benchmark SHA-256: `10430f9da20c180293dede5e3b4b9839e0480af5b6f4f53666d0e34aa60a101d`

---

## 2. Architecture & Pipeline Wiring

### 2.1 GSI Wave 36 Module (`src/gse_engine/science/wave36_gsi_icu_hemodynamic_hypoxia_and_shoulder_kinetic_engine.py`)
- Eliminated the `science` <-> `tracking` import cycle cleanly so clinical/biomechanical RUO monitors load monotonically with zero circular dependency (`ruff check` clean, `mypy --strict` clean across all `88` `src/gse_engine` files).
- Preserves clean-checkout safety: missing MIMIC-IV external drops degrade deterministically with `clean_checkout_fallback = true` while preserving physical Hill curve math and `CLINICAL_RUO_ICU_SPORTS_WEIGHT = 0.0`.
- Warm SLA latency measured below `0.001s` (`< 0.05s` SLA ceiling) and CWD-invariant under temporary `monkeypatch.chdir(tmp_path)`.

### 2.2 GSE Wave 36 Module (`src/gse_engine/tracking/wave36_360_board_officials_special_teams_progression_and_idp_engine.py`)
- Executes `6/6` real AST formulas through `HonestEquationExecutor.parse_and_execute_honestly`:
  1. `allgower_shock_index` = `0.794507`
  2. `hill_oxyhemoglobin_sat` = `0.96811`
  3. `fleisig_gh_torque_ratio` = `1.0`
  4. `kicker_fgoe_expectation` = `0.298`
  5. `progression_read2_lift` = `0.038248`
  6. `halftime_script_surge` = `0.017825`
- Wired into every production/evaluation stage:
  - `src/gse_engine/observability/walk_forward_ablation.py`
  - `src/gse_engine/compute/wave32_unified_sports_situational_live_fusion.py`
  - `src/gse_engine/compute/corpus_situational_integrator.py`
  - `scripts/ops/gse_coach_mind_simulator.py`
  - `scripts/guardrails/pre_sim_total_intelligence_gate.py`
  - `src/gse_engine/memory/knowledge_continuity_and_gsi_rlvr_flywheel.py`

---

## 3. Verification Summary

- `data/eval/wave36_gsi_icu_and_360_board_benchmark_2026.json` (`10430f9da20c1802`): `sample_kc_at_den.gsi_icu_and_throwing.mimic_iv_icu_early_warning`, `full_360_board_w2_w10_oos`, `officiating_crews`, `contract_year_5b_audit`, `live_honest_ast`, and `stage2_deltas` validated end-to-end.
- `data/eval/wave32_unified_engine_weeks1_10_and_multisport_sim_benchmark_2026.json` (`0b4cb4077b17b98d`): `43,225,000`-snap PBP suite (`6.9854` CRPS vs `7.0108` market), `147`-game OOS ablation (`7.0742` norm CRPS, `9.7417` MAE, `0.21966` Brier, `0.07080` ECE, `1.411425` FWL), legacy `pennydata` player validation (`1,170` W2-7 evals: `QB 56.64`, `RB 24.29`, `WR/TE 24.85`, `Skill 24.72`), and Wave 36 `4,784`-eval full-board OOS verified together with `max_nfl_week_simulated = 10`.
- Dedicated regression test suite: `tests/unit/test_wave36_gsi_icu_and_360_board_w1_w10_engine.py`.
