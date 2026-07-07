# API v1 Promotion Readiness Matrix PR Body

## Summary

Adds a local-only promotion-readiness evaluator for the API v1 shadow stack.

The new matrix converts existing shadow evidence into explicit pass/block gates across:

- shadow evidence
- repo boundary
- owner approval

It keeps `livePromotionAllowed=false` in every status, including the best-case `ready_for_disposable_rehearsal_review` state.

## Changes

- Added `apps/web/lib/api/v1/promotion-readiness.ts`.
- Exported the evaluator from `apps/web/lib/api/v1/index.ts`.
- Added focused tests in `apps/web/__tests__/api-v1-promotion-readiness.test.ts`.
- Added `docs/api/API_V1_PROMOTION_READINESS_MATRIX.md`.
- Updated API v1 stack handoff, PR index, reviewer checklist, and README navigation.

## Safety Notes

- No API v1 route.
- No Prisma schema edit.
- No migration.
- No env var.
- No credential.
- No provider call.
- No database execution.
- No AWS/account mutation.
- No billing or partner-account action.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-promotion-readiness.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-boundary-guard.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
npm.cmd run test --workspaces --if-present -- --reporter=dot
git diff --check
```

## Remaining Blocker

The disposable database rehearsal remains blocked until the owner approves a named disposable target, rehearsal scope, destroy-by timestamp, rollback evidence, and raw-key absence proof.
