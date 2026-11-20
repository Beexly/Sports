# Forensic Postmortem & Structural Overhaul: NFL Week 10 + Week 11 TNF (`IND 3 @ HOU 26`)

**Date:** 2026-11-20  
**Workstream:** `W10 + TNF W11 13-Root-Cause Overhaul & Walk-Forward Calibration`

---

## 1. Verified Settled Outcomes Audited

### Week 11 TNF (`IND 3 @ HOU 26`, 2026-11-19, `data/engine/tnf_ind_hou_week11_live_grade_2026_11_19.json`)
- **Top-24 Props Board:** `8-16-0` (33.3%). Main game lines (`Spread`, `Total`, `ML`) all correctly stayed `PASS`.
- **Personal Card (`personal_bankroll_52`):** `$46.00` staked, `-$31.68` realized PnL:
  - **Bucket 1 Core:** `1-4` (Wins: `C.J. Stroud OVER 1.5 Pass TDs` [3 actual]; Losses: `CJ Allen UNDER 4.5 Solo Tackles` [7 actual], `Dalton Schultz OVER 29.5 Rec Yds` [11 actual], `Tyler Warren OVER 4.5 Receptions` [1 actual], `C.J. Stroud OVER 253.5 Pass Yds` [194 actual]).
  - **Bucket 2 Fast:** `1-3` (Wins: `Will Anderson Jr. OVER 0.75 Sacks` [1.0 actual]; Losses: `Xavier Hutchinson OVER 4.5 1Q Rec Yds` [2 actual], `Tyler Warren OVER 3.5 1Q Rec Yds` [0 actual], `David Montgomery OVER 0.5 Anytime TD` [0 actual]).
  - **Bucket 3 SGPs:** `0-3` (`-$8.00`; SGP 1 `+425` 1/4 legs, SGP 2 `+550` 2/3 legs, SGP 3 `+650` 2/4 legs).
  - **DraftKings Showdown (`$6.00`):** Cash Optimal `77.89` pts (proj `99.8`), GPP Pivot `73.06` pts (proj `101.2`).

### Week 10 Systemic Pathology Summary
- Contradictory same-QB prop splits (e.g. OVER attempts + UNDER completions / OVER TDs + UNDER yards),
- Unpriced or synthetic-priced props leaking onto candidate cards without two-sided American odds,
- Pocket-statue QB rush/completion/YPC envelope distortions (missing `-1/-2` kneeldown mass or extreme completion%/YPC drift),
- Early-week injury deletions (`Out` mid-week before official inactives) and unverified QB1 mismatches vs sportsbook boards,
- Sub-1.5pt `$600` zero-snap Showdown CPT heuristics via `2.4x` fallback floor.

---

## 2. All 13 Root Causes (`RC1`–`RC13`) & Verified Code Fixes

| Root Cause | Structural Bug | Verified Implementation Fix | Verification Test |
|---|---|---|---|
| `RC1` + `RC8` | Uncalibrated JEV pass-menu skew & flat blowout lead decay | `calibrate_jev_pass_prob`, `compute_progressive_script_pass_shift`, balanced `off_play_family` prompt | `tests/test_jev_pass_rate_calibration_and_blowout_clock_kill.py` |
| `RC2` | Fixed `0.52 * total_plays` IDP pool + blind `UNDER` bets on surging roles | `compute_defense_tackle_pool_vector`, `detect_role_surge_or_line_divergence_trap`, DK solo anchoring | `tests/test_idp_tackle_pool_and_role_surge.py` |
| `RC3` | Fixed `loc_yd=31` GPD longest-play tails | Exact `N`-trial lognormal order statistic `sample_exact_n_trial_longest_play` + EB single-play priors | `tests/test_longest_play_order_statistic.py` |
| `RC4` | Continuous `Beta` 1Q/1H yardage missing zero-catch outcomes | Zero-inflated `Binomial-Dirichlet` generator `sample_discrete_window_yards` | `tests/test_zero_inflated_quarter_half_props.py` |
| `RC5` | Non-conserved receptions + inflated `66%` Anytime TD probabilities | `allocate_conserved_receptions`, `sit_mult` `[0.75, 1.35]` clamp, `compute_calibrated_anytime_td_lambda` | `tests/test_conserved_share_and_td_calibration.py` |
| `RC6` | Unpriced single-side slips, sim-vs-market drift, uncalibrated tails | `merge_two_sided_prop_odds.py`, `check_sim_market_drift_circuit_breaker`, `validateStrictTwoSidedWriteup`, `calibrate_360_prop_families_walkforward.py` | `tests/test_stage5_fail_closed_and_drift_circuit_breaker.py`, `tests/test_prop_family_walkforward_calibration.py`, `apps/web/lib/writeups/__tests__/coach-writeup-fail-closed.test.ts` |
| `RC7` | Same-QB/team correlation stacking & default synthetic `1.18x` SGPs | `construct_uncorrelated_game_card` (`<=1/athlete`, `|rho|<=0.45`, `<=6` std + A+ exception, Kelly `<=2%/8%`), `evaluate_sgp_strict_gate` (`sgp_publish_enabled=False`) | `tests/test_correlated_card_optimizer.py`, `tests/test_sgp_quarantine_and_exact_copula_gate.py` |
| `RC9` | Zero regression suite locking all 13 structural failures | Full replay regression harness | `tests/test_w10_and_tnf_w11_regression_replay.py` |
| `RC10` | +5.9 yd QB rush inflation erasing `-1/-2` kneeldown worlds | `resolve_qb_mobility_profile` (`_get_cached_mobility_pbp_df`), `calibrate_qb_rush_distribution`, removal of Gamma/Poisson QB rush corruption | `tests/test_qb_mobility_kneeldown_and_rush_calibration.py` |
| `RC11` | Premature mid-week injury deletions & book QB1 mismatches | `verify_prelock_roster_and_qb1_truth` dual-branch handling & T-75 QB1 cross-check | `tests/test_stage0_t75_roster_and_qb1_cross_check.py` |
| `RC12` | Disconnected QB `(yds, att, comp)` & contradictory same-QB bets | `enforce_joint_qb_pass_coherence` & `veto_contradictory_same_qb_props` | `tests/test_qb_pass_volume_coherence_invariant.py` |
| `RC13` | `$600` zero-snap Showdown CPT picks from `2.4x` salary floor | Hard ban on `salary <= $1000` / `< 4.5` fpts from CPT in `build_weekly_dfs_packets.py` & `build_week10_all_slates_dfs_packets.py` | `tests/test_sgp_quarantine_and_exact_copula_gate.py::test_dfs_showdown_blocks_min_salary_zero_snap_cpt` |

---

## 3. Strictly Causal Walk-Forward Calibration Summary (`2026 Weeks 1–10` PBP, OOS Weeks `4–10`)

Measured by `scripts/calibration/calibrate_360_prop_families_walkforward.py` $\to$ `data/calibration/prop_family_calibration_heads_2026.json`:

| Prop Family | `w_sim` | `Temp` | `Cap` | OOS Brier | Market Baseline | OOS Acc | `n_oos` | Eligible? |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| `passing_tds` | 0.55 | 1.15 | 0.70 | 0.2343 | 0.2500 | 0.621 | 182 | **True** |
| `solo_tackles` | 0.55 | 1.15 | 0.74 | 0.2386 | 0.2500 | 0.585 | 3811 | **True** |
| `tackles_plus_assists` | 0.55 | 1.15 | 0.70 | 0.2416 | 0.2500 | 0.572 | 3811 | **True** |
| `carries` | 0.55 | 1.00 | 0.62 | 0.2445 | 0.2500 | 0.570 | 300 | **True** |
| `pass_attempts` | 0.55 | 1.15 | 0.74 | 0.2446 | 0.2500 | 0.555 | 182 | **True** |
| `rushing_yards` | 0.55 | 1.15 | 0.70 | 0.2455 | 0.2500 | 0.553 | 300 | **True** |
| `receptions` | 0.45 | 1.00 | 0.66 | 0.2482 | 0.2500 | 0.543 | 753 | **True** |
| `1q_pass_yds` | 0.55 | 1.15 | 0.74 | 0.2454 | 0.2500 | 0.544 | 182 | **False** (Quarantined) |
| `1q_rec_yds` | 0.15 | 0.55 | 0.62 | 0.2505 | 0.2500 | 0.477 | 753 | **False** (Quarantined) |
| `1q_rush_yds` | 0.15 | 0.55 | 0.62 | 0.2516 | 0.2500 | 0.497 | 300 | **False** (Quarantined) |
| `longest_comp` | 0.15 | 0.55 | 0.62 | 0.2500 | 0.2500 | 0.511 | 182 | **False** (Quarantined) |
| `longest_rec` | 0.35 | 0.70 | 0.62 | 0.2498 | 0.2500 | 0.531 | 753 | **False** (Quarantined) |
| `longest_rush` | 0.55 | 1.00 | 0.70 | 0.2480 | 0.2500 | 0.540 | 300 | **False** (Quarantined) |
| `anytime_td` | 0.15 | 0.55 | 0.70 | 0.2171 | 0.2232 | 0.330 | 966 | **False** (Quarantined) |
| `sacks` | 0.15 | 0.55 | 0.74 | 0.1173 | 0.0884 | 0.099 | 3811 | **False** (Quarantined) |
| `passing_yards` | 0.25 | 1.15 | 0.62 | 0.2509 | 0.2500 | 0.527 | 182 | **False** (Quarantined) |
| `pass_completions` | 0.45 | 1.15 | 0.66 | 0.2501 | 0.2500 | 0.511 | 182 | **False** (Quarantined) |
| `receiving_yards` | 0.15 | 0.55 | 0.62 | 0.2515 | 0.2500 | 0.489 | 753 | **False** (Quarantined) |
