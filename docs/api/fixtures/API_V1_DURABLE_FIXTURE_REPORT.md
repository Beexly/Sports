# API v1 Durable Fixture Report

Generated at: `2026-07-04T00:00:00.000Z`

## Summary

- Schema version: `api-v1-durable-fixture-report-v1`
- Status: `shadow_report_ready`
- Live promotion allowed: `false`
- Fixture: `api-v1-durable-local-synthetic-v1`
- Fixture passed: `true`
- Fixture operation count: `5`
- Conformance adapter: `mock_transactional_store`
- Conformance passed: `true`
- Conformance case count: `5`

## Boundary

- Route exposed: `false`
- Database touched: `false`
- Provider called: `false`
- Executable: `false`

## Fixture Cases

- `resolve-known-consumer`
- `put-new-shadow-consumer`
- `append-allow-audit-event`
- `record-quota-and-audit-commit`
- `record-quota-and-audit-rollback`

## Checklist

| Check | Result | Live blocker | Evidence |
| --- | --- | --- | --- |
| `fixture-simulator-passed` | pass | No | Fixture api-v1-durable-local-synthetic-v1 passed=true. |
| `durable-harness-conformance-passed` | pass | No | Harness mock_transactional_store passed=true. |
| `fixture-operation-coverage-present` | pass | No | operationCount=5; caseIds=resolve-known-consumer,put-new-shadow-consumer,append-allow-audit-event,record-quota-and-audit-commit,record-quota-and-audit-rollback. |
| `route-free` | pass | No | Fixture boundary says routeExposed=false. |
| `database-free` | pass | No | Fixture boundary says databaseTouched=false. |
| `provider-free` | pass | No | Fixture boundary says providerCalled=false. |
| `non-executable` | pass | No | Fixture boundary says executable=false. |
| `live-promotion-blocked` | pass | Yes | Live promotion remains blocked even when shadow evidence passes. |

## Promotion Blockers

- Owner approval for live API use is not present in this archive.
- No Prisma schema edit or migration exists for API v1 durable tables.
- No API v1 route tree exists.
- No disposable database rollback rehearsal has been recorded.
- No production credential, partner onboarding, billing, or provider path exists.

## Next Required Proof

- Replay fixture reports against any future disposable database adapter before schema mutation.
- Run the durable conformance harness against a real adapter in a non-production database.
- Record rollback rehearsal output with row counts and audit tip hash before owner promotion review.
- Keep OpenAPI generation, guardrails, typecheck, lint, and focused API v1 tests green before route exposure.

This report is tracked shadow evidence only. It is not a live-readiness, legal-clearance, or production-readiness claim.
