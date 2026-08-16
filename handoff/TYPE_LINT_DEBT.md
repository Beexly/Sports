# Type + Lint Debt — P7-06

Run: 2026-08-17 (session start)

## Commands

```
npm run typecheck > handoff/typecheck-raw.txt 2>&1
npm run lint       > handoff/lint-raw.txt 2>&1
```

## Results

| Gate       | Exit code | Problems |
|------------|-----------|----------|
| typecheck  | 0         | 0 errors |
| lint       | 0         | 0 errors |

## What was fixed in sprint-touched files

**1 lint error (2 problems) in `apps/web/lib/data-sources/free-score-persist.test.ts`** — the only
file this sprint modified that had lint issues:

- Line 100: `'checkClearance' is defined but never used` (`@typescript-eslint/no-unused-vars`)
- Line 101: `'buildTrustedFinals' is defined but never used` (`@typescript-eslint/no-unused-vars`)

**Fix:** removed the two unused direct imports. The module already has hoisted `vi.mock()` shims for
`@/lib/scraping/clearance-engine` and `./free-settlement` (lines 53 and 71), and the tests invoke
the mock objects `mocks.checkClearanceMock` / `mocks.buildTrustedFinalsMock` — the direct imports
were leftovers from a prior version of the test and served no purpose.

Verification after fix:

```
npm run typecheck  → EXIT=0
npm run lint       → EXIT=0
```

## Remaining debt (outside sprint-touched files)

**None.** Both `npm run typecheck` and `npm run lint` pass clean across every workspace. There are no
pre-existing type or lint errors to carry forward.

Note: an initial per-file `tsc` run on just the test file (triggered by the edit-autolint hook)
reported many errors (`TS2307: Cannot find module '@/...'`, `TS2802` downlevelIteration, etc.), but
those are artifacts of running `tsc` on a single file without the project's `tsconfig.json` path
aliases and `module`/`target` settings. The full workspace `npm run typecheck` (which uses each
package's configured `tsc --noEmit` with proper tsconfig) passes with zero errors.
