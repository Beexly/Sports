# C4 Code Level: `intelligence/coaching` & `intelligence/reasoning` (26-Layer ContextPacket & 5-Track `L1..L5` Reasoning)

## Overview

- **Name**: Situational Context Ingestion, Morning Sweep Charting & 5-Track Reasoning Orchestrator
- **Description**: Builds the 26-Layer `ContextPacket` (`L01..L26`) from play-by-play tendencies, active injury/depth-chart gates (`Stage 0`), trench pass protection (`wPP`/`xwPP`), `QB Supporting Cast Score`, `FunnelReport+`, `PCVR`, and Seattle red-zone inversion splits, then executes the 5-Track (`L1..L5`) `ReasoningTrace` before any snap simulation runs.
- **Location**: [`intelligence/coaching/`](file:///C:/Users/Garrett/Sports/intelligence/coaching), [`intelligence/reasoning/`](file:///C:/Users/Garrett/Sports/intelligence/reasoning), and [`intelligence/external_charting/`](file:///C:/Users/Garrett/Sports/intelligence/external_charting)
- **Language**: Python 3.13
- **Purpose**: Implements `Stage 1` and `Stage 2` of the Full-Game Snap-by-Snap JEV & 5-Stage Engine Gate Doctrine (`Situational First`).

## Code Elements

### Functions/Methods

- `compute_morning_sweep_situational_adjustment(off_team: str, def_team: str, is_red_zone: bool = False): Dict[str, Any]`
  - Description: Synthesizes `@sfdata9ers` QB Supporting Cast Score, `@realjoespinosa7` OL `wPP/xwPP`, `@suuma810` Seattle Red-Zone Inversion, `@MagicSportsGuy` `FunnelReport+`, and `@connor_long15` `PCVR` into snap-level pressure, pass-rate, and target-funnel adjustments.
  - Location: [`intelligence/external_charting/morning_sweep_2026_11_07.py:165`](file:///C:/Users/Garrett/Sports/intelligence/external_charting/morning_sweep_2026_11_07.py#L165-L240)
  - Dependencies: `data/external_charting/2026-11-07/*.csv`

- `get_qb_disguise_blitz_profile(qb_name_or_team: str): Dict[str, Any]`
  - Description: Returns the quarterback's pressure-to-sack survival, disguise vulnerability, and `QB Supporting Cast` adjustment (`Joe Milton III` verified for `PHI`).
  - Location: [`intelligence/coaching/qb_disguise_blitz_matrix.py:98`](file:///C:/Users/Garrett/Sports/intelligence/coaching/qb_disguise_blitz_matrix.py#L98-L145)
  - Dependencies: `morning_sweep_2026_11_07.py`

### Classes/Modules

- `ReasoningOrchestrator`
  - Description: Coordinates the 26-Layer `ContextPacket` and 5-Track (`L1` Market Anchor, `L2` Trench & Matchup, `L3` Coaching & Script, `L4` Weather/Rest/Venue, `L5` Conjunction & Pass Discipline) reasoning pipeline.
  - Location: [`intelligence/reasoning/orchestrator.py`](file:///C:/Users/Garrett/Sports/intelligence/reasoning/orchestrator.py)
  - Methods: `build_context_packet()`, `run_reasoning_tracks()`
  - Dependencies: `intelligence/coaching/*`, `intelligence/external_charting/*`

## Dependencies

### Internal Dependencies
- [`data/external_charting/2026-11-07/`](file:///C:/Users/Garrett/Sports/data/external_charting/2026-11-07) (`35` full-table CSVs)
- [`data/nflverse/injuries_2026.csv`](file:///C:/Users/Garrett/Sports/data/nflverse/injuries_2026.csv)

### External Dependencies
- `pandas`, `numpy`, `duckdb`
