# PR: Add API v1 Database Schema Proposal

## Summary

Adds a proposal-only database schema contract for API v1 durable consumers, audit events, and quota-month counters. This is intentionally not a live DB migration.

## Changes

- Added `apps/web/lib/api/v1/schema-proposal.ts` as the canonical schema proposal source.
- Exported proposed `ApiV1Consumer`, `ApiV1AuditEvent`, and `ApiV1QuotaMonth` drafts.
- Added rollback steps and draft rollback SQL for a future owner-approved migration.
- Added validation that blocks live route exposure, env vars, migration directories, raw key fields, non-64-character hash fields, and missing quota/audit constraints.
- Added tests proving this branch does not mutate `schema.prisma`, add API v1 migrations, create `apps/web/app/api/v1`, or introduce API v1 env vars.

## Safety Notes

- No `packages/db/prisma/schema.prisma` edit.
- No `packages/db/prisma/migrations/*api_v1*` directory.
- No `apps/web/app/api/v1` route.
- No API key, env var, partner record, provider call, billing hook, or database write path.
- Proposal remains reviewable by Claude and future agents through tracked docs and tests.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

The durable adapter harness now lives in `docs/api/API_V1_DURABLE_ADAPTER_HARNESS.md`. The next slice should draft a dormant durable adapter interface that maps these mocked operations to the proposed Prisma table names without adding schema, migrations, live routes, secrets, or DB execution.
