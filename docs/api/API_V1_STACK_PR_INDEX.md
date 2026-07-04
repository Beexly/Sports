# API v1 Stacked PR Index

Status: copy-paste-ready PR map only. GitHub CLI auth is required before live PR creation.

## Stack

1. `codex/api-persistence-shadow-adapter`
   - Commit: `73d59271`
   - Purpose: local API v1 persistence shadow adapter.

2. `codex/api-v1-db-schema-proposal`
   - Commit: `481f83ab`
   - PR body: `docs/api/API_V1_DATABASE_SCHEMA_PR_BODY.md`

3. `codex/api-v1-durable-adapter-harness`
   - Commit: `01dfe0c0`
   - PR body: `docs/api/API_V1_DURABLE_ADAPTER_HARNESS_PR_BODY.md`

4. `codex/api-v1-dormant-durable-adapter-interface`
   - Commit: `6edddd26`
   - PR body: `docs/api/API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE_PR_BODY.md`

5. `codex/api-v1-durable-fixture-simulator`
   - Commit: `63c950f4`
   - PR body: `docs/api/API_V1_DURABLE_FIXTURE_SIMULATOR_PR_BODY.md`

6. `codex/api-v1-durable-fixture-report-archive`
   - Commit: `f286054d`
   - PR body: `docs/api/API_V1_DURABLE_FIXTURE_REPORT_PR_BODY.md`

7. `codex/api-v1-disposable-db-rehearsal-plan`
   - Commit: `fcee1716`
   - PR body: `docs/api/API_V1_DISPOSABLE_DB_REHEARSAL_PLAN_PR_BODY.md`

8. `codex/api-v1-rd-polish-guards`
   - Commit: `9789a040`
   - Summary:
     - adds API v1 boundary guard and npm script
     - adds edge-case durable fixtures
     - adds markdown report renderer and tracked rendered report
     - adds stack handoff and PR index

9. `codex/api-v1-autonomous-polish-hardening`
   - Commit: current branch after this slice is committed
   - PR body: `docs/api/API_V1_AUTONOMOUS_POLISH_PR_BODY.md`
   - Summary:
     - adds hostile invalid fixture rejection coverage
     - adds runtime table-count shape validation to the simulator
     - adds reviewer merge checklist
     - adds README stack navigation
     - adds a focused CI API v1 boundary job
     - adds `docs/api/API_V1_AUTONOMOUS_POLISH_VERIFICATION_LOG.md`

## Current Autonomous Polish PR Body

Use `docs/api/API_V1_AUTONOMOUS_POLISH_PR_BODY.md` for the current branch.

## Previous R&D Polish PR Body

### Summary

Adds no-cost API v1 R&D polish around the existing shadow/proposal stack: a CI-style boundary guard, expanded synthetic durable fixtures, a markdown renderer for the tracked fixture archive, and a master handoff for Claude/Codex.

### Changes

- Added `scripts/guardrails/api-v1-boundary.mjs`.
- Added `guard:api-v1-boundary` and wired it into `npm.cmd run guardrails`.
- Added `apps/web/__tests__/api-v1-boundary-guard.test.ts`.
- Added `apps/web/__fixtures__/api-v1/durable-fixture-edge-cases.json`.
- Expanded `api-v1-durable-fixture-simulator.test.ts`.
- Added `apps/web/lib/api/v1/durable-fixture-report-renderer.ts`.
- Added `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.md`.
- Added `docs/api/API_V1_STACK_HANDOFF.md`.
- Added `docs/api/API_V1_STACK_PR_INDEX.md`.

### Safety Notes

- No API v1 route.
- No Prisma schema edit.
- No migration.
- No env var.
- No credential.
- No provider call.
- No DB execution.
- No AWS/account mutation.
- Boundary guard now fails if any of those surfaces appear accidentally.

### Suggested Verification

```bash
npm.cmd run test --workspace=apps/web -- api-v1-boundary-guard.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts api-v1-consumer-registry.test.ts api-v1-shadow-seam.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
npm.cmd run test --workspaces --if-present -- --reporter=dot
git diff --check
```

### Follow-Up

No database-adjacent implementation should proceed until the owner approves a named disposable target and rehearsal scope.
