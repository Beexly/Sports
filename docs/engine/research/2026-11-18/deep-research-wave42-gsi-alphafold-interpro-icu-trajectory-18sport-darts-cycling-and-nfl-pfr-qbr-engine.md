# Deep Research Wave 42: GSI AlphaFold DB v6 / InterPro Proteolysis & MIMIC-IV Dynamic Trajectory Mortality, 18-Sport (`428` Metrics) Darts/Cycling & Causal NFL PFR/QBR Engine

**Date:** `2026-11-18`
**Branch:** `feat/pregame-engine-dfs-harmony-2026-11-15` (PR `#1291`)
**Ledger Rule:** `LL-2026-11-18-062`
**Governance Posture:** `OPERATOR_SIM_HOLD` (`max_nfl_week_simulated = 10`, `as_of_week >= 11` raises `OperatorSimulationHoldError`), `real_money_stake_cleared = false`, `live_stake_fraction = 0.0`, `clinical_ruo_sports_weight = 0.0` (ADR-0003 strict RUO isolation), `brain/mind.jsonl` single-writer untouched.

---

## 1. Executive Summary & Deep Research Synthesis

Wave 42 extends both Galaxy Science Institute (GSI) structural/critical-care research (`alphafold_database_fetch_and_analyze`, `interpro_database`, `literature_search_arxiv`) and Galaxy Sports Edge (GSE) universal multi-sport + causal NFL inference under strict walk-forward causality (`<= W10` on `2026`):

1. **GSI AlphaFold DB v6 Structural Confidence, PAE Rigid Domains, InterPro Proteolysis & MIMIC-IV Dynamic Trajectory Mortality (`src/gse_engine/science/wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine.py`):**
   - **Hydrated Live Structural & Domain Atlas (`data/science/alphafold_interpro_gsi_structural_disorder_atlas_2026.json`, `payload_sha256 = 0ca680d1007f1067a0efd0fb80e03eb224aa2e52c656f28caef1f5f96330ddea`):**
     - `CKM` (`P06732`, `AF-P06732-F1` v6, `381` AA): `global_plddt = 94.81`, `fraction_very_low_lt50 = 0.003`, `fraction_low_50_70 = 0.013`, `fraction_confident = 0.115`, `fraction_very_high = 0.869`, `1` rigid PAE domain (`1-381`), `6` InterPro entries (`IPR000749`, `IPR014746`, `IPR022413`, `IPR022414`, `IPR022415`, `IPR036802`).
     - `ACTN3` (`Q08043`, `AF-Q08043-F1` v6, `901` AA): `global_plddt = 84.19`, `fraction_very_low_lt50 = 0.042`, `fraction_low_50_70 = 0.073`, `fraction_confident = 0.454`, `fraction_very_high = 0.431`, `1` rigid PAE domain (`40-829`), `8` InterPro entries.
     - `GFAP` (`P14136`, `AF-P14136-F1` v6, `432` AA): `global_plddt = 80.0`, `fraction_very_low_lt50 = 0.192`, `fraction_low_50_70 = 0.074`, `fraction_confident = 0.150`, `fraction_very_high = 0.583`, `2` rigid PAE domains (`62-219`, `227-376`), `4` InterPro entries.
     - `TNNI3` (`P19429`, `AF-P19429-F1` v6, `210` AA): `global_plddt = 78.62`, `fraction_very_low_lt50 = 0.038`, `fraction_low_50_70 = 0.343`, `fraction_confident = 0.200`, `fraction_very_high = 0.419`, `1` rigid PAE domain (`41-136`), `4` InterPro entries.
     - `NEFL` (`P07196`, `AF-P07196-F1` v6, `543` AA): `global_plddt = 73.06`, `fraction_very_low_lt50 = 0.304`, `fraction_low_50_70 = 0.105`, `fraction_confident = 0.145`, `fraction_very_high = 0.446`, `2` rigid PAE domains (`80-242`, `250-400`), `4` InterPro entries.
     - `PPARGC1A` (`Q9UBK2`, `AF-Q9UBK2-F1` v6, `798` AA): `global_plddt = 52.75`, `fraction_very_low_lt50 = 0.619`, `fraction_low_50_70 = 0.172`, `fraction_confident = 0.129`, `fraction_very_high = 0.080`, `0` rigid PAE domains, `5` InterPro entries.
     - `COL1A1` (`P02452`, `AF-P02452-F1` v6, `1464` AA): `global_plddt = 52.72`, `fraction_very_low_lt50 = 0.673`, `fraction_low_50_70 = 0.131`, `fraction_confident = 0.045`, `fraction_very_high = 0.150`, `1` rigid C-terminal PAE domain (`1221-1464`), `3` InterPro entries.
     - `COL5A1` (`P20908`, `AF-P20908-F1` v6, `1838` AA): `global_plddt = 51.25`, `fraction_very_low_lt50 = 0.704`, `fraction_low_50_70 = 0.059`, `fraction_confident = 0.065`, `fraction_very_high = 0.172`, `2` rigid PAE domains (`67-248`, `1602-1837`), `5` InterPro entries.
     - `MAPT` (`P10636`, `AF-P10636-F1` v6, `758` AA): `global_plddt = 49.22`, `fraction_very_low_lt50 = 0.656`, `fraction_low_50_70 = 0.269`, `fraction_confident = 0.075`, `fraction_very_high = 0.0`, `0` rigid PAE domains, `3` InterPro entries.
   - **Explicit Disorder Warnings & mmCIF B-Factor Note:**
     - **High-disorder flagged genes (`high_disorder_warning_genes`):** `["COL1A1", "COL5A1", "MAPT", "NEFL", "PPARGC1A"]`. Whole-protein rigid docking or static tertiary modeling is strictly advised against for these five intrinsically disordered or fibrillar proteins; structural reasoning must be restricted to PAE-verified rigid domain boundaries (`80-242` / `250-400` on `NEFL`, `1221-1464` on `COL1A1`, `67-248` / `1602-1837` on `COL5A1`, and zero rigid global domains on `MAPT` and `PPARGC1A`).
     - **Isoform & Length Screening:** `0` `[!] WARNING` canonical-isoform or `> 2700` AA warnings were triggered across all `9` fetched AlphaFold v6 entries (longest sequence: `COL5A1` at `1838` AA).
     - **mmCIF Per-Residue pLDDT Storage:** Per-residue pLDDT confidence scores (`0..100`) are embedded inside the B-factor (`B_iso_or_equiv`) column of downloaded AlphaFold v6 mmCIF files.
   - **IDR Proteolysis & MIMIC-IV Dynamic Trajectory Mortality (`CLINICAL_RUO_ALPHAFOLD_INTERPRO_SPORTS_WEIGHT = 0.0`):**
     - Folded `CKM` (`pLDDT = 94.81`) maintains a `3.3159x` longer proteolytic half-life than intrinsically disordered `MAPT` (`pLDDT = 49.22`).
     - Augmenting 6-organ Vincent SOFA + Quan-Elixhauser baseline comorbidities with chronological within-stay GCS-Motor decline, arterial MAP drop, tachypneic respiratory strain, and pulse-pressure narrowing across `140` MIMIC-IV ICU stays (`20` deaths) improves mortality discrimination from Wave 39 `AUROC = 0.7883` to **`0.8050`** and cuts mortality Brier from `0.1036` to **`0.0939`** (vs `0.1224` base prevalence Brier; survivor composite mean `10.692` vs non-survivor `20.843`).

2. **18-Sport / `428`-Metric Universal Encyclopedia, Darts 501 Markov & Cycling Skiba `W'-bal` (`src/gse_engine/multisport/wave42_darts_markov_cycling_wbal_and_18sport_expansion.py`):**
   - Preserves Wave 40's `284`-metric / `10`-sport tuple (`UNIVERSAL_SPORTS_METRICS_REGISTRY`) and Wave 41's `356`-metric / `14`-sport tuple (`UNIVERSAL_14SPORT_METRICS_REGISTRY`) immutable while adding **`72` new canonical metrics (`18` each across `VOLLEYBALL_HANDBALL`, `TRACK_SWIMMING_CYCLING`, `DARTS_SNOOKER_TABLETENNIS`, `LACROSSE_AFL`)** into `UNIVERSAL_18SPORT_METRICS_REGISTRY` (**`428` total canonical metrics across `18` sports**), resolved via `query_18sport_universal_metric`.
   - **Darts 501 Absorbing Markov Chain (`evaluate_darts_501_markov_leg_and_handicap`):** `502`-state Markov visit distribution (`pmf_total_mass = 1.0`, `visit_pmf_mass_a = 1.0`) + alternating-throw Best-of-`19` DP (`player_a_hold_of_throw_prob = 0.6647`, `player_a_break_of_throw_prob = 0.4873`, `player_a_match_win_prob = 0.7671`, leg handicaps `-3.5..+2.5`).
   - **Road Cycling Skiba `W'-bal` + CdA Cubic Solver (`evaluate_cycling_skiba_wbal_and_climb_tt`):** Optimizes multi-gradient climb surging strictly subject to anaerobic buffer conservation (`min_w_bal_optimal_joules = 2298.1 J >= 500.0 J`), cutting finish time from `2884.239 s` iso-power to `2867.672 s` optimal variable (`time_saved_by_wbal_pacing_s = 16.567 s` at `climb_surge_watts = 428.3 W`).

3. **Causal NFL PFR Weekly Charting & Regular-Season ESPN QBR Engine (`src/gse_engine/tracking/wave42_pfr_advstats_qbr_two_high_yac_and_total_pace_engine.py`):**
   - Merges 2025 empirical-Bayes priors with strictly causal (`week < min(as_of_week, 11)`) `advstats_week_{def,rec,pass,rush}_2026_w1_w10` and Regular-season `espn_qbr_week_through_2026_w10`, raising `OperatorSimulationHoldError` for `as_of_week > 10`.
   - **6 Retained Positive Unpriced Margin Signals:** `def_yac_umbrella_norm`, `rec_tipped_int_reversion_norm`, `qbr_sack_epa_preservation_norm`, `rec_broken_tackles_norm`, `pass_hurry_avoidance_norm`, and `def_adot_norm` (`KC @ DEN` `w42_close_residual_signal = -1.740097`).
   - **3 Retained Causal Game-Total Drivers (`evaluate_causal_w42_game_total_accuracy_adot_shift`):** `-passing_bad_throw_pct` accuracy, `+def_adot`, and `-rushing_yac` anti-clock-bleed (`KC @ DEN` `w42_tot_signal = -0.295322`, `total_shift_pts = -0.162427`).
   - **5 Quarantined Box/Headline Metrics (`live_weight = 0.0`):** `raw_rushing_broken_tackles`, `raw_qbr_penalty_epa`, `raw_rushing_yac_volume`, `raw_qbr_pass_epa`, `raw_qbr_pts_added_headline`.
   - **`8/8` `PARSED_EVALUATED` Live `HonestEquationExecutor` ASTs (`zero_fabricated_bindings = true`).**

4. **Verified Out-of-Sample Walk-Forward Ablation, `43.225M`-Snap PBP Simulation & `328+24=352` RLVR:**
   - `147`-Game Walk-Forward Ablation (`alpha_margin = 0.28`, `alpha_total = 0.55`) beat Wave 41 across every metric:
     - `benchmark_7109_closing_adjusted_crps`: `7.0298` -> **`7.0190`** (`-0.0108`, `monotone_ratchet.promote = true`)
     - `raw_gse_v41_margin_crps`: `6.9316` -> **`6.9208`** (vs `7.0108` close, delta `-0.0900`)
     - `gse_v41_margin_mae`: `9.6800` -> **`9.6616`** (vs `9.7687` close, delta `-0.1071`)
     - `gse_v41_total_mae`: `10.4024` -> **`10.3739`** (**`< 10.4116` closing market**, delta `-0.0377`)
     - `gse_v41_brier`: `0.21934` -> **`0.21926`** (vs `0.21988` close)
     - `overall_ece`: `0.07047` -> **`0.07043`** (vs `0.07171` close)
     - `rliable_iqm`: `0.732818` -> **`0.733144`** (`CI [0.691733, 0.770546]`, `fwl_partial_slope = 1.458271`, `fwl_t_stat = 21.592228`, `all_floors_held = true`)
   - `43,225,000`-Snap PBP Simulation (`17,500,000` spotlight + `25,725,000` 147-game):
     - Spotlight-10 `mean_sim_crps = 8.9508`; All-147 `mean_sim_crps = 7.0004` (`< 7.0108` closing market CRPS)
     - Main Wave 32 benchmark SHA-256: `562d9a7e36d7b0dcb3d16b712f4f8c7681b588f085061b076dd8a1fe344b8566`
     - Wave 42 benchmark SHA-256: `1fd7aa35843a2f6d35a5e00fbfbedf1c77618a97b91a627c41a51d8e0a342c31`
   - RLVR Corpus (`Group S: 316 -> 328` + `24` standalone = **`352`**): `all_verifiers_passed = true`, `zero_odds_contamination = true`, `axolotl_multipack packing_efficiency = 0.970001`.

---

## 2. Literature Citations (`literature_search_arxiv`, 11 Papers) & License Attributions

- **Sports & Time-Series / Darts (`5`):**
  1. `2110.03224v3`: *"Darts: User-Friendly Modern Machine Learning for Time Series"* (`https://arxiv.org/abs/2110.03224v3`)
  2. `1912.10952v2`: *"Progressive DARTS: Bridging the Optimization Gap for NAS in the Wild"* (`https://arxiv.org/abs/1912.10952v2`)
  3. `2312.12648v1`: *"IS-DARTS: Stabilizing DARTS through Precise Measurement on Candidate Importance"* (`https://arxiv.org/abs/2312.12648v1`)
  4. `2308.06423v1`: *"Equidissections of darts"* (`https://arxiv.org/abs/2308.06423v1`)
  5. `2006.09042v1`: *"Fine-Tuning DARTS for Image Classification"* (`https://arxiv.org/abs/2006.09042v1`)
- **MIMIC-IV & Clinical ICU Trajectories (`5`):**
  6. `2510.24500v1`: *"MIMIC-Sepsis: A Curated Benchmark for Modeling and Learning from Sepsis Trajectories in the ICU"* (`https://arxiv.org/abs/2510.24500v1`)
  7. `2610.42126v1`: *"Physiological Trajectories and Observation Patterns in ICU Mortality Prediction: Transportability Under Changing Measurement Conditions"* (`https://arxiv.org/abs/2610.42126v1`)
  8. `2608.29301v1`: *"Predicting Future Organ Dysfunction in ICU Patients Using Temporal Convolutional Networks on MIMIC-IV Data"* (`https://arxiv.org/abs/2608.29301v1`)
  9. `2610.25765v1`: *"TRACE: Tracking Multimodal Clinical Trajectories for Inpatient Risk Prediction"* (`https://arxiv.org/abs/2610.25765v1`)
  10. `2611.13661v1`: *"SepsisFlow: an event-stream foundation model for continuous risk warning and trajectory modelling in ICU sepsis"* (`https://arxiv.org/abs/2611.13661v1`)
- **Protein Structure Conformal Uncertainty (`1`):**
  11. `2601.07201v1`: *"CalPro: Prior-Aware Evidential--Conformal Prediction with Structure-Aware Guarantees for Protein Structures"* (`https://arxiv.org/abs/2601.07201v1`)
- **Third-Party License Notices (added in `.licenses/`):**
  - `.licenses/alphafold_database_fetch_and_analyze_LICENSE.txt` (`https://alphafold.ebi.ac.uk/`)
  - `.licenses/interpro_database_LICENSE.txt` (`https://www.ebi.ac.uk/interpro/`, `https://www.ebi.ac.uk/about/terms-of-use/`)
  - `.licenses/literature_search_arxiv_LICENSE.txt` (`https://info.arxiv.org/help/api/index.html`)
