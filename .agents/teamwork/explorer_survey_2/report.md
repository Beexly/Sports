# Comprehensive Survey & Implementation Blueprint: Requirement 2 (R2)
## 14/14 Specific Receiver-vs-Corner & Trench Matchup Reports Upgrade

**Author**: `explorer_survey_2`  
**Date**: 2026-10-18  
**Scope**: Read-Only Architecture & Data Investigation of `intelligence/matchups/matchup_engine.py` and Associated Research Feeds  
**Target Output**: Zero Week 6 games with 0 or 1 chains; 14/14 games emitting `>= 2` file-cited causal chains covering specific WR/TE-vs-CB/Safety matchups and OL-vs-Front trench mismatches.

---

## 1. Executive Summary & Diagnostic Findings

Requirement 2 (R2) of the master command specifies:
> "Upgrade `intelligence/matchups/matchup_engine.py` to integrate 2026 in-season NGS receiving/rushing/passing statboards (`raw_statboard_receiving.json`, `raw_statboard_rushing.json`, `raw_statboard_passing.json`), 4-week LineStar usage shares, 2026 ESPN depth charts, and normalized player-name matching against `espn_nfl_injuries_week6.json` so all 14/14 Week 6 NFL games emit non-empty, file-cited causal chains covering both specific WR/TE-vs-CB/Safety matchups and OL-vs-Defensive-Front trench mismatches (`docs/predictions/research/2026-10-18/*-matchups.md`). Acceptance criteria: `chains_count >= 2` for every game."

### 1.1 Current Baseline Audit
An exhaustive inspection of the existing 14 Week 6 matchup reports in `docs/predictions/research/2026-10-18/*-matchups.md` reveals severe data suppression and structural defects:
- **6 games currently have 0 chains (Completely Empty)**: `ARI@LAR`, `BUF@LV`, `HOU@JAX`, `LAC@KC`, `PIT@TB`, `WSH@SF`.
- **4 games have only 1 chain**: `BAL@CLE`, `CAR@PHI`, `NO@NYG`, `TEN@IND`.
- **Only 4 games currently meet `chains_count >= 2`**: `CHI@ATL` (2), `DAL@GB` (2), `NYJ@NE` (2), `SEA@DEN` (3).

### 1.2 Root Cause Analysis

| Defect ID | Mechanism in `matchup_engine.py` | Impact |
|---|---|---|
| **RC-1: Premature Loop Termination** | Line 287 has an unconditional `break` inside `if cb_pairs:` at the end of the first receiver iteration (WR1). | Terminates the receiver pairing loop immediately. WR2, TE1, and RB1 are never evaluated. |
| **RC-2: Healthy Starter Invalidation** | Lines 279–286 only append a chain if `q_cbs` is non-empty (`if q_cbs:`). If the opposing slot-1 CB is healthy (`not-on-report`), nothing is appended and `break` executes. | If opposing CB1 is healthy, 0 receiver chains are emitted for the entire team, even if WR1 has elite separation or safeties are out. |
| **RC-3: Dead Coverage Void Logic** | Lines 288–296 (`if cov_out:`) sit after `if cb_pairs: ... break`. | Because `cb_pairs` is populated for almost every team, `if cov_out:` is dead code and never executes. Systemic secondary injuries are ignored. |
| **RC-4: One-Sided Trench Analysis** | Lines 298–318 only evaluate `HOME-OL vs AWAY-FRONT`. It never evaluates `AWAY-OL vs HOME-FRONT`. | 50% of the trench game is completely unmodeled. |
| **RC-5: Zero-Defensive-Injury Suppression** | Line 310 only appends a trench chain `if down:`. | If the opposing front has no players on IR/Out, 0 trench chains are emitted, ignoring OL injuries, QB time-to-throw, and RB TLOS/RYOE mismatches. |
| **RC-6: Stale 2025 Input Files** | Line 35 points to `nextgenstats.nfl.com_stats_receiving#yards.2026-07-03T13_39_35.994Z.json` (a 2025-season snapshot), ignoring `raw_statboard_receiving.json`. | Emits stale 2025 targets and yards; misses 2026 rookies and traded players. |
| **RC-7: Team Key Aliasing Mismatch** | The old file used `'AZ'` and `'WAS'`, while ESPN depth charts use `'ARI'` and `'WSH'`, and ESPN injuries uses `'ARI'` and `'WAS'`. `build_matchups` does not canonicalize team strings. | `WSH@SF` failed with `injury digest missing a team block (SF/WSH)` and 0 pairings for WSH. `ARI@LAR` had 0 receivers for ARI. |

---

## 2. Forensic Audit of All 14 Current Matchup Reports

| Matchup | Pairings | Chains | Status | Specific Breakdown & Defect Details |
|---|---:|---:|:---:|---|
| **ARI@LAR** | 1 | **0** | **FAIL** | ARI not found in stale 2025 NGS (`AZ` key); LAR WR1 Nacua drew healthy CB1 Garrett Williams -> 0 receiver chains; ARI defensive front healthy -> 0 trench chains. |
| **BAL@CLE** | 2 | **1** | **FAIL** | CLE CB1 healthy -> 0 receiver chains; BAL CB1 healthy -> 0 receiver chains; only HOME-OL vs AWAY-FRONT emitted a chain due to Broderick Washington Jr. (DT, OUT). |
| **BUF@LV** | 2 | **0** | **FAIL** | Both teams' slot-1 corners healthy -> 0 receiver chains; LV defensive front has no DOWN players -> 0 trench chains. |
| **CAR@PHI** | 2 | **1** | **FAIL** | Both teams' slot-1 corners healthy -> 0 receiver chains; only HOME-OL emitted due to Cam Jackson (DT, IR). |
| **CHI@ATL** | 2 | 2 | PASS | CHI WR1 Odunze chain emitted (ATL CB Clark Phillips on report); HOME-OL emitted (Dayo Odeyingbo, IR). |
| **DAL@GB** | 2 | 2 | PASS | Both GB WR1 Doubs and DAL WR1 Pickens drew corner injuries; 0 trench chains emitted. |
| **HOU@JAX** | 2 | **0** | **FAIL** | Both teams' slot-1 corners healthy -> 0 receiver chains; JAX front has no DOWN players -> 0 trench chains. |
| **LAC@KC** | 2 | **0** | **FAIL** | Both teams' slot-1 corners healthy -> 0 receiver chains; KC front has no DOWN players -> 0 trench chains. |
| **NO@NYG** | 2 | **1** | **FAIL** | NO WR1 Olave emitted chain (NYG CB on report); NYG front has no DOWN players -> 0 trench chains. |
| **NYJ@NE** | 2 | 2 | PASS | NYJ WR1 Mitchell emitted chain; NE front missing Joseph Ossai -> trench chain emitted. |
| **PIT@TB** | 2 | **0** | **FAIL** | Both teams' slot-1 corners healthy -> 0 receiver chains; TB front has no DOWN players -> 0 trench chains. |
| **SEA@DEN** | 2 | 3 | PASS | DEN WR1 Sutton and SEA WR1 JSN both emitted; HOME-OL emitted (Brandon Pili OUT). |
| **TEN@IND** | 2 | **1** | **FAIL** | Both slot-1 corners healthy -> 0 receiver chains; HOME-OL emitted (Jordan Elliott OUT). |
| **WSH@SF** | 1 | **0** | **FAIL** | WSH team code mismatch (`WAS` vs `WSH`); gap logged: `injury digest missing a team block (SF/WSH)`. WSH offense completely absent. |

**Summary**: Only 28.6% (4/14) pass the mandate. 71.4% (10/14) fail the `chains_count >= 2` acceptance criterion.

---

## 3. Input Data Feed Specification & Schema Inventory

All required 2026 in-season data feeds are present, verified, and complete on the local filesystem in `docs/data-sources/research/`.

### 3.1 2026 In-Season Next Gen Stats (NGS) Statboards
Location: `docs/data-sources/research/2026-10-13/ngs/`
- **`raw_statboard_receiving.json`** (`season: 2026`, 128 rows):
  - Primary Keys: `playerName`, `teamId` (GSIS franchise ID, e.g. `'3430'`, `'3700'`), `position`.
  - Metrics: `avgSeparation` (SEP in yds), `avgCushion` (CUSH in yds), `percentShareOfIntendedAirYards` (TAY%), `targets`, `receptions`, `catchPercentage`, `yards`, `recTouchdowns`, `avgYAC`, `avgExpectedYAC`, `avgYACAboveExpectation` (EYAC/R).
- **`raw_statboard_rushing.json`** (`season: 2026`, 53 rows):
  - Primary Keys: `playerName`, `teamId`, `position` (`RB`).
  - Metrics: `rushAttempts` (ATT), `rushYards` (YDS), `avgRushYards` (AVG), `efficiency` (EFF), `percentAttemptsGteEightDefenders` (8+D%), `avgTimeToLos` (TLOS in seconds), `rushYardsOverExpected` (RYOE), `rushYardsOverExpectedPerAtt` (RYOE/ATT).
- **`raw_statboard_passing.json`** (`season: 2026`, 40 rows):
  - Primary Keys: `playerName`, `teamId`, `position` (`QB`).
  - Metrics: `avgTimeToThrow` (TTT in seconds), `attempts`, `completions`, `passYards`, `passTouchdowns`, `interceptions`, `completionPercentageAboveExpectation` (CPOE%), `aggressiveness` (AGG% into tight coverage < 1 yd).

### 3.2 LineStar Feeds
Location: `docs/data-sources/research/2026-10-13/linestar/`
- **`linestar_slate_grid_2026-10-13.json`**:
  - `defense_vs_position`: Full DVOA metrics and defense yields allowed across 13 positional buckets (`QB: 1`, `RB1: 2`, `RB2: 4`, `WR: 240`, `WR1: 16`, `WR2: 32`, `WR3: 64`, `TE: 768`, `TE1: 256`) for all 32 NFL teams (`Abbrev`: `'LAC'`, `'KC'`, `'ATL'`, etc.).
  - Yield metrics: `FPPG_DK`, `ReceivingYards`, `ReceivingTouchdowns`, `Targets`, `Receptions`, `RushingYards`, `DVOA`.
  - `players` (746 rows): Individual player salaries, site projections, injury status, starting order.
- **`linestar_usage_2026-10-13.json`**:
  - Trailing 4-week window metrics: `target_share_4wk`, `snap_share_4wk`, `carry_share_4wk`, `rz_targets_4wk`, `rz_recTD_4wk`.
- **`linestar_usage_surfaces_2026-10-13.json`**:
  - `snap_counts` (64 rows) & `red_zone_stats` (65 rows): granular snap counts and red zone targets across trailing 2/4/8 week windows.

### 3.3 ESPN Depth Charts
Location: `docs/data-sources/research/2026-10-13/depthcharts/espn-depthcharts-2026.json`
- Contains complete 32-team depth charts with slot hierarchy:
  - Offensive Line: `3WR 1TE|LT` (starter slot=3), `LG` (slot=4), `C` (slot=5), `RG` (slot=6), `RT` (slot=7).
  - Defensive Front: `Base 4-3 D|LDE`, `LDT`, `RDT`, `RDE` or `Base 3-4 D|NT`, `DE`, `OLB`, `EDGE`.
  - Secondary: `Base 4-3 D|LCB` (slot=1), `RCB` (slot=1), `NB` (slot=1), `SS` (slot=1), `FS` (slot=1).

### 3.4 ESPN Week 6 Official Injury Digest
Location: `docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json`
- 799 player status entries across all 32 teams.
- Fields: `athlete`, `position`, `status` (`OUT`, `INJURED RESERVE`, `DOUBTFUL`, `QUESTIONABLE`, `ACTIVE`), `detail` (injury type/body part), `date`.

---

## 4. Entity Matching & Injury Filtering Protocol

### 4.1 NFL GSIS Franchise ID Mapping Table
NGS statboards key teams by 4-digit GSIS IDs. The engine must map them unambiguously to canonical 3-letter codes:

```python
GSIS_TEAM_MAP = {
    '0200': 'ATL', '0325': 'BAL', '0610': 'BUF', '0750': 'CAR', '0810': 'CHI',
    '0920': 'CIN', '1050': 'CLE', '1200': 'DAL', '1400': 'DEN', '1540': 'DET',
    '1800': 'GB',  '2100': 'TEN', '2120': 'HOU', '2200': 'IND', '2250': 'JAX',
    '2310': 'KC',  '2510': 'LAR', '2520': 'LV',  '2700': 'MIA', '3000': 'MIN',
    '3200': 'NE',  '3300': 'NO',  '3410': 'NYG', '3430': 'NYJ', '3700': 'PHI',
    '3800': 'ARI', '3900': 'PIT', '4400': 'LAC', '4500': 'SF',  '4600': 'SEA',
    '4900': 'TB',  '5110': 'WSH'
}
```

### 4.2 LineStar Team ID Mapping (65–96)
```python
LINESTAR_TEAM_MAP = {
    65: 'LAC', 66: 'DEN', 67: 'DET', 68: 'ATL', 69: 'SEA', 70: 'CAR', 71: 'BAL', 72: 'CIN',
    73: 'MIA', 74: 'JAX', 75: 'LAR', 76: 'KC',  77: 'CHI', 78: 'NE',  79: 'BUF', 80: 'NYJ',
    81: 'MIN', 82: 'TB',  83: 'HOU', 84: 'TEN', 85: 'PHI', 86: 'ARI', 87: 'LV',  88: 'CLE',
    89: 'IND', 90: 'PIT', 91: 'GB',  92: 'NO',  93: 'WSH', 94: 'DAL', 95: 'SF',  96: 'NYG'
}
```

### 4.3 Team Abbreviation Canonicalizer
```python
TEAM_ALIASES = {
    'AZ': 'ARI', 'ARZ': 'ARI', 'WAS': 'WSH', 'WFT': 'WSH',
    'JAC': 'JAX', 'LA': 'LAR', 'SD': 'LAC', 'OAK': 'LV'
}

def canon_team(t: str) -> str:
    if not t:
        return ""
    s = str(t).strip().upper()
    if s in GSIS_TEAM_MAP:
        return GSIS_TEAM_MAP[s]
    try:
        tid = int(s)
        if tid in LINESTAR_TEAM_MAP:
            return LINESTAR_TEAM_MAP[tid]
    except ValueError:
        pass
    return TEAM_ALIASES.get(s, s)
```

### 4.4 Player Name Normalization
Handles `"Last, First"`, curly apostrophes, periods, hyphens, and generational suffixes (`Jr.`, `Sr.`, `III`, `II`, `IV`):
```python
def norm_name(name: str) -> str:
    n = (name or "").strip()
    if "," in n:
        parts = [p.strip() for p in n.split(",", 1)]
        n = f"{parts[1]} {parts[0]}"
    n = n.replace("’", "'")
    n = re.sub(r"[.\u2019']", "", n)
    for suf in (" jr", " sr", " iii", " ii", " iv", " v"):
        if n.lower().endswith(suf):
            n = n[:-len(suf)].strip()
    return re.sub(r"\s+", " ", n).lower().strip()
```

### 4.5 Fail-Closed Injury Filtering Protocol
- **Offensive Weapons Exclusion**: Players listed as `OUT`, `IR`, `INJURED RESERVE`, `DOUBTFUL`, or `PUP` are filtered out from being designated as the active WR1/WR2/TE1/RB1 usage leader.
- **Defensive Coverage Voids**: Cornerbacks and Safeties (`CB`, `S`, `FS`, `SS`, `NB`) with status `OUT`, `IR`, `INJURED RESERVE`, or `DOUBTFUL` represent systemic coverage voids and are cited as reasons for passing target concentration.
- **Trench Compromise**:
  - Offensive Line starters (`LT`, `LG`, `C`, `RG`, `RT`) with status `OUT`/`IR` represent protection compromises.
  - Defensive Front starters (`DE`, `DT`, `EDGE`, `NT`) with status `OUT`/`IR` represent pass-rush attrition.

---

## 5. Exact Code Modifications for `intelligence/matchups/matchup_engine.py`

### 5.1 File Headers & Path Upgrades
Update lines 35–41 to reference 2026 in-season feeds directly:
```python
NGS_REC_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_receiving.json"
NGS_RUSH_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_rushing.json"
NGS_PASS_FILE = SOURCES / "2026-10-13" / "ngs" / "raw_statboard_passing.json"
LINESTAR_GRID_FILE = SOURCES / "2026-10-13" / "linestar" / "linestar_slate_grid_2026-10-13.json"
LINESTAR_USAGE_FILE = SOURCES / "2026-10-13" / "linestar" / "linestar_usage_2026-10-13.json"
INJ_FILE = SOURCES / "2026-10-18" / "injuries" / "espn_nfl_injuries_week6.json"
DC_FILE = SOURCES / "2026-10-13" / "depthcharts" / "espn-depthcharts-2026.json"
```

### 5.2 2026 Receiving Statboard Parser (`_receivers`)
Replace the markdown table parser with a clean JSON loader supporting 2026 fields:
```python
def _receivers() -> dict[str, list[dict]]:
    d = _load(NGS_REC_FILE)
    if not d:
        return {}
    rows: dict[str, list[dict]] = {}
    for r in (d.get("stats") or []):
        team = canon_team(r.get("teamId"))
        p_info = r.get("player") or {}
        pname = p_info.get("displayName") or r.get("playerName") or ""
        row = {
            "player": pname,
            "team": team,
            "pos": r.get("position") or p_info.get("position") or "WR",
            "season_label": "2026-inseason",
            "cushion": float(r.get("avgCushion") or 0.0),
            "sep": float(r.get("avgSeparation") or 0.0),
            "tay": float(r.get("avgIntendedAirYards") or 0.0),
            "tay_pct": float(r.get("percentShareOfIntendedAirYards") or 0.0),
            "rec": int(r.get("receptions") or 0),
            "tar": int(r.get("targets") or 0),
            "catch_pct": float(r.get("catchPercentage") or 0.0),
            "yards": float(r.get("yards") or 0.0),
            "td": int(r.get("recTouchdowns") or 0),
            "yac_per_r": float(r.get("avgYAC") or 0.0),
            "eyac_per_r": float(r.get("avgYACAboveExpectation") or 0.0),
            "source": str(NGS_REC_FILE.relative_to(REPO)).replace("\\", "/"),
        }
        rows.setdefault(team, []).append(row)
    for team in rows:
        rows[team].sort(key=lambda x: x["tar"], reverse=True)
    return rows
```

### 5.3 2026 Rushing & Passing Parsers
Parse `raw_statboard_rushing.json` (ATT, YDS, EFF, 8+D%, TLOS, RYOE) and `raw_statboard_passing.json` (attempts, completions, passYards, CPOE, avgTimeToThrow).

### 5.4 Dual-Side Receiver Pairing & Chain Emission Logic
In `build_matchups(home: str, away: str)`:
1. Canonicalize `home = canon_team(home)` and `away = canon_team(away)`.
2. Iterate over both sides:
   - `("AWAY-OFF vs HOME-DEF", (away, home))`
   - `("HOME-OFF vs AWAY-DEF", (home, away))`
3. Filter out injured offensive leaders (`OUT`/`IR`) from taking WR1 title.
4. Match WR1 against the opposing slot-1 CB ladder (`LCB`, `RCB`, `NB`).
5. **CRITICAL FIX**: Remove the premature `break`!
6. Generate a file-cited causal chain for the primary receiver matchup citing:
   - 2026 NGS separation, air yards share, and targets (`raw_statboard_receiving.json`).
   - Matched opposing slot-1 CB and status (`espn-depthcharts-2026.json`, `espn_nfl_injuries_week6.json`).
   - Secondary injuries or coverage scheme vulnerability / DvP rankings (`linestar_slate_grid_2026-10-13.json`).
   - Explicit, falsifiable breaking condition.

### 5.5 Dual-Side Trench Mismatch Engine
In `build_matchups`:
Evaluate BOTH `AWAY-OL vs HOME-FRONT` and `HOME-OL vs AWAY-FRONT`:
1. Extract offensive line starters (`LT`, `LG`, `C`, `RG`, `RT`) from depth charts and check OL injuries in `espn_nfl_injuries_week6.json`.
2. Extract defensive front starters (`DE`, `DT`, `NT`, `EDGE`) and check front injuries in `espn_nfl_injuries_week6.json`.
3. Read team QB `avgTimeToThrow` (TTT) from `raw_statboard_passing.json`.
4. Read team RB1 `avgTimeToLos` (TLOS) and `rushYardsOverExpected` (RYOE) from `raw_statboard_rushing.json`.
5. Emit a file-cited trench chain:
   - If OL is injured: cite OL compromise and swinging pass rush win rate to opposing defensive front.
   - If DL is injured: cite thinned front rotation, collapse of defensive pressure rate, and widening QB pocket window.
   - If both are healthy: cite QB pocket release tempo (`TTT`) and RB downhill lane leverage (`TLOS` / `RYOE`) vs defensive front ranks in `linestar_slate_grid_2026-10-13.json`.
   - Explicit breaking condition.

### 5.6 Result: Guaranteed Minimum Chains
With both sides evaluated for:
1. `AWAY-OFF vs HOME-DEF` (Receiver Chain + Trench Chain = 2 chains)
2. `HOME-OFF vs AWAY-DEF` (Receiver Chain + Trench Chain = 2 chains)
Every single game emits **4 chains** (minimum 2), completely eliminating the 0-chain and 1-chain defect.

---

## 6. Implementation Blueprint for Worker Agent

When the orchestrator assigns an execution worker to implement Requirement 2, the worker should execute the following sequence:

### Step 1: Update `intelligence/matchups/matchup_engine.py`
Apply the unified code modifications:
1. Update file path constants to point to 2026 in-season feeds in `docs/data-sources/research/2026-10-13/ngs/`.
2. Add `GSIS_TEAM_MAP` and `canon_team` normalization.
3. Update `_receivers()` to load from `raw_statboard_receiving.json`.
4. Update `_rushers()` to load from `raw_statboard_rushing.json`.
5. Add `_passers()` to load from `raw_statboard_passing.json`.
6. Add `_dvp()` to load from `linestar_slate_grid_2026-10-13.json`.
7. Refactor `build_matchups()`:
   - Canonicalize team codes.
   - Run both `AWAY-OFF vs HOME-DEF` and `HOME-OFF vs AWAY-DEF`.
   - Eliminate unconditional `break`.
   - Add dual-side OL-vs-Front trench analysis with QB TTT and RB TLOS.
   - Emit verified chains with breaking conditions.

### Step 2: Regenerate All 14 Matchup Reports
Execute the runner:
```powershell
python -c "
from intelligence.matchups.matchup_engine import emit_matchup_md
games = [
    ('LAR', 'ARI'), ('CLE', 'BAL'), ('LV', 'BUF'), ('PHI', 'CAR'),
    ('ATL', 'CHI'), ('GB', 'DAL'), ('JAX', 'HOU'), ('KC', 'LAC'),
    ('NYG', 'NO'), ('NE', 'NYJ'), ('TB', 'PIT'), ('DEN', 'SEA'),
    ('IND', 'TEN'), ('SF', 'WSH')
]
for home, away in games:
    path, rep = emit_matchup_md(home=home, away=away, date='2026-10-18')
    print(f'{away}@{home} -> {len(rep[\"chains\"])} chains')
"
```

### Step 3: Run Full Validation Suite
Verify all 14 files in `docs/predictions/research/2026-10-18/*-matchups.md`:
```powershell
python -c "
import glob, os
files = sorted(glob.glob('docs/predictions/research/2026-10-18/*-matchups.md'))
assert len(files) == 14, f'Expected 14 files, found {len(files)}'
for f in files:
    txt = open(f, encoding='utf-8').read()
    chains_sec = txt.split('## Matchup chains')[1] if '## Matchup chains' in txt else ''
    chains = [l for l in chains_sec.splitlines() if l.strip() and l.strip()[0].isdigit()]
    assert len(chains) >= 2, f'{os.path.basename(f)} failed with {len(chains)} chains'
    print(f'{os.path.basename(f)}: PASS ({len(chains)} chains)')
print('ALL 14 MATCHUP REPORTS VERIFIED WITH chains_count >= 2!')
"
```

### Step 4: Downstream Synchronize Master Command Packet
Re-run `python intelligence/pipeline/emit_week6_master_product.py` to ensure Section 2 of `WEEK6_MASTER_COMMAND_PACKET.md` and `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json` reflect non-zero chains across all 14 games.

---

## 7. Artifact Index

- **Survey Report**: `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\report.md`
- **Verification Prototype**: `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\test_prototype.py`
- **Handoff Report**: `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\handoff.md`
- **Dispatch Log**: `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\DISPATCH.md`
- **Briefing & Progress**: `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\BRIEFING.md`, `progress.md`
