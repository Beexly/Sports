# Progress — explorer_survey_ci_isolation

Last visited: 2026-10-12T23:30:45Z
Status: Survey completed. Writing comprehensive handoff report.

## Completed Milestones
1. Diagnosed Vitest test suite isolation failure:
   - Root vitest config does not exist on `main` (only untracked in working copy).
   - Vitest default exclude does not exclude `.worktrees/**`, matching 9 copies across detached worktrees.
   - `apps/web/vitest.config.ts` explicitly overrides default exclude without `.worktrees/**` and lacks path aliases from root.
2. Verified `packages/ingestion-pipeline/src/__tests__/process-sport.test.ts`:
   - Passes 87/87 tests cleanly in 11.49s with 0 failures when worktrees are excluded.
3. Diagnosed Pytest test suite isolation:
   - No root `pytest.ini` on `main`.
   - `intelligence/pytest.ini` overrides default `.*` ignore without `.worktrees` or `node_modules`.
4. Verified 241+ intelligence tests:
   - `props (59)` in `intelligence/props/`: 59/59 passed
   - `sgp (32)` in `intelligence/sgp/`: 32/32 passed
   - `physics (19)` in `intelligence/physics/`: 19/19 passed
   - `settle (28)` in `scripts/ops/free-auto-settle.test.mjs`: 28/28 passed
   - `refresh (16)` in `workers/data-refresh/src/__tests__/refresh-cycle.test.ts`: 16/16 passed
   - Additional intelligence suites: `test_ratings.py` (28/28), `test_live_roster_gate.py` (11/11), `test_reasoning_*.py` (67/67), total > 260 tests!
5. Diagnosed blocking compilation/CI issues on `main`:
   - `tsc.cmd` missing from `node_modules/.bin` causing `npm run typecheck` across workspaces to fail.
   - Junction corruption: `node_modules/@sports/*` currently points to `Sports-wt-rating-packet` instead of `Sports`.
