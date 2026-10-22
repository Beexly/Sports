## 2026-10-18T14:22:11Z
You are worker_master_pipeline_1, an implementation worker for Galaxy Sports Edge (c:\Users\Garrett\Sports).
Your working directory is: c:\Users\Garrett\Sports\.agents\teamwork\worker_master_pipeline_1

MANDATORY FIRST STEP: Read c:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md completely.
Also read:
- c:\Users\Garrett\Sports\.agents\teamwork\PROJECT.md
- c:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_3\report.md (contains the comprehensive blueprint, test scripts, and exact formulas)
- c:\Users\Garrett\Sports\.agents\teamwork\worker_matchups_1\handoff.md (14/14 matchup chains ready)
- c:\Users\Garrett\Sports\.agents\teamwork\worker_db_1\handoff.md (DB picks and rest days locked)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

WRITE OWNERSHIP:
You exclusively own:
- `intelligence/pipeline/emit_week6_master_product.py`
- `docs/predictions/research/2026-10-18/WEEK6_MASTER_COMMAND_PACKET.md`
- `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`
Do NOT modify files outside your ownership.

OBJECTIVE:
Implement Milestones 3, 4, 5 (R3, R4, R5):
1. Upgrade `intelligence/pipeline/emit_week6_master_product.py`:
   a. **R3 (Player Props)**:
      - Wire directly to the 14 archived DraftKings prop files in `docs/data-sources/research/props-archive/*_20261018T09.json` (20,019 lines across 8 markets: Passing Yds, Completions, Passing TDs, Rushing Yds, Carries, Receiving Yds, Receptions, Pass+Rush Yds).
      - Eliminate synthetic `~` line estimates and tied 94.0 conviction scores.
      - Resolve 2026 rosters (A.J. Brown on NE, Hollywood Brown & DeVonta Smith on PHI).
      - Enforce fail-closed `LiveRosterGate` (`OUT`/`IR`/`Doubtful`/`PUP` blocked).
      - Compute model projection mu, sigma, LogNormal tail win probability P(Over/Under) against actual DraftKings half-point `line` and `openLine`, line delta, and continuous un-tied conviction scores.
   b. **R4 (Student-t Copula SGPs)**:
      - Price 8 high-conviction Week 6 SGPs across active Sun/Mon games (HOU@JAX, CHI@ATL, CAR@PHI, ARI@LAR, LAC@KC, BUF@LV, DAL@GB, WSH@SF) using 50,000-draw Student-t copula simulations (`nu=4.0`) over the 1,088-game nflverse 8x8 correlation matrix (`data/snapshots/sgp_correlations.json`) with Higham (1988) nearest PSD repair.
      - Anchor to actual DraftKings prop lines and live totals. Every leg verified ACTIVE via LiveRosterGate.
      - Assert and report `true_copula_prob > independent_prob` with positive correlation lift and positive EV.
   c. **R5 (DraftKings DFS Lineup Suites)**:
      - Filter pool to active Week 6 Sunday/Monday slate teams (exclude bye teams MIN, DET, MIA, CIN and completed TNF SEA@DEN).
      - Map LineStar `teamId` codes (65..96) to verified 2026 NFL teams (100% resolution, zero "NFL" placeholders).
      - Enforce LiveRosterGate fail-closed (0 OUT/IR/Doubtful players).
      - Generate Cash Mode, Greedy Leverage, Tabu Search Top-3, and FieldSim 99.5th-percentile portfolios (salary <= $50k, 9 slots: QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST).
   d. **Master Outputs**:
      - Read the updated matchup chains (all 14 games have 4 chains each).
      - Emit `docs/predictions/research/2026-10-18/WEEK6_MASTER_COMMAND_PACKET.md` and `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`.
2. Run `python intelligence/pipeline/emit_week6_master_product.py` and verify that both output files are generated cleanly without errors.
3. Write an independent verification script in your working directory to assert every single acceptance criterion:
   - Zero `~` estimated lines in Props Board; all cite exact DK half-point lines; un-tied conviction scores; zero OUT/IR/Doubtful.
   - All 8 SGPs have 50k Student-t draws, nu=4.0, true_prob > indep_prob, positive EV, 0 inactives.
   - All DFS lineups sum to <= $50,000, 9 slots, zero bye/TNF players, zero "NFL" team codes, zero inactives.
   - 14/14 games have chains_count >= 2.
4. Document all verification results and write formal hard handoff in `c:\Users\Garrett\Sports\.agents\teamwork\worker_master_pipeline_1\handoff.md`.

When complete, send a message to orchestrator with summary of work and verification results.


## 2026-10-18T14:34:11Z
**Context**: Master Pipeline implementation in `intelligence/pipeline/emit_week6_master_product.py`, `WEEK6_MASTER_COMMAND_PACKET.md`, and `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`.
**Content**: URGENT USER DIRECTIVE AT 09:30 AM CST (approaching 12:00 PM CST Sunday Kickoffs):
1. Incorporate the additional 2026 signals on disk into the master pipeline:
   - `intelligence/coaching/data/ftn_charting_2026.parquet` (13,438 plays of 2026 FTN play-action/blitz/motion/box-count charting) & `intelligence/coaching/data/qbr_week_level.parquet` / `snap_counts_2026.parquet`
   - `intelligence/vision/data/metrics_summary.json` & `derived_metrics_pre_week6_2026.parquet` (2026 Weeks 1-5 Separation Over Expected `soe_yd`, Anticipatory Route Triggering `art_mean`, and `pocket_depth_yd`)
   - `docs/data-sources/research/2026-10-18/cognitive/cognitive_signals.json` (Coach-speak Tuesday-to-Sunday & situational signals)
2. CRITICAL TIME-GATE FOR DFS AT 09:30 AM CST:
   - `HOU @ JAX` (London 8:30 AM CST / 13:30 UTC) and `SEA @ DEN` (TNF) have ALREADY kicked off!
   - Ensure the DraftKings DFS Optimal Lineups (`Cash Mode`, `Greedy Leverage`, `Tabu Top-3`, `FieldSim`) strictly EXCLUDE `HOU` and `JAX` (in addition to `SEA`, `DEN`, and bye teams `MIN`, `DET`, `MIA`, `CIN`) so customers can enter every single DFS lineup right now before the 12:00 PM CST main slate!
3. Include a crisp, social-media-ready executive summary block at the very top of `WEEK6_MASTER_COMMAND_PACKET.md` with:
   - Locked Game Picks (from Neon DB)
   - Top Player Props (with exact DraftKings half-point lines & projection)
   - Top Copula SGPs (with empirical correlation lift & positive EV)
   - Optimal DFS Lineup Cards (Cash & Top GPP) ready to copy/paste directly to social media.
**Action**: Integrate these 3 items immediately into `emit_week6_master_product.py`, regenerate the master packet and outbox JSON, and complete your verification.
