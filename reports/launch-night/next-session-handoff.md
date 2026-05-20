# Next-Session Handoff

What the *next* autonomous loop should pick up after the launch-night
loop completes. Sorted by priority. Each item lists the existing
foundation the next loop can build on.

## Priority 1 — turn the in-memory pieces durable

### 1a. Redis-backed Jarvis history

**Today:** `apps/web/lib/cockpit/jarvis-history.ts` provides a
process-local ring buffer via `sharedJarvisHistory()`. Process restart
wipes the buffer. Multi-process deploys each see their own history.

**Next:** add `apps/web/lib/cockpit/jarvis-history-redis.ts` that
implements the same `JarvisHistory` interface against an existing
Redis instance (`REDIS_URL`). Swap `sharedJarvisHistory()` to delegate
to Redis when REDIS_URL is present, fall back to in-memory otherwise.

Test plan:
- Existing `jarvis-history.test.ts` still passes against the in-memory
  implementation.
- A new `jarvis-history-redis.test.ts` mocks an `ioredis`-shaped
  client and asserts the same ordering + capacity invariants.

### 1b. Durable Jarvis audit log

**Today:** `serializeJarvisAudit()` produces tab-separated + verbose +
JSON outputs. No sink is wired.

**Next:** `workers/jarvis-audit/src/index.ts` — a small BullMQ worker
that runs every 10 minutes, calls `loadJarvisAssessment()`, computes
`diffJarvis(previous, current)`, persists the audit line to a
PostgreSQL `JarvisAuditLog` table (new Prisma model), and forwards
paging alerts via `alertsFromDiff` to whatever sink the operator
configures (Slack webhook, PagerDuty events API).

Test plan:
- Unit test for the worker's reducer using fixtures from
  `jarvis-audit-log.test.ts`.
- Source-level test that the worker references `alertsFromDiff` and
  `pagingAlerts`.

## Priority 2 — open the calibration loop

### 2a. Calibration proposal → applied delta

**Today:** `canApplyCalibrationAdjustments` is hard-coded false.
`CalibrationProposal` model exists. There's a `/cockpit/calibration`
page that surfaces proposals but cannot apply them — by design.

**Next:** introduce a manual operator action (`/cockpit/calibration/
[id]/apply` route, ADMIN-gated, requires a typed reason) that:

1. Verifies the proposal is `IMPLEMENTED` in source (model-freeze
   guardrail enforces the MODEL_VERSION bump).
2. Records the applied delta in a `CalibrationApplied` audit row.
3. Posts a Jarvis safety warning until the next calibration cycle
   confirms the delta moved the win rate the predicted direction.

Out of scope: never auto-apply. The operator action remains explicit.

## Priority 3 — replace the partial admin dashboard

**Today:** `apps/web/app/admin/dashboard/dashboard-view.tsx` is a stub
("rebuilt after a truncation incident") with a live launch-status pill
that fetches `/api/cockpit/jarvis`. The historical `DashboardData` +
SnapshotDetail types in `app/api/admin/dashboard/route.ts` still exist
and represent the full operator console design.

**Next:** rebuild the admin dashboard view consuming the existing
`/api/admin/dashboard` payload. The Jarvis pill should stay; the rest
of the view should restore ingestion runs, recent picks, signal
coverage, pending picks, etc. Use the existing `dashboard-view.tsx`
helper functions (`ago`, `fmtTime`, `confColor`, `gradeColor`,
`depthColor`, `resultColor`) as scaffolding.

Test plan:
- Source-level test asserting the rebuilt view consumes every key
  the API returns.

## Priority 4 — promote the brand voice document

**Today:** `docs/launch-observatory.md` contains the brand voice quick
reference inline. As contributors edit copy, a doc-only file at
`docs/brand-voice.md` would be discovered faster than buried inside
the observatory doc.

**Next:** extract the brand voice section into its own
`docs/brand-voice.md`. Cross-link from observatory and the
`CONTRIBUTING.md` "Adding a new customer-facing claim" recipe.

## Priority 5 — wire the focused subsets into local pre-commit

**Today:** `npm run test:brand-safety` + `npm run test:cockpit` exist
but aren't wired to a pre-commit hook. The `brand-safety` CI job
catches issues, but only after push.

**Next:** add a Husky (or vanilla git-hooks) `pre-commit` script that
runs `test:brand-safety` when files under
`apps/web/{app,components,lib}/` are staged. Cockpit tests don't need
to gate every commit but should run on PR via CI.

## Priority 6 — Calibration Proposal model freshness audit

**Today:** `model-freeze` guardrail enforces that MODEL_VERSION bumps
land with an IMPLEMENTED CalibrationProposal. There's no test that
proposals don't sit OPEN forever.

**Next:** add a Jarvis safety warning when a `CalibrationProposal`
has been `OPEN` for more than 14 days. Add a test asserting the
warning fires.

## Priority 7 — Snapshot regeneration in CI

**Today:** `npm run snapshots:regen` is operator-run against a dev
server. Snapshots are committed but go stale silently.

**Next:** add a GitHub Action that boots the Next.js app in CI, runs
`npm run snapshots:regen`, and commits the result to the PR branch.
That way every PR has up-to-date snapshots.

---

When the next session starts, read this file first, then
`reports/launch-night/overnight-summary.md` for the full second-pass
context.
