# Draft Fence Workflow Harness

Status: complete for local draft workflow composition. No content is published, no API route is exposed, no partner link is activated, and no live integration is created.

## Purpose

The draft fence workflow harness composes the existing fence plugins into a single pre-publication decision layer for content and API drafts.

It exists to prove that GSE can route draft work through source-rights, commercial-copy, disclosure, responsible-gaming, API payload-rights, and restricted-tracking-data gates before a human review step.

## Implementation

Code:

- `apps/web/lib/workflows/draft-fence-workflow.ts`

Tests:

- `apps/web/__tests__/draft-fence-workflow.test.ts`

The harness is pure TypeScript. It does not use the task-store runtime, Prisma, route handlers, email, publishing, partner links, or external services.

## Workflow Kinds

| Kind | Fences |
| --- | --- |
| `content` | source rights, commercial copy, restricted tracking data, affiliate disclosure, responsible gaming |
| `api` | source rights, API payload rights, restricted tracking data |

## Terminal States

| Status | Meaning |
| --- | --- |
| `BLOCKED` | At least one fence blocked the draft. Manual review cannot approve until the draft is repaired. |
| `NEEDS_MANUAL_REVIEW` | Automated fences did not block, but owner/manual review is still required. |

There is no `PUBLISHED`, `SENT`, `ROUTE_EXPOSED`, or `LIVE` terminal state.

## Hard Outputs

Every run returns:

- `publishAllowed: false`
- `routeExposureAllowed: false`
- `externalSendAllowed: false`
- `liveIntegrationAllowed: false`
- `manualReviewGate.required: true`
- `manualReviewGate.passed: false`

## Covered Failures

The tests prove:

- safe content can advance only to manual review
- banned tout copy and evidence-required commercial claims block
- partner/affiliate language without nearby disclosure blocks
- sportsbook/DFS/deposit language blocks without structured responsible-gaming review
- unsafe API payload rights block
- protected payload values are not echoed in workflow results

## Next Gate

The next safe expansion is a durable draft review packet:

1. serialize the workflow result into a local review artifact
2. add optional owner checklist fields
3. keep final approval manual
4. keep publish/send/API exposure disabled
