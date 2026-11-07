# SUNDAY WEEK 8 — PBP-DERIVED MODEL-ADJUSTMENTS
# Source: master_weeks_1_to_7_pbp_tendencies_2026.json (Weeks 1–7, all 32 teams)
# Generated: 2026-10-30 | Applies to: Week 8 Sunday slate (13 games, TNF = CAR@GB already played)
# Video status: NO game frames used. All adjustments derived from PBP tendencies only.

## 1. CONTEXT

TNF CAR@GB (Thursday, Oct 29) is complete. Week 8 Sunday features 13 remaining games.
This note lists the exact PBP-derived overlays and haircuts to apply to the GSE
coach-mind simulator (`scripts/ops/gse_coach_mind_simulator.py`) and coaching
modules (`intelligence/coaching/`) for Sunday, derived solely from Weeks 1–7 PBP
tendencies. No video frames were used.

## 2. CAR @ GB TNF CONFIRMATION (for reference, already settled)

From `data/engine/new_engine_official_ledger_2026.json`:
- Verified record: 31-11 (73.8%), +18.56 units
- CAR@GB TNF night: 15-6 (71.4%), +8.11u
- Key settled plays: GB -3.5 (SETTLED), UNDER 46.5 (SETTLED), GB 1H -2.5 (SETTLED),
  CAR 1H Team Total UNDER 10.5 (SETTLED), Tucker Kraft 1Q REC YDS OVER (SETTLED),
  Bryce Young UNDER 253.5 PASS YDS (SETTLED), Jordan Love UNDER 35.5 ATT (SETTLED)

## 3. CAR TENDENCIES (W1–W6, 6 games) — KEY CUTS

| Metric | Value | Implication |
|--------|-------|-------------|
| early_down_pass_rate | 0.568 | Pass-heavy on early downs |
| neutral_pass_rate_pct | 67.5% | Very pass-neutral / pass-leaning |
| play_action_pct | 26.3% | Moderate play-action |
| def_blitz_rate_pct | 36.2% | CAR defense blitzes frequently |
| def_sack_rate_pct | 4.53% | Moderate pass rush |
| sack_rate_allowed_pct | 6.3% | CAR OL allows sacks at decent rate |
| Cover-3 pct | 47.6% | CAR base coverage is Cover 3 (single-high) |
| single_high_shell_pct | 57.7% | CAR predominantly single-high |
| yards_per_rush_w1_w7 | 3.88 | Weak CAR run game |
| off_rush_epa | -0.084 | Negative rush EPA |
| redzone_td_pct | 0.2143 | **21.4% RZ TD rate — FG-heavy in RZ** |
| off_epa_w1_w5 | 0.086 | Early-season strength |
| off_epa_w6_w7 | -0.053 | Recent decline |
| off_trend_delta_w67_vs_w15 | -0.139 | **Significant offensive decline** |
| wr1_target_share | 25.5% | McMillan dominant (25.7% actual, 9.0 tgts/g) |
| wr1 | Tetairoa McMillan, 85.2 YPG |
| rb1 | Chuba Hubbard, 16.0 carries/g, 76.5 YPG |

## 4. GB TENDENCIES (W1–W7, 7 games) — KEY CUTS

| Metric | Value | Implication |
|--------|-------|-------------|
| early_down_pass_rate | 0.525 | Balanced early-down script |
| neutral_pass_rate_pct | 64.4% | Pass-leaning neutral |
| play_action_pct | 19.5% | Lower play-action than CAR |
| def_blitz_rate_pct | 33.2% | Moderate blitz |
| def_sack_rate_pct | 5.44% | Solid GB pass rush |
| sack_rate_allowed_pct | 4.56% | GB OL protects well |
| two_high_shell_pct | 56.1% | **GB predominantly two-high (Cover 2/4/6)** |
| single_high_shell_pct | 33.0% | Less single-high than CAR |
| Cover-2 pct | 21.7% | GB base has Cover 2 element |
| Cover-4 pct | 24.3% | Quarters element |
| yards_per_rush_w1_w7 | 3.02 | **Terrible GB run game** |
| off_rush_epa | -0.291 | **Very negative rush EPA** |
| redzone_td_pct | 0.1481 | **14.8% RZ TD rate — extremely FG-heavy** |
| off_epa_w1_w5 | -0.013 | Early-season flat |
| off_epa_w6_w7 | 0.033 | Recent improvement |
| off_trend_delta_w67_vs_w15 | +0.046 | GB offense trending up |
| wr1_target_share | 26.5% | Watson (21.8%, 8.0 tgts/g) |
| te1_target_share | 16.4% | Tucker Kraft (6.1 tgts/g, 42.4 YPG) |
| rb1 | Josh Jacobs (46 YPG, 11 carries — limited sample) / MarShawn Lloyd (46 YPG) |

## 5. SUNDAY WEEK 8 OVERLAYS / HAIRCUTS (EXACT PARAMETER CHANGES)

### 5.1 Rush Decay (applies to all Sunday games)
**Basis:** CAR off_rush_epa = -0.084, GB off_rush_epa = -0.291; both teams rush for ~3.0–3.9 YPC.
**Change:** In `gse_coach_mind_simulator.py`, the run yardage model uses
`run_yds = normal(4.4 + 9.5 * net_epa, 4.2)`. For teams with `off_rush_epa < -0.15`
(GB = -0.291, CAR = -0.084 borderline), apply a **rush decay multiplier of 0.78**
to run yardage and reduce `rb1_carry_share` by 8 points.

Code sketch:
```python
RUSH_DECAY_THRESHOLD = -0.15
RUSH_DECAY_MULT = 0.78
# In simulate_matchup_pbp, after computing run_yds:
if team_off_rush_epa < RUSH_DECAY_THRESHOLD:
    run_yds = run_yds * RUSH_DECAY_MULT
    rb1_share_emp = clip(rb1_share_emp - 0.08, 0.35, 0.88)
```

### 5.2 Red-Zone TD Rate Haircut (applies to all Sunday games)
**Basis:** CAR RZ TD = 21.4%, GB RZ TD = 14.8%. League average is typically ~55–60%.
Both teams are extreme FG-heavy outliers in the RZ.
**Change:** In the 4th-down / goal-to-go logic, apply an RZ TD rate haircut:
`p_td_rz = min(p_td_rz, team_rz_td_pct * 1.15)` where `team_rz_td_pct` comes from
the tendencies file. Additionally, increase FG make probability inside the 10 by
0.05 for teams with `redzone_td_pct < 0.25`.

Code sketch:
```python
RZ_TD_HAIRCAP = True
# In simulate_matchup_pbp, goal-to-go / 4th-down go decision:
if team_rz_td_pct < 0.25:
    p_conv = clip(p_conv * 0.85, 0.15, 0.82)  # haircut go-for-it success
    p_fg = min(p_fg + 0.05, 0.98)  # boost FG make
```

### 5.3 IDP Haircut (applies to IDP tackle/sack props)
**Basis:** CAR def_blitz_rate = 36.2%, GB def_blitz_rate = 33.2%. Both defenses
blitz frequently, creating tackle-funnel opportunities for off-ball LBs.
CAR sacks allowed = 6.3%, GB sacks allowed = 4.56%.
**Change:** For IDP tackle props, apply a **tackle-funnel allocation boost** of
+0.15 expected tackles for off-ball LBs on teams with `def_blitz_rate_pct > 30`.
For sack props, apply a **sack-tandem gate**: only boost sack probability if both
`def_sack_rate_pct > 4.0` AND `off_sack_rate_allowed > 5.0`.

Code sketch:
```python
# IDP tackle-funnel (in intelligence/coaching/ or prop model):
if def_blitz_rate_pct > 30.0:
    lb_tackle_expected += 0.15  # blitz creates clean-up tackles

# Sack tandem gate (in prop model):
if def_sack_rate_pct > 4.0 and off_sack_rate_allowed_pct > 5.0:
    sack_prob_multiplier = 1.20  # tandem pressure stack
else:
    sack_prob_multiplier = 1.00
```

### 5.4 Sack Tandem Gate (applies to QB sack / pressure props)
**Basis:** CAR allows 6.3% sacks, GB allows 4.56%. CAR defense generates 4.53%
sack rate, GB generates 5.44%.
**Change:** In `simulate_matchup_pbp`, `away_sack_prob` and `home_sack_prob` are
currently computed as `clip(0.55 * ol_sack + 0.25 * (def_press * 0.30), 0.030, 0.125)`.
Add a tandem gate: if `def_sack_rate_pct > 4.5` AND `off_sack_rate_allowed_pct > 5.5`,
boost the defensive pressure term weight from 0.25 to 0.40.

Code sketch:
```python
# In simulate_matchup_pbp, sack prob computation:
tandem = (def_sack_rate_pct > 4.5) and (off_sack_rate_allowed_pct > 5.5)
press_weight = 0.40 if tandem else 0.25
away_sack_prob = clip(0.55 * ol_sack + press_weight * (def_press * 0.30), 0.030, 0.125)
```

### 5.5 2H Clock-Bleed Elasticity (applies to teams leading 8+)
**Basis:** CAR off_epa trending down (-0.139 delta), GB off_epa trending up (+0.046).
CAR neutral_sec_per_snap = 23.9, GB = 25.9.
**Change:** In the simulator's clock model, leading >= 7 already adds +2.8s per
play (line 582-586). For teams with `off_epa_trend_delta < -0.10` (CAR), add an
additional +1.5s clock bleed in 2H when leading, reflecting conservative game
management. For teams with `off_epa_trend_delta > +0.03` (GB), reduce clock bleed
by -1.0s when leading.

Code sketch:
```python
# In simulate_matchup_pbp, pace computation:
if score_diff >= 7 and qtr >= 3:
    if team_off_epa_trend_delta < -0.10:
        pace_base_vec += 1.5  # CAR-style conservative bleed
    elif team_off_epa_trend_delta > 0.03:
        pace_base_vec -= 1.0  # GB-style up-tempo
```

## 6. TEAM-BY-TEAM APPLICATION MATRIX (Sunday Week 8)

Apply the above to all 13 Sunday games using each team's W1–7 tendencies from
`master_weeks_1_to_7_pbp_tendencies_2026.json`. Key teams to watch for each overlay:

| Overlay | Teams most affected (W1–7 data) |
|---------|--------------------------------|
| Rush decay (off_rush_epa < -0.15) | GB (-0.291), plus any team below -0.15 |
| RZ TD haircut (rz_td_pct < 0.25) | GB (0.1481), CAR (0.2143), any team < 0.25 |
| IDP tackle-funnel (def_blitz > 30) | CAR (36.2), GB (33.2), plus others |
| Sack tandem gate (def_sack > 4.5 AND off_sack_allowed > 5.5) | CAR (4.53 / 6.3), GB (5.44 / 4.56 borderline) |
| 2H clock bleed (off_epa_trend < -0.10) | CAR (-0.139) |
| 2H clock bleed reduction (off_epa_trend > +0.03) | GB (+0.046) |

## 7. HOW TO APPLY (EXACT COMMANDS)

Edit `scripts/ops/gse_coach_mind_simulator.py`:
1. Add the four parameter blocks above (RUSH_DECAY_*, RZ_TD_*, IDP tackle-funnel,
   sack tandem gate, clock-bleed elasticity) near the top constants.
2. Wire them into `simulate_matchup_pbp` at the marked locations.
3. Pass `w1_w7_override` with `off_rush_epa`, `redzone_td_pct`, `def_blitz_rate_pct`,
   `def_sack_rate_pct`, `sack_rate_allowed_pct`, `off_epa_trend_delta` for each team.

Edit `intelligence/coaching/`:
- `redzone.py`: add `get_rz_td_pct(season, team)` returning `redzone_td_pct` from tendencies.
- `dc_pressure.py` / `pressure_answer.py`: add sack tandem gate helper.

## 8. STATUS

- Video layer: BLOCKED (nfl-video.com inaccessible). No frames used for this note.
- PBP + structural work: ADVANCED. All adjustments derived from `master_weeks_1_to_7_pbp_tendencies_2026.json`.
- Vision pipeline: STAGED as `data/film_room_2026/_bootstrap/vision_probe_ready.py`.
- Commit target: `engine/cv-bootstrap-2026-10-30`.