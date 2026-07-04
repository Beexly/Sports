# API v1 Reviewer Merge Checklist

Status: reviewer checklist only. This document does not approve live API v1 routes, Prisma models, migrations, provider calls, credentials, billing hooks, or database execution.

## Stack Order

Review and merge the stack in this order:

1. `codex/api-persistence-shadow-adapter`
2. `codex/api-v1-db-schema-proposal`
3. `codex/api-v1-durable-adapter-harness`
4. `codex/api-v1-dormant-durable-adapter-interface`
5. `codex/api-v1-durable-fixture-simulator`
6. `codex/api-v1-durable-fixture-report-archive`
7. `codex/api-v1-disposable-db-rehearsal-plan`
8. `codex/api-v1-rd-polish-guards`
9. `codex/api-v1-autonomous-polish-hardening`
10. `codex/api-v1-promotion-readiness-matrix`

Do not merge a later branch before all earlier branches are either merged or deliberately recreated on the target branch.

## Pre-Merge Stop Signs

Stop review if the diff introduces any of these before explicit owner approval:

- `apps/web/app/api/v1`
- API v1 Prisma models
- API v1 migrations
- API v1 environment variables
- provider SDK calls from `apps/web/lib/api/v1`
- `fetch(` from `apps/web/lib/api/v1`
- `process.env` reads from `apps/web/lib/api/v1`
- raw API key persistence
- database execution or disposable database creation
- AWS, DNS, billing, or partner-account mutation

## Required Local Verification

Run the focused stack checks first:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-promotion-readiness.test.ts api-v1-boundary-guard.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts api-v1-consumer-registry.test.ts api-v1-shadow-seam.test.ts
```

Then run the repo-level checks:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
npm.cmd run test --workspaces --if-present -- --reporter=dot
git diff --check
```

## Evidence To Inspect

- `docs/api/API_V1_STACK_HANDOFF.md`
- `docs/api/API_V1_STACK_PR_INDEX.md`
- `docs/api/API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.md`
- `docs/api/API_V1_PROMOTION_READINESS_MATRIX.md`
- `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json`
- `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.md`
- `apps/web/__fixtures__/api-v1/durable-fixture-hostile-invalid.json`

## Approval Boundary

The next implementation step is still a disposable database rehearsal. That remains blocked until the owner names the disposable target, approves the rehearsal scope, approves a destroy-by timestamp, and confirms the rollback evidence expected from that rehearsal.

Until that approval exists, allowed work remains local-only: docs, synthetic fixtures, deterministic report rendering, guardrails, tests, and copy-paste-ready PR material.
