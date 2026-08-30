# API v1 Live Route Promotion Packet

Status: reviewer packet only. This document does not approve live routes, database writes, credentials, provider calls, billing hooks, partner exposure, AWS resources, or production API availability.

## Purpose

This packet defines the final owner-review gate before any future `app/api/v1` route implementation can be discussed.

It exists because the current API v1 stack has intentionally stopped at shadow seams:

- auth/key parsing and hashing
- scope checks
- quota and rate-limit simulation
- request ID handling
- response envelopes
- usage events
- payload-rights filtering
- OpenAPI/security checks
- durable-adapter rehearsal plans
- route-level shadow harnesses
- idempotency replay simulation

The live route promotion packet keeps those seams useful while preserving the current boundary: no route tree, no database execution, no live consumer, no external provider call, no raw key storage, and no production exposure.

## Packet Contract

Code contract:

- `apps/web/lib/api/v1/live-route-promotion-packet.ts`
- `buildApiV1LiveRoutePromotionPacket()`

Schema:

- `schemaVersion`: `api-v1-live-route-promotion-packet-v1`
- `status`: `blocked_by_repo_boundary`, `blocked_by_owner_gates`, or `ready_for_owner_route_review`
- `liveRouteCreationAllowed`: always `false`
- `commandsExecutableNow`: always `false`
- `gates`: owner, route-contract, and repo-boundary review gates
- `blockers`: human-readable blockers
- `nextActions`: safe next actions only
- `intents`: non-executable command intents with evidence requirements and forbidden targets

## Required Gates

| Gate | Required evidence | Failure state |
| --- | --- | --- |
| Owner approval recorded | Owner decision record, route surface list, rollback owner | blocked |
| Durable persistence reviewed | Durable adapter report, quota debit proof, audit ledger proof | blocked |
| Route exposure approved | Exact path list, scope map, boundary exception note | blocked |
| Abuse response reviewed | Malformed auth, overscope, replay, rate-limit, unsafe payload denial proof | blocked |
| Payload envelope consumed | Route candidate calls `filterApiV1MetricPayloadFields()` or `filterProprietaryMetricPayloadEnvelope()` before response construction | blocked |
| OpenAPI/security reviewed | OpenAPI diff, security scanner output, scope coverage table | blocked |
| Rate-limit policy reviewed | Rate-limit policy, quota windows, idempotency replay proof, usage-event proof | blocked |
| Rollback plan reviewed | Disable procedure, rollback checklist, post-rollback verification list | blocked |
| Boundary exception reviewed | Route tree still absent, no boundary violations, explicit exception review | blocked |
| Raw-key absence reviewed | Proof that raw keys are never stored, logged, echoed, or returned | blocked |

## Status Rules

`blocked_by_repo_boundary` means there is already a route tree or boundary violation that must be removed or isolated before review continues.

`blocked_by_owner_gates` means the repo boundary is still clean, but required owner or route-contract evidence is missing.

`ready_for_owner_route_review` means the review packet is internally complete. It still does not create, approve, expose, deploy, or execute a live route.

## Forbidden Targets

Every intent is non-executable and forbids:

- production database
- shared staging database
- raw API key material
- provider account
- billing path
- partner onboarding path
- live cloud resource
- unreviewed route tree

## Current Expected State

The expected local state before owner review is:

- `status`: `blocked_by_owner_gates`
- `liveRouteCreationAllowed`: `false`
- `commandsExecutableNow`: `false`
- no `apps/web/app/api/v1` route tree
- no API v1 Prisma models
- no API v1 migrations
- no API v1 env vars
- no provider hooks in `apps/web/lib/api/v1`
- no database execution

## Verification

Focused verification:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-live-route-promotion-packet.test.ts api-v1-boundary-guard.test.ts api-v1-promotion-readiness.test.ts api-v1-disposable-rehearsal-packet.test.ts
npm.cmd run typecheck --workspace=@sports/web
npm.cmd run guardrails
git diff --check
```

Broader verification before merge:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test --workspaces --if-present -- --reporter=dot
npm.cmd run guardrails
git diff --check
```

## Non-Approval Statement

This packet is intentionally not a launch plan. It is a review artifact. Live API route creation remains blocked until the owner separately approves route exposure, durable persistence, abuse-response behavior, rollback procedure, and raw-key absence proof.
