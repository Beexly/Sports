# BUILD-REALAPP-013: Mock and demo leakage runtime gate

## Duplicate Gate

- duplicate_check_status: EXTENSION
- matched_existing_ids: BUILD-CMD-053
- relation_to_existing: Real-app evidence child of the prior command-center card.
- reason_not_duplicate: This card is tied to verified behavior from C:\Users\Garrett\Sports, not generic strategy.
- parent_id: BUILD-CMD-053
- dependency_ids: BUILD-REALAPP-002

## Category

QA/testing

## Goal

Production readiness fails on DEV_FAKE_ADMIN or DEMO_PICKS_ENABLED and public pages never show sample data in launch env.

## Real App Evidence

Readiness script guards flags; local runtime fails from invalid DB rather than sample fallback.

## Current Behavior

Demo/sample code exists by design and test logs show stub client when DATABASE_URL is absent.

## Desired Behavior

Production readiness fails on DEV_FAKE_ADMIN or DEMO_PICKS_ENABLED and public pages never show sample data in launch env.

## Affected Routes

/picks, /performance

## Affected Files

packages/db/src/sample-picks.ts
scripts/check-deploy-readiness.mjs

## Launch Classification

Priority P0; difficulty M; owner department QA / Infrastructure.

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

You are Claude Code in C:\Users\Garrett\Sports. Execute only BUILD-REALAPP-013: Mock and demo leakage runtime gate. Use the real-app evidence in docs/command-center, preserve founder-only methodology boundaries, avoid live affiliate/billing/prize changes, make the smallest scoped fix, then run the listed verification commands and report exact results.
