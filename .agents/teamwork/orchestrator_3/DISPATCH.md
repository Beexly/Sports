# Dispatch Messages

## 2026-10-12T23:08:00Z

You are the Project Orchestrator for the task defined in `C:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md` under section `## 2026-10-12T23:07:45Z`.

## Working Directory
Your working directory is:
`C:\Users\Garrett\Sports\.agents\teamwork\orchestrator_3\`
The repository root is:
`C:\Users\Garrett\Sports`

## Mission
Orchestrate the Galaxy Sports Edge autonomous fleet across all 13 active lanes to enforce that EVERY play, prop, and parlay passes through all 200+ gates and the full L1–L5 reasoning engine prior to publishing any lines or picks, while executing CI repair, test suite isolation, migration ledger execution, and production deployment following the pre-kickoff gauntlet.
Integrity mode: development.

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

## Standing Rules & Governance
- Follow all Standing Doctrines in `AGENTS.md` (Standing Doctrines 1-11, Wire-First, Direct-To-Mind, etc.).
- Maintain `BRIEFING.md`, `plan.md`, and regularly update `progress.md` in your working directory (`C:\Users\Garrett\Sports\.agents\teamwork\orchestrator_3\`).
- Dispatch specialist subagents under `.agents/teamwork/` with their own isolated working directories (e.g., workers, reviewers, challengers).
- Once all acceptance criteria are verified and proven with clean evidence, deliver `handoff.md` in your directory and report completion to the Sentinel.


## 2026-10-13T16:57:31Z

[SERVER RESTART RESUME DIRECTIVE]
Timestamp: 2026-10-13T16:56:28Z
Server restarted. It is now 11am on 10/13. Game is over (MNF BUF@LAR settled).
Garrett's directive: "we need to get everything connected, weighted, calibrated and live on galaxysportsedge.com - use subagents to continue working".

Resume execution across active milestones per C:\Users\Garrett\Sports\.agents\teamwork\orchestrator_3\PROJECT.md:
1. Milestone 1: Finish Test Suite Isolation & CI on main repair (verify vitest.config.ts isolation, resolve blocking typecheck/test failures). Revive or re-spawn worker_m1 / specialists as needed.
2. Milestone 2: Wire the 200+ engine gates, ensure PASS veto leak is sealed in packages/types and apps/web, connect L1-L5 reasoning & live roster gates.
3. Milestone 3: Merge sequencing & calibration weighting (calibrate book path, ensure isotonic regression and weighting are live).
4. Milestone 4: Migration ledger execution and live production deployment to galaxysportsedge.com.


## 2026-10-13T17:17:25Z

[FLEET COORDINATOR UPDATE]
Timestamp: 2026-10-13T17:17:05Z
From: Full Fleet Coordinator (Parent 0b09699f-e2a6-4282-8e97-7eb725e5d1b0)

1. Root web type repairs landed cleanly:
   - Added `failedDays` to `RundownFetchResult` in `packages/data-ingestion/src/rundown-client.ts`.
   - Added `paidScoresJustifiedSports` to `SettleSportOptions` in `packages/ingestion-pipeline/src/settle-sport.ts`.
   - Re-exported INT estimators (`fitIntPerAttemptPrior`, `posteriorIntPerAttempt`, `probIntGivenAttempts`) from `packages/prediction-engine/src/edge-lab/props-hb-int.ts` and `index.ts`.
   - Made `layer` and `knownAtWeek` optional on `CovariateCell` in `packages/prediction-engine/src/edge-lab/covariate-bus.ts`.
   - Handled `entitlements ?? undefined` in `apps/web/app/api/mobile/v1/bootstrap/route.ts` and aligned un-migrated mobile DB fallbacks.
   - Cleared stale Next.js route type artifacts from `apps/web/.next`.
2. Week 6 MNF settled in DB; 3-leg sovereign SGP (+400), 2-leg air stack, and total (OVER 55.5) all verified HIT.
3. Coordinator standing by as M1 review completes and M2 gate launches.

Continue milestone progression and report M1 verification consensus.


## 2026-10-13T17:28:53Z

[GATE 1 UNBLOCK NOTIFICATION]
Timestamp: 2026-10-13T17:28:43Z
From: Parent (0b09699f-e2a6-4282-8e97-7eb725e5d1b0)

Forensic fix applied and verified: `process-sport-db-outage.test.ts` now cleanly isolates `fetchEspnOddsForSport` from live network calls. Vitest ran with 5/5 passed (10ms, exit code 0). 
Gate 1 review is now UNBLOCKED. Proceed immediately to Milestone 2 (200+ engine gates, PASS veto leak closure, and L1–L5 reasoning trace integration) per C:\Users\Garrett\Sports\.agents\teamwork\orchestrator_3\PROJECT.md.

Report Milestone 2 worker dispatch status. Crons active.
