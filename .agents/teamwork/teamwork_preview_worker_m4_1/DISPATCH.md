# DISPATCH: Milestone 4 Worker (Fantasy Data Unification & Zero Mock Policy)

## Mission
Implement Milestone 4 (Fantasy Data Unification & Zero Mock Policy) according to the blueprint in `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md` and requirements in `ORIGINAL_REQUEST.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m4_1`

## Inputs
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\PROJECT.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md` (Detailed blueprint)
- `dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv` (686 real NFL players with DK salaries and Pinnacle projections)
- `dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES_STAMP.json`
- `apps/web/__tests__/e2e/astra-overhaul.test.ts` (E2E tests for M4)

## Exclusive File Boundaries
You exclusively own and may edit the following files:
- `apps/web/lib/dfs/unified-slate.ts` (new unified CSV parser)
- `apps/web/app/fantasy/dfs/page.tsx`
- `apps/web/components/fantasy/optimizer-workspace.tsx`
- `apps/web/app/fantasy/gm-ledger/page.tsx`
- `apps/web/lib/fantasy/gm-ledger.ts`
- `apps/web/components/fantasy/live-pool-empty.tsx`

DO NOT edit files outside this list (specifically do not edit pricing page, board page, nav, or ingestion packages).

## Implementation Checklist
1. **Unified Projection Feed Parser (`apps/web/lib/dfs/unified-slate.ts`)**:
   - Parse `dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv` (686 real players).
   - Map `player` -> `name`, `pos` -> `pos`, `salary` -> `salary`, `mkt_implied_dk_pts` -> `proj`, etc.
   - Expose `getUnifiedDfsSlate(): DfsPlayer[] | null`.
2. **Synchronize `/fantasy/dfs` and `/optimizer`**:
   - In `apps/web/app/fantasy/dfs/page.tsx`: load `getUnifiedDfsSlate()` and pass to `<DfsOptimizer initialSlate={slate} />`. If empty/locked, render `<LivePoolEmpty message="NFL Slate locks Tuesday 09:00 AM. Projection engine refreshing." />`.
   - In `apps/web/components/fantasy/optimizer-workspace.tsx`: pass the exact same `unifiedSlate` to `<DfsOptimizer initialSlate={slate} />` so salaries, projections, and exposures match 100%.
3. **Zero Mock Policy Enforcement**:
   - Remove fallback to fictional players (`Silas Hart`, `Marcus Vale`, etc.) from production surfaces.
   - When real feed is unavailable, render honest status state (`LivePoolEmpty`) rather than fictional mock slates.
4. **Reconcile `/fantasy/gm-ledger`**:
   - Remove the 7 hardcoded fictional demo decisions from `gm-ledger.ts`.
   - Render honest pre-season status banner: `"Pre-Season Ledger: No regular season decisions committed yet. SHA-256 Merkle ledger initialized."` plus 1-click Sleeper sync.
5. **Verification**:
   - Run `npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts`
   - Run `npm run test --workspace=apps/web -- lib/fantasy/dfs-optimizer.test.ts lib/fantasy/dfs-correlation.test.ts` (33/33 and 6/6 tests pass)
   - Run `npm run lint:brand` and `npm run guard:trust`
6. Write `handoff.md` and report completion to Project Orchestrator via `send_message`.


## 2026-10-11T21:44:24Z
[Message from 54bf42d6-0187-42fc-84af-ba49e183495d]
You are Milestone 4 Worker (Fantasy Data Unification & Zero Mock Policy).
Working directory: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m4_1
Read DISPATCH.md in your directory and ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement:
1. apps/web/lib/dfs/unified-slate.ts: parse dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv (686 real players, DK salaries, Pinnacle projections).
2. Synchronize /fantasy/dfs and /optimizer: both consume getUnifiedDfsSlate() for 100% data parity.
3. Zero mock policy: remove fallback to fictional players (Silas Hart, etc.). Render LivePoolEmpty when feed is absent/locked.
4. Reconcile /fantasy/gm-ledger: honest pre-season status banner and real Sleeper sync instead of fictional demo decisions.
5. Verify with npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts, dfs-optimizer.test.ts (33/33), and dfs-correlation.test.ts (6/6).
Write handoff.md and notify me via send_message.
