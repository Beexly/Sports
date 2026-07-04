# PR: Add API v1 Durable Fixture Report Archive

## Summary

Adds a deterministic report archive and promotion checklist for API v1 durable fixture evidence. It compares the local synthetic fixture simulator with the mocked durable-adapter conformance harness and records that live promotion remains blocked.

## Changes

- Added `apps/web/lib/api/v1/durable-fixture-report.ts`.
- Added `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json`.
- Added `apps/web/__tests__/api-v1-durable-fixture-report.test.ts`.
- Added docs and copy-paste-ready PR body for the report archive.

## Safety Notes

- No `apps/web/app/api/v1` route.
- No Prisma schema edit.
- No migration directory.
- No API v1 env var.
- No real database adapter.
- No SQL execution.
- No raw API key storage.
- No provider call, generated credential, partner record, billing hook, or AWS/account mutation.
- `livePromotionAllowed=false` is part of the tracked archive.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

The next slice should add a disposable-database rehearsal plan as documentation and local contract only, without adding schema edits, migrations, live routes, env vars, credentials, provider calls, or database execution.
