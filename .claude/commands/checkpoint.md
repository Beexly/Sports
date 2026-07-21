---
description: Save and verify workflow state — create/list/verify checkpoints across development phases
---

Manage workflow checkpoints to track progress and enable safe recovery.

Usage: `/checkpoint [create <name>] [verify <name>] [list] [clear]`

## create <name>

1. Run `npm run typecheck && npm run test` — record pass/fail + test count
2. Run `git stash` (if uncommitted changes) or `git commit -m "checkpoint: <name>"`
3. Record to `.claude/checkpoints.log`:
   ```
   <ISO-timestamp> | <name> | <git-sha> | tests: <N>/<N> | typecheck: OK
   ```
4. Output: `Checkpoint '<name>' saved at <sha>`

## verify <name>

Compare current state to named checkpoint:
- Files added since checkpoint (via `git diff <sha>..HEAD --name-only`)
- Files modified since checkpoint
- Test count now vs checkpoint (`npm run test -- --reporter=verbose 2>&1 | tail -5`)
- TypeScript error count now vs checkpoint

Output a diff table showing what changed.

## list

Display all entries in `.claude/checkpoints.log` as a table:
```
NAME             | TIMESTAMP           | SHA     | TESTS   | STATUS
feature-start    | 2026-07-21T10:00:00 | abc1234 | 10281/0 | ✓ passed
post-type-fix    | 2026-07-21T11:30:00 | def5678 | 10283/0 | ✓ passed
```

## clear

Keep last 5 checkpoints, remove older entries from `.claude/checkpoints.log`.

## Recommended workflow for GSN features

```
/checkpoint create feature-start       # before any changes
/checkpoint create schema-done         # after Prisma migration
/checkpoint create impl-done           # after core implementation
/checkpoint create tests-done          # after tests written
/checkpoint verify feature-start       # confirm scope of changes
```

## Recovery

If tests fail after a change:
1. Run `/checkpoint list` to find last known-good SHA
2. Run `git diff <sha>..HEAD` to see what changed
3. Run `git stash` to park current work
4. Fix the regression, then `git stash pop`
