# Short-week road deficit — backtested, and the shipped magnitude does not survive

**Date:** 2026-09-28 · **Signal:** `packages/prediction-engine/src/signals/situational/short-week-road-deficit.ts`
· **Corpus:** nflverse `games.csv` (CC-BY 4.0), 2,622 settled NFL REG games, 2015–2024
· **Builder:** `scripts/ops/build-backtest-corpus.mjs` · **Test:** `src/backtest/short-week-road-deficit.backtest.test.ts`

## The claim under test

The signal's docstring asserts, as "Empirical Domain Characteristics":

> Road teams on 4 days rest underperform their baseline spread by an average of
> **-1.85 to -2.30 points**, while allowing a **34% increase in 4th-quarter
> explosive plays**.

The code ships a **-1.75 point** spread penalty (plus -0.65 over 1500 miles of travel, -0.50 when the opponent rested normally). The signal is registered in `signal-registry-extensions.ts` and its `spreadPointAdjustment` is emitted as the signal value, so this number is live. The total-signal spec's rule 6 requires a rule to prove itself in backtest before it touches a live projection. It had not been backtested.

## The measurement

Measured on the side playing on ≤4 days rest, graded against the **closing** spread, with a control group of every game where both teams had >4 days:

| group | n | mean vs closing spread | sd |
|---|---|---|---|
| short week (≤4 days rest) | 157 | **-0.471** | 12.206 |
| control (>4 days rest) | 2,465 | **+0.063** | 12.815 |

**Raw differential: -0.534 points. Welch t = -0.53.**

## What that means

**The effect is not statistically distinguishable from zero.** |t| = 0.53 over n=157. A closing line is a near-perfect market estimate, so a genuine 1.75-point rest edge would show up as a large t, not a sub-1 one. The shipped penalty is **3.3x** the point estimate, and the point estimate is not distinguishable from no effect at all.

**The sign is not the problem — the magnitude is not supported.** The effect points the way the docstring claims (short-week teams do underperform), so this is not "the signal is backwards." It is "the signal is roughly a third of the claimed size, and the claimed size is not real."

**The "34% increase in 4th-quarter explosive plays" claim is not testable from this corpus and was not tested.** It is recorded here as UNSUPPORTED, not as refuted. It needs a play-level source before anyone repeats it.

## Two bugs this process caught, both worth keeping

**1. A self-confirming backtest.** The first version added `spreadPointAdjustment` to the observed margin and then compared groups. That returns ~-1.77 *by construction* — the shipped constant gets added to the short-week group, so the measurement reproduces the claim no matter what the history says. It "confirmed" the -1.75 perfectly. The test now measures the **raw** margin with nothing added, and is shaped so the only way to pass is for the measurement to come out wherever it comes out.

**2. A sign error the control group exposed.** The first raw run used `margin + line`. nflverse's `spread_line` is positive when the home team is favored, so it must be subtracted. The wrong sign did not crash — it produced a control mean of **-3.483**, which is impossible for a closing line (they average ~0 by construction). The control group's only job in the test is to make that class of error visible. That is precisely why a control exists, and it is why this write-up records the mistake instead of only the final number.

## What is NOT being done, deliberately

The magnitude is **not** being changed. Lowering -1.75 to -0.53, or dropping the signal, is the same class of action as flipping a gate or weakening a floor: it changes live output on the strength of one backtest. Per law 3 and the spec's backtest-or-cut discipline, the rescale is a founder decision. This document is the evidence for it.

**The recommendation, for whoever decides:** the honest options are (a) rescale the penalty to the measured effect and widen the interval, (b) demote the signal to an unweighted logged observation, or (c) widen the corpus (play-level, more seasons) and re-measure before deciding. Option (c) is the one this evidence most supports, because n=157 with |t|=0.53 cannot distinguish "small real effect" from "no effect."

## Provenance and credit

Corpus from **nflverse/nflverse-data** `games.csv`, CC-BY 4.0. Rest days are **read** from the source's own `home_rest`/`away_rest` columns rather than derived locally. `isDivisionRivalry` is joined from nflverse's `teams_colors_logos.csv` `team_division` column — a real membership lookup, not a name-pattern guess. The backtest README pointed at a `schedules.csv` URL that now 404s (the asset was renamed to `games.csv`); this work used the URL verified to resolve on 2026-09-28.

Dropped rows are counted and printed by the builder, never silently: 1 of 2,623 for 2015–2024, missing a spread line. The corpus is intentionally **not committed** (the harness README's stated posture); the builder regenerates it.
