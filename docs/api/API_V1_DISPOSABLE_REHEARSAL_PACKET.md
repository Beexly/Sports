# API v1 Disposable Rehearsal Packet

Status: local-only reviewer packet. This document does not approve live API v1 routes, Prisma models, migrations, env vars, credentials, provider calls, billing hooks, database execution, AWS/account mutation, or production use.

## Purpose

`apps/web/lib/api/v1/disposable-rehearsal-packet.ts` consumes the promotion readiness matrix and turns it into a structured owner-review packet for a future disposable database rehearsal.

It is intentionally non-executable:

- `commandsExecutableNow=false`
- every command intent has `executableNow=false`
- `livePromotionAllowed=false`
- readiness blockers are carried forward from the matrix
- owner approval remains required

## Packet Status

| Status | Meaning |
| --- | --- |
| `blocked_by_readiness_matrix` | The readiness matrix is not ready for disposable rehearsal review. Use matrix blockers first. |
| `owner_review_packet_ready` | The packet can be attached to an owner-reviewed disposable rehearsal ticket. It still does not execute commands or approve live API use. |

## Packet Sections

- `readiness`
- `approval`
- `target`
- `evidence`
- `rollback`
- `post_rehearsal`

Each section records status, summary, and required evidence. A section becoming `ready` means its evidence is ready for review, not that a command may run.

## Command Intents

The packet records command intents instead of shell commands:

- `record-owner-approval`
- `prepare-disposable-target`
- `review-future-schema-diff`
- `seed-synthetic-fixture-data`
- `run-durable-conformance`
- `compare-fixture-report`
- `capture-rollback-evidence`
- `verify-post-rollback-cleanup`

Each intent lists expected evidence and forbidden targets. Forbidden targets include production database, shared staging database, raw API key material, partner billing or onboarding path, provider account, AWS account, and live API v1 route.

## Current Expected State

The current repository should produce:

- `status=blocked_by_readiness_matrix`
- `readinessStatus=owner_approval_required`
- `commandsExecutableNow=false`
- `livePromotionAllowed=false`
- blocked owner approval gates for owner approval, disposable target, destroy-by timestamp, rollback evidence, and raw-key absence proof

## Verification

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-disposable-rehearsal-packet.test.ts api-v1-promotion-readiness.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-boundary-guard.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Next Safe Slice

The next safe R&D slice is a rendered markdown packet builder that turns this packet object into a tracked human-readable artifact. It should remain generated from local fixtures and still keep all command intents non-executable.
