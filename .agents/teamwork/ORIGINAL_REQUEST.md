# Original User Request

## 2026-10-04T23:14:44Z

TASK SPECIFICATION:
Mandatory GSE Engine Gate & Roster/Signal Enforcement Audit

Working directory: C:\Users\Garrett\Sports
Doctrine: Standing Doctrines 1-11 in AGENTS.md

Context & Work already completed:
1. `intelligence/roster/live_roster_gate.py` has been created with ESPN primary and Sleeper cross-check, suffix-aware and ID-keyed.
2. `intelligence/roster/test_live_roster_gate.py` has 11/11 passing tests proving detection of stale rosters (Montgomery on DET -> HOU), inactive players, missing players (Diontae Johnson), and feed failure fail-closed.
3. `frontier/sports/engine_gate.py` defines the 5 gates (Live Roster, Provenance & Freshness, JEV Mandatory, Real LCB, Stamp).
4. 16 legacy pick-emitting scripts were retired with fail-closed runtime guards (`_retired.py`).
5. `frontier/sports/test_engine_gate.py` verifies gate behavior and CI anti-bypass scanning.

Deliverables required to complete:
1. Audit and strengthen the engine gate to run EVERY candidate through the real GSE Signal Registry (`packages/ingestion-pipeline/src/signal-registry-definitions.ts` and `signal-registry-extensions.ts`), real mathematical engines (`packages/prediction-engine`), and real equations.
2. Complete end-to-end integration proving the math, the equations (Wilson score LCB, Bayesian robust Kelly, Copula tail dependence, Higham nearest-PSD repair, Poisson/CQR, EPA/SVI), and signal provenance.
3. Re-verify tonight's DET @ CAR SNF board and provide an unflinching, verifiable audit report with live feed provenance stamps.
4. Run independent verification tests.


## 2026-10-12T03:34:50Z

Harden, synchronize, and verify the Galaxy Sports Edge ingestion pipeline, workers, and intelligence systems across the repository, ensuring complete integration with the free Galaxy/ESPN keyless odds flow, Neon cloud backend (S3 storage and AI Gateway), and optimizer modules.

Working directory: c:\Users\Garrett\Sports
Integrity mode: development

## Requirements

### R1. Odds Ingestion Pipeline & Worker Synchronization
Synchronize packages/ingestion-pipeline and workers/data-refresh with the Galaxy keyless-first path, ensuring clean fallbacks to paid feeds (opt-in via ODDS_PROVIDER), proper provider tagging, zero schema drift, and write-once bet term preservation.

### R2. Test Suite Isolation & Clean Verification
Ensure Vitest and build configurations ignore detached worktrees (.worktrees/**) so tests run strictly scoped to the repository, with 100% of pipeline tests passing without mock leaks or type errors.

### R3. Cloud Backend & Optimizer Integration
Ensure the newly wired Neon S3-compatible storage and AI Gateway services in .env.local connect reliably with downstream snapshot exporters, and ensure optimizer tooling in intelligence/optimizer/ (dfs_optimizer_suite.py and pull_entries.py) is verified against ingested research data.

## Acceptance Criteria

### Pipeline Verification
- [ ] vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts passes with 0 failures (87/87 tests).
- [ ] Root/package test runners do not scan into .worktrees/**.
- [ ] Full build and type checks pass cleanly across touched modules.

### Intelligence & Cloud Verification
- [ ] Ingested research docs in docs/<bucket>/research/2026-10-11/ adhere strictly to AGENTS.md filing rules.
- [ ] Production optimizer scripts run without import or environment errors.


## 2026-10-12T03:43:15Z

[DIRECT-TO-MIND UPDATE - ENGINE EXPANSION v4.14 INGESTED]
Critical internal intelligence has been ingested into docs/engine/research/2026-10-11/LIVE_INTEL_ENGINE_EXPANSION_v414.md and compiled directly into brain/feeds/2026-10-11/trainer_feed.jsonl:
1. Backtest NFL 2025 (wks 1-5, 93 games, 77 leakage-free): Brier 0.2868 -> 0.2464 via T=7.512 refit, PIT deviation 0.082 (GOOD).
2. 8 Rating Systems (/ratings): Colley, Massey, SRS, PageRank, Keener, Glicko-2 (Glickman exact), TrueSkill, Plackett-Luce.
3. Calibration Layer (/calib): Conformal (90.8% coverage), Platt, Temp, Beta, ECE calibrated to 0.0217.
4. Simultaneous Kelly (/kelly2): Covariance matrix discovers correlation tax; rho=0.55 excludes correlated leg; growth 0.0129 vs naive 0.0052.
5. Props Deep (/props): NegBin, Bivariate Poisson, Gaussian copula rho sweeps, Bayes shrinkage.
6. Engine Math v4.10: Shin de-vig (insider-trading), Kalman state-space (form = process noise), Copula teaser 28pt correlation swing, Quantile props, and sqrt(time) in-game dynamics.
Ensure this engine math is integrated into active reasoning and verification. Do not expose public endpoints; preserve as confidential internal core.


## 2026-10-12T23:07:45Z

Orchestrate the Galaxy Sports Edge autonomous fleet across all 13 active lanes to enforce that EVERY play, prop, and parlay passes through all 200+ gates and the full L1–L5 reasoning engine prior to publishing any lines or picks, while executing CI repair, test suite isolation, migration ledger execution, and production deployment following the pre-kickoff gauntlet.

Working directory: c:\Users\Garrett\Sports
Integrity mode: development

## Requirements

### R1. Mandatory 200+ Engine Gates & L1–L5 Reasoning Filter
Run every single candidate play, prop, and parlay through the complete GSE Gate Stack prior to emitting or publishing lines:
- **Live Roster Gate** (`intelligence/roster/live_roster_gate.py`): Inactives and depth chart verified against live ESPN/Sleeper feeds.
- **5 Frontier Engine Gates & Conjunction Gate**: Live Roster, Provenance & Freshness, JEV Mandatory, Real LCB, Stamp. If `independentEdge.decision == "PASS"`, never publish regardless of path. Agreement >= 2 required or solo-source edges shrunk.
- **Mathematical & Statistical Rigor**: Wilson score LCB, Bayesian robust Kelly, Copula tail dependence, Higham nearest-PSD repair, Poisson/CQR distributions.
- **L1–L5 Reasoning Trace Engine** (`intelligence/reasoning/`): Trace depth must be L5 for any card/pick; L4 adversary breaking conditions must evaluate to `False`; 5-track checklist (`qb_behavior`, `coaching_scheme`, `offensive_line`, `trust_signals`, `scheme_matchup`) must have zero UNCHECKED tracks; hierarchy order OL -> Coaching -> QB strictly enforced.
- **Fail-Closed Policy**: Any gate rejection or failing condition results in an honest PASS / unmodeled holdout. Zero synthetic mocks or hand-templated edges.

### R2. Test Suite Isolation & CI on Main Repair
Enforce `.worktrees/**` exclusion across Vitest and pytest configurations so test runners never execute against detached worktrees. Resolve all blocking TypeScript/Vitest failures on `main` to establish a clean green baseline.

### R3. Deterministic Merge Sequencing & Quarantine
Execute merges in strict order: CI repair on `main` first, followed by dual-agent-reviewed PRs (`fix/galaxy-odds-first-2026-10-08`, SGP measured correlations, props distribution models). Quarantine unmodeled or guessed-spec modules with honest empty states.

### R4. Migration Ledger & Production Deployment Pack
Execute the migration ledger runbook up to machine-accessible boundaries. Prepare the pre-filled checklist for user-authenticated steps (Neon/Vercel logins). Once the engine gauntlet confirms green before kickoff, trigger deployment and verify all live routes.

## Acceptance Criteria

### Gate & Prediction Verification
- [ ] Every published pick/prop/parlay carries a verified L5 trace ID with 0 breaking conditions met and passed Live Roster Gate.
- [ ] 100% of candidate lines with negative expected CLV or PASS decisions are strictly filtered out.
- [ ] Measured distribution props (nflverse play-by-play) verified; 25 unmodeled families cleanly held out as unmodeled.

### Test & Platform Verification
- [ ] `vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` passes with 0 failures (87/87 tests).
- [ ] Root test runner ignores `.worktrees/**` with 0 cross-worktree bleed.
- [ ] All 241+ intelligence tests pass (props 59, sgp 32, physics 19, settle 28, refresh 16).
- [ ] Production routes verify HTTP 200 with honest derived data.


## 2026-10-13T16:56:28Z

Server restarted. It is now 11am on 10/13. Game is over (MNF BUF@LAR settled). Garrett's directive: "we need to get everything connected, weighted, calibrated and live on galaxysportsedge.com - use subagents to continue working".

Resume execution across active milestones:
1. Milestone 1: Finish Test Suite Isolation & CI on main repair (verify vitest.config.ts isolation, resolve blocking typecheck/test failures).
2. Milestone 2: Wire the 200+ engine gates, ensure PASS veto leak is sealed in packages/types and apps/web, connect L1-L5 reasoning & live roster gates.
3. Milestone 3: Merge sequencing & calibration weighting (calibrate book path, ensure isotonic regression and weighting are live).
4. Milestone 4: Migration ledger execution and live production deployment to galaxysportsedge.com.
Report progress and current active workers immediately.


## 2026-10-13T17:17:05Z

Full Fleet Coordinator:
1. Root web type repairs landed cleanly:
   - Added `failedDays` to `RundownFetchResult` in `packages/data-ingestion/src/rundown-client.ts`.
   - Added `paidScoresJustifiedSports` to `SettleSportOptions` in `packages/ingestion-pipeline/src/settle-sport.ts`.
   - Re-exported INT estimators (`fitIntPerAttemptPrior`, `posteriorIntPerAttempt`, `probIntGivenAttempts`) from `packages/prediction-engine/src/edge-lab/props-hb-int.ts` and `index.ts`.
   - Made `layer` and `knownAtWeek` optional on `CovariateCell` in `packages/prediction-engine/src/edge-lab/covariate-bus.ts`.
   - Handled `entitlements ?? undefined` in `apps/web/app/api/mobile/v1/bootstrap/route.ts` and aligned un-migrated mobile DB fallbacks.
   - Cleared stale Next.js route type artifacts from `apps/web/.next`.
2. Week 6 MNF settled in DB; 3-leg sovereign SGP (+400), 2-leg air stack, and total (OVER 55.5) all verified HIT.
3. Standing by as M1 review completes and M2 gate launches.


## 2026-10-13T17:28:43Z

Forensic fix applied and verified: process-sport-db-outage.test.ts now cleanly isolates fetchEspnOddsForSport from live network calls. Vitest ran with 5/5 passed (10ms, exit code 0). You may now unblock Gate 1 review and proceed to Milestone 2.


## 2026-10-18T13:48:18Z

Deliver a 100% accurate, zero-fabrication, fail-closed NFL Week 6 & Week 7 production intelligence suite and live Neon database state for Galaxy Sports Edge (`c:\Users\Garrett\Sports`), covering all 14 Week 6 NFL games, live published database picks, 20,019 archived DraftKings player prop lines, 14/14 specific receiver-vs-corner and trench matchup chains, empirical Student-t copula SGP parlays, and DraftKings DFS optimal lineups. Use a very large team of agents to execute and verify every NFL surface in parallel. When spawning subagents, use the low/flash tier (`flash` / `flash_lite`) as requested by the user.

Working directory: c:\Users\Garrett\Sports
Integrity mode: development

## Verification Resources

- Live database connection string in `.env.production.local` / `.env.local` (`DATABASE_URL`)
- Archived Week 6 DraftKings prop lines across all 14 games: `docs/data-sources/research/props-archive/*_20261018T09.json` (20,019 prop lines with `line`, `openLine`, `lineMoved`, `propMarket`, `playerName`)
- Official Week 6 NFL injury digest: `docs/data-sources/research/2026-10-18/injuries/espn_nfl_injuries_week6.json` (799 player status entries)
- 2026 in-season Next Gen Stats statboards: `docs/data-sources/research/2026-10-13/ngs/raw_statboard_receiving.json`, `raw_statboard_rushing.json`, `raw_statboard_passing.json`
- LineStar Week 6 (Period 412) salaries, ownership, and 4-week trailing usage shares: `docs/data-sources/research/2026-10-13/linestar/linestar_slate_grid_2026-10-13.json`, `linestar_usage_2026-10-13.json`, `linestar_usage_surfaces_2026-10-13.json`, `linestar_ownership_2026-10-13.json`
- 2026 ESPN NFL depth charts: `docs/data-sources/research/2026-10-13/depthcharts/espn-depthcharts-2026.json`
- Empirical 1,088-game nflverse 8×8 SGP correlation matrix: `data/snapshots/sgp_correlations.json`
- Existing pipeline and engine modules: `intelligence/pipeline/emit_week6_master_product.py`, `intelligence/matchups/matchup_engine.py`, `intelligence/roster/live_roster_gate.py`, `intelligence/sgp/sgp_copula_engine.py`, `intelligence/optimizer/dfs_optimizer_suite.py`, `intelligence/reasoning/analyst.py`, `packages/data-ingestion/src/context-enrichment.ts`

## Requirements

### R1. Live Neon Database `team_game_logs` Backfill & Week 6 NFL Picks/Games Lock
Backfill all settled 2026 regular-season NFL games (Weeks 1–5 plus Week 6 TNF `SEA@DEN`, `commenceTime >= '2026-09-01'` and `commenceTime < '2026-10-17'`, `mergedIntoGameId IS NULL`) from `games` into `team_game_logs` for all 32 NFL teams—specifically ensuring `Kansas City Chiefs` (`2026-10-04`), `Carolina Panthers` (`2026-10-05`), `Tampa Bay Buccaneers` (`2026-10-09`), and `Dallas Cowboys` (`2026-10-09`) have their October 2026 rows in `team_game_logs` so no background worker querying `team_game_logs` can ever revert `restDaysHome`/`restDaysAway` to `56`–`57` days or inflate `edgeScore` to `76`–`77`. Re-verify and lock `restDaysAway` and `restDaysHome` on all 14 Week 6 NFL `games` rows, update all published Week 6 NFL `picks` rows (`factorBreakdown`, `injuryEvidence`, `continuityDeltas`, `reasoning`, `edgeScore`, `noBet: null`) to reflect true rest and Week 6 signals, and evaluate the remaining Week 6 NFL games (`NO@NYG`, `TEN@IND`, `PIT@TB`, `DAL@GB`, `BAL@CLE`) so every genuine positive-edge play over de-vigged consensus odds is published with full Week 6 reasoning and zero `PASS` or negative-edge leaks.

### R2. 14/14 Specific Receiver-vs-Corner & Trench Matchup Reports
Upgrade `intelligence/matchups/matchup_engine.py` to integrate 2026 in-season NGS receiving/rushing/passing statboards (`raw_statboard_receiving.json`, `raw_statboard_rushing.json`, `raw_statboard_passing.json`), 4-week LineStar usage shares, 2026 ESPN depth charts, and normalized player-name matching against `espn_nfl_injuries_week6.json` so all 14/14 Week 6 NFL games emit non-empty, file-cited causal chains covering both specific WR/TE-vs-CB/Safety matchups and OL-vs-Defensive-Front trench mismatches (`docs/predictions/research/2026-10-18/*-matchups.md`).

### R3. Week 6 Player Props Engine Wired Directly to All 20,019 Archived DraftKings Lines
Refactor the Week 6 player props engine in `intelligence/pipeline/emit_week6_master_product.py` to join active Week 6 players directly against the 14 archived DraftKings prop files in `docs/data-sources/research/props-archive/*_20261018T09.json` (`Total Passing Yards`, `Total Pass Completions`, `Total Passing Touchdowns`, `Total Rushing Yards`, `Total Carries`, `Total Receiving Yards`, `Total Receptions`, `Total Passing Plus Rushing Yards`). Eliminate all synthetic `~90.3 yds` line estimates, resolve every player's accurate 2026 NFL team from current 2026 rosters/depth charts, enforce the fail-closed `LiveRosterGate` (`OUT`/`IR`/`Doubtful`/`PUP` blocked), and compute per-prop model projection $\mu$, $\sigma$, tail win probability $P(\text{Over/Under})$ against the actual DraftKings half-point `line` and `openLine`, and continuous un-tied conviction scores.

### R4. Empirical Student-t Copula SGP Parlays Anchored to Real Week 6 Lines
Price 8 high-conviction Week 6 Same-Game Parlays across the active Sunday and Monday games (`HOU@JAX`, `CHI@ATL`, `CAR@PHI`, `ARI@LAR`, `LAC@KC`, `BUF@LV`, `DAL@GB`, `WSH@SF`) using 50,000-draw Student-t copula simulations (`nu=4.0`) over the measured 1,088-game nflverse 8×8 correlation matrix (`data/snapshots/sgp_correlations.json`), anchored to actual archived DraftKings prop lines and live game totals, with every leg verified `ACTIVE` through `LiveRosterGate`.

### R5. Week 6 DraftKings DFS Optimal Lineups & Web DFS Salary Integration
Filter the Week 6 DraftKings DFS optimizer pool (`build_week6_dfs_optimal_suite`) strictly to active Week 6 Sunday/Monday slate teams (excluding bye teams `MIN`, `DET`, `MIA`, `CIN` and completed TNF `SEA@DEN`), resolve every player's verified 2026 team (zero `"NFL"` unknown-team placeholders), enforce `LiveRosterGate` fail-closed, and emit Cash Mode, Greedy Leverage, Tabu Search Top-3, and FieldSim 99.5th-percentile portfolios into `docs/predictions/research/2026-10-18/WEEK6_MASTER_COMMAND_PACKET.md` and `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json`.

### R6. Repository Sync & Production Verification
Commit and push all updated code, database sync scripts, matchup reports, `docs/predictions/research/2026-10-18/WEEK6_MASTER_COMMAND_PACKET.md`, and `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json` to `origin/main` (without staging untracked scratch/parquet files).

## Acceptance Criteria

### Database & Live API Integrity
- [ ] Querying `team_game_logs` in Neon DB for `sport = 'americanfootball_nfl'` confirms all 32 NFL teams (including `Kansas City Chiefs`, `Carolina Panthers`, `Tampa Bay Buccaneers`, and `Dallas Cowboys`) have `max("gameDate") >= '2026-10-04'` and at least 4 settled 2026 regular-season rows.
- [ ] Querying `games` in Neon DB for all 14 Week 6 NFL games confirms `restDaysAway <= 14` and `restDaysHome <= 14` (zero `56` or `57` values).
- [ ] All published PENDING NFL Week 6 picks in Neon DB and on `https://www.galaxysportsedge.com/api/picks?sport=americanfootball_nfl` have `noBet: null`, non-empty Week 6 `reasoningTrace` (>250 chars), `injuryEvidence` present, `continuityDeltas` present, and zero `independentEdge.decision == "PASS"` rows published.

### Matchups, Props, Copula SGPs & DFS Master Packet
- [ ] All 14 Week 6 matchup reports (`docs/predictions/research/2026-10-18/*-matchups.md`) have `chains_count >= 2` (zero Week 6 games with `0 chains`).
- [ ] Every prop on the Week 6 Player Props Board in `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json` and `WEEK6_MASTER_COMMAND_PACKET.md` cites an exact DraftKings half-point `line` and `openLine` from `docs/data-sources/research/props-archive/*_20261018T09.json` (zero `~` estimated lines), maps to a valid 28-team active Week 6 team abbreviation, passes `LiveRosterGate`, and has distinct un-tied conviction scores.
- [ ] All 8 Student-t Copula SGP parlays (`nu=4.0`, `n_draws=50000`) pass `LiveRosterGate` (`0` OUT/IR/Doubtful players) and report `true_copula_prob > independent_prob` with positive EV against book pricing.
- [ ] All Cash and GPP DFS lineups in `outbox/WEEK6-MASTER-COMMAND-2026-10-18.json` sum to `<= $50,000` salary, contain 9 valid roster slots (`QB, RB1, RB2, WR1, WR2, WR3, TE, FLEX, DST`), contain zero players from bye teams (`MIN, DET, MIA, CIN`) or completed TNF (`SEA, DEN`), contain zero `"NFL"` unknown team codes, and contain zero `OUT`/`IR`/`Doubtful` players.
- [ ] `git status` is clean of modified tracked files and all changes are pushed to `origin/main`.


## 2026-10-18T14:33:13Z

URGENT USER DIRECTIVE AT 09:30 AM CST (NFL SUNDAY):
The user needs the final outputs ASAP (without cutting corners or minimizing) to post on social media before the 12:00 PM CST kickoff window, and specifically asked us to step outside the box to ensure EVERY signal in the repo is accounted for:
1. Ensure `worker_master_pipeline_1` incorporates the additional 2026 signals on disk:
   - `intelligence/coaching/data/ftn_charting_2026.parquet` (13,438 plays of 2026 FTN play-action/blitz/motion/box-count charting) & `intelligence/coaching/data/qbr_week_level.parquet` / `snap_counts_2026.parquet`
   - `intelligence/vision/data/metrics_summary.json` & `derived_metrics_pre_week6_2026.parquet` (2026 Weeks 1-5 Separation Over Expected `soe_yd`, Anticipatory Route Triggering `art_mean`, and `pocket_depth_yd`)
   - `docs/data-sources/research/2026-10-18/cognitive/cognitive_signals.json` (Coach-speak Tuesday-to-Sunday & situational signals)
2. CRITICAL TIME-GATE FOR DFS & PROPS AT 09:30 AM CST:
   - `HOU @ JAX` (London 8:30 AM CST / 13:30 UTC) and `SEA @ DEN` (TNF) have already kicked off! Ensure the DraftKings DFS Optimal Lineups (`Cash Mode`, `Greedy Leverage`, `Tabu Top-3`, `FieldSim`) exclude `HOU` and `JAX` (as well as `SEA`, `DEN`, and bye teams `MIN`, `DET`, `MIA`, `CIN`) from the upcoming Sunday Main Slate / Sunday-Monday DFS lineups so customers can enter every single DFS lineup right now at 9:30 AM CST!
3. Include a crisp, social-media-ready executive summary block at the top of `WEEK6_MASTER_COMMAND_PACKET.md` with the locked Game Picks, Top Player Props, Top Copula SGPs, and Optimal DFS Lineups so the user can post immediately.
