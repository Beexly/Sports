# Project: Galaxy Sports Edge NFL Week 6 & Week 7 Production Intelligence Suite

## Architecture
- **Data & Ingestion Layer**: Live Neon PostgreSQL Database (`games`, `team_game_logs`, `picks`), context enrichment (`packages/data-ingestion/src/context-enrichment.ts`), DraftKings props archive (`docs/data-sources/research/props-archive/`), NGS 2026 in-season statboards, LineStar 4-week usage, ESPN depth charts, and Week 6 injury digests.
- **Matchup Intelligence Engine**: `intelligence/matchups/matchup_engine.py` producing bidirectional receiver-vs-corner/safety and trench OL-vs-defensive front causal chains across all 14 Week 6 games.
- **Player Props Engine**: `intelligence/pipeline/emit_week6_master_product.py` joining 2026 active players directly to 20,019 DraftKings archived lines with LogNormal tail probabilities, actual lines, line deltas, and continuous conviction scores.
- **Empirical SGP Copula Engine**: `intelligence/sgp/sgp_copula_engine.py` executing 50,000-draw Student-t copula simulations (`nu=4.0`) with Higham PSD repair across 1,088-game correlation matrix, pricing 8 high-conviction Sunday/Monday SGPs.
- **DraftKings DFS Optimizer**: `intelligence/optimizer/dfs_optimizer_suite.py` solving Cash, Greedy, Tabu Top-3, and FieldSim 99.5th percentile portfolios with strict slate filtering and 100% 2026 team resolution.
- **Master Publishing & Sync**: `WEEK6_MASTER_COMMAND_PACKET.md`, `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`, and git push to `origin/main`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Database Backfill | Backfill 77 settled 2026 NFL games (154 team rows) into `team_game_logs` | M1 | R1 |
| 2 | Rest Days Lock | Recalculate & lock `restDaysAway` and `restDaysHome` on all 14 Week 6 games (<= 14) | M1 | R1 |
| 3 | Pick Edge Normalization | Recalculate edgeScore and attach injuryEvidence/continuityDeltas to published picks | M1 | R1 |
| 4 | Remaining Games Picks | Evaluate NO@NYG, TEN@IND, PIT@TB, DAL@GB, BAL@CLE for positive-edge plays | M1 | R1 |
| 5 | Matchup Engine Upgrade | Ingest 2026 NGS statboards, normalize aliases (WAS, ARI), fix loop break & dead code | M2 | R2 |
| 6 | 14/14 Matchup Reports | Emit non-empty causal chains (WR/TE-vs-CB & OL-vs-Front) with chains_count >= 2 | M2 | R2 |
| 7 | Props DK Archive Join | Join active Week 6 players against 20,019 lines in 14 DK archive files | M3 | R3 |
| 8 | Analytical Props Math | Compute mu, sigma, LogNormal P(Over/Under), line movement delta, and continuous conviction | M3 | R3 |
| 9 | 2026 Roster Reality | Enforce LiveRosterGate, resolve 2026 teams (e.g. A.J. Brown on NE), eliminate synthetic lines | M3 | R3 |
| 10 | Student-t Copula SGPs | Price 8 target SGPs with 50k Student-t draws (nu=4.0), Higham repair, real DK lines | M4 | R4 |
| 11 | DFS Slate & Team Resolution | Filter to active Sun/Mon slate, map LineStar team IDs 65..96 to 28 NFL teams | M5 | R5 |
| 12 | DFS Portfolios | Generate Cash, Greedy, Tabu Top-3, and FieldSim 99.5th lineups (salary <= $50k, 9 slots) | M5 | R5 |
| 13 | Master Command Outbox | Emit WEEK6_MASTER_COMMAND_PACKET.md and outbox/WEEK6-MASTER-COMMAND-2026-10-18.json | M5 | R5 |
| 14 | Final Verification & Git Sync | Comprehensive test validation, commit clean tracked changes, push to origin/main | M6 | R6 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Live Neon DB Backfill & Week 6 Picks/Games Lock | Execute DB migration, backfill team_game_logs, lock rest days, normalize picks, publish 5 positive plays | none | DONE (worker_db_1) |
| M2 | 14/14 Matchup Chains Engine & Reports | Upgrade matchup_engine.py with 2026 NGS, depth charts, injuries; emit all 14 matchup files | none | DONE (worker_matchups_1) |
| M3 | Player Props Engine Wired to DK Lines Archive | Refactor props generator in emit_week6_master_product.py to join 14 DK archive files with LogNormal math | M2 | IN_PROGRESS (worker_master_pipeline_1) |
| M4 | 8 Empirical Student-t Copula SGPs | Implement 8-game copula SGP pipeline with 50k Student-t draws, Higham PSD repair, real DK lines | M3 | IN_PROGRESS (worker_master_pipeline_1) |
| M5 | DFS Optimizer & Master Command Packet | Implement slate filtering, team ID mapping, 4 DFS modes, emit master MD and JSON outbox | M4 | IN_PROGRESS (worker_master_pipeline_1) |
| M6 | Verification, Audit & Production Sync | Independent review, adversarial challenge, forensic audit, git commit & push to origin/main | M1, M2, M5 | PLANNED |

## Code Layout
- `scripts/sync_week6_db.py`: Migration script to backfill `team_game_logs`, lock rest days, normalize existing picks, and insert remaining positive-edge picks.
- `intelligence/matchups/matchup_engine.py`: Core matchup intelligence engine.
- `docs/predictions/research/2026-10-18/*-matchups.md`: 14 matchup research files.
- `intelligence/pipeline/emit_week6_master_product.py`: Master pipeline integrating props, SGPs, DFS, and emitting final packets.
- `docs/predictions/research/2026-10-18/WEEK6_MASTER_COMMAND_PACKET.md`: Final human-readable command packet.
- `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`: Production JSON payload.
