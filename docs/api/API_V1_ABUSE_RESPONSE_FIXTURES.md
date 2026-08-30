# API V1 Abuse Response Fixtures

Updated: 2026-07-06

## Purpose

This local fixture report proves API v1 denial behavior and promotion conflict checks before any live `app/api/v1` route, database adapter, env var, credential, provider call, billing hook, or partner exposure exists.

Canonical files:

- `apps/web/lib/api/v1/abuse-response-fixtures.ts`
- `apps/web/__tests__/api-v1-abuse-response-fixtures.test.ts`

## Fixture Coverage

| Fixture | Expected result |
| --- | --- |
| malformed API key | `401`, no quota debit, no payload leak |
| conflicting API keys | `401`, no quota debit, no payload leak |
| overscoped consumer | `403`, no quota debit, no payload leak |
| quota exhausted | `429`, no quota debit, no payload leak |
| unsafe payload rights | `403`, no quota debit, no payload leak |
| malformed route controls | `405`, no quota debit, no payload leak |

## Promotion Conflict Checks

The report also checks:

- replay conflicts from reused external idempotency keys with different payload hashes
- unresolved local review queue blockers
- stale local review queue packets
- duplicate API route promotion request IDs

Any conflict blocks `promotionGateEvidence.abuseResponseReviewed`.

## Locks

The report always keeps:

- `liveRoutePromotionAllowed: false`
- `commandsExecutableNow: false`
- `routeExposed: false`
- `databaseWritesAllowed: false`

## Verification

Command:

```bash
npm run test --workspace=apps/web -- api-v1-abuse-response-fixtures.test.ts api-v1-shadow-route-harness.test.ts api-v1-shadow-route-replay.test.ts api-v1-live-route-promotion-packet.test.ts local-review-queue-persistence.test.ts
```

Result:

- PASS
- 5 files
- 25 tests

Command:

```bash
npm run typecheck --workspace=@sports/web
```

Result:

- FAIL then PASS
- First run caught a nullable replay-conflict map/filter type issue.
- Fixed by replacing the nullable map/filter with an explicit conflict collection loop.

## Non-Approval Statement

This fixture report is not a route approval, launch approval, durable persistence approval, security certification, legal clearance, partner onboarding approval, or production readiness claim.

The next gate remains owner-reviewed route design plus separate proof for durable persistence, OpenAPI/security, rate limits, rollback, boundary exception, payload-envelope consumption, and raw-key absence.
