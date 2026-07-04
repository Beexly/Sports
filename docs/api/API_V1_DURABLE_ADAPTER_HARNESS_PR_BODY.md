# PR: Add API v1 Durable Adapter Harness

## Summary

Adds a route-free, migration-free durable-adapter conformance harness for API v1. The harness proves the current memory store and a mocked transaction adapter preserve quota/audit behavior before a real database adapter exists.

## Changes

- Added `apps/web/lib/api/v1/durable-adapter-harness.ts`.
- Added `runApiV1DurableAdapterConformanceSuite()` for adapter behavior checks.
- Added `createApiV1MockTransactionalPersistenceStore()` with staged commit and rollback simulation.
- Added tests for memory-store conformance, mocked-transaction conformance, commit logging, rollback safety, and no-live-surface boundaries.
- Added docs for future Claude/Codex handoff.

## Safety Notes

- No `apps/web/app/api/v1` route.
- No Prisma schema edit.
- No migration directory.
- No API v1 env var.
- No real database adapter.
- No raw API keys, generated credentials, partner record, billing hook, provider call, or AWS/account mutation.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

The dormant durable adapter interface now lives in `docs/api/API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.md`. The next slice should build a route-free durable adapter simulation over local JSON fixtures without adding schema, migrations, live routes, secrets, provider calls, or DB execution.
