# API v1 Durable Fixture Report Archive

Status: tracked shadow evidence only. This slice does not add a database adapter, edit Prisma schema, create a migration, expose `apps/web/app/api/v1`, add an environment variable, generate a credential, call a provider, enable billing, or grant partner access.

## Purpose

The API v1 durable fixture simulator now has a deterministic report archive and promotion checklist. The canonical builder is `apps/web/lib/api/v1/durable-fixture-report.ts`, the markdown renderer is `apps/web/lib/api/v1/durable-fixture-report-renderer.ts`, and the tracked archives are `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json` and `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.md`.

The archive compares:

- local synthetic fixture replay
- mocked durable-adapter conformance harness output
- route/database/provider boundary state
- live-promotion blockers
- required next proof

## Current Archive

`docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json` records:

- `status=shadow_report_ready`
- `livePromotionAllowed=false`
- fixture id `api-v1-durable-local-synthetic-v1`
- 5 simulated fixture operations
- mocked transaction harness passed
- 8 checklist items passed
- live promotion still blocked

The archive is intentionally not a live-readiness claim.

## Checklist Meaning

Passing checklist items mean the local shadow artifacts agree with each other. They do not mean API v1 is production-ready.

Live promotion remains blocked because:

- owner approval is not recorded
- no API v1 Prisma schema edit exists
- no API v1 migration exists
- no API v1 route exists
- no disposable database rollback rehearsal exists
- no production credential, partner onboarding, billing, or provider path exists

## Verification

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Next Promotion Slice

The disposable-database rehearsal plan now lives in `docs/api/API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.md`. No database-adjacent implementation should proceed until the owner explicitly approves a disposable target and rehearsal scope. Without that approval, safe follow-up is limited to documentation, checklist hardening, or additional synthetic fixtures.
