# GSE Production Audit, Dense Chronological Calibration & 4-ArXiv-PDF Synthesis (`2026-11-20`)

**Scope & Temporal Guarantee:** Consolidates CI remediation on `Beexly/Sports @ bab3a64`, repo-wide removal of base-100 (`season * 100 + week`) rolling-window arithmetic, all 5 quantitative sports-betting & NFL analytics textbooks, all 4 peer-reviewed arXiv tracking/trench papers, all 13 local `2025–2026` nflverse/FTN/NGS/PFR/SnapCounts/Combine/PBP tables, the full **62-page GSE Master Data Compendium (49 source files)**, real FanDuel `2024` closing-prop OOS validation (`6,224` rows), and chronological MoneyPuck `2024–2026` NHL walk-forward calibration (`2,809` OOS games). Zero governance locks (`publishes_pick = false`, `00-TRUTH-FILE`) modified.

---

## 1. Failing CI Remediation on `Beexly/Sports @ bab3a64`

| Workflow | Failing Target | Root Cause | Surgical Fix |
|---|---|---|---|
| `Epistemic Calibration & Sanity Gate` (`epistemic_gate.yml`, Run `44829599996`) | [test_jev_pass_rate_calibration_and_blowout_clock_kill.py](file:///C:/c/wt-owner/tests/test_jev_pass_rate_calibration_and_blowout_clock_kill.py) | [run_week11_jev_full_game_spine.py](file:///C:/c/wt-owner/scripts/ops/run_week11_jev_full_game_spine.py) imported `from jevkit import client as jev_client` unconditionally at module top level; `jevkit` is local-only and absent on Ubuntu CI runners. | Wrapped top-level import in `try ... except ImportError: jev_client = None` and added fail-closed `RuntimeError` inside `run_week11_live_jev_spine()`. Pure helpers (`_resolve_snap`, rulebook audit, WP martingale) execute without `jevkit`. |
| Main `CI` (`ci.yml`, Run `44829599890`) | [docs-claim-accuracy.test.ts](file:///C:/c/wt-owner/apps/web/__tests__/docs-claim-accuracy.test.ts) | [HANDOFF.md](file:///C:/c/wt-owner/docs/strategy/HANDOFF.md#L1504) Tranche-7 log prose named a phantom command string in backticks while documenting its replacement. | Reworded the historical prose note so it refers to the `ops:monitor` package-script key without the false command string; `docs-claim-accuracy.test.ts` passes (`7/7`). |

---

## 2. Elimination of Base-100 (`season * 100 + week`) Starvation, 2x Sawtooth & Self-Inclusion

Encoding `(season, week)` as `season * 100 + week` creates an `82`-integer dead gap (`19..99`) between Season `S` Week `18` and Season `S+1` Week `1`, starving Weeks `1–4` lookbacks (`0..3` rows) and producing a `2x` seasonal sample-size sawtooth (`18` vs `35` weeks).

| Surface | Replacement Implemented | Behavior Preserved / Verified |
|---|---|---|
| [textbook_and_nflverse_2026_feature_engine.py](file:///C:/c/wt-owner/intelligence/calibration/textbook_and_nflverse_2026_feature_engine.py) | `chronological_nfl_week_index(season, week)` (`2025 W18 -> 89`, `2026 W1 -> 90`, step `1`), full `2025 REG -> 2026` 16-week stationary lookback, and `compute_chronological_shrunk_covariance` (Ledoit-Wolf PSD, strictly `< target_chrono_week`, zero self-inclusion). | `target_week=1, 2` priors now read non-starved `2025 REG` history while preserving exact future-week mutation invariance (`week >= 6` mutations produce zero change). |
| [calibrate_360_prop_families_walkforward.py](file:///C:/c/wt-owner/scripts/calibration/calibrate_360_prop_families_walkforward.py) | Bridged `play_by_play_2025.parquet` REG (`W1–W18`) + `play_by_play_2026.parquet` over stationary `16`-week chronological windows; scored Brier, LogLoss, Equal-Width ECE, and Equal-Mass ECE via [score_walkforward_calibration_v1.py](file:///C:/c/wt-owner/evaluation/frozen/score_walkforward_calibration_v1.py). | `early_w1_w3_scored` rose from `0` to `90–1,733` across families with constant `16`-week history width. |
| [chronological-time.ts](file:///C:/c/wt-owner/packages/prediction-engine/src/expected-metrics/chronological-time.ts) + 7 `expected-metrics/*.ts` | Replaced every `season * 100 + week`, `year * 100 + week`, and `Math.floor(... / 100)` across `drive-failure-rate.ts`, `pressure-elusiveness-collision.ts`, `snap-differential.ts`, `play-size-distribution.ts`, `sequencing-volatility.ts`, `game-script-splits.ts`, `third-down-target-share.ts`. | `107/107` expected-metrics & governance tests pass. |
| [dml-panel.ts](file:///C:/c/wt-owner/packages/prediction-engine/src/research/dml-panel.ts) | Kept `timeIndex()` pinned as an ordinal key (`evalTimeIndex(2, 5) === 205` required by `research-causal-bridge.test.ts`); added `chronologicalPanelIndex()` for gap-free window math. | `28/28` causal-bridge + `7/7` DML QB-out tests pass. |
| [props-player-inputs.ts](file:///C:/c/wt-owner/apps/web/lib/ops/props-player-inputs.ts) & [props-slate/route.ts](file:///C:/c/wt-owner/apps/web/app/api/ops/props-slate/route.ts) | Dense `18`-week chronological trailing-4 lookback bridging `season - 1` Weeks `15–18` for Weeks `1–4` while rejecting invalid `week < 1`. | `6/6` props-player-inputs tests pass including new Week `1–2` cross-season suite. |

---

## 3. Synthesis of All 5 Attached PDFs (`4` Standalone ArXiv Papers + Compendium)

1. **Pipping-Gamón, Gebauer, Lee, Watts & Wyner (`arXiv:2604.01491v2`, 27p — *Opponent-Adjusted Pass Protection & Rush*):** Ridge-penalized Bradley-Terry early-win logit + OLS disruption severity `Q_a = 0.009*hurry + 0.103*hit_pressure + 1.0*sack` with Empirical-Bayes prior smoothing (`tau = 4` games) and rusher-vs-OL stability asymmetry (`r_s ~ 0.91` vs OL assignment dependence). Unlocked `sacks` from `30.92%` -> **`67.15%` OOS accuracy (`Brier = 0.14545 < 0.14574`, `n = 2,292`)**.
2. **Yurko, Nguyen & Pelechrinis (`arXiv:2406.17220v2`, 34p — *NFL Ghosts*):** Feature-parsimonious 2D RFCDE defender catch-point positioning + **stabilization split**: **8-week window** for 1D YAC over expected (`rec_yac_oe`) vs **12-week window** for 2D defensive coverage completion/YPA allowed.
3. **Nguyen & Yurko (`arXiv:2603.17866v3`, 32p — *NFL Step-and-Turn*):** Scaled-arcsine stride multilevel model showing RB random-effect variance dominates defensive team variance (`sigma_RB = 0.0058` vs `sigma_def = 0.0035`, **`73.3%` vs `26.7%`** skill share) + von Mises concentration coupling -> `compute_nguyen_yurko_step_turn_rush_decomp()` modulates `rushing_yards` and `longest_rush`.
4. **Szekely, Sinnott, Halow & Ryan (`arXiv:2303.05774v1`, 16p — *NFL Combine*):** Combine 3-cone/40yd/broad-jump predicts matriculation (`83%` RF accuracy) yet leaves career snap volume noisy (`RMSE = 1,210`, `R^2 = 0.17`). Enforced `compute_szekely_combine_prior_weight(n_nfl)` decaying linearly to **`0.0` at `n_nfl >= 4` games**.
5. **62-Page `GSEMasterDataCompendium20261120 (1).pdf` ([gse_master_compendium_2026_loader.py](file:///C:/c/wt-owner/intelligence/calibration/gse_master_compendium_2026_loader.py)):** Strictly gated on `target_week >= 11` for Week 11+ `Defense vs QB/RB/WR/TE`, 32-team SRS/AdvPassing/Conversions, OL Penalty friction, Hardy catastrophe blitz cusp (`0.88x–1.02x`), and GCP cost-protection guardrails.

---

## 4. Verified Walk-Forward Calibration Metrics (Brier, LogLoss, Equal-Width & Equal-Mass ECE)

### NFL Chronological Walk-Forward (`2025 REG -> 2026 W4–W10` OOS, [prop_family_calibration_heads_2026.json](file:///C:/c/wt-owner/data/calibration/prop_family_calibration_heads_2026.json))
**`8/18` certified eligible families** (`walkforward_brier < market_baseline_brier` AND `walkforward_accuracy >= 0.535` AND outside single-play lottery quarantine):

| Family | `n_oos` | Early W1–3 Scored | WF Brier | Mkt Brier | WF LogLoss | WF ECE | Equal-Mass ECE | OOS Acc | Eligible |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| `sacks` | `2292` | `990` | `0.14545` | `0.14574` | `0.46098` | `0.02279` | `0.09845` | `67.15%` | **`True` (NEWLY UNLOCKED)** |
| `passing_tds` | `190` | `90` | `0.23720` | `0.25000` | `0.66748` | `0.06993` | `0.15643` | `63.16%` | **`True`** |
| `longest_rush` | `348` | `146` | `0.24158` | `0.25000` | `0.67621` | `0.05869` | `0.14034` | `61.21%` | **`True`** |
| `carries` | `348` | `146` | `0.23661` | `0.25000` | `0.66603` | `0.04878` | `0.16159` | `60.92%` | **`True`** |
| `solo_tackles` | `4099` | `1733` | `0.23622` | `0.25000` | `0.66520` | `0.04599` | `0.14925` | `60.75%` | **`True`** |
| `rushing_yards` | `348` | `146` | `0.23584` | `0.25000` | `0.66448` | `0.07697` | `0.14524` | `60.06%` | **`True`** |
| `tackles_plus_assists` | `4099` | `1733` | `0.23864` | `0.25000` | `0.67007` | `0.05467` | `0.14251` | `59.19%` | **`True`** |
| `pass_completions` | `190` | `90` | `0.24560` | `0.25000` | `0.68434` | `0.04905` | `0.13809` | `58.95%` | **`True`** |
| `pass_attempts` | `190` | `90` | `0.25129` | `0.25000` | `0.69592` | `0.04029` | `0.15042` | `54.74%` | `False` (Brier >= mkt) |
| `receiving_yards` | `846` | `376` | `0.25075` | `0.25000` | `0.69466` | `0.04479` | `0.13425` | `53.78%` | `False` (Brier >= mkt) |
| `receptions` | `846` | `376` | `0.24772` | `0.25000` | `0.68856` | `0.04554` | `0.13651` | `51.65%` | `False` (OOS < 53.5%) |
| `passing_yards` | `190` | `90` | `0.25096` | `0.25000` | `0.69514` | `0.05840` | `0.11862` | `52.11%` | `False` (Brier >= mkt) |
| `anytime_td` | `1078` | `481` | `0.20674` | `0.21036` | `0.60508` | `0.03341` | `0.13327` | `48.52%` | `False` (lottery + OOS < 53.5%) |
| `1q_*`, `longest_comp`, `longest_rec` | `190–846` | `90–376` | `0.24221–0.24858` | `0.25000` | `0.67746–0.69034` | `0.04955–0.10991` | `0.13059–0.16027` | `54.96%–58.95%` | `False` (lottery guard) |

### Real Sportsbook & Multi-Sport Verification ([textbook_and_real_sportsbook_prop_benchmark_2026.json](file:///C:/c/wt-owner/data/calibration/textbook_and_real_sportsbook_prop_benchmark_2026.json), [multisport_walkforward_heads_2026.json](file:///C:/c/wt-owner/data/calibration/multisport_walkforward_heads_2026.json))
- **FanDuel `2024` `receptions` (`n = 1,460`):** `model_brier = 0.24109` vs `fanduel_brier = 0.24446`, `model_log_loss = 0.67488` vs `0.68197`, `model_ece = 0.01719`, **`55.07%` directional accuracy**.
- **2026 22-Book NFL ML (`n = 72`):** `model_brier = 0.22291`, `model_log_loss = 0.63979`, `model_ece = 0.09572`, **`65.28%` accuracy**.
- **NHL MoneyPuck (`n = 2,809`):** `walkforward_brier = 0.24056` vs `0.24837`, `walkforward_log_loss = 0.67378`, `walkforward_ece = 0.01288`, **`57.53%` winner accuracy** (held in `TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING` without closing odds).
- **Sunday/MNF Week 11 Audit ([week11_sunday_rc1_rc13_recalibrated_card_2026_11_20.json](file:///C:/c/wt-owner/data/engine/week11_sunday_rc1_rc13_recalibrated_card_2026_11_20.json)):** `12` games, `144` props (`72` family-quarantined, `12` drift-blocked, `60` fail-closed `INV-5`, `0` leaked, SGPs quarantined).
