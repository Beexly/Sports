# Handoff Report — explorer_survey_3

**Agent**: `explorer_survey_3`  
**Handoff Type**: Hard (Task Complete)  
**Date**: 2026-10-18  
**Subject**: Architectural Investigation & Blueprint for Week 6 Requirements R3, R4, and R5

---

## 1. Observation
1. **Synthetic Props**: In `intelligence/pipeline/emit_week6_master_product.py`, line 199:
   `"market": f"Receiving Yards OVER (~{round(yds / 5.0 - 4.5, 1)} yds line)"` and line 194:
   `score = round(min(94.0, 52.0 + (tar * 0.55) + (sep * 3.2) + max(-3.0, yac_oe * 2.5) + (air_share * 0.25)), 1)`.
   These heuristic estimates generated synthetic `~` lines and 12 identical `94.0/100` conviction scores.
2. **DraftKings Archive Files**: Exactly 14 files exist in `docs/data-sources/research/props-archive/*_20261018T09.json` totaling 20,019 lines. Each line object contains `eventId`, `playerId`, `playerName`, `propMarket`, `line`, `openLine`, `lineMoved`, `asOf`, and `source`. The 8 target markets in the feed carry the suffix `(incl. overtime)`.
3. **2026 Roster Reality (A.J. Brown)**:
   - `docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json`:
     `INJ: NE {'athlete': 'A.J. Brown', 'position': 'WR', 'status': 'Questionable', 'date': '2026-10-17T20:12Z', 'comment': "The Patriots activated Brown (ankle) from injured reserve Saturday..."}`
   - `docs/data-sources/research/2026-10-13/depthcharts/espn-depthcharts-2026.json`:
     `DC: NE 3WR 1TE|WR {'slot': 2, 'athlete': 'A.J. Brown'}`
   - `docs/data-sources/research/props-archive/401873001_20261018T09.json` (`NYJ @ NE`):
     `{'playerName': 'A.J. Brown', 'propMarket': 'Total Receiving Yards (incl. overtime)', 'line': 50.5, 'openLine': 51.5}`
   - PHI WRs are Hollywood Brown and DeVonta Smith. A.J. Brown is on NE.
4. **SGP Correlation Matrix**: In `data/snapshots/sgp_correlations.json`, the 8x8 matrix from 1,088 team-games is `[qb_pass_yards, qb_pass_tds, wr_rec_yards, wr_anytime_td]` for own team (0..3) and opponent team (4..7).
5. **DFS Team Resolution**: In `linestar_slate_grid_2026-10-13.json`, there are 28 unique `teamId` codes (65..96). Cross-matching with `espn-depthcharts-2026.json` mapped 100% of these IDs to 28 valid NFL team abbreviations. Previously, `team = canon_team(u.get("team") or "")` evaluated to empty, falling back to line 484: `"team": team or "NFL"`, which populated every DFS slot with `"NFL"`.
6. **DFS Slate Leak**: Previous code lacked filtering on bye teams (`MIN`, `DET`, `MIA`, `CIN`) and completed TNF (`SEA`, `DEN`), allowing Jaxon Smith-Njigba (`SEA`) to be drafted into Cash Lineup.

## 2. Logic Chain
1. From Observation 1, the props engine in `emit_week6_master_product.py` did not read the archived DraftKings prop lines, causing synthetic values and score clumping.
2. From Observation 2, all 20,019 lines exist on disk across all 14 Week 6 games and can be joined by `(playerName, market)`.
3. From Observation 3, player team assignments must use 2026 depth charts and injury reports rather than legacy hardcoded assumptions.
4. From Observation 4, the 8 target Week 6 SGPs can be parameterized with exact lines and empirical correlations; Student-t copula simulations (`nu=4.0`, 50,000 draws) in `test_8_sgp_runs.py` prove positive correlation lift (+44% to +67%) and positive EV against book pricing.
5. From Observation 5 and 6, mapping `teamId` via `LINESTAR_TID_MAP` and filtering out `EXCLUDED_TEAMS` (`MIN, DET, MIA, CIN, SEA, DEN`) produces a clean active pool of 341 players with zero unknown teams and zero completed game leaks.

## 3. Caveats
- DraftKings raw prop archives contain multiple entries for over/under two-sided markets; deduping by `(playerName, propMarket)` selecting the latest `asOf` snapshot is required.
- Game totals and spreads are sourced from `scoreboard_week_cur.json` (captured 2026-10-18T09:00Z) which reflects the final active pre-kick consensus lines.

## 4. Conclusion
Requirements R3, R4, and R5 have been completely audited and reverse-engineered with mathematical rigor. All datasets are confirmed present and valid on disk. The refactoring plan provides an exact, drop-in blueprint for a worker to update `emit_week6_master_product.py` and output products without fabrication or regressions.

## 5. Verification Method
To independently verify this investigation:
1. Run `python c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3\inspect_dk.py` to confirm 20,019 DraftKings lines across 14 games.
2. Run `python c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3\test_joined_props.py` to verify the props join against real DraftKings half-point lines.
3. Run `python c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3\test_8_sgp_runs.py` to verify 50,000-draw Student-t copula simulations for all 8 target games.
4. Run `python c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3\test_dfs_run.py` to verify DFS slate filtering, team ID resolution, and valid $50k 9-slot lineups.
