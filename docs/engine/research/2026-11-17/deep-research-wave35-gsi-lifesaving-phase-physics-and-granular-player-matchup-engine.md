# Wave 35 Deep Research: GSI Life-Saving Phase-Transition Physics & GSE Granular Player-vs-Defender Micro-Metrics Engine

- **Date:** 2026-11-17
- **Branch:** `feat/pregame-engine-dfs-harmony-2026-11-15` (PR `#1291`)
- **Primary Engine Modules:**
  - GSI Phase-Transition & Tissue Skill-Channel Engine: `src/gse_engine/science/wave35_gsi_lifesaving_neuro_cardiac_and_tissue_phase_engine.py`
  - GSE Granular Player-vs-Defender Micro-Metrics & Live AST Engine: `src/gse_engine/tracking/wave35_player_micro_metrics_and_matchup_physics_engine.py`
- **Verification Suite:** `tests/unit/test_wave35_gsi_lifesaving_and_player_micro_metrics.py`
- **Governance Holds:** `nfl_week_11_plus_sim_hold=OPERATOR_SIM_HOLD`, `real_money_stake_cleared=false`, `live_stake_fraction=0.0`, `single_writer_mind_jsonl_untouched=true`, `adr0003_rule_in_only_doctrine=true`, `clinical_ruo_sports_weight=0.0`

---

## 1. Executive Mission Alignment (GSE + GSI Dual Sovereign Mandate, Zero Snapshare Reductionism)

Wave 35 permanently retires lazy team-level "snapshare" injury caps and coarse season averages across both halves of our sovereign engineering architecture:

1. **GSI ("Save Lives & Change Lives" - ADR-0003 Phase-Transition Sports Medicine):** Replaces binary availability heuristics with multi-scale viscoelastic neuro-trauma wave propagation, 500 Hz Koopman/Takens cardiac stability monitoring, Stull psychrometric exertional heat/altitude tracking, and 6 orthogonal biomechanical tissue-skill multipliers fitted across `15,400` longitudinal NFL injury and practice records. All translational clinical biomarkers run strictly under `adr0003_rule_in_only_doctrine = true` with `clinical_ruo_sports_weight = 0.0`.
2. **GSE (Granular Player-vs-Defender Football Intelligence):** Hydrates `9` additional official `nflverse` Next Gen Stats, weekly PFR advanced charting, 11-on-11 participation, and FTN charting tables on top of `24` existing omni-vaults, pairing individual runner speed-to-LOS and broken-tackle elusiveness against opposing linebacker A/B/C/D-gap fill rates, QB intended air yards against charted catchable-pass accuracy, and WR separation/cushion against individual DB yards-per-target and Man/Zone shells, executed through live `HonestEquationExecutor` AST formulas over bitemporally dated CSV vaults.

---

## 2. Pillar I: GSI Life-Saving & Career-Saving Phase-Transition Science

Implemented in `src/gse_engine/science/wave35_gsi_lifesaving_neuro_cardiac_and_tissue_phase_engine.py` and exported via `src/gse_engine/science/__init__.py`:

### 2.1 Sub-Concussive CTE Viscoelastic Waveguide & Non-Abelian `D(S_3)` Hysteresis

- **Multi-Mode Relaxation & Hyperelastic Tissue Law (`evaluate_gsi_cte_subconcussive_waveguide`):** Models white-matter axonal shear accumulation through a 3-mode Prony viscoelastic series (`tau_1 = 0.05 s`, `tau_2 = 2.50 s`, `tau_3 = 65.0 s`; modal weights `0.25, 0.30, 0.45`), Ogden pre-strain stiffening (`alpha = 4.2`, matching the embedded C++20 `gsi_cte_viscoelastic_waveguide_kernel.cpp`), sulcal geometric focusing (`2.15 + 0.65 * |sin(theta)|`), non-abelian `D(S_3)` braid norm, and Betti-1 microtear persistence (`2.90491` under rapid sequence).
- **Binary 10 Hz Kinematics & CARE Biomarker Kinetics:** Parses real `4,900`-byte `nfl_10hz_kinematics_stream.bin` (`175` frames at `28` bytes `<7f`: `peak_speed_yds_s = 5.045`, `peak_accel_g = 1.265`, `peak_jerk_10hz = 1.264`) and propagates two-compartment plasma decay kinetics calibrated to NCAA-DoD CARE references (`GFAP = 0.07063 ng/mL`, `UCH_L1 = 0.19927 ng/mL`, `NFL_LIGHT = 0.03875 ng/mL` at `12 h`).
- **Measured Inter-Impact Cadence Hysteresis (`+65.4%` Sulcal Shear):** Under identical linear/rotational impulses (`26g/30g/32g`), an unrelaxed hurry-up tempo (`dt = 35 s < tau_3 = 65 s`) drives sulcal waveguide peak stress to **`48.951 kPa`** compared against **`29.593 kPa`** at rested cadence (`dt = 300 s`, `cte_inter_impact_hysteresis_verified = true`).

### 2.2 Koopman EDMD & Takens 500 Hz 8-Lead ECG V-Fib Interception + WBGT Heat Safety

- **Cardiac Spectral & Phase Coherence (`evaluate_gsi_koopman_cardiac_and_wbgt_autonomic_safety`):** Decodes `24,000`-byte 8-lead telemetry `mimic_ecg_500hz_stream.bin` (`500` frames of `48` bytes `<QI8fI`) into Koopman EDMD spectral radius (`1.00015`), Takens phase-braid coherence (`1.48573`), standing-wave synchronization index (`0.97102`), and Navier-Stokes circular phase resultant `R = 0.1746` (preventing false arrhythmia triggers from opposed-half cancellation).
- **Exertional Heat & Altitude Autonomic Index:** Couples Stull psychrometric wet-bulb globe temperature (`WBGT`, triggering `exertional_heat_cardiac_protocol_flag = true` at `WBGT >= 27.8 C` or `thermal_strain_index >= 0.75`) with body-mass surface dissipation (`mass_lbs / 220` ^ `0.35`) and barometric `altitude_po2_ratio = exp(-alt_ft / 27600)` (e.g., `0.82588` at Denver `5,280 ft`).

### 2.3 Longitudinal `15,400`-Row Injury/Practice Rupture Hazard & 6 Orthogonal Skill Channels

- **Weibull Non-Contact Tissue Hazard (`evaluate_gsi_longitudinal_injury_and_tissue_mechanics`):** Scans `15,400` longitudinal NFL injury and Wed-Fri practice rows (`injuries_2024.csv`, `injuries_2025.csv`, `injuries_2026.csv`, strictly gated `yr in {2024, 2025} or (yr == 2026 and week <= as_of_week)` with pre-week recurrence tracking `1.25x` and synthetic-turf torque multiplier `1.18x` on `16` synthetic-turf venues vs. `1.0x` grass).
- **Six Orthogonal Biomechanical Skill-Channel Multipliers:** Rather than cutting player minutes blindly via a scalar "snapshare", specific anatomical pathology attenuates the exact kinematic demand it impairs while leaving orthogonal skills intact:
  1. `burst_speed_to_los_mult`
  2. `lateral_cut_separation_mult`
  3. `deep_ball_velocity_air_yds_mult`
  4. `contact_elusiveness_mult`
  5. `gap_fill_leverage_mult`
  6. `ball_security_fumble_hazard_mult`
- **Verified Week 10 Examples:** At Denver (`DEN` natural grass, `turf_torque_multiplier = 1.0`), `KC` (`242` prior soft-tissue rows, `12` Week 10 entries) registers `max_non_contact_rupture_chi = 0.3125` (`Jaylon Moore`: `lateral_cut_separation_mult = 0.9437`, `burst_speed_to_los_mult = 0.9563`). On Buffalo's synthetic turf (`BUF` `turf_torque_multiplier = 1.18`), both `CIN` (`182` prior events, `Kyle Dugger` `chi = 0.3687`) and `BUF` (`263` prior events, `Spencer Brown` `chi = 0.3687`, `lateral_cut_separation_mult = 0.9336`) reflect elevated non-contact lower-extremity torque stress.

---

## 3. Pillar II: GSE Granular Player-vs-Defender Micro-Metrics & Live Symbolic ASTs

Implemented in `src/gse_engine/tracking/wave35_player_micro_metrics_and_matchup_physics_engine.py` and exported via `src/gse_engine/tracking/__init__.py`:

### 3.1 Nine Newly Hydrated Official `nflverse` & Tracking Datasets (`data/nflverse/`)

| Dataset File | Shape (`rows x cols`) | Primary Micro-Metrics Extracted (Causal `week < as_of_week`) |
| --- | --- | --- |
| `ngs_rushing.csv.gz` | `6,409 x 22` (`2016..2026`, `350` in `2026`) | `avg_time_to_los`, `rush_yards_over_expected_per_att`, `efficiency`, `>=8 defenders %` |
| `ngs_passing.csv.gz` | `6,273 x 29` (`2016..2026`, `340` in `2026`) | `avg_intended_air_yards`, `aggressiveness` (tight-window %), `avg_time_to_throw`, `CPOE` |
| `ngs_receiving_2016_2026.csv.gz` | `15,544 x 23` (`2016..2026`, `813` in `2026`) | `avg_separation`, `avg_cushion`, `avg_yac_above_expectation`, `% intended air yards` |
| `advstats_week_pass_2025.parquet` | `684 x 24` | Weekly PFR bad-throw, on-target, drop, and pressure-pocket progression baselines |
| `advstats_week_rush_2025.parquet` | `2,355 x 16` | Weekly PFR yards before/after contact and broken tackles |
| `advstats_week_rec_2025.parquet` | `4,533 x 17` | Weekly PFR target depth (`aDOT`), drops, YAC, and broken tackles after catch |
| `advstats_week_def_2025.parquet` | `7,926 x 29` | Weekly PFR individual defender `tgt`, `yds_tgt`, `cmp_percent`, and `m_tkl_percent` |
| `ftn_charting_2025.parquet` | `47,316 x 29` | Multi-season FTN catchable-ball, contested, interception-worthy, and blitz priors |
| `pbp_participation_2025.parquet` | `45,184 x 26` | 11-on-11 personnel & defensive `MAN_COVERAGE` vs. `ZONE_COVERAGE` shell frequencies |

### 3.2 Runner Speed & Elusiveness vs. Linebacker A/B/C/D-Gap Fill (`evaluate_rb_speed_elusiveness_vs_lb_gap_fill`)

- Pairs NGS RB `avg_time_to_los`, `rush_yards_over_expected_per_att`, and PFR broken-tackle rate (`brk_tkl / att`) directly against defensive front/LB **gap-fill %** (`rushing_yards <= 2` across `middle`, `guard`, `tackle`, `end` lanes in `2025` `wt=0.45` + causal `2026` PBP `wt=1.0`), front **stuff rate** (`rushing_yards <= 1 | tackled_for_loss`), and PFR `lb_db_missed_tackle_pct`.
- **Week 10 Observed Divergence:** In `KC @ DEN`, `DEN`'s front fills `50.14%` of rushing lanes at `<= 2 yds` (`middle: 54.76%`, `guard: 50.21%`, `tackle: 44.00%`, `end: 49.11%`), yielding an away RB edge of `-0.094032`. In `CIN @ BUF`, `BUF`'s runners hit the line faster (`2.5926 s` vs. `CIN` defense `42.87%` LB gap-fill and `30.24%` stuff rate) with `+0.9247 RYOE/att`, yielding `home_rb_vs_away_lb_edge = +0.126844`.

### 3.3 QB Intended Air Yards & Charted Catchable Balls per Attempt (`evaluate_qb_air_yards_and_catchable_accuracy`)

- Inner-joins `ftn_charting_2026.parquet` onto 372-column `play_by_play_2026.parquet` (`week < as_of_week`) stratified by short (`< 10 air yds`) vs. deep (`>= 15 air yds`) throws, blending FTN `is_catchable_ball / pass_attempt`, `is_interception_worthy / pass_attempt`, and `mean_air_yards` with NGS passing `avg_intended_air_yards`, tight-window `aggressiveness`, and `ngs_cpoe`.
- **Week 10 Observed Divergence:** `CIN` QBs post `0.73362` catchable balls per pass attempt (`7.362` air yds, `+0.03091` CPOE, edge `+0.046197`) vs. `BUF` `0.66667` (`8.227` air yds), while in `KC @ DEN`, `KC` (`0.68342` catchable, `6.444` air yds) outperforms `DEN` (`0.62445` catchable, `6.406` air yds).

### 3.4 WR Separation & YACOE vs. DB Coverage & 11-on-11 Shells (`evaluate_wr_separation_vs_db_coverage`)

- Pairs NGS receiver `avg_separation`, `avg_cushion`, and `avg_yac_above_expectation` against opposing secondary `db_yds_per_tgt_allowed`, `db_comp_pct_allowed`, `pbp_participation_2025` (`45,184` plays) Man/Zone share, and `173,150` BDB26 Sumer defender coverage responsibility rows.
- **Week 10 Observed Divergence:** In `CIN @ BUF`, `BUF` pass catchers generate `3.4413 yds` average separation against a `CIN` secondary surrendering `8.2935 yds/tgt` (`64.99%` completion allowed, `36.58%` Man, edge `+0.037874`), whereas in `KC @ DEN`, `DEN`'s DBs hold receivers to `6.9272 yds/tgt` and `60.37%` completion (`44.39%` Man).

### 3.5 Bitemporal Dated CSV Sweep & Live `HonestEquationExecutor` AST Bindings (`evaluate_dated_csv_and_live_ast_equations`)

- Scans all `2,584` CSV tables under `docs/` using repo-relative path date extraction (`r"(202\d-\d{2}-\d{2})"`), enforcing strict pre-cutoff gating (`247 / 2,584` visible at Week 3 `<= 2026-09-23`; `2,221 / 2,584` visible at Week 10 `<= 2026-11-11`).
- Evaluates `6` physical/statistical equations (`wr_sep_db_yield`, `rb_speed_lb_gap_edge`, `qb_catchable_air_expectation`, `prony_relaxation_tau3`, `sulcal_stress_ratio`, `am_gm_trench_damping`) live via `intelligence.equations.honest_equation_executor.parse_and_execute_honestly(..., allow_domain_probe=False)` with `zero_fabricated_bindings = true` and `6/6` `PARSED_EVALUATED` status.

---

## 4. Pillar III: Out-of-Sample Empirical Results (`147` Games, `1,170` Player-Weeks, `43.225M` Snaps)

### 4.1 Out-of-Sample Closing-Spread Residual Discovery (`n = 147` Weeks 1-10)

Empirical testing across all `147` completed 2026 NFL games revealed which causal micro-metrics carry genuine unpriced spread signal vs. where naive assumptions mislead:

- **Positive Unpriced Close-Residual Correlations Retained:**
  - RB speed-to-LOS differential (`away_rb_time_to_los_sec - home_rb_time_to_los_sec`): **`r = +0.1308`**
  - WR separation edge (`home_wr_avg_separation_yds - away_wr_avg_separation_yds`): **`r = +0.1057`**
  - Defensive front stuff rate edge (`home_stuff - away_stuff`): **`r = +0.0507`**
  - GSI longitudinal collagen rupture hazard edge (`away_chi - home_chi`): **`r = +0.0425`**
  - LB gap-fill % edge (`home_lb_gap_fill - away_lb_gap_fill`): **`r = +0.0267`**
  - QB catchable balls per attempt differential (`home_catchable - away_catchable`): **`r = +0.0258`**
- **Falsified Naive Hypotheses (Explicitly Quarantined from Positive Spread Weights):**
  - Raw small-sample PFR RB broken-tackle rate correlated negatively with spread residuals (`r = -0.0931`), and FTN QB interception-worthy rate also showed an inverse sign (`r = -0.1249`), because market spreads already overprice highlight broken-tackle clips while high-EPA aggressive QBs generate more risk-adjusted attempts.
  - On `WR/TE` (`n = 761`), scaling L1 yardage predictions directly by raw `ngs_receiving` `avg_separation` slightly worsened L1 MAE (`24.85 -> 24.91`) because tight ends and flat routes carry wider separation than vertical threats on right-skewed yardage distributions; restricting `WR/TE` Wave 35 adjustments (`micro_scale = 0.5`) to GSI `lateral_cut_separation_mult` injury attenuation preserved `24.85` while tightening combined skill MAE to **`24.72`**.

### 4.2 Causal Player-Week OOS Projection Progression (`n = 1,170` Evaluable Weeks 2-7)

| Position Cohort (`evals`) | Naive Baseline MAE | Wave 34 MAE | Wave 35 Micro + GSI MAE | Hard Floor | Verdict |
| --- | --- | --- | --- | --- | --- |
| `QB Passing Yards` (`n = 172`) | `65.73` | `56.85` | **`56.64`** (`-13.83%`) | `<= 58.77` | **IMPROVED** |
| `RB Rushing Yards` (`n = 237`) | `26.73` | `24.61` | **`24.29`** (`-9.15%`) | `<= 25.87` | **IMPROVED** |
| `WR/TE Receiving Yards` (`n = 761`) | `27.46` | `24.85` | **`24.85`** (`-9.51%`) | `N/A` | **HELD** |
| `Combined Skill` (`n = 998`) | `27.29` | `24.79` | **`24.72`** (`-9.42%`) | `<= 25.29` | **IMPROVED** |

### 4.3 Walk-Forward 147-Game Ablation, Full-Season PBP Simulation & RLVR Corpus

| System Metric (`147` Completed Games Weeks 1-10) | Closing Market | Wave 34 | Wave 35 Coupled | Verdict |
| --- | --- | --- | --- | --- |
| Normalized CRPS (`7.109` Close, Floor `<= 7.0944`) | `7.1090` | `7.0889` | **`7.0761`** (`6.9779` raw) | **IMPROVED & BEATS CLOSE** |
| Margin MAE (pts) | `9.7687` | `9.7612` | **`9.7443`** | **IMPROVED & BEATS CLOSE** |
| Win Probability Brier Score | `0.21988` | `0.21975` | **`0.21967`** | **IMPROVED & BEATS CLOSE** |
| Overall Calibration ECE (`4`-bin) | `0.07171` | `0.06419` | **`0.07084`** | **BEATS CLOSE** |
| FWL Partial Slope (Close-Residual Skill) | `0.0000` | `1.40949` | **`1.411127`** | **IMPROVED & ORTHOGONAL** |
| Full-Season PBP (`43.225M` Snaps) 147-Game Mean CRPS | `7.0108` | `6.9889` | **`6.9913`** (`8.9389` 10-game `10k`) | **BEATS CLOSE** |

Additional verification gates passed: `ruff check` (`0` errors), `mypy --strict src/gse_engine` (`86` files, `0` issues), `pre_sim_total_intelligence_gate.py --self-test` (`PASS`, `0` dead leaves, `0` silent excepts), warm Stage-2 SLA `< 0.05 s`, NFL Week 11 `OperatorSimulationHoldError` enforced, `8` sports x `10,000` = `80,000` worlds conserved, and RLVR corpus expanded to **`252` compiled + `24` standalone = `276` pure-ASCII zero-odds trajectories**.
