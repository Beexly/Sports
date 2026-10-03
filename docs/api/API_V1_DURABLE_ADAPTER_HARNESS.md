# API v1 Durable Adapter Harness

Status: local conformance harness only. This slice does not add a database adapter, edit Prisma schema, create a migration, expose `apps/web/app/api/v1`, add an environment variable, generate a credential, enable billing, or grant partner access.

## Purpose

The API v1 seam now has a reusable conformance harness for future durable adapters. It compares adapter behavior against the existing shadow contract before any live storage is allowed.

The canonical implementation lives in `apps/web/lib/api/v1/durable-adapter-harness.ts`.

## What It Proves

`runApiV1DurableAdapterConformanceSuite()` verifies that an adapter:

- validates seeded registry and audit state
- increments quota usage exactly once on allowed requests
- appends one allow audit event for allowed requests
- appends one deny audit event for rejected requests
- does not increment usage for rejected requests
- records quota exhaustion as a denial with consumer context
- preserves a valid hash-chained audit ledger

The suite runs against:

- `createApiV1MemoryPersistenceStore()`
- `createApiV1MockTransactionalPersistenceStore()`

## Mocked Transaction Boundary

`createApiV1MockTransactionalPersistenceStore()` stages writes in a working store first. It commits only after the whole quota/audit operation succeeds.

The mock can inject a commit failure through `injectNextCommitFailure(reason)`. When that happens:

1. the staged audit event is not committed
2. quota usage does not increment
3. the transaction log records a `rolled_back` result
4. the committed snapshot stays unchanged

This is still a local mock. It is not a database transaction and does not imply production readiness.

## Boundary

This branch must keep all of the following true:

- no `apps/web/app/api/v1`
- no `packages/db/prisma/schema.prisma` API v1 models
- no `packages/db/prisma/migrations/*api*v1*`
- no API v1 environment variables
- no raw API keys
- no durable database adapter
- no live route exposure

## Verification

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Next Promotion Slice

The dormant durable adapter interface lives in `docs/api/API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE.md`, and the route-free durable fixture simulator lives in `docs/api/API_V1_DURABLE_FIXTURE_SIMULATOR.md`. The next safe slice is a fixture-report archive and promotion checklist without Prisma schema edits, migrations, live route exposure, secrets, provider calls, or database execution.
