# PR: Add API v1 Dormant Durable Adapter Interface

## Summary

Adds a dormant, table-mapped durable adapter interface for API v1. This connects the memory shadow adapter, mocked transaction harness, and proposal-only Prisma table map without creating a live database adapter.

## Changes

- Added `apps/web/lib/api/v1/dormant-durable-adapter-interface.ts`.
- Exported a table map for `ApiV1Consumer`, `ApiV1AuditEvent`, and `ApiV1QuotaMonth`.
- Added operation plans for `resolve_consumer`, `put_consumer`, `append_audit_event`, and `record_quota_and_audit`.
- Added validators that block route exposure, Prisma imports, database package imports, env reads, API v1 env vars, schema mutation, migrations, table-map drift, non-append-only audit writes, and non-atomic quota/audit writes.
- Added a dry-run report that is explicitly non-executable.
- Added focused Vitest coverage for mapping, atomicity rules, boundary leaks, dry-run behavior, and current repo state.
- Added repo-visible docs for Claude/Codex handoff.

## Safety Notes

- No `apps/web/app/api/v1` route.
- No Prisma schema edit.
- No migration directory.
- No API v1 env var.
- No real database adapter.
- No SQL execution.
- No raw API key storage.
- No generated credential, partner record, billing hook, provider call, or AWS/account mutation.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

The route-free durable fixture simulator now lives in `docs/api/API_V1_DURABLE_FIXTURE_SIMULATOR.md`. The next slice should add a fixture-report archive and promotion checklist that records simulator output as tracked artifacts and compares it against the durable harness, still without adding live routes, schema edits, migrations, env vars, credentials, provider calls, or database execution.
