## 2026-10-13T17:00:36Z
You are teamwork_preview_worker with identity worker_m1_gen2.
Your working directory is: C:\Users\Garrett\Sports\.agents\teamwork\worker_m1_gen2\
You MUST read C:\Users\Garrett\Sports\.agents\teamwork\ORIGINAL_REQUEST.md before starting work.
Also read C:\Users\Garrett\Sports\.agents\teamwork\orchestrator_3\PROJECT.md and survey findings in:
- C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_ci_isolation\handoff.md
- C:\Users\Garrett\Sports\.agents\teamwork\explorer_survey_merge_deploy\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your assigned Milestone is: M1 — Test Suite Isolation & CI on Main Repair.

Exclusive File Ownership:
- `vitest.config.ts` (root)
- `pytest.ini` (root)
- `.gitignore` (root)
- `apps/web/vitest.config.ts`
- `intelligence/pytest.ini`
- `packages/ingestion-pipeline/src/process-sport.ts`
- `apps/web/components/ui/nav.tsx`
- `apps/web/app/auth/signin/page.tsx`
- `packages/data-ingestion/src/index.ts`

Tasks to Execute:
1. Enforce Test Runner Worktree Isolation:
   - Ensure tracked root `vitest.config.ts` excludes `**/.worktrees/**`, `**/.agents/**`, `**/data/snapshots/**`, `**/node_modules/**`, `**/dist/**`, `**/.next/**`, `apps/mobile/**`.
   - Update `apps/web/vitest.config.ts` line 20 to exclude `**/.worktrees/**`, `**/.agents/**`.
   - Create root `pytest.ini` with `norecursedirs = .worktrees .agents node_modules .venv __pycache__ .git .next dist hf-survey-raw`.
   - Update `intelligence/pytest.ini` norecursedirs to include `.worktrees .agents node_modules`.
   - Append `.worktrees/` to root `.gitignore`.
2. Fix 4 Blocking CI / Compilation Errors on Main:
   - `packages/ingestion-pipeline/src/process-sport.ts`: Fix syntax error at lines 1753-1754 by replacing `lineSnapshotsPersisted?: number; lineArchiveErrors?: number;` with `lineSnapshotsPersisted, lineArchiveErrors,`.
   - `apps/web/components/ui/nav.tsx`: Remove duplicate older `Nav` and `NavSkeleton` (lines 108-134 and lines 188-210), keeping only the `NavChrome` / `<Suspense>` implementation.
   - `apps/web/app/auth/signin/page.tsx`: Remove duplicate `export const metadata: Metadata` declaration (lines 22-24).
   - `packages/data-ingestion/src/index.ts`: Add `export { getOddsPaymentCircuitBreaker } from "./odds-api-circuit-breaker.js";`.
3. Repair Corrupted Node Modules Junctions:
   - Run `node scripts/hybrid-node-modules.cjs C:\Users\Garrett\Sports C:\Users\Garrett\Sports` to repair `@sports/*` junctions.
4. Run Build and Test Verifications:
   - Run `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport.test.ts` and verify 87/87 tests pass with 0 failures and 0 worktree bleed.
   - Run `npx vitest list process-sport` to verify only 1 file is matched (0 matches under `.worktrees/**`).
   - Run `npx vitest run packages/ingestion-pipeline/src/__tests__/process-sport-db-outage.test.ts`.
   - Run workspace typechecks for packages touched (`packages/ingestion-pipeline`, `packages/data-ingestion`, `apps/web`).
5. Write your handoff report to `C:\Users\Garrett\Sports\.agents\teamwork\worker_m1_gen2\handoff.md` following the Handoff Protocol (Observation, Logic Chain, Caveats, Conclusion, Verification Method).
6. Send a completion message via send_message to parent (4b4ec98b-b9df-4eda-bc9a-7faeca182fee).
