# TEST RESULTS — raw gate evidence (2026-06-15)

All gates run on branch `claude/review-agent-os-runtime` = `origin/codex/enforce-use-of-main-branch-in-git-setup` @ **`3a381d4c`**. RAW_EXIT read from log, not wrapper echo.

| Gate | Command | RAW_EXIT | Result |
|---|---|---|---|
| Prisma generate | `npm run db:generate` | 0 | ✅ Prisma Client v5.22.0 generated |
| Typecheck | `npm run typecheck` | 0 | ✅ **all 10 workspaces clean** |
| Named tests | `npm run test --workspace=apps/web -- jarvis-operating-runtime-cockpit.test.ts agent-os-operating-spine.test.ts agent-os-runtime.test.ts` | 0 | ✅ **3 files, 29 tests passed** |
| Build | `npm run build` | 0 | ✅ **187/187 pages**, only the benign Sentry/OpenTelemetry `require-in-the-middle` webpack warning |

## Critical note — the earlier typecheck "EXIT 2" was a FALSE NEGATIVE

First typecheck attempt returned EXIT 2 with errors like:
```
.next/types/app/api/calibration/elo-backtest/route.ts(2,24): error TS2307:
  Cannot find module '../../../../../../app/api/calibration/elo-backtest/route.js'
```
These reference **my** branch's routes (`calibration/elo-backtest`, `market-backtest`,
`backfill-historical-games`) which **do not exist** on Codex's branch. Root cause: a **stale
`apps/web/.next/types` cache** left by my prior builds on `claude/zealous-noether-inaaa3`.

**Fix:** `rm -rf apps/web/.next` + `npm run db:generate`, then re-run → **exit 0**. Codex's
branch has no compile errors. (This is the same class of bug Codex itself hit and fixed: its
typecheck "missing CockpitTaskStatus/Promotion/OddsMarket" failure was a **stale generated
Prisma client**, fixed by `npm run db:generate`. Always clear generated caches before trusting
a red gate.)

## Cross-confirmation with Codex's own logs

Codex (network-isolated worktree) reported the identical end-state independently:
- `✅ npm run db:generate`
- `✅ npm run typecheck` (after regenerating the stale client)
- `✅ npm run build` — "build gate now passes; only existing non-fatal Sentry/OpenTelemetry
  warning remains" ← **the exact warning I observed**
- `✅` the 3 named tests + `agent-os-operating-spine` + `homepage-doctrine-hero`

Two independent environments, same green result, same single benign warning. Not a fluke.

## What the 29 tests actually assert (meaningful, not brittle)

`agent-os-operating-spine.test.ts` (17) locks the honesty invariants:
- 23 agents, no duplicate IDs; every agent `externalActionsAllowed=false`, forbidden ⊇ the
  11 owner-approval actions, escalates to jarvis.
- NOT_WIRED (`delta`) cannot receive an executable task; AVA can DRAFT but PUBLISH forbidden;
  LEDGER is MANUAL/human-triggered; PRISM owner-approval; PILOT/ECHO blocked-until messages.
- **`operationalCapacity === 0` && `notWired > 0`** (the anti-fake-green assertion).
- Router: source-rights-review task not accepted; NOT_WIRED → `NOT_WIRED_CANNOT_EXECUTE`; dedupe.
- 14 workflows, all `canPublish=false` & `canChangeModelWeights=false`; content requires
  owner approval; protected-source + unsettled-season block run plans.
- Cockpit map: public-adjacent surfaces have review gates; Calibration owned by audit/ledger.
- **`companyHealth === "CRITICAL"`** ("critical risks above vanity green");
  `ownerDecisions !== claudeReview`.
- GSIS-only player resolution; name-only refused; commence-time-only game join UNSAFE;
  unsettled seasons excluded; stat gaps → PRISM/ASCEND with `claudeReviewRequired`.

`agent-os-runtime.test.ts` (9) + `jarvis-operating-runtime-cockpit.test.ts` (3): task
persistence/dedupe/transition gates, workflow event/task creation, blocked-workflow cannot
self-complete, queue pauses on owner/claude review, data-reliability tasking, memory
review-gating, market/CLV blocking, calibration metrics, and the cockpit panel wiring +
reality-count visibility + owner/claude separation.
