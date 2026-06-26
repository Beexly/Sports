# Prediction Court

**Module:** `packages/decision-field-runtime/src/prediction-court.ts`
**Surface:** Prediction Trial tab of `/matches/preview/*` and the offline Event Genome page
**Status:** fixture-only. **No fixture trial is ever a public performance claim.**

## What it is

Every prediction is put on trial, and the verdict has two independent axes: **process** (was the call
sound given what was knowable?) and **outcome** (what actually happened?). A tips site reports its
wins. GSE reports whether a win was *deserved* or *lucky*, and whether a loss was *unlucky* or *fair* —
because only process is repeatable.

## The two grades

`gradePrediction(input)` → `PredictionTrial` with:

- **`processGrade`** ∈ `GOOD_PROCESS | THIN_EVIDENCE | BAD_PRICE | WRONG_READ | OVERFIT_TREND |
  DATA_MISSING | AUTHORITY_TOO_STRONG`.
- **`outcomeGrade`** ∈ `DESERVED_WIN | LUCKY_WIN | UNLUCKY_LOSS | FAIR_LOSS | PUSH | PENDING`.
- **`clv`** — closing-line value from decimal odds (positive if we beat the close), `null` if either
  price is missing (never imputed).
- **`authorityRespected`** — `false` if the claim's strength exceeded its authority ceiling. An
  over-strong claim fails on process *regardless of the result* (`AUTHORITY_TOO_STRONG`).
- `whatChanged`, `autopsy`, `lesson`, `memoryWrite`, and the hard flag
  `countsAsPublicPerformance: false`.

## Hard rules

- **A push is never a win.** `PUSH` is its own outcome.
- **Missing odds → `DATA_MISSING`**, never an imputed price.
- **One result never upgrades authority.** A single win does not promote a model or open a gate.
- **`publicPerformanceStatus(trials)`** returns `isPublicPerformanceClaim: false` for any fixture set —
  the public performance gate is opened only by settled, audited, calibrated live history elsewhere.

## The deliberate over-claim fixture

`p-eg-overclaim` (Ecuador match) claims `PUBLIC_ACTION` against an `INFO_ONLY` ceiling and *wins*. The
court grades it `AUTHORITY_TOO_STRONG` / `LUCKY_WIN` — proving the system punishes the process even
when the outcome flatters it.

## Tests

`__tests__/prediction-court.test.ts`: process ≠ outcome, push ≠ win, one result never upgrades
authority, missing odds not imputed, no fixture trial is a public performance, over-claim is caught.
