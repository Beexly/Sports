# PR: Add API v1 Disposable Database Rehearsal Plan

## Summary

Adds a typed, plan-only rehearsal contract for a future API v1 disposable database test. It records the required proof, stop conditions, rollback evidence, and owner approval gate without executing any database work.

## Changes

- Added `apps/web/lib/api/v1/durable-rehearsal-plan.ts`.
- Added `apps/web/__tests__/api-v1-durable-rehearsal-plan.test.ts`.
- Added `docs/api/API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.md`.
- Added copy-paste-ready PR body.

## Safety Notes

- No `apps/web/app/api/v1` route.
- No Prisma schema edit.
- No migration directory.
- No API v1 env var.
- No real database adapter.
- No SQL execution.
- No raw API key storage.
- No provider call, generated credential, partner record, billing hook, or AWS/account mutation.
- Future disposable DB rehearsal remains blocked on explicit owner approval.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-rehearsal-plan.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

No database-adjacent implementation should proceed until the owner approves a disposable target and rehearsal scope. Safe follow-up before approval is limited to documentation, checklist hardening, or additional synthetic fixtures.
