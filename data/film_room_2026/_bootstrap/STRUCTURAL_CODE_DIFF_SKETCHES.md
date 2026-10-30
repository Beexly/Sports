# STRUCTURAL CODE-DIFF SKETCHES — WEEK 8 ENGINE UPGRADES
# Target: scripts/ops/gse_coach_mind_simulator.py + intelligence/coaching/
# Generated: 2026-10-30 | Basis: master_weeks_1_to_7_pbp_tendencies_2026.json
# These are before/after sketches — drop-in parameter changes or code additions.

## SKETCH 1 — RUSH DECAY

**Problem:** Teams with poor rush efficiency (GB off_rush_epa = -0.291, CAR = -0.084)
are simulated with the same baseline run yardage as efficient rushing teams.

**Location:** `gse_coach_mind_simulator.py`, `simulate_matchup_pbp()`, run-yardage
generation block (around line 664).

**Before:**
```python
run_yds = np.round(rng.normal(4.4 + 9.5 * ne_v, 4.2, size=len(idx_13))).astype(np.int32)
```

**After:**
```python
RUSH_DECAY_THRESHOLD = -0.15
RUSH_DECAY_MULT = 0.78
# ... inside the is_1to3 block, before yds = np.where(is_pass, pass_yds, run_yds):
if team_off_rush_epa < RUSH_DECAY_THRESHOLD:  # team-specific, from w1_w7_override
    run_yds = np.round(run_yds * RUSH_DECAY_MULT).astype(np.int32)
    rb1_share_emp = float(np.clip(rb1_share_emp - 0.08, 0.35, 0.88))
```

**Parameter source:** `w1_w7_override["away"]["off_rush_epa"]` / `["home"]["off_rush_epa"]`
from `master_weeks_1_to_7_pbp_tendencies_2026.json`.

---

## SKETCH 2 — RED-ZONE TD RATE HAIRCUT

**Problem:** CAR (21.4%) and GB (14.8%) RZ TD rates are far below league average
(~55–60%). The simulator currently treats all RZ trips equally.

**Location:** `gse_coach_mind_simulator.py`, 4th-down goal-to-go / FG decision block
(lines 591–629).

**Before:**
```python
p_conv = np.clip(0.64 - 0.05 * ydstogo[g_idx] + 0.55 * net_epa_vec[g_idx], 0.15, 0.82)
...
p_fg = np.clip(0.97 - 0.011 * np.maximum(0, yardline_100[f_idx] - 15), 0.45, 0.98)
```

**After:**
```python
RZ_TD_CUTOFF = 0.25
# ... for the scoring team, look up team_rz_td_pct from w1_w7_override:
if team_rz_td_pct < RZ_TD_CUTOFF:
    p_conv = np.clip(p_conv * 0.85, 0.15, 0.82)   # haircut go-for-it success
    p_fg = np.minimum(p_fg + 0.05, 0.98)          # boost FG make inside the 10
```

**Parameter source:** `w1_w7_override[team]["redzone_td_pct"]`.

---

## SKETCH 3 — IDP TACKLE-FUNNEL HAIRCUT

**Problem:** IDP tackle props don't account for blitz rate creating clean-up tackle
opportunities for off-ball linebackers.

**Location:** `intelligence/coaching/` — new helper, or `pressure_answer.py`.

**Before:** (no IDP tackle-funnel logic exists)

**After — new function in `intelligence/coaching/pressure_answer.py`:**
```python
def idp_tackle_funnel_adjustment(def_blitz_rate_pct: float) -> float:
    """Add expected tackles for off-ball LB when defense blitzes frequently."""
    if def_blitz_rate_pct > 30.0:
        return 0.15  # expected additional tackles per game
    return 0.0
```

**Usage:** Add `+0.15` to expected tackles for CAR (36.2% blitz) and GB (33.2% blitz)
off-ball LBs on Sunday.

**Parameter source:** `w1_w7_override[team]["def_blitz_rate_pct"]`.

---

## SKETCH 4 — SACK TANDEM GATE

**Problem:** QB sack probability should stack when both the defense rushes well and
the offensive line allows sacks.

**Location:** `gse_coach_mind_simulator.py`, `simulate_matchup_pbp()`, sack prob
computation (lines 498–518).

**Before:**
```python
away_sack_prob = float(np.clip(0.55 * ol_sack + 0.25 * (def_press * 0.30), 0.030, 0.125))
```

**After:**
```python
TANDEM_DEF_SACK = 4.5   # def_sack_rate_pct threshold
TANDEM_OFF_SACK = 5.5   # off_sack_rate_allowed_pct threshold
tandem = (def_sack_rate_pct > TANDEM_DEF_SACK) and (off_sack_rate_allowed_pct > TANDEM_OFF_SACK)
press_weight = 0.40 if tandem else 0.25
away_sack_prob = float(np.clip(0.55 * ol_sack + press_weight * (def_press * 0.30), 0.030, 0.125))
```

**CAR qualifies:** def_sack_rate_pct = 4.53 (>4.5) AND sack_rate_allowed_pct = 6.3 (>5.5) → tandem active.

**Parameter source:** `w1_w7_override[team]["def_sack_rate_pct"]` and `["sack_rate_allowed_pct"]`.

---

## SKETCH 5 — 2H CLOCK-BLEED ELASTICITY

**Problem:** Teams with declining offense (CAR off_epa_trend = -0.139) manage the
clock more conservatively when leading; improving teams (GB +0.046) play faster.

**Location:** `gse_coach_mind_simulator.py`, pace computation (lines 582–586).

**Before:**
```python
pace_base_vec = np.where(
    score_diff >= 7.0,
    pace_base_vec + 2.8,
    np.where(score_diff <= -7.0, pace_base_vec - 3.0, pace_base_vec),
)
```

**After:**
```python
# ... inside the loop, for the team in possession:
if score_diff >= 7.0 and qtr >= 3:
    if team_off_epa_trend_delta < -0.10:
        pace_base_vec = pace_base_vec + 1.5   # extra conservative bleed
    elif team_off_epa_trend_delta > 0.03:
        pace_base_vec = pace_base_vec - 1.0   # faster tempo
else:
    pace_base_vec = pace_base_vec + 2.8
```

**Parameter source:** `w1_w7_override[team]["off_trend_delta_w67_vs_w15"]`.

---

## APPLICATION CHECKLIST

- [ ] Add RUSH_DECAY_THRESHOLD, RUSH_DECAY_MULT constants to gse_coach_mind_simulator.py
- [ ] Add RZ_TD_CUTOFF constant and haircut logic to 4th-down block
- [ ] Add idp_tackle_funnel_adjustment() to intelligence/coaching/pressure_answer.py
- [ ] Add TANDEM_DEF_SACK / TANDEM_OFF_SACK and press_weight logic to sack prob block
- [ ] Add clock-bleed elasticity to pace computation block
- [ ] Wire `w1_w7_override` to pass `off_rush_epa`, `redzone_td_pct`, `def_blitz_rate_pct`,
  `def_sack_rate_pct`, `sack_rate_allowed_pct`, `off_trend_delta_w67_vs_w15` per team
- [ ] Test with CAR@GB override to confirm no seal hash violation (tau=0.42 must remain)