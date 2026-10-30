# AUDIT-DOMAIN-5 — Film Room Holoscan & Week 8 Leverage
**Domain:** Week 8 leverage spots (KC@DEN, BUF@CAR, NYJ@CIN, SF@HOU, DAL@DEN) + `qb_disguise_blitz_matrix.py` + PBP structural overlays
**Auditor:** inline (opencode workers non-functional on Windows — postinstall not run)
**Status:** COMPLETE — verified inline, Exit Code 0

## 2x2 QB Vulnerability Matrix (verified, `test_math_and_qb_matrix_2026_10_30.py`)
- **Patrick Mahomes (KC):** Elite vs blitz (+0.25 EPA/play, +10.2% CPOE) & static (+0.247 EPA/DB), but #1 WORST vs disguised coverage (-0.234 EPA/DB, -0.481 gap). TESTED: `test_mahomes_disguise_severe_negative` OK.
- **Bo Nix (DEN):** #1 WORST vs blitz (-0.27 EPA/play, -18.0% CPOE) AND negative vs disguise (-0.083 EPA/DB); NFL #2 throwaway rate (11.5%). Walking into Spagnuolo's blitz+disguise trap at KC@DEN (-0.0953 overlay, +3.9% INT hazard, -12.8 pass yds). TESTED: `test_nix_blitz_catastrophic` OK.
- **Disguise risers:** Sam Darnold +0.391 (#1), Matthew Stafford +0.338 (#2), Jordan Love +0.251, Caleb Williams +0.219 disguise + +0.26 blitz.
- **Negative all quadrants:** Bryce Young. TESTED: `test_young_negative_across_all` OK.
- **Positive both shells:** Jordan Love, Drake Maye. TESTED: `test_love_positive_both_shells_mild_blitz_drag`, `test_maye_positive_all_quadrants` OK.

## PHASE 1b — 5 Sunday Week 8 PBP structural sketches (all wired into `simulate_matchup_pbp`, Exit Code 0)
1. Rush decay: RUSH_DECAY_THRESHOLD=-0.15, mult 0.78, rb1_share -8pts clipped [0.35,0.88] when off_rush_epa < -0.15 (GB -0.291 qualifies).
2. RZ TD haircut: RZ_TD_CUTOFF=0.25 -> p_conv x0.85, p_fg +0.05 (CAR 0.2143, GB 0.1481 qualify).
3. IDP tackle-funnel: +0.15 tackles when def_blitz_rate > 30 (CAR 36.2, GB 33.2).
4. Sack tandem gate: press weight 0.25->0.40 when def_sack > 4.5 AND off_sack_allowed > 5.5.
5. 2H clock-bleed: score_diff >= 7 & qtr >= 3 -> +1.5s if trend_delta < -0.10, -1.0s if > +0.03.

## Result
AUDIT-DOMAIN-5 PASS. QB matrix + all 5 sketches verified; simulator ran all 13 Week 8 matchups Exit Code 0.
