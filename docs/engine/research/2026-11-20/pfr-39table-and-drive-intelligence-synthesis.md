# PFR 39-Table, Agent Bundle & Drive Intelligence Synthesis (Stream 15O)

Date: 2026-11-20
Bucket: docs/engine/research/2026-11-20/
Status: WIRED (Stream 15O, strictly derived 32-team z-scored composite priors)

## 1. Rights Hygiene & INGEST-AND-LEARN Discipline

All Pro-Football-Reference exports are treated strictly under `INGEST-AND-LEARN`:
- Zero raw HTML `.xls` dumps, zero raw `.csv` tables, and zero player names/IDs enter version control.
- `scripts/ops/learn_pfr_advanced_39tables_2026.py` extracts strictly derived cross-sectional 32-team z-score composite indices bounded to `[-3.0, +3.0]` into `data/engine/gse_derived_trench_scheme_contact_priors_2026.json` (`ensure_ascii=True`).
- All runtime evaluators read ONLY `data/engine/gse_derived_trench_scheme_contact_priors_2026.json` with a module-level cache and neutral `0.0` fallback.

## 2. Complete Source Inventory Extracted

1. **39 Raw PFR HTML `.xls` Exports (`C:\Users\Garrett\Downloads\sportsref_download*.xls`):**
   - Deduplicated across exact MD5 duplicates, season-total vs. per-game views, and team offense (`exp_pts_tot`) vs. team defense (`exp_pts_def_tot`) splits:
     - Team Offense (`(5)`/`(22)`/`(36)`-defense), Passing (`(6)`/`(21)`), Rushing (`(7)`/`(20)`), Returns (`(8)`/`(19)`), Kicking (`(9)`/`(18)`), Punting (`(10)`/`(17)`), Scoring (`(11)`/`(16)`), Conversions & Red Zone (`(12)`/`(15)`), Drives (`(0)`/`(4)`/`(13)`/`(14)`).
     - Team Offense Advanced Passing Air/YAC (`(31)`), Accuracy/Drops/Batted (`(32)`), Pocket Time/Pressure/Hits/Blitz (`(33)`), and Play-Action/RPO (`(34)`).
     - Player Advanced Passing (`(23)`/`(24)`), Rushing YBC/YAC/Broken Tackles (`(25)`/`(26)`), Receiving aDOT/YAC/Drops/Broken Tackles (`(27)`/`(28)`), Defense Pressures/Hurries/Knockdowns/Coverage/Missed Tackles (`(29)`/`(30)`/`(38)`), and Player Penalties (`(35)`: `holding`, `false_start`, `penalties`, `declined`).
   - Multi-team combined rows (`2TM`, `3TM`, `4TM`) are excluded when summing player rows to teams so no stats are double-counted; all team aliases (`LVR`, `NWE`, `NOR`, `SFO`, `TAM`, `KAN`, `GNB`, `LAR`, `JAC`, `WSH`, plus full city names) normalize to the 32 canonical codes.
2. **25 Clean Bundle CSVs (`pfr_2026_11_19_agent_bundle.zip`):**
   - AFC/NFC Standings (`01`/`02`: `srs`, `osrs`, `dsrs`, `strength_of_schedule`), team splits (`05`-`13`), player red-zone splits (`22`-`23`), and Defense vs RB (`24`) / TE (`25`).
3. **3 Gapfill CSVs (`G:\My Drive\GSE Autonomous Support Pack (2026-11-19)\pfr_2026_11_19_gapfill_and_tnf_pack.zip`):**
   - `26_fantasy_rankings.csv`, `27_defense_vs_qb.csv`, and `28_defense_vs_wr.csv`.
   - Note: `CODING_AGENT_HANDOFF.md` Track A (`Scrapling`) is explicitly excluded per `ANTI_EVASION_POLICY`, while Track B (`nuclei` self-audit on GSE domains only, `notify`) is active.
   - Note: Both Split-Field Coverages PDFs uploaded in this session were verified to be 1-2 page title stubs with zero chapter text.

## 3. Stream 15O Composite Indices & Spine Wiring

Each team carries 7 scalar composite z-scores plus 2 structured sub-vectors (`def_pos_vulnerability_z` and `standings_strength_z`), all bounded in `[-3.0, +3.0]`:

- `off_pocket_protection_z`: pressured% (inv 0.40), sack% (inv 0.30), pocket time (+0.15), QB hits/att (inv 0.15)
- `off_qb_accuracy_discipline_z`: on-target% (+0.40), poor-throw% (inv 0.30), drop% (inv 0.15), batted-pass rate (inv 0.15)
- `off_scheme_pa_rpo_rate_z`: PA+RPO rate/att (+0.60), PA+RPO yard share (+0.40)
- `off_run_trench_contact_z`: rush YBC/att (+0.40), rush YAC/att (+0.30), rush broken tackles/att (+0.20), rec broken tackles/rec (+0.10)
- `def_pressure_havoc_z`: pressures/opp pass att (+0.45), sacks/opp att (+0.30), hurries+knockdowns+batted/opp att (+0.25)
- `def_coverage_tackling_z`: missed-tackle rate (inv 0.35), yds/target allowed (inv 0.30), cmp% allowed (inv 0.20), YAC/cmp allowed (inv 0.15)
- `penalty_discipline_z`: team penalties/game (inv 0.35), penalty yds/game (inv 0.30), OL/front holding+false-start/game (inv 0.35)
- `def_pos_vulnerability_z`: `{ vs_qb_z, vs_rb_z, vs_wr_z, vs_te_z }`
- `standings_strength_z`: `{ srs_z, osrs_z, dsrs_z, sos_z }`

`intelligence/coaching/pfr_learned_trench_scheme_contact_engine.py` exposes `evaluate_learned_trench_scheme_contact_matchup`, returning 9 conditioners (`stream_15o_*`) with verified swap symmetry and strict antisymmetry (`stream_15o_net_trench_contact_diff`), wired into `gse_coach_mind_simulator.py`, `gse_connected_game_workflow.py`, and `verify_and_wire_all_layers_before_sim.py`.
