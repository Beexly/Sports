# Local Review Queue Blocker Report

Updated: 2026-07-06

## Purpose

This report turns the memory-shadow review queue snapshot into a repair map for local operators.

It answers:

- which queue sources have unresolved blockers
- which workflow surfaces are blocked
- which source IDs are driving source-rights or payload-rights repair work
- which packets should be reviewed first
- whether any live-action lock was opened

## Implemented Surface

- `apps/web/lib/workflows/local-review-queue-report.ts`
- `apps/web/lib/workflows/local-review-queue-report-markdown.ts`
- `apps/web/__tests__/local-review-queue-report.test.ts`

The report consumes `LocalReviewQueueSnapshot` from the existing simulator. It does not create a second persistence model.

## Grouping

| Report group | Why it exists |
| --- | --- |
| Queue source | Separates draft-review fixtures, first-month media, partner/sponsor, and manual-shadow work. |
| Workflow surface | Separates content and API repair lanes. |
| Source ID | Shows which source-rights or payload-rights surfaces are blocking review. |
| Priority queue | Orders unresolved packets by blocker count, stale evidence, workflow status, warnings, and source type. |

## Safety Locks

The report keeps these values false:

- `publishAllowed`
- `routeExposureAllowed`
- `externalSendAllowed`
- `liveIntegrationAllowed`
- `affiliateActivationAllowed`
- `sponsorApprovalAutomatic`
- `databaseWritesAllowed`
- `durablePersistenceEnabled`
- `externalSideEffectsAllowed`

## Current Verification

Command:

```bash
npm run test --workspace=apps/web -- local-review-queue-report.test.ts
```

Result:

- PASS
- 1 file
- 4 tests

## Non-Approval Statement

This report does not approve content publication, outbound outreach, affiliate activation, sponsor approval, API route exposure, database writes, durable persistence, legal clearance, source clearance, or any production workflow.

The next safe local gate is guarded Portfolio Fit / Calibration Integrity metric work or owner-reviewed production preview QA.
