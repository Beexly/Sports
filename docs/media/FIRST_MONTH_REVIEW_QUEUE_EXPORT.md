# First Month Review Queue Export

Updated: 2026-07-05

Status: local review export only. No content is published, no newsletter is sent, no social account is touched, no partner email is sent, and no live integration is created.

## Purpose

The first-month review queue export turns the 30-day content fixture plan into local review packets.

It exists so GSE can inspect title, hook, script-beat count, claim-safety status, content score, cadence coverage, and workflow fence status before any owner decision.

## Implementation

Code:

- `apps/web/lib/media-revenue/first-month-review-queue.ts`

Tests:

- `apps/web/__tests__/first-month-review-queue.test.ts`

## Export Contract

`buildFirstMonthReviewQueueExport()` returns:

- 90 local review packets by default
- generated timestamp
- blocked packet count
- waiting-manual-review count
- claim-blocked count
- evidence-required count
- weekly cadence summary
- closed live-action lock proof

Each packet includes:

- item id
- draft review packet id
- day and week
- title
- workflow status
- content score and grade
- script beat count
- claim-safety result
- blockers, warnings, and fix hints
- bounded markdown review text
- live-action locks

The markdown includes metadata and the underlying fence review summary. It does not print full script bodies.

## Safety Contract

Every exported packet keeps:

- `publishAllowed: false`
- `externalSendAllowed: false`
- `routeExposureAllowed: false`
- `liveIntegrationAllowed: false`

Unsafe drafts can be represented in the queue, but they remain `BLOCKED` and waiting on repair.

## Verification

Targeted verification:

```bash
npm run test --workspace=apps/web -- first-month-review-queue.test.ts first-month-content-queue.test.ts draft-fence-workflow.test.ts
```

Current focused result:

- 3 files passed
- 16 tests passed

Additional gates run:

- `npm run typecheck --workspace=@sports/web` passed
- `npm run guardrails` passed
- `git diff --check` passed

## Boundaries

This slice does not add:

- persistent queue storage
- public route exposure
- auto-posting
- newsletter sending
- partner email sending
- affiliate activation
- sponsor claims
- traffic claims
- revenue claims
- win-rate claims
- ROI claims
- public calibration claims
