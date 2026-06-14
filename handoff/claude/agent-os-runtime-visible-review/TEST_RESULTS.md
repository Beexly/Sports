# TEST RESULTS — raw evidence (2026-06-14)

## Patch presence
- `ls handoff/codex/visible-patches/` → **DIR ABSENT**
- repo-wide `find` for `*agent-os-runtime-visible.patch`, `APPLY_INSTRUCTIONS.md`, `current-working-tree.diff` → **no matches**
- `git cat-file -t 3bfc262` → **absent**; `git cat-file -t 0679aa3` → **absent**
- GitHub API `get_commit 0679aa3` → **422 No commit found for SHA**

## Required gates
- `npm run db:generate` → **OK**
- `npm run typecheck` → **green** (this session's gate30: full typecheck+lint+build+test, RAW_EXIT=0)
- `npm run test --workspace=apps/web -- jarvis-operating-runtime-cockpit.test.ts agent-os-operating-spine.test.ts agent-os-runtime.test.ts`
  → **`No test files found, exiting with code 1`** (the three files do not exist)
- `npm run build` → **green** in this repo: `✓ Generating static pages (187/187)`, RAW_EXIT=0.
  The Google-Fonts/network blocker Codex referenced **does not reproduce here** (build of the
  current tree, not of Codex's patch).

## Interpretation
Codex's "tests passed / build issues" cannot be confirmed or denied against `beexly/sports`
because none of the referenced commits, tests, or patch files are present.
