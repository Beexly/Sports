# Genesis Kernel — recovery provenance (from PR #127)

Status: IMPLEMENTED_ON_DRAFT_BRANCH / NOT_MERGED. Dormant, shadow-only: no
production surface imports this package (structural test 16 enforces it).

## Source

- Recovered from PR #127 head `fdd1739eecdc3e66c11b93d51fffd8d3d02dc080`
  (branch `genesis/gx-000-codebase-twin-plan-compiler`, base `0e56c477`).
- Rebased-by-extraction onto `main` at `c19a00d` — the package tree was
  checked out directly from the #127 blob objects, not retyped.

## Extraction fidelity

17 of 18 package files are byte-identical (sha256-verified) to the #127
blobs. Exactly one file was modified:

- `src/__tests__/structural.test.ts` — test 17 ("no public route path under
  apps/web/app contains 'genesis'") matched the ABSOLUTE walk path, so any
  checkout whose directory name contains "genesis" (e.g. a worktree at
  `.../wt/genesis`) failed spuriously. The scan now matches paths relative to
  `apps/web/app`. The invariant is unchanged and not weakened: a route
  segment named `genesis` still fails exactly as before.

Root wiring (outside the package): `package.json` gained the same
`genesis:scan` / `genesis:plan` / `test:genesis` scripts #127 added, plus a
`test:genesis-kernel` alias; the npm lockfile re-registered the workspace
via a lockfile-only `npm install` (same 12-line shape as #127's diff).

## Purity verification (performed at recovery time)

- Zero Prisma: no `@sports/db` / `@prisma/client` anywhere (structural test
  18 also enforces this).
- Zero model calls: no fetch/network/SDK usage in the library; the planner
  test suite carries a fetch tripwire.
- Zero hidden clocks in the kernel: `generatedAt` / `repositoryCommit` are
  injected parameters (`plan-receipt.ts`, `BuildPlanReceiptInput`); the
  receipt hash excludes `generatedAt`. `Date.parse` in `hard-constraints.ts`
  is deterministic string parsing of contract/candidate data, not a clock.
- The only impure files are the two CLI shells (`scan-cli.ts`,
  `plan-cli.ts`): documented boundaries, not exported from `index.ts`, which
  source the clock/commit and inject them into the pure library. No purity
  correction to the original was required.

## Codebase Twin

The Twin contracts and implementation (`contracts.ts`, `codebase-twin.ts`,
`repo-evidence.ts`) are pure — a deterministic function over the committed
evidence table — and were recovered in full, not as types-only stubs. Note:
`repo-evidence.ts` describes repository state as of #127's session
(`main@0e56c477`); it is a committed snapshot, not a live index. Refreshing
it against current `main` is deferred work, as is any node-taxonomy
extension beyond the v0 seven-kind subset (J2 scope — v0 semantics are
preserved verbatim here).

The doc paths cited in comments (`docs/genesis/*`,
`docs/frontier/GENESIS_CONVERGENCE_MAP.md`) live on #127's branch and its
siblings, not on `main`; they are referenced as provenance strings only —
nothing here imports them.
