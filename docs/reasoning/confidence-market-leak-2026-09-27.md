# Finding: `marketFairProb` reaches the published `confidence` number

Slice 3, third sub-task. 2026-09-27. **This is a measurement, not a patch. No
production code was changed.**

## Verdict

**The leak is real, confirmed, and quantified.** The prompt's hypothesis was a
hypothesis; it is now a measured fact with a size attached.

Published `confidence` moves **7 points** when a market probability changes and
nothing about the recommended bet changes at all.

## What the code says about itself

`packages/prediction-engine/src/scoring.ts:1219`:

> "Heuristic confidence stays as the market-echo composite for UX continuity."

So this is **by design and documented in the source**, not an accidental
regression. That changes the remediation conversation entirely: this is not a bug
to hotfix, it is a labelling problem. A number that is partly the book is being
presented to users as confidence.

## Two independent channels

`pick-proof-receipt.ts` does not compute confidence — it commits whatever the
scorer hands it (`:124`, `:184`). Contamination enters upstream at scoring.

**Channel 1 — the spread-side de-vigged market probability.**
`scoring.ts:510-521` computes `fairProb = removeVig(homeImpliedAvg, awayImpliedAvg)`.
That is the same quantity the receipt commits as `marketFairProb`. It flows into
`computeEdgeScore` (`scoring.ts:532`, body `:310-344`) and is added into the
confidence sum at `scoring.ts:580-588`.

**Channel 2 — the H2H moneyline market.**
`scoring.ts:540-547` computes `mlFairProbHome = removeVig(avgH, avgA)` and passes
it to `computeCrossMarketScore` (`game-context.ts:698`, body `:451-490`), which
returns ±`CROSS_MARKET_AGREE_BONUS` (4) / `CROSS_MARKET_DISAGREE_PENALTY` (3)
(`constants.ts:79,81`). That score is added into the same sum at `scoring.ts:573`
and `:584`.

The same sum is reused at `scoring.ts:933` (TOTAL) and `scoring.ts:1231`
(SPREAD/independent). Write-back to the receipt happens at
`process-sport.ts:1246`, `:1459`, mint at `:1538`.

There is a third-order path too: `computeUncertaintyPenalty` consumes
`crossMarketScore` (`game-context.ts:597`).

## The measurement

`packages/prediction-engine/src/__tests__/confidence-market-independence.test.ts`
holds the entry price, the line, the book count, the teams, and the selection
**identical**, and varies only a market probability.

| channel | market probability | confidence | bet |
|---|---|---|---|
| 1 | `marketFairProb` 0.5000 → 0.3957 | **57 → 50** | byte-identical |
| 2 | H2H agrees → opposes | **61 → 54** | byte-identical |

Because the de-vig is proportional, symmetric repricing barely moves the edge
term — you must move the **opposing** side's price to move `marketFairProb` at a
fixed entry price. That is the isolation the fixture uses, and the fixture guards
itself against passing vacuously.

`Tests 4 passed (4)`.

## Why three of the four tests are `it.fails`

The three invariance assertions are real and currently fail. Committing them as
ordinary `it()` would leave the branch permanently red, which is how a suite
teaches people to ignore red.

`it.fails` asserts the **current, leaky** behaviour. The suite stays green while
the leak stands, and flips **red the moment someone fixes it** — that red is the
signal to delete the guards. Nothing is deleted in the meantime; the invariant
stays written down and machine-checked.

The fourth test is a plain passing `it()` that pins the magnitude
(`>= 5` points). If it ever fails, the leak was repaired.

## Calibration page: dark, and confirmed dark

`apps/web/app/calibration/page.tsx` ("The Proof Room", a live route) renders
buckets via `loadPublicCalibrationReport` (`apps/web/lib/calibration/report.ts:89`),
which withholds everything unless `resolveEffectivePerformanceGate()
.canExposePerformanceStats` (`:94`).

That gate is **fail-closed on every path**: stub mode `false`
(`effective-performance-gate.ts:24`), load error `false` (`:55`), reading
`PERFORMANCE_STATS_ENABLED` with default `false`
(`platform-config.ts:168`). `.env.example:315` ships
`PERFORMANCE_STATS_ENABLED="false"`; `CALIBRATION_PUBLISHED` is commented out
(`:514`).

**Live production value: `NOT_EVALUATED`** — no `.env` exists in this worktree and
the gate resolves against a database this session must not reach. Named missing
env var: `PERFORMANCE_STATS_ENABLED`.

Nothing was enabled. No win-rate, ROI, or units figure was created.

## What this means for a product surface

Any analysis of "does high confidence win more?" is, for this number, partly
measuring the book. That is a direct restatement of the standing prohibition on
publishing a bucket table of public win rates — and it is now demonstrated in
code rather than merely suspected. The calibration page staying dark is not a
formality; it is the only thing standing between this and a published claim that
the market has already made.

## Not done, deliberately

The production scorer was **not** patched. Removing the two market channels
changes what every downstream surface shows, is a product decision rather than an
overnight measurement, and `scoring.ts` is a shared hot path that the parallel
session also reads. This slice measures. It does not decide.
