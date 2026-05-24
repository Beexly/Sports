# COORDINATION.md — Overnight Claude Run 1
**Run:** 1
**Mode:** WRITE (branch: claude/magical-volta-KSe4E)
**Start:** 2026-05-24T07:10:00Z
**TTL:** 90 min

## Active Stream Claims

| Stream | Files | TTL | Status |
|--------|-------|-----|--------|
| grow/ingestion-pipeline-tests | packages/ingestion-pipeline/src/__tests__/ | 07:10-08:40 | ACTIVE |
| improve/force-dynamic-api-routes | apps/web/app/api/blog/route.ts, apps/web/app/api/subscriptions/*, apps/web/app/api/webhooks/stripe/route.ts | 07:10-08:40 | ACTIVE |
| repair/cockpit-enum-validation | apps/web/app/api/cockpit/tasks/route.ts, apps/web/app/api/cockpit/tasks/[id]/route.ts | 07:10-08:40 | ACTIVE |

## Disprove Gates

1. **force-dynamic**: Disprove by showing Next.js automatically marks these routes dynamic because they call `auth()` which reads cookies. If true, the fix is still correct but lower urgency.
2. **enum validation**: Disprove by showing Prisma throws a clean error for invalid enum values (it does — but the error is a 500 not a 400, which is the bug).
3. **ingestion-pipeline tests**: Disprove by finding existing tests elsewhere that cover `source-snapshot.ts` stableStringify logic.

## Blockers
None currently.
