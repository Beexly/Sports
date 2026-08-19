# Phase A Summary — A++ hardening (2026-08-12)

## What was graded

- **T1** `tools/model-advisor/**` (shipped by prior session) — diff-vs-spec
  review: conforms on all 7 required test cases, file layout, rule order,
  types. No changes needed.
- **T2** `apps/web/app/cockpit/api-costs/routing-legibility.tsx` + page wiring +
  component test — built and hardened this run.
- **T3** `eval/promptfoo/{surface-prompts,scorer,report}.ts` + tests + README —
  built and hardened this run.

## What changed this phase

Commit 1 `feat(cockpit): routing legibility card … [overnight-T2]`:
- new `routing-legibility.tsx` (read-only card), page wiring, 7 component tests.

Commit 2 `feat(eval): offline per-surface cost/quality report … [overnight-T3]`:
- harness prompt set, deterministic scorer, report CLI, 13 tests, README.

Post-commit hardening (uncommitted so far — will commit as
`refactor(scope): [A++-hardening]`):
- removed non-null assertions from T3 tests (`SURFACE_PROMPTS[0]!` → typed
  `firstPrompt()` helper that throws if the fixture is missing),
- imported `SurfacePrompt`/`EvalReport` types explicitly.

## Gate results (A1 baseline)

| Gate | Result |
|---|---|
| `npx vitest run tools/model-advisor` | 10/10 pass |
| `npx vitest run eval/promptfoo` | 13/13 pass |
| `npx vitest run apps/web/__tests__/cockpit-api-costs-*` | 11/11 pass |
| `npm run lint` (all workspaces, --max-warnings=0) | pass |
| `npm run typecheck` (workspaces) | 3 pre-existing #421 errors, 0 new |
| `npm run guard:performance-claims` | OK (216 files) |
| `npm run guard:commercial-copy` | OK (217 files) |
| `npm run guard:secrets` | OK (5383 files) |
| strict `tsc --noEmit` on eval/promptfoo + tools/model-advisor | clean |

## What still fails and why

- `typecheck` (#421): 3 pre-existing errors in autonomy executor allow-list and
  ranking pause groups — deliberately NOT fixed (design decisions required,
  per the issue). My files add zero errors.
- `guard:model-freeze` (#419) and `guard:api-v1-boundary` (#420): pre-existing
  tracked debt, red on main too, unrelated to this branch's files.

## Divergences (documented in PHASE_A_NOTES.md)

- T2: request count/spend live on the cost-monitor surface table; the routing
  card shows the model-router view. No fabricated enum bridge.
- T3: `npm run eval:prompts` script untouched (package.json edits forbidden);
  offline report via `npx tsx eval/promptfoo/report.ts`.

Next: PHASE B — read-only adversarial audit (handoff/AUDIT_FINDINGS.md).
