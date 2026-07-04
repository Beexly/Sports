# API v1 Shadow Persistence Adapter

Status: local shadow adapter only. This slice does not add a database table, Prisma migration, route handler, environment variable, generated key, billing path, provider call, or partner access.

## Purpose

The API v1 consumer registry and audit ledger now have a persistence boundary that future durable storage must match. It proves the behavior before a real store exists:

- consumer registry snapshots are validated every time
- audit ledger snapshots are hash-chain verified every time
- quota decrement and audit append happen together in one adapter operation
- denied requests append a denial audit event without incrementing quota
- raw API key storage is rejected by promotion-plan validation
- route exposure remains blocked in this shadow slice

## Modules

| File | Purpose |
| --- | --- |
| `apps/web/lib/api/v1/persistence.ts` | Defines the persistence adapter contract, in-memory shadow store, quota/audit write path, snapshots, and promotion-plan validation. |
| `apps/web/lib/api/v1/schema-proposal.ts` | Defines the proposal-only durable table shapes and rollback validation for a future migration. |
| `apps/web/lib/api/v1/durable-adapter-harness.ts` | Defines the adapter conformance suite and mocked transaction boundary for future durable stores. |
| `apps/web/__tests__/api-v1-persistence.test.ts` | Proves atomic quota/audit behavior, denied-event behavior, registry visibility, hash-chain continuity, and promotion-plan blockers. |
| `apps/web/__tests__/api-v1-db-schema-proposal.test.ts` | Proves the schema proposal stays proposal-only and does not mutate Prisma, routes, migrations, env vars, or key-storage rules. |
| `apps/web/__tests__/api-v1-durable-adapter-harness.test.ts` | Proves memory and mocked transaction adapters conform, and rollback does not leak staged writes. |

## Adapter Contract

The adapter exposes:

- `listConsumers()`
- `readAuditLedger()`
- `snapshot()`
- `resolveConsumer()`
- `putConsumer()`
- `appendAuditEvent()`
- `recordQuotaAndAudit()`

`recordQuotaAndAudit()` is the key promotion seam. A future database adapter must keep the same semantics:

1. Resolve the consumer from a parsed credential.
2. Fail closed if the credential, consumer, status, expiry, or quota fails.
3. Append a deny audit event on failure.
4. On success, increment usage and append the allow audit event together.
5. Return a snapshot with registry and audit verification reports.

## Promotion-Plan Gates

`validateApiV1PersistencePromotionPlan()` blocks any plan that:

- stores raw API keys
- stores anything other than hashes
- lacks append-only audit behavior
- does not make quota decrement and audit append transactional
- exposes an API v1 route during the shadow persistence slice
- lets denied responses leak protected payload data
- includes a migration without rollback
- attempts live database storage before owner approval

Warnings remain for local shadow storage and missing owner approval.

## Database Schema Proposal

See `docs/api/API_V1_DATABASE_SCHEMA_PROPOSAL.md`. The proposal names the future `api_v1_consumers`, `api_v1_audit_events`, and `api_v1_quota_months` tables, but this branch still does not edit Prisma schema, add a migration, expose a route, or create a credential path.

## Durable Adapter Harness

See `docs/api/API_V1_DURABLE_ADAPTER_HARNESS.md`. The harness runs the same conformance suite against the memory store and a mocked transaction store. The mocked store stages quota/audit writes and can inject a rollback to prove that staged quota and audit changes do not leak into committed state.

## Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-db-schema-proposal.test.ts api-v1-durable-adapter-harness.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```
