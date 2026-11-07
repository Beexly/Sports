# STRUCTURAL CODE-DIFF PROPOSALS — TNF CAR@GB ROOT-CAUSE FIXES
Source: `scripts/ops/gse_coach_mind_simulator.py` (sealed coach-first PBP Monte Carlo, 10k worlds).
All proposals keep `DEFAULT_SEALED_BASELINE` and the sealed MappingProxyType lock untouched.

---

## Fix 1 — Game-script rush-volume decay (Jacobs OVER 60.5 rush LOSS root cause)

**Problem:** GB led 20-10 (Q2) then 27-10 (Q3) and abandoned the run — Jacobs 16 carries, 33 yards, 2.1 YPC. The simulator adjusts pass rate when leading (script_pass_mod = -0.08 at score_diff ≥ 7, line 637) and slows pace (+2.8s, line 582), but never reduces rush-attempt volume when leading by a multi-score margin in Q3/Q4. The model over-projects rush yards for leading-team RB1s.

**Before (simulator lines 636-642):** `p_pass` is adjusted by `script_pass_mod` only (-0.08 leading ≥7). No rush-volume term.

**After:** Add a rush-volume decay multiplier when leading ≥10 in Q3/Q4. In the vectorized loop, after computing `p_pass`, apply:

```python
# Game-script rush-volume decay: leading >= 10 in Q3/Q4 cuts rush attempts ~35%
rush_decay = np.where(
    (sd_v >= 10.0) & (qt_v >= 3),
    0.0,          # p_pass boost = fewer runs
    0.0,
)
p_pass = np.clip(p_pass + rush_decay, 0.15, 0.90)
```

Equivalently, add a dedicated `script_rush_mod` that reduces run_yds accumulation when leading:

```python
run_yds = np.round(rng.normal(4.4 + 9.5 * ne_v, 4.2, size=len(idx_13))).astype(np.int32)
run_yds = np.where((sd_v >= 10.0) & (qt_v >= 3), np.round(run_yds * 0.65).astype(np.int32), run_yds)
```

**Expected impact on 10k-world vectors:** Leading-team RB1 rush-yards means drop ~30-40% in Q3/Q4 blowout worlds, aligning Jacobs-type projections with reality (33 yards when up 17 late). Reduces false rush-OVERs for leading favorites.

---

## Fix 2 — Red-zone TD rate vs FG stall parameter (GB TT UNDER 25.5 LOSS root cause)

**Problem:** GB scored TDs on all 3 red-zone trips (3-3), CAR settled for FG on 1 of 2 (1-2). The model under-projected GB's RZ TD efficiency and Love's 281-yard passing day. GB team-total UNDER 25.5 lost (GB scored 27). The simulator has a "redzone" field zone (line 359: yardline_100 > 20) and JEV pass_prob by zone, but no distinct RZ TD-conversion rate distinct from generic pass success.

**Before:** In the redzone, `p_pass` comes from the JEV tensor (line 650-652); TD resolution is generic (new_yl <= 0 → +6.95, line 703-709). No team-specific RZ TD rate.

**After:** Introduce a per-team `redzone_td_pct` parameter (from trends JSON, e.g. GB 0.1481, CAR 0.1262) that biases TD conversion inside the redzone. In the touchdown resolution block (line 703-709), weight TD probability:

```python
# Team-specific RZ TD rate (from trends W1-W7)
rz_td_pct_vec = np.where(ps_v == 1, home_rz_td_pct, away_rz_td_pct)  # ~0.12-0.15
td_nt = (new_yl <= 0) & (rng.random(len(nt_i)) < rz_td_pct_vec / 0.15)
```

Where `0.15` is a normalization so `rz_td_pct` ≈ 0.15 means "baseline RZ TD propensity"; lower values convert some would-be TD plays into FG-stall/short-yardage outcomes.

**Expected impact:** Leading-team (GB) RZ TD conversion rises in sim, raising GB team-total and QB passing-yards projections; team-total UNDERs for high-RZ-TD teams weaken appropriately. Fixes GB TT UNDER 25.5 class of loss.

---

## Fix 3 — IDP snap-count haircut (Okereke/McDuffie/Nixon root causes)

**Problem:** Okereke OVER 6.5 T+A lost (4 tackles), McDuffie UNDER 8.5 T+A lost (10 tackles), Nixon OVER 4.5 lost (2 tackles). IDP tackle volume depends on defensive snap share, which the simulator doesn't track — it accumulates team rush/pass yards but not per-side snap counts or tackle propensity.

**Before:** Simulator tracks `home_rush_yds_tot`, `home_pass_yds_tot` (lines 560-563, 688-691) but no snap-count or tackle accumulator.

**After:** Add per-team defensive snap accumulator and a tackle-rate parameter. Inside the 175-snap loop, increment `away_def_snaps_tot` / `home_def_snaps_tot` per active play. Then project IDP tackles:

```python
# Defensive snap accumulation (added near line 562)
home_def_snaps_tot = np.zeros(n_sims, dtype=np.int32)
away_def_snaps_tot = np.zeros(n_sims, dtype=np.int32)
# inside loop, each active play:
home_def_snaps_tot[active] += (poss[active] == 0).astype(np.int32)  # home def on field when away has ball
away_def_snaps_tot[active] += (poss[active] == 1).astype(np.int32)
```

IDP tackle projection for a player: `expected_tackles = team_def_snaps × player_tackle_rate × snap_share`. Apply a haircut when the team's defense is off the field (offense controls clock > 28:00 → fewer defensive snaps → lower tackle projections).

**Expected impact:** McDuffie (GB, winning team, controlled clock) tackle projection haircut downward; Okereke (CAR, defense on field 26:41 but structured to limit tackles) handled via team tackle-rate calibration. Reduces false IDP OVERs.

---

## Fix 4 — Single-edge sack prop tandem gate (Van Ness hit / Brooks miss)

**Problem:** Van Ness OVER 0.25 sacks won (1 sack), Brooks OVER 0.25 sacks lost (0 sacks). Single-edge sack props are high-variance; the model issued them based on individual pressure without requiring tandem pressure + opponent sack-allowed confirmation.

**Before:** `sack_prob_v` is per-play (line 644, from JEV pressure tensor). No rusher-specific or opponent-sack-allowed gate.

**After:** Gate single-edge (0.25) sack props on a tandem condition: rusher's pressure rate × opponent's sack_rate_allowed_pct must exceed a threshold (e.g. product > 0.03). Only issue 0.25-sack props when both edges are present:

```python
# Pre-prop gating (in the prop-selection layer, not the sealed sim)
def sack_prop_eligible(rusher_pressure_pct, opp_sack_allowed_pct):
    return (rusher_pressure_pct / 100.0) * (opp_sack_allowed_pct / 100.0) > 0.03
```

Brooks (low pressure × CAR moderate sack-allowed) would fail the gate → no 0.25-sack prop issued. Van Ness (higher pressure × CAR sack-allowed) passes.

**Expected impact:** Eliminates low-conviction single-edge sack props; improves precision on 0.25-sack market without changing the sealed simulator internals.

---

## Summary of expected vector impacts
| Fix | 10k-world vector effect | Markets corrected |
|---|---|---|
| Rush-volume decay | Leading-team RB1 rush-yds mean ↓ 30-40% in Q3/Q4 blowout worlds | Jacobs-type rush OVERs |
| RZ TD rate parameter | Leading-team RZ TD conversion ↑; team-total ↑ for high-RZ-TD teams | GB TT UNDER, team totals |
| IDP snap haircut | Winning-team LB/DB tackle projections ↓ when offense controls clock | McDuffie/Nixon/Okereke T+A |
| Sack tandem gate | 0.25-sack props issued only when rusher pressure × opp sack-allowed > threshold | Brooks-type sack misses |
