# API v1 Stack Handoff

Status: shadow and proposal stack only. This handoff does not claim live availability, legal clearance, database readiness, or production readiness.

## Current Boundary

The API v1 stack is still blocked from live use:

- no `apps/web/app/api/v1` route tree
- no API v1 Prisma models
- no API v1 migration
- no API v1 env vars
- no generated credentials
- no partner onboarding
- no billing hook
- no provider call
- no AWS/account mutation
- no database execution

The current hard gate is `docs/api/API_V1_DISPOSABLE_DB_REHEARSAL_PLAN.md`: database-adjacent work requires explicit owner approval of a disposable target and rehearsal scope.

## Branch Stack

| Order | Branch | Commit | Purpose |
| --- | --- | --- | --- |
| 1 | `codex/api-persistence-shadow-adapter` | `73d59271` | Adds local API v1 persistence shadow adapter. |
| 2 | `codex/api-v1-db-schema-proposal` | `481f83ab` | Adds proposal-only durable schema map and rollback plan. |
| 3 | `codex/api-v1-durable-adapter-harness` | `01dfe0c0` | Adds local conformance harness and mocked transaction rollback proof. |
| 4 | `codex/api-v1-dormant-durable-adapter-interface` | `6edddd26` | Maps planned durable operations to proposed table names without execution. |
| 5 | `codex/api-v1-durable-fixture-simulator` | `63c950f4` | Replays local synthetic fixture traces against the dormant interface. |
| 6 | `codex/api-v1-durable-fixture-report-archive` | `f286054d` | Archives fixture and harness evidence with `livePromotionAllowed=false`. |
| 7 | `codex/api-v1-disposable-db-rehearsal-plan` | `fcee1716` | Adds plan-only disposable DB rehearsal checklist and validator. |
| 8 | `codex/api-v1-rd-polish-guards` | `9789a040` | Adds boundary guard, edge fixtures, rendered report, and this handoff. |
| 9 | `codex/api-v1-autonomous-polish-hardening` | current branch after this slice is committed | Adds hostile invalid fixture coverage, reviewer merge checklist, README navigation, and focused CI guard wiring. |

## Key Code Surfaces

| File | Role |
| --- | --- |
| `apps/web/lib/api/v1/persistence.ts` | Memory shadow persistence adapter and promotion plan gates. |
| `apps/web/lib/api/v1/schema-proposal.ts` | Proposal-only Prisma table draft and rollback validation. |
| `apps/web/lib/api/v1/durable-adapter-harness.ts` | Adapter conformance harness and mocked transaction store. |
| `apps/web/lib/api/v1/dormant-durable-adapter-interface.ts` | Table-mapped durable interface contract. |
| `apps/web/lib/api/v1/durable-fixture-simulator.ts` | Local synthetic operation replay and drift detection. |
| `apps/web/lib/api/v1/durable-fixture-report.ts` | Deterministic report archive builder. |
| `apps/web/lib/api/v1/durable-fixture-report-renderer.ts` | Markdown renderer for the tracked fixture report. |
| `apps/web/lib/api/v1/durable-rehearsal-plan.ts` | Plan-only disposable DB rehearsal checklist and validator. |
| `scripts/guardrails/api-v1-boundary.mjs` | Repo guard that blocks accidental API v1 live surfaces. |

## Tracked Evidence

| File | Evidence |
| --- | --- |
| `apps/web/__fixtures__/api-v1/durable-fixture-simulator.json` | Canonical local synthetic happy-path durable trace. |
| `apps/web/__fixtures__/api-v1/durable-fixture-edge-cases.json` | Suspended, expired, quota-exhausted, and malformed-audit synthetic trace. |
| `apps/web/__fixtures__/api-v1/durable-fixture-hostile-invalid.json` | Deliberately invalid negative-control trace that must fail simulation. |
| `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.json` | Machine-readable archive with `livePromotionAllowed=false`. |
| `docs/api/fixtures/API_V1_DURABLE_FIXTURE_REPORT.md` | Rendered human-readable archive. |
| `docs/api/API_V1_REVIEWER_MERGE_CHECKLIST.md` | Reviewer checklist and stop-sign list for stacked PR review. |
| `docs/api/API_V1_AUTONOMOUS_POLISH_VERIFICATION_LOG.md` | Exact local verification commands, outcomes, caveats, and GitHub auth blocker. |

## Focused Tests

Run:

```bash
npm.cmd run test --workspace=apps/web -- api-v1-boundary-guard.test.ts api-v1-durable-rehearsal-plan.test.ts api-v1-durable-fixture-report.test.ts api-v1-durable-fixture-simulator.test.ts api-v1-dormant-durable-adapter-interface.test.ts api-v1-durable-adapter-harness.test.ts api-v1-db-schema-proposal.test.ts api-v1-persistence.test.ts api-v1-consumer-registry.test.ts api-v1-shadow-seam.test.ts
```

## Full Verification

Run:

```bash
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run guardrails
npm.cmd run test --workspaces --if-present -- --reporter=dot
git diff --check
```

`npm.cmd run guardrails` now includes `scripts/guardrails/api-v1-boundary.mjs`.
`.github/workflows/ci.yml` also includes a focused `api-v1-boundary` job so CI can fail fast on accidental live API v1 surfaces.

## PR Creation State

GitHub CLI was unauthenticated during the last verification. Live PR creation remains blocked until `gh auth login` is completed.

Copy-paste PR bodies are tracked per slice:

- `docs/api/API_V1_DATABASE_SCHEMA_PR_BODY.md`
- `docs/api/API_V1_DURABLE_ADAPTER_HARNESS_PR_BODY.md`
- `docs/api/API_V1_DORMANT_DURABLE_ADAPTER_INTERFACE_PR_BODY.md`
- `docs/api/API_V1_DURABLE_FIXTURE_SIMULATOR_PR_BODY.md`
- `docs/api/API_V1_DURABLE_FIXTURE_REPORT_PR_BODY.md`
- `docs/api/API_V1_DISPOSABLE_DB_REHEARSAL_PLAN_PR_BODY.md`
- `docs/api/API_V1_AUTONOMOUS_POLISH_PR_BODY.md`
- `docs/api/API_V1_STACK_PR_INDEX.md`

## Remaining Approval Gate

Do not proceed to database-adjacent implementation until all of these are true:

1. Owner approves a named disposable database target.
2. Owner approves rehearsal scope and destroy-by timestamp.
3. Future schema diff and rollback SQL are reviewed.
4. Synthetic-only seed proof is prepared.
5. Raw-key absence proof is prepared.

Before that approval, safe work is limited to docs, checklist hardening, local synthetic fixtures, and guardrails.
