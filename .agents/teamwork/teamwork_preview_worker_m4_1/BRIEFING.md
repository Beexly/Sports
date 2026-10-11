# BRIEFING — 2026-10-11T21:45:00Z

## Mission
Implement Milestone 4 (Fantasy Data Unification & Zero Mock Policy) across apps/web fantasy surfaces, ensuring real player projections from SUNMON_DFS_CANDIDATES.csv, honest empty states, and pre-season Merkle ledger without fictional mock decisions.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m4_1
- Original parent: 54bf42d6-0187-42fc-84af-ba49e183495d
- Milestone: Milestone 4 (Fantasy Data Unification & Zero Mock Policy)

## 🔒 Key Constraints
- Exclusively own and edit:
  - `apps/web/lib/dfs/unified-slate.ts`
  - `apps/web/app/fantasy/dfs/page.tsx`
  - `apps/web/components/fantasy/optimizer-workspace.tsx`
  - `apps/web/app/fantasy/gm-ledger/page.tsx`
  - `apps/web/lib/fantasy/gm-ledger.ts`
  - `apps/web/components/fantasy/live-pool-empty.tsx`
- DO NOT edit files outside this list.
- DO NOT CHEAT: genuine logic, no hardcoded test shortcuts, no fictional mock fallback in production.
- Real feed: `dfs/genie_acq2/sunmon_154470/SUNMON_DFS_CANDIDATES.csv` (686 real players).

## Current Parent
- Conversation ID: 54bf42d6-0187-42fc-84af-ba49e183495d
- Updated: 2026-10-11T21:44:24Z

## Task Summary
- **What to build**:
  1. `apps/web/lib/dfs/unified-slate.ts`: Parse `SUNMON_DFS_CANDIDATES.csv` into `DfsPlayer[]`, expose `getUnifiedDfsSlate()`.
  2. Synchronize `/fantasy/dfs` and `/optimizer`: Both consume `getUnifiedDfsSlate()` for 100% data parity.
  3. Zero mock policy: Purge fictional mock players (`Silas Hart`, `Marcus Vale`, etc.) from production surfaces; render `LivePoolEmpty` when feed absent/locked.
  4. Reconcile `/fantasy/gm-ledger`: Honest pre-season status banner and Sleeper sync instead of fictional demo decisions.
  5. Verify tests: `astra-overhaul.test.ts`, `dfs-optimizer.test.ts` (33/33), `dfs-correlation.test.ts` (6/6), lint and trust guards.
- **Success criteria**: All relevant E2E and unit tests pass cleanly, zero mock players on production pages.
- **Interface contracts**: `PROJECT.md`, `ASTRA_ARCHITECTURAL_MASTER_PLAN.md`.
- **Code layout**: `apps/web/lib/dfs/`, `apps/web/app/fantasy/`, `apps/web/components/fantasy/`.

## Key Decisions Made
- [TBD]

## Artifact Index
- `handoff.md` — Final handoff report upon completion
- `progress.md` — Liveness heartbeat and progress tracking

## Change Tracker
- **Files modified**: None yet
- **Build status**: Pending
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not yet run
- **Lint status**: Not yet run
- **Tests added/modified**: Pending
