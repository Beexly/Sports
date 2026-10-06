# Rescue 2026-09-26 (4/6): the xfp research record + a guard (PR #917)

- From: hermes → (Garrett / Mimo)
- Created: 2026-09-26
- Status: done
- Repo: `Beexly/Sports` · branch: `hermes/port-xfp-research`
- PR: [#917](https://github.com/Beexly/Sports/pull/917) (draft, 18 files + guard + CI step)

## What landed

Everything on `mimo/mimo-xfp-2026-09-18` that is not already in #914. The
branch's verifier + foundry core is byte-identical to the docs-cleanup branch's
and lands in #914; this is what makes the xfp branch its own port.

**Why a negative result is worth keeping:** Unit 1 is a pre-registered **FAIL** —
xFP/FPOE does not beat naive last-week fantasy points for next-week rank
prediction on holdout 2020–2025 (n=6022, Δrho = -0.0165, season-week bootstrap CI
[-0.0396, 0.0086]). The RESULT says it plainly: "a complete, publishable negative
result … worth more than a fitted claim we cannot support." Unit 2 is
**INCONCLUSIVE** (point estimate +0.0350, CI covers zero) and Unit 3 is
**BLOCKED** with the reason written down. Those three states are the most
expensive things in this repo to produce and the easiest to quietly delete or
upgrade.

**Path kept as-is on purpose.** `main` keeps research under `docs/research/`, so
this looks like it belongs at `docs/research/2026-09-18-mimo-xfp/`. It does not:
every RESULT doc cites its own artifact as
`scripts/research/mimo-xfp/results/unit1_holdout.json`, and re-rooting a
pre-registered record means editing the evidence. `main` has no
`scripts/research/` today; this adds the directory rather than rewriting
citations.

## Test results

The new part is the **guard**: `verify-record.test.mjs`, 12 tests.

```
node --test scripts/research/mimo-xfp/verify-record.test.mjs  →  12 passed, 0 failed
```

- every number the RESULTs present as "measured output, not estimated" must exist
  in the JSON the run wrote (compared as floats — the docs print 6 dp, the
  artifacts store full precision)
- each verdict must follow from the pre-registered kill line: unit 1 FAIL because
  Δrho < 0 with a CI covering zero; unit 2 INCONCLUSIVE because the point estimate
  is positive and the CI still covers zero — asserted from **both** the artifact
  flag and the prose, so flipping either alone fails
- the bootstrap must stay clustered on season-week (2000 reps), never downgraded
- holdout seasons must stay strictly after the training seasons (leak check)
- unit 3 must stay BLOCKED and still owe a written reason
- artifact shapes pinned: 18,150 × 7 air-yards sample, two 20 × 8 fPOE tails, a
  per-position rate table whose QB/RB target coefficients must differ, and the
  nflverse / FTN attribution

Also: all four Python files compile (`py_compile`); all six artifacts parse. CI
gains one step in the existing `Test, type-check, lint, Prisma` job, next to the
Vercel skip-gate test that already uses that pattern.

## Honesty note

The RESULTs were measured on a Windows worktree on **2026-09-18** and were **not
re-run** here — re-running needs the nflverse/FTN pulls and would reproduce a
2026-09-18 measurement, not a fresh one. What is verified is that the prose
matches the artifacts that were written and that the verdicts follow from the
pre-registered kill lines. That is the guard's job and no more.

## Open for a human

Keeping a negative result at all is a judgment worth confirming, and
`verify-record.test.mjs` is the thing to review if you want to trust the guard.
