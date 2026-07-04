# API v1 Durable Fixture Simulator

Status: local synthetic fixture simulator only. This slice does not add a database adapter, edit Prisma schema, create a migration, expose `apps/web/app/api/v1`, add an environment variable, generate a credential, call a provider, enable billing, or grant partner access.

## Purpose

The API v1 durable interface can now be replayed against tracked local fixtures. The canonical source is `apps/web/lib/api/v1/durable-fixture-simulator.ts`, and the first fixture is `apps/web/__fixtures__/api-v1/durable-fixture-simulator.json`.

The simulator does not execute storage. It validates that a synthetic operation trace matches the dormant durable adapter interface:

- read tables
- write tables
- commit order
- rollback order
- read-only behavior
- table-count changes
- rollback leakage
- route, database, and provider boundaries

## Fixture Boundary

Each scenario must declare:

- `schemaVersion=api-v1-durable-fixture-simulator-v1`
- `source=local_synthetic_fixture`
- `routeExposed=false`
- `databaseTouched=false`
- `providerCalled=false`

Any deviation becomes a report blocker.

## Covered Operations

The first fixture covers:

| Fixture operation | Expected result | Boundary proved |
| --- | --- | --- |
| `resolve-known-consumer` | `read_only` | Consumer resolution reads only `api_v1_consumers`. |
| `put-new-shadow-consumer` | `committed` | Consumer upsert writes only `api_v1_consumers`. |
| `append-allow-audit-event` | `committed` | Audit append changes only `api_v1_audit_events` and adds exactly one row. |
| `record-quota-and-audit-commit` | `committed` | Quota and audit writes follow the dormant commit order. |
| `record-quota-and-audit-rollback` | `rolled_back` | Rollback order follows the dormant contract and table counts do not leak. |

## Report

`simulateApiV1DurableFixtureScenario()` returns:

- `passed`
- `operationCount`
- `boundary`
- per-operation cases
- blockers
- observations
- warnings from the dormant durable interface validator

The report is intentionally non-executable and has `boundary.executable=false`.

## Boundary

This branch must keep all of the following true:

- no API v1 route tree
- no Prisma API v1 models
- no API v1 migration directory
- no API v1 env vars
- no raw API keys
- no SQL execution
- no database package import
- no provider call
- no partner onboarding or billing path

## Verification

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Next Promotion Slice

The next safe slice is a fixture-report archive and promotion checklist. It should persist generated simulator reports as tracked markdown or JSON artifacts, compare them against the harness conformance suite, and still avoid live routes, Prisma schema edits, migrations, env vars, credentials, provider calls, and database execution.
