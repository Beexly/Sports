# Dispatch Log

## 2026-10-18T13:50:13Z
From: parent (4ab43d0b-bf76-49ee-b183-b70e04a14178)
Priority: MESSAGE_PRIORITY_HIGH

You are the Project Orchestrator (orchestrator_4) for Galaxy Sports Edge (`c:\Users\Garrett\Sports`).

Working directory: `c:\Users\Garrett\Sports\.agents\teamwork\orchestrator_4`
User Request Reference: `c:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md` (see timestamp `## 2026-10-18T13:48:18Z`).

User Directive:
"Deliver a 100% accurate, zero-fabrication, fail-closed NFL Week 6 & Week 7 production intelligence suite and live Neon database state for Galaxy Sports Edge (`c:\Users\Garrett\Sports`), covering all 14 Week 6 NFL games, live published database picks, 20,019 archived DraftKings player prop lines, 14/14 specific receiver-vs-corner and trench matchup chains, empirical Student-t copula SGP parlays, and DraftKings DFS optimal lineups. Use a very large team of agents to execute and verify every NFL surface in parallel. When spawning subagents, use the low/flash tier (`flash` / `flash_lite`) as requested by the user."

Key Requirements:
1. R1. Live Neon Database `team_game_logs` Backfill & Week 6 NFL Picks/Games Lock:
   - Backfill all settled 2026 regular-season NFL games (Weeks 1–5 plus Week 6 TNF `SEA@DEN`, `commenceTime >= '2026-09-01'` and `commenceTime < '2026-10-17'`, `mergedIntoGameId IS NULL`) from `games` into `team_game_logs` for all 32 NFL teams—specifically ensuring `Kansas City Chiefs` (`2026-10-04`), `Carolina Panthers` (`2026-10-05`), `Tampa Bay Buccaneers` (`2026-10-09`), and `Dallas Cowboys` (`2026-10-09`) have their October 2026 rows in `team_game_logs` so no background worker querying `team_game_logs` can ever revert `restDaysHome`/`restDaysAway` to `56`–`57` days or inflate `edgeScore` to `76`–`77`.
   - Re-verify and lock `restDaysAway` and `restDaysHome` on all 14 Week 6 NFL `games` rows.
   - Update all published Week 6 NFL `picks` rows (`factorBreakdown`, `injuryEvidence`, `continuityDeltas`, `reasoning`, `edgeScore`, `noBet: null`) to reflect true rest and Week 6 signals.
   - Evaluate the remaining Week 6 NFL games (`NO@NYG`, `TEN@IND`, `PIT@TB`, `DAL@GB`, `BAL@CLE`) so every genuine positive-edge play over de-vigged consensus odds is published with full Week 6 reasoning and zero `PASS` or negative-edge leaks.
2. R2. 14/14 Specific Receiver-vs-Corner & Trench Matchup Reports:
   - Upgrade `intelligence/matchups/matchup_engine.py` to integrate 2026 in-season NGS receiving/rushing/passing statboards, 4-week LineStar usage shares, 2026 ESPN depth charts, and normalized player-name matching against `espn_nfl_injuries_week6.json`.
   - Emit non-empty, file-cited causal chains covering both specific WR/TE-vs-CB/Safety matchups and OL-vs-Defensive-Front trench mismatches for all 14 Week 6 games (`docs/predictions/research/2026-10-18/*-matchups.md`).
3. R3. Week 6 Player Props Engine Wired Directly to All 20,019 Archived DraftKings Lines:
   - Refactor the Week 6 player props engine in `intelligence/pipeline/emit_week6_master_product.py` to join active Week 6 players directly against the 14 archived DraftKings prop files in `docs/data-sources/research/props-archive/*_20261018T09.json`.
   - Eliminate synthetic estimates; resolve accurate 2026 teams; enforce fail-closed `LiveRosterGate`; compute model projection mu, sigma, tail win prob P(Over/Under) against actual DraftKings half-point lines, and continuous un-tied conviction scores.
4. R4. Empirical Student-t Copula SGP Parlays Anchored to Real Week 6 Lines:
   - Price 8 high-conviction Week 6 SGPs across active Sunday/Monday games using 50,000-draw Student-t copula simulations (`nu=4.0`) over 1,088-game nflverse 8x8 correlation matrix (`data/snapshots/sgp_correlations.json`), anchored to actual DraftKings prop lines and live game totals, with every leg verified ACTIVE through `LiveRosterGate`.
5. R5. Week 6 DraftKings DFS Optimal Lineups & Web DFS Salary Integration:
   - Filter DFS optimizer pool strictly to active Sunday/Monday slate teams (excluding bye teams MIN, DET, MIA, CIN and completed TNF SEA@DEN); resolve verified 2026 teams; enforce `LiveRosterGate`; emit Cash Mode, Greedy Leverage, Tabu Search Top-3, and FieldSim 99.5th-percentile portfolios into `docs/predictions/research/2026-10-18/WEEK6_MASTER_COMMAND_PACKET.md` and `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`.
6. R6. Repository Sync & Production Verification:
   - Commit and push all updated code, database sync scripts, matchup reports, `WEEK6_MASTER_COMMAND_PACKET.md`, and `WEEK6-MASTER-COMMAND-2026-10-18.json` to `origin/main`.

## 2026-10-18T14:33:45Z
From: parent (4ab43d0b-bf76-49ee-b183-b70e04a14178)
Priority: MESSAGE_PRIORITY_HIGH

URGENT USER DIRECTIVE AT 09:30 AM CST (NFL SUNDAY):
The user needs the final outputs ASAP (without cutting corners or minimizing) to post on social media before the 12:00 PM CST kickoff window, and specifically asked us to step outside the box to ensure EVERY signal in the repo is accounted for:

1. Ensure `worker_master_pipeline_1` incorporates the additional 2026 signals on disk:
   - `intelligence/coaching/data/ftn_charting_2026.parquet` (13,438 plays of 2026 FTN play-action/blitz/motion/box-count charting) & `intelligence/coaching/data/qbr_week_level.parquet` / `snap_counts_2026.parquet`
   - `intelligence/vision/data/metrics_summary.json` & `derived_metrics_pre_week6_2026.parquet` (2026 Weeks 1-5 Separation Over Expected `soe_yd`, Anticipatory Route Triggering `art_mean`, and `pocket_depth_yd`)
   - `docs/data-sources/research/2026-10-18/cognitive/cognitive_signals.json` (Coach-speak Tuesday-to-Sunday & situational signals)
2. CRITICAL TIME-GATE FOR DFS & PROPS AT 09:30 AM CST:
   - `HOU @ JAX` (London 8:30 AM CST / 13:30 UTC) and `SEA @ DEN` (TNF) have already kicked off! Ensure the DraftKings DFS Optimal Lineups (`Cash Mode`, `Greedy Leverage`, `Tabu Top-3`, `FieldSim`) exclude `HOU` and `JAX` (as well as `SEA`, `DEN`, and bye teams `MIN`, `DET`, `MIA`, `CIN`) from the upcoming Sunday Main Slate / Sunday-Monday DFS lineups so customers can enter every single DFS lineup right now at 9:30 AM CST!
3. Include a crisp, social-media-ready executive summary block at the top of `WEEK6_MASTER_COMMAND_PACKET.md` with the locked Game Picks, Top Player Props, Top Copula SGPs, and Optimal DFS Lineups so the user can post immediately.
