# Local Review Queue Persistence Simulator

Updated: 2026-07-06

## Purpose

This simulator proves how GSE can persist media, content/API, and partner/sponsor review packets before any database table, live route, affiliate activation, sponsor approval automation, or publishing workflow exists.

It is intentionally local and shadow-only. It is not a production queue.

## Implemented Surface

- `apps/web/lib/workflows/local-review-queue-persistence.ts`
- `apps/web/__tests__/local-review-queue-persistence.test.ts`

The simulator provides:

- normalized packet inputs for draft-review packets
- normalized packet inputs for first-month media review exports
- normalized packet inputs for partner/sponsor review fixtures
- append-only local queue events
- deterministic replay into queue snapshots
- duplicate event rejection
- duplicate packet rejection
- stale packet reporting
- unresolved blocker reporting
- owner decision events with optimistic version checks
- approval blocking when packet blockers remain unresolved
- markdown snapshot rendering

Companion reporting:

- `apps/web/lib/workflows/local-review-queue-report.ts`
- `apps/web/lib/workflows/local-review-queue-report-markdown.ts`
- `docs/ops/LOCAL_REVIEW_QUEUE_BLOCKER_REPORT.md`

The companion report consumes simulator snapshots and groups unresolved blockers by queue source, workflow surface, and source ID without adding database writes or live workflow actions.

## Queue Event Types

| Event | Purpose | Live effect |
| --- | --- | --- |
| `PACKET_ENQUEUED` | Adds a local manual-review packet to the queue. | None |
| `OWNER_DECISION_RECORDED` | Records repair-required or draft-use-only owner review. | None |
| `PACKET_ARCHIVED` | Archives a local queue packet. | None |

## Locks

Every packet and snapshot keeps these locks closed:

- `publishAllowed: false`
- `routeExposureAllowed: false`
- `externalSendAllowed: false`
- `liveIntegrationAllowed: false`
- `affiliateActivationAllowed: false`
- `sponsorApprovalAutomatic: false`
- `databaseWritesAllowed: false`
- `durablePersistenceEnabled: false`

## Failure Behavior

The simulator fails closed for:

- duplicate event IDs
- duplicate packet IDs
- owner updates for unknown packets
- stale owner updates with the wrong expected version
- approval attempts while blockers remain unresolved
- any packet that attempts to unlock live actions

## Current Verification

Command:

```bash
npm run test --workspace=apps/web -- local-review-queue-persistence.test.ts first-month-review-queue.test.ts draft-review-fixtures.test.ts partner-sponsor-review-fixtures.test.ts
```

Result:

- PASS
- 4 files
- 19 tests

Command:

```bash
npm run typecheck --workspace=@sports/web
```

Result:

- FAIL then PASS
- First run caught queue record status being narrowed to only draft workflow status.
- Fixed by separating initial workflow status from mutable queue record status.

## Non-Approval Statement

This simulator does not approve live queue persistence, database writes, public route exposure, content publication, outbound outreach, affiliate activation, sponsor approval, performance claims, source legal clearance, or any production workflow.

The next local gate is historical distribution/drift adapters for governed metrics or owner-reviewed production preview QA.
