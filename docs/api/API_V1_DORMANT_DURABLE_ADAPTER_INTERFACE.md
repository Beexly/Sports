# API v1 Dormant Durable Adapter Interface

Status: dormant contract only. This slice does not add a database adapter, edit Prisma schema, create a migration, expose `apps/web/app/api/v1`, add an environment variable, generate a credential, call a provider, enable billing, or grant partner access.

## Purpose

The API v1 persistence stack now has a table-mapped durable adapter interface that future database work must satisfy before any real storage is considered. The canonical source is `apps/web/lib/api/v1/dormant-durable-adapter-interface.ts`.

This is the bridge between:

- the current in-memory shadow adapter
- the mocked transaction harness
- the proposal-only Prisma table map

It is intentionally not executable. It gives future agents a precise contract for what a durable adapter must read, write, commit, and roll back.

## Proposed Table Map

| Proposed model | Proposed table | Live today |
| --- | --- | --- |
| `ApiV1Consumer` | `api_v1_consumers` | No |
| `ApiV1AuditEvent` | `api_v1_audit_events` | No |
| `ApiV1QuotaMonth` | `api_v1_quota_months` | No |

The table names are validated against `API_V1_DATABASE_SCHEMA_PROPOSAL`. A mismatch blocks promotion.

## Operation Contract

| Operation | Reads | Writes | Transaction required | Rule |
| --- | --- | --- | --- | --- |
| `resolve_consumer` | `api_v1_consumers` | none | No | Reads hash-based consumer state only. |
| `put_consumer` | `api_v1_consumers` | `api_v1_consumers` | Yes | Upserts hash-only consumer metadata. |
| `append_audit_event` | `api_v1_audit_events` | `api_v1_audit_events` | Yes | Appends one immutable hash-chain event. |
| `record_quota_and_audit` | `api_v1_consumers`, `api_v1_quota_months`, `api_v1_audit_events` | `api_v1_quota_months`, `api_v1_audit_events` | Yes | Quota and audit succeed or roll back together. |

`record_quota_and_audit` stages quota before audit and rolls back audit before quota. That ordering keeps the audit event tied to the post-decision quota state while still making both writes one unit.

## Validator Gates

`validateApiV1DormantDurableAdapterInterface()` blocks:

- route tree exposure
- Prisma imports
- database package imports
- SQL execution
- environment reads
- API v1 env vars
- API v1 migrations
- Prisma schema mutation
- mismatched table maps
- missing operation plans
- non-append-only audit writes
- quota/audit writes that are not atomic
- live database storage before owner-approved promotion

Warnings remain for owner approval because this is still a planned durable store, not a live system.

## Dry Run

`buildApiV1DormantDurableAdapterDryRun()` returns a non-executable report:

- `status=blocked_no_execution`
- `executable=false`
- every operation is `mapped_not_executed`

This gives future automation a safe discovery surface without creating a DB connection or route.

## Boundary

This branch must keep all of the following true:

- no `apps/web/app/api/v1`
- no API v1 Prisma models in `packages/db/prisma/schema.prisma`
- no API v1 migration directory
- no API v1 env vars
- no raw API keys
- no live database adapter
- no SQL execution
- no provider call
- no partner onboarding or billing path

## Verification

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Next Promotion Slice

The route-free durable fixture simulator now lives in `docs/api/API_V1_DURABLE_FIXTURE_SIMULATOR.md`. The next safe slice is a fixture-report archive and promotion checklist that records simulator output as tracked artifacts and compares it against the durable harness, still without adding live routes, Prisma schema edits, migrations, env vars, credentials, provider calls, or database execution.
