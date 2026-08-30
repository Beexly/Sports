# API v1 Promotion Readiness Matrix

Status: local-only promotion-readiness evaluator. This document does not approve live API v1 routes, Prisma models, migrations, env vars, credentials, provider calls, billing hooks, database execution, AWS/account mutation, or production use.

## Purpose

`apps/web/lib/api/v1/promotion-readiness.ts` turns existing API v1 shadow evidence into an explicit gate matrix. It is the current safe R&D layer above the durable fixture report, dormant durable adapter interface, and disposable database rehearsal plan.

The evaluator intentionally separates:

- shadow evidence gates
- repo boundary gates
- owner approval gates

It never sets `livePromotionAllowed=true`. Even the best-case status is only `ready_for_disposable_rehearsal_review`.

## Status Values

| Status | Meaning |
| --- | --- |
| `blocked` | Shadow evidence or repo boundary gates failed. Do not discuss disposable database execution until blockers are fixed. |
| `owner_approval_required` | Local shadow evidence and repo boundaries pass, but owner-only approval evidence is missing. This is the expected current state. |
| `ready_for_disposable_rehearsal_review` | Shadow evidence, repo boundaries, and owner approval evidence are complete enough to review a disposable rehearsal packet. This is still not live API approval. |

## Gate Categories

### Shadow Evidence

- `fixture-report-ready`
- `durable-conformance-ready`
- `live-promotion-disabled`
- `rehearsal-plan-clean`

### Repo Boundary

- `route-tree-absent`
- `prisma-models-absent`
- `migration-absent`
- `env-vars-absent`
- `provider-hooks-absent`

### Owner Approval

- `owner-approval-recorded`
- `disposable-target-approved`
- `destroy-by-timestamp-recorded`
- `rollback-evidence-recorded`
- `raw-key-absence-proof-recorded`

## Current Expected State

The current repository should evaluate to:

- `status=owner_approval_required`
- `shadowEvidenceReady=true`
- `ownerApprovalComplete=false`
- `livePromotionAllowed=false`

That means the local shadow stack is reviewable, but the next database-adjacent step is still blocked by owner approval and disposable-target evidence.

## Verification

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-promotion-readiness.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-boundary-guard.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
git diff --check
```

## Adjacent Safe Slice

The repo-visible disposable rehearsal packet now lives in `docs/api/API_V1_DISPOSABLE_REHEARSAL_PACKET.md` and `apps/web/lib/api/v1/disposable-rehearsal-packet.ts`. It consumes this matrix output and keeps all command intents non-executable until owner approval is present.
