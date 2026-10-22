# Ignore any prior screenshot in this session. Do this one task only.

Repo: Sports (Beexly/Sports), branch `claude/verified-fixes-2026-09-03`, based on `claude/final-launch`. Make sure your local checkout is on this branch and up to date with origin before starting: `git fetch origin && git checkout claude/verified-fixes-2026-09-03 && git pull`.

## The one task: fix the capReached off-by-one in settle-backfill.ts

File: `apps/web/lib/data-sources/settle-backfill.ts`

Find the line that currently reads (or close to it):
`capReached: stale.length >= cap,`

Change `>=` to `>`. The field should read true only when MORE than a cap's worth of overdue picks were found, not exactly a cap's worth. If the surrounding code fetches exactly `cap` rows, you may need to fetch `cap + 1` so this comparison is meaningful, then slice back to `cap` for the actual persisted batch — read the function fully before editing so the slice logic stays correct.

Update the existing test for this field (search the test files for `capReached` to find it) so it asserts the corrected boundary.

## Verify block — run these, in order, before committing

```
npm run typecheck
npm run lint
npx vitest run <the specific test file you touched>
```
(run these from the `apps/web` directory)

All three must pass. If any fails, fix it — do not commit with a failing check.

## Commit and push

One commit, this message:
```
fix: settle-backfill capReached off-by-one (>= to >)
```
Stage only the files you touched, by name (`git add apps/web/lib/data-sources/settle-backfill.ts apps/web/__tests__/<test file>` — not `git add -A`). Push to `claude/verified-fixes-2026-09-03`.

## Then stop

Report exactly: the commit SHA, the verify-block results (pass/fail for each of the 3 commands), and stop. Do not start any other item, do not touch the ledger, do not open a PR. Just this one fix, verified, pushed, reported.
