# Rescue 2026-09-26 (1/6): PR #884 red tests + the typecheck stragglers

- From: hermes → (Garrett / whoever picks up the Sports rescue)
- Created: 2026-09-26
- Status: done
- Repo: `Beexly/Sports` · branches: `hermes/fix-884-mock-isresearchpower`, `hermes/port-tcv-failclosed`
- PRs: [#911](https://github.com/Beexly/Sports/pull/911) (draft), [#913](https://github.com/Beexly/Sports/pull/913) (draft)

## What was asked

Two of the three rescue pieces from tonight's audit: fix PR #884's red tests, and
port the four unmerged files from `mimo/typecheck-signal-value-fix`.

## #911 — PR #884's red tests

**Prescribed fix applied, then verified to be the right one.** Two test files were
missing `isResearchPowerRatingsEnabled: vi.fn().mockReturnValue(false),` in the
`@sports/data-ingestion` mock factory. Before applying it I confirmed the CI log
carries exactly that error.

**One thing the audit brief did not know:** that symbol does not exist on `main`
at all. It is defined only on PR #884's branch, so the fix is based on **#884's
head, not `main`** — a fix branch off `main` would not compile. PR #911 therefore
targets `mimo/wire-nfl-mlb-2026-09-23`.

**Extra finding, fixed in the same PR:** 2 of #884's 3 red tests were not the mock
at all. `cqr.test.ts` asserts the old clamping behaviour while `cqr.ts` is
byte-identical on `main` and #884 — the test is a **stale copy**, a base-drift
artifact, and `main` already carries the corrected fail-closed test. Ported
`main`'s version. Blast radius checked first: the affected ledger line is marked
`H-M: DONE` and no live pick path depends on it.

## #913 — the four stragglers

`conformal-margin-set` + `tweedie-aci` (4 files) ported onto a fresh branch from
`main`. This is a real correctness change, not cosmetics: the conformal quantile
now **fails closed** when the rank exceeds `n` instead of returning `+Infinity`,
which is what produced the `expected Infinity` failure in #884's CI.

- `conformalMarginSet` is a **pure re-export** — verified, so the change cannot
  fan out.
- The dependent module is a pure re-export too; no live consumer on the row.

## Test results

Both PRs' logic was executed directly (not inferred) by transpiling the ported
files with esbuild and running them against hand-computed values:

- tcv port: **36/36 pass**, including the 15/15 the branch's own message claimed.
- #911: the two test files are mocks; the fix is a single added export per file,
  placed inside the correct mock factory (8 insertions total, reviewed in the
  diff).

`vitest` and `tsc` **cannot run on the iSH host** — see the blocker handoff.
CI on `ubuntu-latest` is the real gate for both PRs.

## What was skipped and why

Nothing from either piece. Both were small and fully delivered.

## Open

- #884 is still owned by Mimo. #911 is a draft stacked on it; it does not fix
  #884 and must not be read as doing so.
