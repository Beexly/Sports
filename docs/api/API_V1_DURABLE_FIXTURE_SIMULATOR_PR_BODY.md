# PR: Add API v1 Durable Fixture Simulator

## Summary

Adds a route-free, database-free fixture simulator for the API v1 dormant durable adapter interface. It replays local synthetic operation traces against the table-mapped contract and reports drift before any real database adapter exists.

## Changes

- Added `apps/web/lib/api/v1/durable-fixture-simulator.ts`.
- Added `apps/web/__fixtures__/api-v1/durable-fixture-simulator.json`.
- Added tests for clean replay, boundary enforcement, read/write drift, rollback leakage, bad rollback order, dormant-interface drift, and no live-storage hooks.
- Exported the simulator from `apps/web/lib/api/v1/index.ts`.
- Added repo-visible docs and copy-paste-ready PR body.

## Safety Notes

- No `apps/web/app/api/v1` route.
- No Prisma schema edit.
- No migration directory.
- No API v1 env var.
- No real database adapter.
- No SQL execution.
- No raw API key storage.
- No provider call, generated credential, partner record, billing hook, or AWS/account mutation.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

The next slice should add a fixture-report archive and promotion checklist that records simulator output as tracked artifacts and compares it against the durable harness, still without adding live routes, schema edits, migrations, env vars, credentials, provider calls, or database execution.
