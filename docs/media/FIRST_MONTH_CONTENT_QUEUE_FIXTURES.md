# First Month Content Queue Fixtures

Updated: 2026-07-05

Status: local fixture and scanner only. No content is published, no newsletter is sent, no social account is touched, no sponsor or affiliate link is activated, and no live integration is created.

## Purpose

The first-month content queue turns the media plan into repo-visible, testable operating fixtures.

The queue is designed to prove that GSE can plan a serious first 30 days without inventing traffic, revenue, sponsors, win rates, ROI, or live publishing status.

## Implementation

Code:

- `apps/web/lib/media-revenue/first-month-content-seeds.ts`
- `apps/web/lib/media-revenue/first-month-content-queue.ts`

Tests:

- `apps/web/__tests__/first-month-content-queue.test.ts`

## Fixture Scope

The generated queue contains:

- 30 daily watch posts
- 8 long-form YouTube drafts
- 40 short-form clip drafts
- 4 newsletter drafts
- 4 founder build-log drafts
- 4 weekly board-meeting drafts
- 30 manual partner-outreach batches at 10 targets per day

That is 90 content drafts plus 300 manually reviewed partner-outreach targets.

## First Week Exact Content

The queue preserves the first-week titles from the Sunday media plan:

- `Confidence Is Not Probability - Why Most Sports Prediction Sites Mislead You`
- `I am Building a Sports AI That Is Allowed to Say No`
- `No bet is a position.`
- `Why stale odds break trust.`
- `The line moved. That does not mean edge.`
- `Box score lied: targets are not role.`
- `Most models fail because they cannot say I do not know.`
- `What GSE refuses to do.`
- `Why I am building this in public.`
- `Market Mirage in 60 seconds.`
- `Loss autopsy > fake win-rate screenshots.`
- `The sports data business in one sentence.`
- `The First GSE Board Meeting.`

## Safety Contract

Every queue item returns:

- `status: DRAFT_ONLY`
- `manualReviewRequired: true`
- `publishAllowed: false`
- `externalSendAllowed: false`

The claim-safety report scans each generated title, hook, script beat, and CTA.

The report records:

- blocked item count
- evidence-required item count
- warning item count
- daily coverage count
- weekly cadence summary
- partner outreach batch count
- partner outreach target count
- closed live-action locks

## Verification

Targeted verification:

```bash
npm run test --workspace=apps/web -- first-month-content-queue.test.ts media-revenue-claim-safety.test.ts
```

Current focused result:

- 2 files passed
- 9 tests passed

Current broad result:

- `npm run typecheck` passed
- `npm run lint` passed
- `npm run guardrails` passed
- `npm run test --workspaces --if-present` passed: 635 test files, 8052 tests
- `git diff --check` passed

## Boundaries

This slice does not add:

- auto-posting
- newsletter sending
- partner emails
- affiliate links
- sponsor claims
- paid tools
- secrets
- traffic claims
- revenue claims
- win-rate claims
- ROI claims
- public calibration claims
