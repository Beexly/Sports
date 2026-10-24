# BUILD-REALAPP-002: Resolve local production database auth and health degradation

## Duplicate Gate

- duplicate_check_status: EXTENSION
- matched_existing_ids: BUILD-CMD-048
- relation_to_existing: Real-app evidence child of the prior command-center card.
- reason_not_duplicate: This card is tied to verified behavior from C:\Users\Garrett\Sports, not generic strategy.
- parent_id: BUILD-CMD-048
- dependency_ids: none

## Category

infrastructure/security

## Goal

Health is green in approved env or returns explicit non-launch blocked diagnostics.

## Real App Evidence

prod-probe failed and logs show Prisma auth failure.

## Current Behavior

/api/health returns 503 because Prisma cannot authenticate against localhost as sports.

## Desired Behavior

Health is green in approved env or returns explicit non-launch blocked diagnostics.

## Affected Routes

/api/health

## Affected Files

.env*
packages/db/prisma
apps/web/app/api/health/route.ts

## Launch Classification

Priority P0; difficulty M; owner department Infrastructure / Data Engineering.

## Legal / Compliance Boundary

Do not expose founder-only methodology, live affiliate links, live prizes, or billing changes without explicit approval. Promotions and betting-adjacent copy remain review-gated.

## Data Boundary

Use test/local data only unless owner provides approved launch database access. Do not print secrets. Do not connect production data without explicit approval.

## Implementation Plan

1. Open the affected files in C:\Users\Garrett\Sports.
2. Reproduce the current behavior with the route or command listed above.
3. Make the smallest scoped app change that fixes the verified behavior.
4. Add or update a focused test/probe.
5. Rerun typecheck, lint, relevant tests, build, prod-probe, and route screenshot where applicable.

## Testing Plan

- npm.cmd run typecheck
- npm.cmd run lint
- relevant npm.cmd test filter or package test
- npm.cmd run build
- APP_URL=http://localhost:3210 node scripts/prod-probe.mjs when route behavior changes
- Screenshot affected public route on desktop and mobile when visual behavior changes

## Acceptance Criteria

- The verified failing behavior no longer occurs.
- No new method leakage, demo data leakage, or live-link risk is introduced.
- Required tests and route probes pass or are explicitly documented with owner-approved exceptions.

## Rollback Plan

Revert only the scoped files changed for this card and rerun the same verification commands. Do not revert unrelated dirty worktree changes.

## Claude Code Prompt

You are Claude Code in C:\Users\Garrett\Sports. Execute only BUILD-REALAPP-002: Resolve local production database auth and health degradation. Use the real-app evidence in docs/command-center, preserve founder-only methodology boundaries, avoid live affiliate/billing/prize changes, make the smallest scoped fix, then run the listed verification commands and report exact results.
