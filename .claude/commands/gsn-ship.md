---
description: Verify and ship staged work — typecheck/lint/test/smoke, then commit + push if green
argument-hint: Optional commit message override
---

You are running `/gsn-ship`. Work is assumed staged. Argument (if any): $ARGUMENTS

Steps — execute in order, do not skip:

1. **Verify staged scope.** `git status --short`. If nothing staged, abort with a one-line message.
2. **Typecheck.** Run the repo's typecheck script (`npm run typecheck` or `pnpm typecheck` — match the repo). Fail loudly on errors.
3. **Lint.** Same pattern, lint script. Treat warnings as warnings, errors as blockers.
4. **Test.** Run the test suite. If a test fails, **stop** — do not commit. Fix the smallest blocker, re-run from step 2.
5. **Smoke.** For any touched route or worker, manually exercise the happy path once. For AI features, run one real prompt and persist the I/O to `_logs/samples/{n}.json`.
6. **Commit.** Conventional Commits format. Atomic. Cookbook reference in the body if the change touches AI code.
7. **CHANGELOG.** Append one line to `_logs/CHANGELOG.md`.
8. **DECISIONS.** If the change embedded a non-obvious tradeoff, append an entry to `_logs/DECISIONS.md`.
9. **Push.** `git push -u origin <current-branch>`. Retry on network error per global instructions.

Don't open a PR unless Garrett explicitly asked for one.

If any §14 STOP condition triggers mid-flow (destructive migration, paid service, etc.) — abort the ship, surface the gate, and wait.
