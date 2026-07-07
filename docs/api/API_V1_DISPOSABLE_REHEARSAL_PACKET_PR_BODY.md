# API v1 Disposable Rehearsal Packet PR Body

## Summary

Adds a local-only disposable rehearsal packet builder for the API v1 shadow stack.

The packet consumes the promotion readiness matrix and produces a structured owner-review packet with:

- readiness blockers
- approval boundary
- review sections
- command intents
- expected evidence
- forbidden targets

It does not include executable shell commands and never sets `livePromotionAllowed=true`.

## Changes

- Added `apps/web/lib/api/v1/disposable-rehearsal-packet.ts`.
- Exported the packet builder from `apps/web/lib/api/v1/index.ts`.
- Added focused tests in `apps/web/__tests__/api-v1-disposable-rehearsal-packet.test.ts`.
- Added `docs/api/API_V1_DISPOSABLE_REHEARSAL_PACKET.md`.
- Updated API v1 stack handoff, PR index, shadow seam, reviewer checklist, promotion readiness docs, and README navigation.

## Safety Notes

- No API v1 route.
- No Prisma schema edit.
- No migration.
- No env var.
- No credential.
- No provider call.
- No database execution.
- No AWS/account mutation.
- No billing or partner-account action.

## Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-disposable-rehearsal-packet.test.ts api-v1-promotion-readiness.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-boundary-guard.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
npm.cmd run test --workspaces --if-present -- --reporter=dot
git diff --check
```

## Remaining Blocker

The disposable database rehearsal remains blocked until the owner approves a named disposable target, rehearsal scope, destroy-by timestamp, rollback evidence, and raw-key absence proof.
