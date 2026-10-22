# Handoff Report: Requirement 2 (R2) 14/14 Matchups Survey

**Agent**: `explorer_survey_2`  
**Working Directory**: `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2`  
**Date**: 2026-10-18  
**Recipient**: Orchestrator (`735e5fee-8571-42f4-aca1-c839efea1182`)  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

1. **Current Matchup Report Files**:
   Inspected all 14 files in `docs/predictions/research/2026-10-18/*-matchups.md`.
   Measured counts:
   - 0 chains: `ARI@LAR-matchups.md`, `BUF@LV-matchups.md`, `HOU@JAX-matchups.md`, `LAC@KC-matchups.md`, `PIT@TB-matchups.md`, `WSH@SF-matchups.md` (6/14 files).
   - 1 chain: `BAL@CLE-matchups.md`, `CAR@PHI-matchups.md`, `NO@NYG-matchups.md`, `TEN@IND-matchups.md` (4/14 files).
   - `>= 2` chains: `CHI@ATL-matchups.md` (2), `DAL@GB-matchups.md` (2), `NYJ@NE-matchups.md` (2), `SEA@DEN-matchups.md` (3) (4/14 files).
   - In `WSH@SF-matchups.md`, verbatim gap logged: `injury digest missing a team block (SF/WSH)`.

2. **Source Code Inspection (`intelligence/matchups/matchup_engine.py`)**:
   - Line 35: `NGS_FILE = SOURCES / "2026-10-13" / "nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json"` -> points to a 2025-season snapshot from July 2026 rather than 2026 in-season feeds.
   - Lines 278–287:
     ```python
     if cb_pairs:
         q_cbs = [c for c in cb_pairs if "Questionable" in c or "Doubtful" in c or "OUT" in c.upper()]
         if q_cbs:
             report["chains"].append(...)
         break  # one specific pairing chain per side (WR1 is the usage leader)
     ```
     An unconditional `break` terminates the receiver loop on iteration 1. If `q_cbs` is empty (the starter corner is healthy), no chain is emitted and the loop breaks immediately.
   - Lines 288–296:
     ```python
     if cov_out:
         names = "; ".join(...)
         report["chains"].append(...)
     ```
     Positioned after `if cb_pairs: ... break`. Because `cb_pairs` is non-empty for teams with depth charts, this branch is unreachable dead code.
   - Lines 298–318:
     Only evaluates `HOME-OL vs AWAY-FRONT`. Does not evaluate `AWAY-OL vs HOME-FRONT`. Only appends a chain `if down:` (if opposing DL front has an injured player on report).

3. **Input Data Feeds Inspection**:
   - `docs/data-sources/research/2026-10-13/ngs/raw_statboard_receiving.json`: 128 rows, `season: 2026`, keys include `avgSeparation`, `avgCushion`, `percentShareOfIntendedAirYards`, `targets`, `receptions`, `catchPercentage`, `avgYACAboveExpectation`.
   - `docs/data-sources/research/2026-10-13/ngs/raw_statboard_rushing.json`: 53 rows, `season: 2026`, keys include `rushAttempts`, `rushYards`, `efficiency`, `percentAttemptsGteEightDefenders`, `avgTimeToLos`, `rushYardsOverExpected`.
   - `docs/data-sources/research/2026-10-13/ngs/raw_statboard_passing.json`: 40 rows, `season: 2026`, keys include `avgTimeToThrow`, `completionPercentageAboveExpectation`, `aggressiveness`, `attempts`, `passYards`.
   - `docs/data-sources/research/2026-10-13/depthcharts/espn-depthcharts-2026.json`: Complete 32-team depth charts with OL starters (LT/LG/C/RG/RT), Defensive Front starters (DE/DT/NT/EDGE), and Secondary starters (LCB/RCB/NB/SS/FS).
   - `docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json`: 799 player records across all 32 teams. Uses `'WAS'` for Washington and `'ARI'` for Arizona.
   - `docs/data-sources/research/2026-10-13/linestar/linestar_slate_grid_2026-10-13.json`: `defense_vs_position` covers all 32 teams (including position buckets for WR1: 16, WR2: 32, TE1: 256, RB1: 2).

4. **Prototype Execution**:
   Executed `.agents/teamwork/explorer_survey_2/test_prototype.py`.
   Result: All 14 games successfully produced 4 chains each (2 receiver chains + 2 trench chains across both sides of the ball). `ALL 14 GAMES MEET chains_count >= 2: True`.

---

## 2. Logic Chain

1. From Observation 1, 10 out of 14 current matchup reports fail `chains_count >= 2` (6 have 0 chains, 4 have 1 chain).
2. From Observation 2 (Lines 278–287), the receiver pairing loop unconditionally executes `break` after the first receiver. If the opposing slot-1 cornerback is not on the injury report, `q_cbs` is empty, no chain is added, and the loop terminates. Furthermore, `if cov_out:` is dead code. Thus, healthy opposing secondaries cause 0 receiver chains.
3. From Observation 2 (Lines 298–318), trench analysis only checks `HOME-OL vs AWAY-FRONT` and only emits a chain if the away front has injured players (`if down:`). If the away defensive front is healthy, 0 trench chains are added.
4. From Observation 2 (Line 35) and Observation 3, the engine was reading a stale July 2026 file rather than the 2026 in-season NGS statboards (`raw_statboard_receiving.json`, `raw_statboard_rushing.json`, `raw_statboard_passing.json`).
5. From Observation 2 and Observation 3, lack of team alias normalization caused `WSH` (keyed as `WAS` in injuries) and `ARI` (keyed as `AZ` in old NGS) to drop data entirely.
6. By connecting the 2026 in-season NGS statboards, normalizing team aliases (`AZ` -> `ARI`, `WAS` -> `WSH`, GSIS IDs -> canonical codes), removing the premature `break`, and evaluating bidirectional trench matchups (HOME-OL vs AWAY-FRONT and AWAY-OL vs HOME-FRONT) with QB time-to-throw and RB TLOS/RYOE, every single game is guaranteed to emit at least 2 (and up to 4) fully cited causal chains.
7. Verified independently via the prototype script (`test_prototype.py`), which confirmed 14/14 games emit 4 chains with zero missing blocks.

---

## 3. Caveats

- **Historical Matchup Archive**: The files currently in `docs/predictions/research/2026-10-18/*-matchups.md` were generated with the legacy engine and should be overwritten once the worker implements the upgrade.
- **Upstream DFS / Props Dependencies**: `emit_week6_master_product.py` reads `matchup_map[m_key]['chains_count']` and prints `m_rep['chains']` in Section 2. Once `matchup_engine.py` is upgraded, running `emit_week6_master_product.py` will automatically propagate the updated chains to `WEEK6_MASTER_COMMAND_PACKET.md` and `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`.

---

## 4. Conclusion

Requirement 2 is fully mapped, diagnosed, and prototyped:
1. The failure of 10/14 Week 6 games to emit `>= 2` chains is caused by 4 specific bugs: premature `break` in `matchup_engine.py:287`, dead `cov_out` branch, one-sided trench analysis requiring defensive front injuries, and unnormalized team aliases (`WAS` vs `WSH`).
2. All required data feeds (2026 NGS receiving/rushing/passing, ESPN depth charts, Week 6 ESPN injuries, LineStar DvP) exist locally with 100% coverage across all 28 active Week 6 teams.
3. An exact implementation blueprint has been written to `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\report.md`, and validated by a working prototype script that achieves 14/14 `chains_count >= 2`.

---

## 5. Verification Method

To verify the findings independently:

1. **Verify Current Baseline Defect**:
   ```powershell
   python -c "
   import glob, os
   for f in sorted(glob.glob('docs/predictions/research/2026-10-18/*-matchups.md')):
       txt = open(f, encoding='utf-8').read()
       chains_sec = txt.split('## Matchup chains')[1] if '## Matchup chains' in txt else ''
       chains = [l for l in chains_sec.splitlines() if l.strip() and l.strip()[0].isdigit()]
       print(f'{os.path.basename(f)}: chains={len(chains)}')
   "
   ```
   *Expected output*: 6 files with `chains=0`, 4 files with `chains=1`.

2. **Verify Prototype Solution**:
   ```powershell
   python .agents/teamwork/explorer_survey_2/test_prototype.py
   ```
   *Expected output*:
   `ALL 14 GAMES MEET chains_count >= 2: True` (14/14 games emit 4 chains).

3. **Inspect Implementation Blueprint**:
   Read `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\report.md`.
