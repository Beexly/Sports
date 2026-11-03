# MNF Card Status (`CHI @ SEA`, 2026-11-02) & Post-Game Settlement

1. **Staleness & Operator Odds Contract (`scripts/ops/run_chi_sea_mnf_360_board_review.py`):**
   - Live DraftKings odds must be supplied in `data/engine/mnf_chi_sea_360_odds_2026_11_02.json` with ISO-8601 `fetched_at` (`max_age_hours=6.0`) and `source` naming the capture method.
   - When `data/engine/mnf_chi_sea_360_odds_2026_11_02.json` is absent or stale, the generator emits `"card_status": "STALE_LINES_UNACTIONABLE"` and `"publishAllowed": false`.
2. **Post-Remediation Metrics (Seed `20261102`, Subsystems 2 & 3 Active):**
   - `joint_sim_prob == raw_joint_sim_p == 0.4364` (exact mean of shared 10,000 conserved worlds; `* 1.075` product cap removed).
   - `chi_spread_model_p == 0.488372` (`devig_two_way(-105, -115)` prior baseline; static `+0.35` FWL log-odds overlay removed).
   - `chi_ml_model_p == 0.396199` (`devig_two_way(142, -170)` prior baseline; static `+0.35` FWL log-odds overlay removed).
   - Baseline sack probabilities restored (`ENABLE_TRENCH_POCKET_PHYSICS_V2="0"` and `ENABLE_BIOMECH_KINETIC_TRANSLATION_V1="0"` hard-zeroed at generator import; all research telemetry separated into `data/engine/mnf_chi_sea_360_telemetry_2026_11_02.json` stamped `RESEARCH_TELEMETRY_NOT_FOR_PUBLICATION`).
3. **Actual MNF Box-Score Settlement (`CHI 34 @ SEA 17`, ESPN Event `401872855`):**
   - **6-Play Personal $40 DraftKings Slip Result:** **`4-2-0` (`+$11.81` net profit -> `$51.81` balance, `+2.36u`)**:
     - Slot 1: Kalif Raymond OVER 21.5 Rec Yds (`$10.00`) — **LOSS** (`2 rec, 14 rec yds` + `1 rush, 39 yds` = **`53 scrimmage yds`**; lost pure receiving yards on a slightly backward lateral screen from Caleb Williams; now permanently guarded by `recommend_scrimmage_over_receiving_prop`).
     - Slot 2: Chicago Bears +3.0 (`$9.00` @ -105) — **WIN** (`+$8.57`, CHI 34 - SEA 17).
     - Slot 3: Sam Darnold OVER 4.5 Rushing Yards (`$7.50` @ -110) — **WIN** (`+$6.82`, `2 carries, 14 rush yds`).
     - Slot 4: Rome Odunze OVER 2.5 Receptions (`$6.00` @ -110) — **WIN** (`+$5.45`, `3 rec, 44 yds, 1 TD`).
     - Slot 5: Chicago Bears Moneyline +142 (`$3.50` @ +142) — **WIN** (`+$4.97`, CHI 34 - SEA 17).
     - Slot 6: 2-Leg SGP Kalif Raymond OVER 21.5 Rec Yds + CHI +3.0 (`$4.00` @ +175) — **LOSS** (`-$4.00`, CHI +3.0 won by 20 pts; Raymond lateral rush technicality killed Leg 1).
