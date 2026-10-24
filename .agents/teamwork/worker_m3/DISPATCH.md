## 2026-10-04T23:49:47Z
You are Worker 3: DET @ CAR SNF Board Re-verification & Audit.
Your working directory is: C:\Users\Garrett\Sports\.agents\teamwork\worker_m3
Original Request file path: C:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md
Project Scope file path: C:\Users\Garrett\Sports\.agents\teamwork\orchestrator\PROJECT.md

You MUST read C:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md first before starting work.
Governing Doctrine: Standing Doctrines 1-11 in C:\Users\Garrett\Sports\AGENTS.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write Ownership (Exclusive to Worker 3):
- frontier/sports/audit_tonight_snf.py (new execution script)
- outbox/DET-CAR-SNF-AUDIT-2026-10-04.json (audit output)
- outbox/DET-CAR-SNF-AUDIT-2026-10-04.md (human-readable report)

Task Deliverables:
1. Implement and execute `frontier/sports/audit_tonight_snf.py`:
   - Connect to live feeds via `frontier.sports.live_feeds` or official ESPN endpoints:
     - ESPN Scoreboard: Event ID 401872978 (Detroit Lions at Carolina Panthers)
     - ESPN Core Prop Bets: Event 401872978 odds/propBets
     - ESPN 32-team rosters & Sleeper NFL player DB via `intelligence.roster.live_roster_gate.LiveRosterGate`
     - ESPN Athlete Gamelogs for empirical history samples (2025/2026 seasons)
   - Initialize `EngineGate` (with `LiveRosterGate` and `SignalRegistry`).
   - Package all lines, odds, projections, and histories in `Sourced` containers with ISO UTC timestamps and genuine sources.
   - Evaluate candidate props through `EngineGate.evaluate()`:
     - Amon-Ra St. Brown (DET) Receptions (live line 7.5 vs legacy 6.5)
     - Jahmyr Gibbs (DET) Rushing Yards (live line 98.5 vs legacy 74.5)
     - Jameson Williams (DET) Receiving Yards (live line 52.5)
     - Tetairoa McMillan (CAR) Receiving Yards (live line 73.5 vs legacy 64.5)
     - Chuba Hubbard (CAR) Rushing Yards (live line 66.5 vs legacy 54.5)
     - Chuba Hubbard (CAR) Receptions (live line 3.5)
     - Aidan Hutchinson (DET) Player Sacks (0.75)
     - Detroit Lions Team Sacks (3.5)
     - Negative test cases proving Gate 1 blocks:
       * David Montgomery on DET (traded to HOU) -> MUST BE BLOCKED
       * Andy Dalton on CAR (on PHI) -> MUST BE BLOCKED
       * Diontae Johnson on CAR (unlisted) -> MUST BE BLOCKED
       * Inactive player (e.g. Saquon Barkley on PHI) -> MUST BE BLOCKED
   - Enforce Law 9 / Doctrine 5: verify that inflated lines with non-positive Wilson LCB edge fail closed to ABSTAIN.
   - Format and write sealed audit artifacts:
     - `outbox/DET-CAR-SNF-AUDIT-2026-10-04.json`
     - `outbox/DET-CAR-SNF-AUDIT-2026-10-04.md`
2. Run script and verify output:
   - Execute `python frontier/sports/audit_tonight_snf.py`
   - Ensure it generates the artifacts in `outbox/` and exits cleanly with 0 errors.
   - Run CI anti-bypass scan to ensure `audit_tonight_snf.py` has zero violations (`from frontier.sports.test_engine_gate import violations; assert len(violations()) == 0`).
3. Deliverables:
   - Write your handoff report to `C:\Users\Garrett\Sports\.agents\teamwork\worker_m3\handoff.md`.
   - Send completion message via send_message to orchestrator.
