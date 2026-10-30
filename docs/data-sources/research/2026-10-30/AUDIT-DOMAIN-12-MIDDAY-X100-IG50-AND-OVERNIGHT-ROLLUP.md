# AUDIT-DOMAIN-12 — Midday-X100 Situational Harvest, Dual Postgame Luck Grader & Standing Overnight Items (Items 7–9 Only)

**Date:** 2026-10-30  
**Scope:** Items 7, 8, and 9 from the Phase 2 wiring specification (`2026-10-30-MIDDAY-X100.md`, `2026-10-30-MIDDAY-IG50.md`, `2026-10-30-OVERNIGHT-ROLLUP.md` §5).

---

## Item 7 — Situational Harvest (`scripts/ops/gse_coach_mind_simulator.py`)

All four published situational inputs from `2026-10-30-MIDDAY-X100.md` are wired directly into [`scripts/ops/gse_coach_mind_simulator.py`](file:///C:/c/wt-sports/scripts/ops/gse_coach_mind_simulator.py):

1. **`compute_kickoff_drive_start_offset` (`S106` / `M-90` `@GridironInfo_`):**
   - Published anchor: **Ray Davis (`BUF`)** delivers a `37.8`-yard average starting field position (`KICKOFF_RETURN_DRIVE_START_ANCHORS_2026["BUF"] = 37.8`), shifting `yardline_100` by `25.0 - 37.8 = -12.8` yards.
2. **`compute_rz_points_per_trip_differential` (`M-01` `@sfdata9ers`):**
   - Computes `off_rz_pts_per_trip - def_rz_pts_allowed_per_trip`, separating defenses that bend (field goals, ~3 pts/trip) from defenses that break (touchdowns, ~7 pts/trip).
3. **`compute_non_blitz_pressure_surplus` (`M-57..M-61` `@SumerSports`):**
   - Computes `pressure_rate - 0.85 * blitz_rate`.
   - Published anchor: **`GB` `46.9%` pressure on `28.0%` blitz** (`0.469 - 0.85 * 0.280 = +0.231`), contrasted with **`CAR` `44.0%` blitz** (`NON_BLITZ_PRESSURE_ANCHORS_2026`).
4. **Health Layer State Flag (`MIDDAY-X100.md` line 33):**
   - **`TB_WR_EMEKA_EGBUKA_OUT_FLAG`**: `TB WR Emeka Egbuka` cleared concussion protocol and is ruled **OUT Sunday (`foot` injury)**, automatically injecting his `WR2` role scratch into `TB` simulations.

---

## Item 8 — Dual Postgame Counterfactual Luck Grader (`compute_postgame_dual_luck_grade`)

- Implemented in [`scripts/ops/gse_coach_mind_simulator.py`](file:///C:/c/wt-sports/scripts/ops/gse_coach_mind_simulator.py).
- Combines situation-controlled $\Delta\text{WP}_{\text{penalties}} + \Delta\text{WP}_{\text{luck}}$ (`@run_the_sims` `M-62..M-66`, `S107`) with `Deserve-To-Win` (`M-34..M-40`) so postgame evaluations account for both penalty/turnover/kicking swings and play-by-play win-probability dominance.
- **Hard Fence (`pregame_weight = 0.0`):** Calling `compute_postgame_dual_luck_grade` with `context != "postgame"`, `pregame_weight != 0.0`, or from inside any pregame pricing function (`simulate_matchup_pbp`, `evaluate_qb_matchup_2x2`, `sinkhorn_reallocate_weights`) raises `RuntimeError("POSTGAME_GRADING_FENCE_VIOLATION")`. Verified by `test_8_compute_postgame_dual_luck_grade_and_fence`.

---

## Item 9 — Standing Overnight Items (`OVERNIGHT-ROLLUP.md` §5 & `MIDDAY-IG50.md` `S109`)

1. **On-Disk Signal Pack & Full Tables Loader ([`intelligence/data_loaders/signal_pack_loader.py`](file:///C:/c/wt-sports/intelligence/data_loaders/signal_pack_loader.py)):**
   - Loads the **7-table nflverse signal pack** (`docs/research/2026-10-30/signal-pack/outputs/01_red_zone_xtd_share.csv` .. `07_paired_flip_leverage.csv`) and the **full-table CSVs** (`docs/research/2026-10-30/full-tables/*.csv`) directly from disk without scraping.
   - Exposes `@Timo_NFL`'s **`1.36x` (`1.3607067`) paired-flip leverage inflation ratio** (`S87`) and `@sfdata9ers`'s **composite QB efficiency weights** (`0.30 QBR + 0.20 EPA/play + 0.15 CPOE + 0.15 SR + 0.10 BadThrow%_inv + 0.10 P2S%_inv`).
2. **Held-Out Empirical Bayes Scale Shrinkage (`apply_tau_hat_calibration_shrinkage`):**
   - Consumes the held-out scale parameter **`tau_hat = +6.77` points** ($n = 3,988$ held-out games, `held_out_only=True`) in [`scripts/ops/gse_coach_mind_simulator.py`](file:///C:/c/wt-sports/scripts/ops/gse_coach_mind_simulator.py), rejecting any in-sample call (`held_out_only=False`).
3. **`S109` Family Shield Anti-Voice-Clone Verification Protocol (`2026-10-30-MIDDAY-IG50.md` `MID-15`):**
   - **Protocol Rule (Defensive Triad Completion with `S100` WhatsMyName exposure reduction + `S102` Apple Advanced Data Protection):**
     1. **Shared Family Secret Phrase:** Any urgent voice or video call requesting money, credentials, or emergency action must provide a pre-agreed offline family passphrase before any action is taken.
     2. **Mandatory Hang-Up-and-Callback:** Regardless of caller ID or voice familiarity, hang up immediately and call the family member back on their known saved contact number.
   - Strict Defensive Scope: This entry documents human-in-the-loop defensive verification only; no voice synthesis, cloning, or authentication bypasses are permitted.
