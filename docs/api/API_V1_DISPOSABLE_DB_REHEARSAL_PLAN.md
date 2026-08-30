# API v1 Disposable Database Rehearsal Plan

Status: plan-only. This slice does not add a database adapter, edit Prisma schema, create a migration, expose `apps/web/app/api/v1`, add an environment variable, generate a credential, call a provider, enable billing, or grant partner access.

## Purpose

The API v1 durable evidence stack now has a typed rehearsal plan for a future disposable database test. The canonical source is `apps/web/lib/api/v1/durable-rehearsal-plan.ts`.

The plan exists so future work does not improvise a database rehearsal. It defines the required proof, stop conditions, and boundaries before any owner-approved disposable target is touched.

## Current Boundary

The current plan exports:

- `status=plan_only`
- `commandsExecutableNow=false`
- `currentSliceRequiresEnvVars=false`
- `appliesMigration=false`
- `touchesProductionDatabase=false`
- `exposesRoute=false`
- `createsCredential=false`
- `providerCalled=false`
- `requiredFutureApproval=owner_approval_required`

## Required Steps

| Order | Step | Required proof |
| --- | --- | --- |
| 1 | `owner-approval-record` | Owner decision record and scope-limited rehearsal ticket. |
| 2 | `disposable-database-only` | Database name, creation timestamp, and destroy-by timestamp. |
| 3 | `future-migration-review` | Schema diff, rollback SQL, and table dependency review. |
| 4 | `synthetic-fixture-seed` | Synthetic consumer, quota, and audit row counts with raw-key absence proof. |
| 5 | `durable-adapter-conformance` | Passing durable harness report against the disposable adapter. |
| 6 | `fixture-report-comparison` | Comparison against `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json`. |
| 7 | `rollback-rehearsal` | Pre-rollback row counts, pre-rollback audit tip hash, and rollback transcript. |
| 8 | `post-rollback-verification` | Post-rollback schema diff, remaining API v1 table count, and focused API v1 tests. |

## Stop Conditions

Stop immediately if any of these are missing:

- owner approval
- named disposable target
- destroy-by timestamp
- schema diff
- rollback SQL
- synthetic-only seed proof
- raw-key absence proof
- passing conformance report
- tracked fixture report comparison
- row counts
- audit tip hash
- rollback transcript
- post-rollback schema diff

## Verification

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-rehearsal-plan.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Next Promotion Gate

No further database-adjacent implementation should proceed until the owner explicitly approves a disposable target and rehearsal scope. Without that approval, the next safe work is documentation, checklist hardening, or additional synthetic fixtures only.
