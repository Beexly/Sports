## 2026-10-18T13:52:06Z
You are explorer_survey_3, an exploration agent for Galaxy Sports Edge (c:\Users\Garrett\Sports).
Your working directory is: c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3

MANDATORY FIRST STEP: Read c:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md completely. Do not skip this step.

OBJECTIVE:
Investigate and map Requirements 3, 4, and 5 (R3, R4, R5):
1. R3 - Player Props Engine & Archived DraftKings Lines:
   - Inspect `intelligence/pipeline/emit_week6_master_product.py` (specifically how props are currently generated and where synthetic `~90.3 yds` lines came from).
   - Inspect all 14 archived DraftKings prop files in `docs/data-sources/research/props-archive/*_20261018T09.json`. Document their structure, available markets (`Total Passing Yards`, `Total Pass Completions`, `Total Passing Touchdowns`, `Total Rushing Yards`, `Total Carries`, `Total Receiving Yards`, `Total Receptions`, `Total Passing Plus Rushing Yards`), fields (`line`, `openLine`, `lineMoved`, `propMarket`, `playerName`), and game mappings.
   - Inspect `intelligence/roster/live_roster_gate.py` and how it enforces fail-closed filtering on inactives/OUT/IR/Doubtful/PUP.
   - Design the exact join between active Week 6 players and the DraftKings archive files, computing projection mu, sigma, tail win prob P(Over/Under) against the real DK half-point line, and un-tied conviction scores.
2. R4 - Empirical Student-t Copula SGP Parlays:
   - Inspect `intelligence/sgp/sgp_copula_engine.py` and `data/snapshots/sgp_correlations.json` (1,088-game nflverse 8x8 correlation matrix).
   - Verify how the 8 target Week 6 SGPs (HOU@JAX, CHI@ATL, CAR@PHI, ARI@LAR, LAC@KC, BUF@LV, DAL@GB, WSH@SF) should be constructed and priced using 50,000-draw Student-t copula simulations (`nu=4.0`), anchored to actual DraftKings prop lines and live game totals, with every leg verified ACTIVE through LiveRosterGate.
3. R5 - Week 6 DraftKings DFS Optimal Lineups:
   - Inspect `intelligence/optimizer/dfs_optimizer_suite.py` and `build_week6_dfs_optimal_suite` in `emit_week6_master_product.py`.
   - Verify slate filtering to active Sunday/Monday slate teams (excluding bye teams MIN, DET, MIA, CIN and completed TNF SEA@DEN).
   - Ensure player team resolution gives valid 2026 teams (zero "NFL" placeholders) and zero OUT/IR/Doubtful players.
   - Verify lineup constraints (salary <= $50,000, 9 slots: QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST) across Cash Mode, Greedy Leverage, Tabu Search Top-3, and FieldSim 99.5th-percentile portfolios.
4. Output specs:
   - Structure of `docs/predictions/research/2026-10-18/WEEK6_MASTER_COMMAND_PACKET.md`
   - Structure of `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`
5. Provide a detailed, step-by-step refactoring plan for a worker.

SCOPE BOUNDARIES:
- Read-only exploration. DO NOT modify production source code or generate output artifacts yet.
- Write your full report to: c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3\report.md

When finished, send a message to orchestrator with a summary of findings and the path to your report.md.
