## 2026-10-18T14:07:16Z
You are worker_matchups_1, an implementation worker for Galaxy Sports Edge (c:\Users\Garrett\Sports).
Your working directory is: c:\Users\Garrett\Sports\.agents\teamwork\worker_matchups_1

MANDATORY FIRST STEP: Read c:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md completely.
Also read:
- c:\Users\Garrett\Sports\.agents\teamwork\PROJECT.md
- c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own: `intelligence/matchups/matchup_engine.py` and all 14 files in `docs/predictions/research/2026-10-18/*-matchups.md`. Do NOT modify files outside your ownership.

OBJECTIVE:
Implement Milestone 2 (R2) - 14/14 Specific Receiver-vs-Corner & Trench Matchup Reports:
1. Review the architecture blueprint and prototype in `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_2\report.md` (and `test_prototype.py`).
2. Upgrade `intelligence/matchups/matchup_engine.py`:
   a. Wire 2026 in-season NGS statboards (`raw_statboard_receiving.json`, `raw_statboard_rushing.json`, `raw_statboard_passing.json`) from `docs/data-sources/research/2026-10-13/ngs/`.
   b. Ingest ESPN depth charts (`docs/data-sources/research/2026-10-13/depthcharts/espn-depthcharts-2026.json`), LineStar 4-week usage, and Week 6 ESPN injury digest (`docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json`).
   c. Normalize player and team aliases (`WAS` -> `WSH`, `AZ` -> `ARI`, GSIS IDs).
   d. Remove premature loop break at line 287; activate coverage injury branches; implement bidirectional trench matchups (`HOME-OL vs AWAY-FRONT` and `AWAY-OL vs HOME-FRONT`) with QB time-to-throw and RB rushing metrics.
3. Run `python intelligence/matchups/matchup_engine.py` to regenerate all 14 matchup files (`docs/predictions/research/2026-10-18/*-matchups.md`).
4. Verify that ALL 14 matchup files have `chains_count >= 2` (zero games with 0 or 1 chain) and contain genuine, non-empty, file-cited causal chains.
5. Write your report and formal hard handoff to `c:\Users\Garrett\Sports\.agents\teamwork\worker_matchups_1\handoff.md`.

When complete, send a message to the orchestrator with summary of work and verification results.
