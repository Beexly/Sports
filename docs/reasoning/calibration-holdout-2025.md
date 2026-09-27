# The pregame context bridge has real holdout skill — and is still not publishable

Slice 10. 2026-09-27. Measurement only: this script fits nothing, changes no
product confidence, and turns no publish gate on.

Machine-readable: `data/reasoning/calibration-holdout-2025.json`.
Reproduce: `node scripts/overnight/calibration-audit.mjs`.

## Why this was worth scoring

`docs/reasoning/bridge-fit.json` already carried a Brier of `0.22374` and nothing
else. A Brier score on its own is not a claim about skill — 0.2237 is only good or
bad relative to what you would have got by predicting the base rate. The number
had never been compared against anything.

## The numbers, on the 2025 holdout

| quantity | value |
|---|---:|
| games scored | 285 (all season 2025, asserted) |
| training base rate, home win | 0.564297 (6,991 rows, 1999–2024) |
| **Brier, model** | **0.223743** |
| Brier, always predict base rate | 0.249848 |
| Brier, always predict 0.5 | 0.250000 |
| log loss | 0.636548 |
| **ECE, 10 bins** | **0.051868** |

Out-of-sample by construction: `scripts/run-bridge.mjs:48` trains only on seasons
strictly before 2025 and scores 2025 only.

## Skill, with an honest bound

| quantity | value |
|---|---:|
| Brier skill vs base rate | **+0.026190** |
| 95% bootstrap CI (10,000 paired resamples, seed 20260927) | **[+0.010734, +0.041393]** |
| P(skill > 0) | 0.9997 |

The interval excludes zero, so this is not noise. The point estimate alone would
have been a claim; the interval is the bound, and the two agree.

The bootstrap resamples **games**, paired, because the model and the base rate
are scored on the same game — the difference is far better determined than either
score alone.

## And it still may not be published, or wired

Two independent reasons, and neither is about quality:

1. **`f2 = 1`.** `pregame_context_logit` duplicates the already-LIVE
   `historical_strength` family. By the scalarizer, when f2 is the winning term
   the family is DARK. No amount of skill clears a duplicate.
2. **Policy.** `probabilityClaimsAllowed` stays `false` and the calibration page
   stays dark. The documented bar is sample ≥ 250 and ECE ≤ 0.06; this clears
   both (285 and 0.0519), which makes it *eligible* and not *published*.

There is a real temptation here worth naming. This is the first genuinely
positive holdout result of the night, it clears the documented calibration
contract, and the pull will be to treat "the numbers are good" as "the numbers
can ship". They cannot. The two gates are independent and only one of them moved.

## The broader caution

This model is a pregame team-strength context model, and the same
`marketFairProb`-into-`confidence` contamination documented in
`confidence-market-leak-2026-09-27.md` means the *confidence* surface attached to
such a model is partly an echo of the book. A clean Brier score on the
probability does not make the surrounding confidence number clean.
