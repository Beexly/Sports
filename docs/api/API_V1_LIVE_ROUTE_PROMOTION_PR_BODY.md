## Summary

Adds a local-only API v1 live route promotion packet. The packet lists every gate required before any future live `app/api/v1` route implementation can be reviewed, while keeping live route creation and command execution disabled.

## Changes

- Added `apps/web/lib/api/v1/live-route-promotion-packet.ts`.
- Exported the packet builder from `apps/web/lib/api/v1/index.ts`.
- Added `apps/web/__tests__/api-v1-live-route-promotion-packet.test.ts`.
- Added `docs/api/API_V1_LIVE_ROUTE_PROMOTION_PACKET.md`.
- Updated API stack navigation and Sunday execution ledgers.

## Safety Notes

- No `apps/web/app/api/v1` route tree.
- No Prisma model.
- No migration.
- No env var.
- No credential.
- No provider call.
- No database execution.
- No billing or partner exposure.
- No AWS or cloud mutation.
- `liveRouteCreationAllowed` remains `false` in every packet state.
- `commandsExecutableNow` remains `false` in every packet state.

## Required Review Gates

- owner approval recorded
- durable persistence reviewed
- route exposure approved
- abuse-response reviewed
- metric payload-envelope consumption verified
- OpenAPI/security reviewed
- rate-limit policy reviewed
- rollback plan reviewed
- API v1 boundary exception reviewed
- raw-key absence reviewed

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-live-route-promotion-packet.test.ts api-v1-boundary-guard.test.ts api-v1-promotion-readiness.test.ts api-v1-disposable-rehearsal-packet.test.ts
npm.cmd run typecheck --workspace=@sports/web
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Follow-Up

Do not create live routes after this PR. The next safe work is either owner-reviewed route design paperwork or additional local-only abuse-response fixtures.
