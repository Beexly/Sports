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
| `apps/web/lib/api/v1/dormant-durable-adapter-interface.ts` | Maps planned durable operations to proposed table names and validates that the interface stays dormant and non-executable. |
| `apps/web/lib/api/v1/durable-fixture-simulator.ts` | Replays local synthetic operation fixtures against the dormant interface and reports drift without executing storage. |
| `apps/web/lib/api/v1/durable-fixture-report.ts` | Builds a deterministic tracked report archive and promotion checklist from fixture replay plus harness conformance output. |
| `apps/web/__fixtures__/api-v1/durable-fixture-simulator.json` | First local synthetic trace for consumer resolution, consumer upsert, audit append, quota/audit commit, and quota/audit rollback. |
| `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json` | Tracked shadow evidence archive with `livePromotionAllowed=false`. |
| `apps/web/__tests__/api-v1-persistence.test.ts` | Proves atomic quota/audit behavior, denied-event behavior, registry visibility, hash-chain continuity, and promotion-plan blockers. |
| `apps/web/__tests__/api-v1-db-schema-proposal.test.ts` | Proves the schema proposal stays proposal-only and does not mutate Prisma, routes, migrations, env vars, or key-storage rules. |
| `apps/web/__tests__/api-v1-durable-adapter-harness.test.ts` | Proves memory and mocked transaction adapters conform, and rollback does not leak staged writes. |
| `apps/web/__tests__/api-v1-dormant-durable-adapter-interface.test.ts` | Proves the dormant durable interface maps to proposed tables, blocks live boundaries, and keeps dry runs non-executable. |
| `apps/web/__tests__/api-v1-durable-fixture-simulator.test.ts` | Proves fixture replay catches read/write drift, rollback leakage, bad rollback order, and live-boundary violations. |
| `apps/web/__tests__/api-v1-durable-fixture-report.test.ts` | Proves the tracked archive matches the deterministic builder and keeps live promotion blocked. |

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

## Dormant Durable Adapter Interface

See `docs/api/API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.md`. The interface maps the harness operations to `api_v1_consumers`, `api_v1_audit_events`, and `api_v1_quota_months`, validates that the contract stays route-free and non-executable, and exposes a dry-run report for future fixture simulation.

## Durable Fixture Simulator

See `docs/api/API_V1_DURABLE_FIXTURE_SIMULATOR.md`. The simulator replays a local synthetic trace against the dormant interface and reports drift without importing a database client, reading env vars, exposing a route, or calling a provider.

## Durable Fixture Report Archive

See `docs/api/API_V1_DURABLE_FIXTURE_REPORT.md`. The archive compares the simulator and mocked transaction harness output, records checklist evidence, and keeps `livePromotionAllowed=false`.

## Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-shadow-seam.test.ts api-v1-consumer-registry.test.ts api-v1-persistence.test.ts api-v1-db-schema-proposal.test.ts api-v1-durable-adapter-harness.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-durable-fixture-report.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```
