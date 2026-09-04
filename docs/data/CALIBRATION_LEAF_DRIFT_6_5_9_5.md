# The 6.5–9.5 calibration leaf is not noise

Hermes flagged this in H-N6 and left it without an owner or an explanation. This
characterises it. **No behaviour is changed by this document** — no gate flipped,
no `MODEL_VERSION` bump, no calibration constant touched.

## Source

`docs/data/MARKET_CALIBRATION_2026-09-04-reproduction.txt`, lines 43–51 —
variable-based calibration, train on seasons ≤ 2015, evaluate 2016–2025. Each
leaf's training-period base rate is compared against what actually happened in
the test period.

## The finding

Every leaf sits inside sampling noise except one, and that one misses by four and
a half standard errors.

| leaf | n (test) | train base | test actual | Δ (pp) | z | p (2-sided) |
|---|---:|---:|---:|---:|---:|---:|
| PK-1 | 188 | 46.81% | 46.81% | +0.00 | 0.00 | 1.00 |
| 1.5–2.5 | 447 | 50.94% | 50.11% | −0.83 | −0.35 | 0.73 |
| 3–6 | 1196 | 50.00% | 52.01% | +2.01 | +1.39 | 0.16 |
| **6.5–9.5** | **576** | **65.86%** | **57.12%** | **−8.74** | **−4.42** | **9.7e−06** |
| 10+ | 343 | 74.43% | 72.89% | −1.54 | −0.65 | 0.51 |

`z` is against the training base rate with `SE = sqrt(p(1−p)/n)`.

**It survives multiple-comparison correction.** Bonferroni across the five
leaves: p = 4.9e−05. This is not the one-in-twenty you expect from testing five
things. Every other leaf has |z| ≤ 1.39.

So: **"it may be noise" is answered. It is not noise.**

## What it is not

The obvious mechanism — a league-wide decline in home-field advantage — does not
fit. The leaves are home-win rates by spread band, so an across-the-board HFA
decay should push every home-favourite band down together and roughly in
proportion. It doesn't:

- 6.5–9.5 (home favourite): **−8.74pp**
- 10+ (home favourite, stronger): −1.54pp
- 3–6: **+2.01pp**, the wrong direction entirely

A smooth, monotone cause would not move one interior band by 8.74 points while
its neighbour on one side rises and its neighbour on the other side barely
moves. Whatever this is, it is **local to the 6.5–9.5 band**, and the mechanism
is genuinely unexplained. I am not going to invent one.

## Why it matters

That leaf's Brier is **0.2526** — worse than the global single-mean baseline
(0.2478) and worse than the 0.25 coin-flip line. It is the only leaf that is
actively worse than doing nothing.

The leaf model still wins overall (weighted leaf Brier 0.2440 vs 0.2478 global),
but it wins **despite** this leaf, not because of it. A calibration prior of
65.86% applied to a band that delivers 57.12% is a systematic over-prediction of
home wins, applied confidently, on 576 games.

## Recommendation (not applied)

Until the mechanism is understood, the 6.5–9.5 leaf should not be used as a
calibration prior — collapse it into a neighbouring band or fall back to the
global mean for that range. That is a calibration-behaviour change gated by
`CALIBRATION_ADJUSTMENTS_ENABLED` and the model-freeze guard, so it is the
owner's call and an owner's edit, not an agent's.

## What would explain it

Testable next steps, in order of cheapness:

1. **Split the band.** 6.5, 7, 7.5, 8, 8.5, 9, 9.5 are not one thing. The key
   number 7 (a touchdown) behaves differently from 8.5. If the drift concentrates
   on one or two hooks, that is the finding.
2. **Split by season.** Is it a step change (a rule change, 2020 empty stadiums)
   or a gradual slope? A step at 2020 with recovery afterwards is a different
   story from a monotone decline.
3. **Check the train side's n.** The z above treats the 65.86% training base as
   fixed. If the training band is thin, some of the gap is estimation error in
   the prior rather than drift in the outcome. A two-proportion test needs the
   training count, which this reproduction file does not print.

Step 3 is the honest caveat on the headline number: z = −4.42 is an upper bound
on the significance, because it ignores uncertainty in the training estimate. It
would take a very small training sample to pull p = 9.7e−06 back across any
reasonable threshold, but the exact figure is not established until that count
is in hand.
