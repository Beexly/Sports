# DISPATCH: Milestone 5 Worker (Complete Verification Battery & Final Milestone)

## Mission
Implement Milestone 5 (Complete Verification Battery & Final Code Integrity) according to the blueprint in `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md` and requirements in `ORIGINAL_REQUEST.md`.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Working Directory
`C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m5_1`

## Inputs
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\ORIGINAL_REQUEST.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\PROJECT.md`
- `C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_explorer_survey_3\handoff.md` (Detailed blueprint)

## Exclusive File Boundaries
You exclusively own and may edit the following files:
- `packages/ingestion-pipeline/src/process-sport.ts`
- `packages/prediction-engine/src/index.ts`
- `apps/web/vitest.config.ts` (if needed for Vitest Neon stub)

## Implementation Checklist
1. **Fix Ingestion Pipeline Syntax Error**:
   - In `packages/ingestion-pipeline/src/process-sport.ts`, lines 1750–1756: remove interface property annotations (`lineSnapshotsPersisted?: number; lineArchiveErrors?: number;`) from the object literal return expression. Return valid value properties (`lineSnapshotsPersisted: 0, lineArchiveErrors: 0`).
2. **Fix Duplicate Export in Prediction Engine**:
   - In `packages/prediction-engine/src/index.ts`: resolve the duplicate export of `LedgerEntry` (e.g., alias one as `RecomputeLedgerEntry`).
3. **Execute and Verify Full Verification Battery**:
   - `npm run lint:brand` (19 suites, 4,661+ tests)
   - `npm run guard:trust` (3,654+ scanned files)
   - `npm run guard:secrets` (14,901 tracked files)
   - `npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts` (21/21 passed)
   - `npm run test --workspace=apps/web -- lib/fantasy/dfs-optimizer.test.ts lib/fantasy/dfs-correlation.test.ts` (33/33 and 6/6 passed)
   - `node node_modules/typescript/bin/tsc --noEmit` across packages and apps/web.
4. Document all commands, verbatim outputs, and results in `handoff.md` and report completion to Project Orchestrator via `send_message`.

## 2026-10-11T21:44:24Z
[Message] timestamp=2026-10-11T21:44:24Z sender=54bf42d6-0187-42fc-84af-ba49e183495d priority=MESSAGE_PRIORITY_HIGH content=You are Milestone 5 Worker (Complete Verification Battery & Code Integrity).
Working directory: C:\Users\Garrett\Sports-wt-rating-packet\.agents\teamwork\teamwork_preview_worker_m5_1
Read DISPATCH.md in your directory and ORIGINAL_REQUEST.md.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Implement & Verify:
1. Fix syntax error in packages/ingestion-pipeline/src/process-sport.ts (lines 1750-1756 object literal return).
2. Fix duplicate export of LedgerEntry in packages/prediction-engine/src/index.ts.
3. Run and verify full battery:
   - npm run lint:brand (19 suites, 4,661+ tests)
   - npm run guard:trust (3,654+ scanned files)
   - npm run guard:secrets (14,901 tracked files)
   - npm run test --workspace=apps/web -- __tests__/e2e/astra-overhaul.test.ts
   - npm run test --workspace=apps/web -- lib/fantasy/dfs-optimizer.test.ts lib/fantasy/dfs-correlation.test.ts
   - node node_modules/typescript/bin/tsc --noEmit in packages and apps/web.
Write handoff.md with all verbatim outputs and notify me via send_message.
