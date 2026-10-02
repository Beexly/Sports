# qb-behavior / data — precomputed c02 tables

**Provenance:** built by `../build/build_tables.py` (nflverse pbp) and
`../build/build_protection_stress.py` (pfr_advstats + pbp). Build provenance
in `meta.csv`. Research: `corpus-intelligence/deep/c02/`.

**Regenerate:** `~/workspace/gse-intelligence-build/.venv/bin/python qb-behavior/build/build_tables.py`
(then `build_protection_stress.py`). Runtime serves these with stdlib+csv only.

## Tables

### qb_weekly.csv — QB × season × week (season-to-date through week), 2022–2026
One row per QB-week with ≥50 dropbacks. Point-in-time: week W aggregates
weeks ≤ W of that season (never future data).

| col | meaning |
|---|---|
| qb_id/name/team | GSIS id, canonical name, posteam mode that week |
| db | dropbacks (qb_dropback==1, REG, metric-bible filtered) |
| epa | mean EPA/dropback |
| cpoe_pbp | mean of the **nflverse pbp** `cpoe` column — NOT NGS CPOE (may be empty for the current season until nflverse computes it) |
| adot / deep_rate_20 | avg depth of target; P(air_yards ≥ 20) = public aggressiveness proxy |
| scramble_rate | qb_scramble / dropbacks |
| p2s_eb | pressure-to-sack, EB-shrunk toward 18% (prior n=40); floor proxy (hit+sack) |
| n_clean / n_press | dropbacks with pressure_floor=0 / 1 |
| epa_clean / epa_press | mean EPA in each cell |
| var_clean / var_press | EPA variance in each cell |
| sens_epa_floor | epa_clean − epa_press (attenuated toward zero; clean cell contaminated) |
| sens_se | SE of the difference |
| clean_epa_baseline | epa_clean repeated (report the triple, never the gap alone) |
| int_n_clean / int_att_clean / int_n_press / int_att_press | INT counts/attempts per cell |

Serve-time guard (not in the table): sensitivity served only with
n_press ≥ 100 (proposal :23), else NULL + data_gap.

### qb_season.csv — QB × season, 2010–2026
Same columns at season grain (week empty). Traded QBs are pooled across
teams (team = last team); the proposal is silent, this is documented.

### int_cells.csv — INT situational raw cells
`(scope, id, season_key, cell, n, w)`: scope L=league / T=team / Q=QB;
`season_key` = `YYYY` (pool Y−2..Y) or `2026_wW` (pool 2024+2025+2026w≤W);
`cell` = `p{0,1}_q{1..4}_s{0..2}_z{0..2}_d{0..3}` (pressure-floor × quarter ×
script × zone × down/distance); n = attempts, w = INTs. Raw counts only —
EB shrinkage (M=25, ladder league→team→QB) happens at serve time
(`situational/serve.py`), so the ladder can never disagree with the table.

### trust_weekly.csv — QB × season × week × trust-situation, 2022–2026
Situations: all, rz (≤20), third (down==3), twomin (4Q ≤120s or OT),
trailing, press (pressure_floor). Only rows with targets ≥ 25.
hhi / hhi_lo / hhi_hi (bootstrap 200, seed 42) / n_eff=1/hhi /
top_share / top2_share / top receiver id+name / top_ay_share (PRFFBall leg 2).

### protection_stress.csv — team × season × week, 2018–2026
`stress = press_rate_allowed − (alpha + beta·blitz_rate_faced)`, league OLS
refit weekly on the season-to-date pool. Guards: cum_games < 3 → NULL;
pool < 32 team-weeks → NULL (all). **Analyst/display use only in v1**
(proposal :57-60) — no pick-engine input. `t_beta` recorded for the
fit-quality gate the owner may add later.

### meta.csv — build provenance
Built-at, code version, source, filters, guards, rights statement.

### qb_starts.csv — team × season × week starter (buildable-systems.md #28)
Built by `../build/build_starts.py`. starter = most dropbacks in the
team-week (tiebreak: EPA) — INFERRED, not an official league start.
Columns: starter_qb_id/name, starter_db, team_db, starter_share.

### trust_targets.csv — QB × receiver × season × week targets (#3)
Built by `../build/build_trust_targets.py` from nflverse pass_attempt plays
with a charted receiver (throwaways/spikes/batted balls excluded, not
zeroed). First-read share / TPRR / air-yard share need FTN charting and are
intentionally absent.

## Rights
T1 nflverse only (CC-BY-4.0). No FTN charting, no NGS in these tables.
`first_read_rate` has no pbp source and is intentionally absent.
TTT is intentionally absent (no proxy, per the naming contract).
No `predicted_sacks` column exists anywhere (sack-prop veto, R²<0.005).
