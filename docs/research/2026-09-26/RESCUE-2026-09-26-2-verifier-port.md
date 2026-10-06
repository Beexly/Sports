# Rescue 2026-09-26 (2/6): the verifier + factor-foundry port (PR #914)

- From: hermes → (Garrett / Mimo)
- Created: 2026-09-26
- Status: done
- Repo: `Beexly/Sports` · branch: `hermes/port-verifier-harness` (based on `main` @ `6fd546dbd`)
- PR: [#914](https://github.com/Beexly/Sports/pull/914) (draft, 89 files, +18,112)

## What landed

The one coherent, self-contained unit of `mimo/docs-cleanup-calib-2026-09-21`:
`packages/verifier` (frozen-holdout scorecard / duel / joint / fact-graph), the
28 `docs/factors` specs, and the `scripts/factors` foundry with its runners and
gate.

The branch point is ~406 commits behind `main`, so the port takes **additions and
real modifications only**. The apparent "deletions" in the branch diff are files
`main` gained after the branch point, not deliberate removals — verified before
porting.

The package's only runtime dependency is `@sports/data-ingestion`, and all 7
symbols it imports already exist and are exported on `main`, so it drops in
without touching another package.

## Test results — the strongest evidence in this whole rescue

`vitest` cannot run on this host (see blocker handoff), so instead of trusting a
rewritten harness I made **the branch's own pinned tests runnable**: a ~200-line
vitest shim (`describe`/`it`/`expect`, asymmetric matchers, `.rejects`, hooks)
plus an esbuild pass producing a runnable mirror of the package with the real
fixtures and the real `@sports/data-ingestion` sources.

```
duel 7 · factgraph 15 · holdout 14 · joint 8 · nflverse-releases 21
scorecard 10 · stats-pins 28 · v530 5
────────────────────────────────────
108 passed, 0 failed
```

That is the package's own suite — including the 28 hand-computed statistics pins
and the live nflverse release loader — not a harness I wrote to agree with
itself. Two earlier attempts at a hand-written harness produced 3 "failures" that
were **my expectations being wrong, not the code**: `logLossOf`'s label handling,
and a Wilson boundary that is a documented IEEE754 artifact (see below).

`node --test scripts/factors/index.test.mjs`: **16/16** (after the gate fix below).

## Two judgment calls

**1. `fix(factors)`: the pre-registration gate was HEAD-scoped, which made a
faithful port look like fraud.** `killLineCommitDate` ran `git log -- <yaml>` on
the current branch, so it reported when the spec arrived *here* — always today,
always newer than the spec's recorded `run_sha`. All 20 scored specs were refused
with "pre-registration violated" even though each kill line was committed before
its run on the branch where the run happened. The fix searches **all refs** and
still takes the *earliest* qualifying commit, so a kill line genuinely written
after its run is still refused (that test still refuses, and now passes). It is
isolated in its own commit because it is a governance mechanism.

Note for whoever runs the gate: it needs a **full clone**. `git log --all` and
`git show <run_sha>` both come up empty under fetch-depth 1, and the gate then
refuses rather than passing silently.

**2. `wilsonInterval(10,10).high === 0.9999999999999999`, left as-is.** Math
correct, computed a ULP short; `clamp01` cannot round it up. Consequence: a
`rate <= high` containment check **fails at k = n**. The package's own pin
documents the artifact and asserts `> 0.999`, so pinned statistics were not
silently changed — but callers need a tolerance there. This is now **proven and
measured** rather than merely tolerated: see the papers handoff (#916), where
`wilsonBoundaryAudit` shows exact containment holding while float containment
fails, and `wilsonExact` returns exactly 1 in BigInt rationals.

## Deliberately not ported

`run_sha` values in the specs still point at Mimo's original commits. They were
**not** re-anchored: rewriting them would falsify run provenance, and the whole
point of a pre-registration gate is that it is inconvenient.

## CI note

`Test, type-check, lint, Prisma` is red on #914 — and it is **red on `main` too**,
both at this branch's base commit and at current `main`. The annotations are
pre-existing typecheck errors in `@sports/prediction-engine` and elsewhere
(`MarketPrice` and `PlayerRoleContext` not exported, a nullability error, a
`certificate` property that does not exist). None of them are in files this PR
touches. Do not read #914's red as its own breakage.
