# The apps/web Surface Suite Has 10 Pre-Existing Failures — and Two Are Live Leaks

**Branch:** `audit/reconciliation-2026-10-20`
**Date:** 2026-10-21
**Measured:** 157 of the 959 `apps/web/__tests__` test files (those matching
surface / fence / gate / calibration / trust / ngs / picks / honesty / proof / board), run
in isolation.

```
Test Files  10 failed | 146 passed | 1 skipped (157)
Tests       15 failed | 1465 passed | 3 skipped (1483)
```

**All ten are PRE-EXISTING.** None of the failing test files, and none of the source files
they read, appear in this audit's diff. The working tree is clean: everything this audit
produced is committed, and the only source files it touched are the trust gate, the three
mutation sweeps' `LOCK` constant, and the NGS public-exposure test.

**A correction to the number I reported earlier.** A worker reported "17367 total; 17101
passed; 168 failed" for the whole 957-file `apps/web` suite. That figure is for the FULL
suite, which includes timeouts and unrelated failures, and the full suite also crashes under
concurrent load (a vitest worker exit). The figure above is the reproducible, isolated
measurement of the surface/fence/gate subset — which is the subset this audit actually
touched.

---

## 1. The census

| file | failing assertion | class | state |
|---|---|---|---|
| `b2b-v1-scope-field-gate.test.ts` | a PREMIUM-scope key still gets pModel | behavioural | open |
| `compliance-scanner-payments-surfaces.test.ts` | pricing copy still contains underwriting tokens | behavioural | open |
| ~~`fictional-data-honesty.test.ts`~~ | `intelligence/page.tsx` in LABELED_SURFACES but gone; `fantasy/dfs` no longer renders fiction | deleted file / stale entry | **FIXED** |
| `in-play-exclusion-surface.test.tsx` | 3 failures: undefined element, missing `data-testid` | behavioural | open |
| ~~`internal-surface-fence.test.ts`~~ | ENOENT on `app/intelligence/metrics/page.tsx` | **deleted file** | **FIXED** |
| `picks-mobile-tap-targets.test.ts` | the pricing upgrade CTA lost its tap-target classes | behavioural | open |
| `picks-paywall-copy-truth.test.ts` | 3 failures: the entitlement filter, the daily cap, the confidence gate | behavioural | open |
| `public-picks-gate-parity.test.ts` | **2 failures: `/api/picks` is NOT dark when `PUBLIC_PICKS_ENABLED` is off** | **LIVE LEAK** | open |
| `public-surface-local-time.test.tsx` | the Central stamp is `America/Chicago`, not `UTC` | behavioural | open |
| `td-board.test.tsx` | an unlicensed pool is not labelled fictional | behavioural | open |

## 1a. The two fixed here

**`internal-surface-fence`** read `app/intelligence/metrics/page.tsx`, which no longer
exists -- removed without the registry being updated, and failing ever since. The fix
asserts the STRONGER property: a fenced page must either be present and call its own
gate, or be absent entirely. A page that does not exist cannot render, cannot be linked
to, and cannot leak -- a STRONGER form of dark than "exists and calls `notFound()`". What
must never happen is a page that exists and is UNGATED, and that is exactly the
regression the test was written to catch.

**`fictional-data-honesty`** walked the `LABELED_SURFACES` allow-list and required every
entry to still exist and still carry its disclosure. Two entries failed, for TWO different
reasons:

1. `intelligence/page.tsx` -- the page was DELETED. The allow-list was protecting a page
   that cannot render.
2. `fantasy/dfs/page.tsx` -- the page exists and once rendered the `DFS_SLATE` fixture.
   **The fixture fallback was REMOVED** and the page now reads live per-game production
   via `loadCurrentDfsSlate()`. But the fixture identifier survives in a HISTORICAL COMMENT
   explaining the removal, so the fiction predicate still fired on a page that no longer
   renders fiction. The fix: a disclosure is required only while the page actually renders
   fiction, with the predicate applied to the comment-stripped source.

**The general lesson.** A guard written from a keyword list reports the wrong pages. The
repo's own comment on this guard says it already: "a guard written from a keyword list
reports the honest pages and misses the dishonest ones, and the team learns to ignore it."
This failure is the MIRROR IMAGE: it reports the pages that have become honest.

**A STALE ENTRY IS STILL SURFACED, NOT SWALLOWED** -- the list of allow-list entries whose
page is gone or no longer renders fiction is reported on the console, so the allow-list
can be pruned deliberately rather than by accident.

## 2. The one that matters

### 2a. `public-picks-gate-parity` — the public picks board does NOT go dark

```
x BOTH endpoints go dark when PUBLIC_PICKS_ENABLED is off
  AssertionError: /api/picks must be dark: expected 200 to be 503
x the dark slate response leaks no board shape
  AssertionError: expected '{"success":true,"data":{"date":"2026-…' not to contain 'totalPicks'
```

**This is the same surface as the T15 NGS leak.** `/api/picks` returns **200 with a full
board payload** when `PUBLIC_PICKS_ENABLED` is off, and the payload contains `totalPicks`.
The gate is supposed to return **503** and a dark shape.

Combined with the T15 worker's finding — that `/api/picks` reaches `db.nextGenStat` through
the intelligence bundle and renders NGS prose (`CPOE +8.4, sep 3.90y, YAC+ +1.10`) into
`intelligence.why[]` for a possibly-anonymous caller, with `PUBLIC_PICKS_ENABLED` defaulting
**on** — the picture is:

- the public picks board is **not** gated by `PUBLIC_PICKS_ENABLED` on the `/api/picks`
  endpoint, and
- that same endpoint is the one that leaks NGS metric names and values.

**These two findings are the same finding.** The gate that would close the NGS leak is the
one that is not working.

**Not fixed here, and it is not a small fix.** The parity test asserts behaviour for BOTH
`/api/picks` and `/api/picks/daily-slate`, and the failure is in the endpoint's own gating
logic. Changing it means changing a live public endpoint's behaviour, and the test has been
red long enough that nobody is certain the current behaviour is the intended one — the
alternative is that the endpoint was deliberately changed and the test was not updated.
**That is a question for the owner, and it is recorded here rather than guessed at.**

### 2b. The two "deleted file" failures

`fictional-data-honesty` reads `app/intelligence/page.tsx` and `internal-surface-fence`
reads `app/intelligence/metrics/page.tsx` — **both files no longer exist**, and the tests
throw ENOENT. These are the same class as the `ngs-public-exposure` failure this audit
already fixed: a test that asserts on a source file the same change deleted.

The fix pattern is the one already applied: assert the STRONGER property (the surface is
gone, or is gated) rather than reading a file that is not there.

**The `internal-surface-fence` one matters more than it looks.** Its assertion is "every
fenced page calls its own gate before rendering" — a test that the repo's own fence
architecture depends on. It cannot run, because a page it enumerates has been deleted and
the enumeration was not updated.

## 3. What this does and does not change

**It does not change what this audit delivered.** Every probe T1–T16 is landed and pinned;
the prediction-engine suite is 8,571 passed / 0 failed; tsc is at its 64-error baseline; the
threshold auditor and the class-A guard both exit 0; the trust gate exits 0 over 3,740 files.

**It adds two things to the record.**

1. **A measured, reproducible census** of the surface-suite failures, with the two
   "deleted file" ones FIXED (not just identified), and the `/api/picks` gate failure
   identified as the SAME defect as the T15 NGS leak.
2. **A confirmation that the "file exists" failure mode is repo-wide, not local.** Four
   separate tests in this repo read a source file that a later change deleted:
   `ngs-public-exposure` (fixed here), `fictional-data-honesty`, `internal-surface-fence`,
   and — in the guardrail layer — `trust-gate` (fixed here). **Three of the four were born
   failing** and none was observed, because `apps/web`'s suite is not run in the same way CI
   runs the prediction-engine suite, and the `node:test` guardrails are not run at all.

**That is the eighth instance of the same pattern in this audit**, and it is now visible as a
count rather than an anecdote: a file that exists treated as a thing that works; a test that
exists treated as a thing that runs.

## 4. The recommendation

The two fixes that are unambiguous and mechanical — the two "deleted file" assertions — can
be made the same way the NGS one was, and are worth doing. The `/api/picks` gate is a
**behavioural change to a live public endpoint** and is not this audit's to make: it needs
the owner's decision on whether the endpoint should be dark, and the NGS prose on it is
consequently a decision too.
