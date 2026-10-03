# attic/ — archived prediction-engine modules (2026-09-05)

These 12 modules were removed from `src/` because ALL of the following held
for each (verified 2026-09-05 on `hermes/night-2026-09-05`, see commit message):

1. Zero `export ... from "./<module>.js"` in `src/index.ts` (barrel).
2. Zero `from ".../<module>.js"` value-imports anywhere in apps/, workers/,
   packages/, scripts/ (the single exception is `consensus-view.ts`'s
   `import type` of `edge-significance.ts` — both archived together).
3. Only references elsewhere are prose mentions in comments/docs.

Their co-located tests moved with them, renamed `*.test.ts.archived` so the
`src/**/*.test.ts` vitest include and the `src/**/*.ts` tsconfig include both
ignore this directory. Nothing here compiles or runs in CI.

`src/__tests__/eprocess-property.test.ts` was narrowed to the live
`forecast-skill-eprocess.ts` properties; the bernoulli/instrumented fuzz bodies
live on in `bernoulli-eprocess.test.ts.archived`,
`instrumented-eprocess.test.ts.archived`, and git history.

## Falsified during verification — NOT archived (transitively live)

`docs/intelligence/LEVERAGE_STATUS.md` §2.1 listed 19 modules as "never
exported, never imported"; that claim was checked against `from`-imports (not
just the barrel) and 5 of the 19 turned out to be reachable and were kept:

- `elo-estimator.ts` ← `elo-from-results.ts`, `elo-backtest.ts`,
  `team-strength-filter.ts` (all barrel-exported; elo-backtest has a live
  web route + page).
- `hawkes-steam.ts` ← `pipeline/live-orchestrator.ts` (barrel-exported).
- `nflverse-replay-parser.ts` ← `replay-harness.ts` (barrel-exported).
- `projection-evaluation.ts` ← `tweedie-baseline.ts`, `earned-weight-ensemble.ts`
  (both barrel-exported).
- `tweedie-aci.ts` ← `tweedie-baseline.ts` re-export (barrel).

Restoring any archived module: `git mv attic/<m>.ts src/<m>.ts`,
`git mv attic/<m>.test.ts.archived src/__tests__/<m>.test.ts`, re-add the
barrel export + importer, run typecheck + full suite.
