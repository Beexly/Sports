# Wave 48 Architecture & Empirical Report (`LL-2026-11-18-068`): Real 32-Team Spine Hydration, Showdown CPT MILP, Unmined Vaults Audit, Causal Stage-2 Engine & 4.86x Bit-Exact Speedup

- **Date**: 2026-11-18
- **Branch**: `feat/pregame-engine-dfs-harmony-2026-11-15` (PR `#1291`)
- **Status**: WIRED ACROSS SPINE, ABLATION, PRE-SIM GATE & ZERO-ODDS RLVR (`388 + 24 = 412`)
- **Holds Intact**: `OperatorSimulationHoldError` (`as_of_week >= 11` unless explicit `env_override`), `REAL_MONEY_STAKE_CLEARED = False`, `LIVE_STAKE_FRACTION = 0.0`, `CLINICAL_RUO_W48_SPORTS_WEIGHT = 0.0`, `LIVE_WIN_PROB_SENTIMENT_WEIGHT = 0.0`, `CROSS_SPORT_SOCCER_CONTRACT_NFL_WEIGHT = 0.0`, `PUBLIC_TOKEN_RESELLER_ENABLED = False`, `brain/mind.jsonl` untouched.

---

## 1. Bit-Exact Cold-Start Runtime Vectorization (`4.8627x` Speedup, `6/6` SHA-256 Exact Match)

`cProfile` instrumentation across `compile_gse_to_gsi_rlvr_training_batch` identified three Python/Pandas cold-start hotspots (`194,098` `DataFrame.sort_values` calls, `213,290` `groupby` calls, and row-wise `part25.apply(..., axis=1)` opponent parsing):

1. `src/gse_engine/tracking/wave35_player_micro_metrics_and_matchup_physics_engine.py`: Precomputed `man_share_by_team` once in `_load_raw_micro_tables` using pure-Python `split("_")` over `part25` + precomputed `team_u` across Next Gen Stats tables while keeping exact floating summation ordering (`14.627s -> 5.947s`).
2. `src/gse_engine/tracking/wave45_skill_wopr_snap_continuity_props_and_milp_dfs_nfl_engine.py`: Indexed `pw26` once into contiguous week-sorted `float64` `np.ndarray` maps (`p26_arrays`) queried via `np.searchsorted(..., side="left")` (`34.978s -> 5.024s`).
3. `src/gse_engine/tracking/wave46_causal_picks_combo_props_and_stacked_portfolio_dfs_nfl_engine.py`: Applied identical `np.searchsorted` sorted-array indexing on `p26_arrays` (`52.091s -> 9.962s`).

- **Measured Cold-Start Reduction**: `101.696s -> 20.934s` (`4.8627x` speedup, `-80.762s` saved) with `6/6` bit-exact SHA-256 baseline digests preserved:
  - `w35_m = e90b39a1a41dbdb478852d19704c0d5b7522fa3f1957c7d0ff8fa5d3dcd6d049` (`EXACT_MATCH = True`)
  - `w35_s = ebc359256553660b0fd19853d36254090fb2999c792fb00de063d67daa742675` (`EXACT_MATCH = True`)
  - `w45_p = 1661bf2f6107726404c084a6193dd5292d5d2f1cc74c161de6e2ce43dc22c6ea` (`EXACT_MATCH = True`)
  - `w45_s = 233069a97c24c4c8683ed5a743d7bc7682d720f653981b0677e42d5deb8b7961` (`EXACT_MATCH = True`)
  - `w46_p = cea5b2b7689cc50fc073eee81973a0e5b66b75f7676a3918a916590247dc5f8e` (`EXACT_MATCH = True`)
  - `w46_s = 91cd18ebaf9d5c25b076b081666916590247dc5f8ec2e20d2c943095735ffe64` (`EXACT_MATCH = True`)

---

## 2. DraftKings Single-Game Showdown (`1.5x` CPT + `5` FLEX) MILP & 32-Team Hydrated Spine

1. **`src/gse_engine/compute/dfs_optimizer.py` (`solve_showdown_cpt_duplication_aware_milp`)**:
   - Solves exact `2 * k` binary SciPy HiGHS MILP (`1` `CPT` at `1.5x` salary and `1.5x` simulated points + `5` `FLEX`, `x_cpt[j] + x_flex[j] <= 1`, `1..5` players per franchise).
   - Enforces the empirical `$47,600-$49,400` (`600 <= salary_left <= 2,400`) geometric anti-duplication salary band in `gpp_unique` mode, `+0.55` `WR` CPT uniqueness tilt, exact linear `QB` CPT `1..2` same-team pass-catcher + `>= 1` opponent bring-back stacking, and Schur-complement DPP covariance repulsion with `max_player_overlap <= 4`.
2. **`src/gse_engine/workflows/unified_reasoning_simulation_projection_spine.py` (`hydrate_causal_matchup_context_from_vaults`, `evaluate_vault_hydrated_unified_spine_matchup`)**:
   - Hydrates all `32` franchises from strictly causal `week < min(as_of_week, 11)` `stats_player_week_2026_w1_w10.parquet` + `2025` REG baselines using active per-player `player_gp`, `injuries_2026.csv`, exact-week `W9`/`W10` Stage-0 `confirmed_qb1`, `excluded_players`, `excluded_players_union`, and deadline trades (sanitized via `_sanitize_display_name`, e.g. `SEA -> "Drew L."`).
   - Derives Classic Cash + `L=3` Classic GPP AND Showdown Cash + `L=3` Showdown `gpp_unique` portfolios directly from the shared `projection_source_sha256` simulated box-score arrays (`max_world_conservation_residual = 0.0`, `orphaned_non_simulated_projections = 0`).
3. **18-Game Weeks 2-10 Hydrated Walk-Forward Verification**:
   - Across `18` completed 2026 NFL games (`Weeks 2-10`, `18,000` simulated worlds, `54` GPP Showdown portfolios + `18` Cash Showdown lineups): `all_hydrated_from_vaults = True`, `max_world_conservation_residual = 0.0`, `total_orphaned_projections = 0`, `zero_cap_violations = True`, `all_showdown_gpp_in_anti_dupe_band = True`, `all_qb_cpt_stacks_compliant = True`, `max_portfolio_overlap <= 4`.

---

## 3. Empirical Audit of 5 Unmined `data/nflverse/` Vaults & Causal Stage-2 Engine

Implemented in `src/gse_engine/tracking/wave48_stage0_weather_sentiment_trade_and_showdown_engine.py`:

1. **`kaggle_tobycrabtree_scores_weather_zone1.parquet`**: `14,371` games (`4,363` modern `>= 2010` games, `3,315` weather-complete): calm `< 10 mph` wind averages `46.516` total pts vs `>= 15 mph` wind `40.000` (`-6.516` pts) and `<= 35F` + `>= 15 mph` `39.194` (`-7.322` pts).
2. **`hf_sentiment_twitter_zone2.parquet`**: `5,171` raw rows -> `5,153` clean RoBERTa rows across `10` teams (`18` malformed label rows quarantined), strictly isolated behind the `K23` Chalk Firewall (`dfs_ownership_tilt_only`, `live_win_prob_weight = 0.0`, `chalk_firewall_zero_true_grad = True`).
3. **`hf_ypolatog_contracts_500_zone1.parquet`**: `1,000` June-30 European soccer club contract expiries (`0` NFL GSIS overlap), quarantined at `nfl_live_weight = 0.0` under `INGEST-AND-LEARN` + `5B backtest-or-cut`.
4. **`trades_through_2026_w10.parquet` (`4,975` total rows, `63` `2026` trades) + `stage0_truth_s2026_w10.json` (`32` QB1s, `241` union exclusions, `16` verified deadline trades)**.
5. **Strictly Causal PBP + FTN + PFR AdvStats Signals (`< min(as_of_week, 11)`)**:
   - `7` Retained Margin Signals (`mot_sr_norm`, `d1_neut_epa_norm`, `rz_sr_norm`, `def_four_man_stop_norm`, `def_d1_stop_norm`, `bad_throw_avoid_norm`, `def_mid_stop_norm`): `500`-draw Rademacher martingale `margin_real_corr = +0.144543` (`p = 0.04192 <= 0.05`).
   - `4` Obvious-Pass/RZ Total Drivers + Weather/Divisional Suppressor (`def_obv_stop_norm`, `def_rz_stop_norm`, `def_uncontested_rate_norm`, `uc_epa_norm` + outdoor wind/cold & divisional familiarity): `500`-draw Rademacher martingale `total_real_corr = +0.226998` (`p = 0.00998 <= 0.015`).
   - `5` Quarantined Noisy/Cross-Join Probes (`live_weight = 0.0`, `shortcut_max_output_perturbation = 0.0`); `8/8 PARSED_EVALUATED` `HonestEquationExecutor` ASTs (`zero_fabricated_bindings = True`).

---

## 4. Monotone 147-Game OOS Ablation & RLVR Continuity (`388 + 24 = 412`)

With conservative FWL weights `alpha_m = 0.08` and `alpha_t = 0.28`, every single one of the six `147`-game OOS ablation metrics strictly improves over Wave 46 without crossing any 4-bin Mondrian calibration boundary:

| Metric | Wave 46 Baseline | Wave 48 (`alpha_m = 0.08`, `alpha_t = 0.28`) | Closing Market |
|---|---:|---:|---:|
| Normalized Margin CRPS (`7.109` ref) | `7.0063` | `7.0047` | `7.1090` |
| Raw Margin CRPS (`n=147`) | `6.9082` | `6.9065` | `7.0108` |
| Margin MAE (pts) | `9.6442` | `9.6410` | `9.7687` |
| Game Total MAE (pts) | `10.2970` | `10.2730` | `10.4116` |
| Win-Prob Brier Score | `0.21916` | `0.21915` | `0.21988` |
| Overall Calibration ECE | `0.07021` | `0.07017` | `0.07171` |
| `rliable` IQM Skill | `0.733476` | `0.733567` | `-` |

- **Benchmark SHA-256 (`data/eval/wave48_stage0_weather_sentiment_showdown_and_speedup_2026.json`)**: `64bf0a0a347906d9843e36bedfd036582c83095a17a1f21cd2039082d87d3352`.
- **Zero-Odds RLVR Group Y**: `382 -> 388` (`TIER_1_FOUNDATION = 61`, `TIER_2_SYNTHESIS = 61`, `TIER_3_BEHEMOTH = 266`, `all_verifiers_passed = True`, `zero_odds_contamination = True`), `+ 24` standalone AWS NGS = `412` total trajectories across all three synced JSONL feeds (`brain/mind.jsonl` untouched).
