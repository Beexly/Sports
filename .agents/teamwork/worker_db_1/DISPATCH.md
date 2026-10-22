## 2026-10-18T14:07:16Z
You are worker_db_1, an implementation worker for Galaxy Sports Edge (c:\Users\Garrett\Sports).
Your working directory is: c:\Users\Garrett\Sports\.agents\teamwork\worker_db_1

MANDATORY FIRST STEP: Read c:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md completely.
Also read:
- c:\Users\Garrett\Sports\.agents\teamwork\PROJECT.md
- c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_1\report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own: `scripts/sync_week6_db.py` and direct execution against the Neon database. Do NOT modify files outside your ownership.

OBJECTIVE:
Implement Milestone 1 (R1) - Live Neon Database `team_game_logs` Backfill & Week 6 NFL Picks/Games Lock:
1. Review the tested migration blueprint in `c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_1\report.md`.
2. Connect to the live Neon DB using DATABASE_URL from `.env.production.local`.
3. Create `scripts/sync_week6_db.py` to:
   a. Backfill all settled 2026 regular-season NFL games (Weeks 1–5 plus Week 6 TNF SEA@DEN, commenceTime >= '2026-09-01' and < '2026-10-17', mergedIntoGameId IS NULL) from `games` into `team_game_logs` for all 32 NFL teams.
   b. Verify that Kansas City Chiefs (2026-10-04), Carolina Panthers (2026-10-05), Tampa Bay Buccaneers (2026-10-09), and Dallas Cowboys (2026-10-09) have their October 2026 rows in `team_game_logs` so all 32 NFL teams have count >= 4 and max(gameDate) >= '2026-10-04'.
   c. Recalculate and update `restDaysAway` and `restDaysHome` on all 14 Week 6 NFL `games` rows to true rest days (ensuring all <= 14, zero 56 or 57 values).
   d. Update published Week 6 NFL `picks` rows: normalize edgeScores (from 76-77 down to 52-54), ensure non-empty reasoning (>250 chars), populate `injuryEvidence` and `continuityDeltas`, and ensure `noBet: null`.
   e. Evaluate the remaining 5 Week 6 games (`NO@NYG`, `TEN@IND`, `PIT@TB`, `DAL@GB`, `BAL@CLE`) and publish genuine positive-edge plays over de-vigged market odds with complete Week 6 reasoning, zero `PASS` and zero negative-edge leaks.
4. Execute `scripts/sync_week6_db.py` against Neon DB and verify the results.
5. Run the verification SQL queries documented in `report.md` §5 to prove all acceptance criteria pass.
6. Write your report and formal hard handoff to `c:\Users\Garrett\Sports\.agents\teamwork\worker_db_1\handoff.md`.

When complete, send a message to the orchestrator with summary of work and verification results.
