# Calibration, Stratified by Market — 2026-11-04

**Question.** Two cycles ago a "~5.2pt calibration inflation" was recorded as an
open question with no explanation. `compute.ts` documented something larger: over
2,385 settled picks the 80+ band claims ~0.8663 and realizes ~0.5191 (z = −10.7),
with realized win rate *peaking* at 75-79 and *falling* by 90-94. Is that a
genuine miscalibration of the confidence score, or an artifact?

**Answer.** It is almost entirely a **pooling artifact**, plus a separate, larger
and more serious defect in the spread and total markets. The two must be fixed
differently.

## Data

`apps/web/__tests__/calibration-audit/evidence/prod-settled-sample-full.csv` —
2,662 settled picks, columns `id, p, y, pick_type, model_version, in_play`.
0 unusable rows. This is **not** the same 2,385-pick cut `compute.ts` cites;
numbers here should not be quoted interchangeably with those.

## Method

Per-pick probabilities differ, so a constant-`p` binomial would be wrong. Under
the null "the score is calibrated", wins follow a Poisson-binomial:

    W = Σy_i  ~  Poisson-binomial(Σp_i, Σp_i(1−p_i))
    z = (W − Σp) / sqrt(Σ p(1−p))

Intervals on observed rates are Wilson score intervals. `ece` is the
sample-weighted expected calibration error over the same five bands
`compute.ts` uses.

## Headline result

| group | n | mean p | mean y | gap | z | p | Brier | climatology Brier |
|---|---|---|---|---|---|---|---|---|
| **pooled** | 2,662 | 0.6466 | 0.5590 | **+0.0877** | −9.67 | ~0 | 0.2608 | 0.2465 |
| MONEYLINE | 1,219 | 0.6573 | 0.6645 | **−0.0072** | 0.54 | **0.59** | 0.2333 | 0.2229 |
| SPREAD | 795 | 0.6583 | 0.4591 | **+0.1992** | −12.22 | ~0 | 0.3007 | 0.2483 |
| TOTAL | 648 | 0.6123 | 0.4830 | **+0.1292** | −6.84 | ~0 | 0.2635 | 0.2497 |

The pooled gap of +8.8pt is not a property of the score. **Moneyline is
calibrated** (gap −0.7pt, p = 0.59 — not significant). The entire pooled gap is
carried by spread (+19.9pt) and total (+12.9pt). Restricting to pre-game only
(`in_play=false`) does not change any conclusion: moneyline +2.1pt (p = 0.13),
spread +19.6pt (p ~ 0), total +13.4pt (p ~ 0). In-play picks are not driving it.

## The serious finding: spread confidence is *inverted*

Band-level, the gap does not merely persist as confidence rises — it **grows**,
monotonically, and the top band is catastrophic:

**SPREAD**
| band | n | mean p | mean y | gap | z |
|---|---|---|---|---|---|
| 50-60 | 292 | 0.5379 | 0.4349 | +0.1030 | −3.54 |
| 60-70 | 217 | 0.6489 | 0.4885 | +0.1604 | −4.96 |
| 70-80 | 172 | 0.7399 | 0.4709 | +0.2690 | −8.06 |
| 80-90 | 90 | 0.8422 | 0.4667 | +0.3756 | −9.80 |
| **90-100** | 24 | 0.9342 | **0.3750** | **+0.5592** | −11.14 |

A spread pick at 90+ confidence claims 93.4% and wins **37.5%**. It is not
miscalibrated in the ordinary sense — it is **anti-predictive at the top**: the
model's most confident spread picks are its worst. Even the 50-60 band loses
(43.5% realized), so spread picks are unprofitable across the whole range at a
standard −110 price, which needs ~52.4%.

**TOTAL**
| band | n | mean p | mean y | gap | z |
|---|---|---|---|---|---|
| 50-60 | 293 | 0.5435 | 0.3891 | +0.1544 | −5.32 |
| 60-70 | 281 | 0.6458 | 0.5694 | +0.0764 | −2.68 |
| 70-80 | 55 | 0.7338 | 0.6182 | +0.1156 | −1.94 |
| 80-90 | 19 | 0.8242 | **0.2632** | **+0.5611** | −6.44 |

Same shape, smaller n at the top.

## The surprise: moneyline is *under*-confident at the bottom

**MONEYLINE**
| band | n | mean p | mean y | gap | z |
|---|---|---|---|---|---|
| **50-60** | 225 | 0.5305 | **0.7956** | **−0.2650** | **+7.98** |
| 60-70 | 626 | 0.6373 | 0.6054 | +0.0319 | −1.66 |
| 70-80 | 284 | 0.7412 | 0.6690 | +0.0722 | −2.78 |
| 80-90 | 66 | 0.8383 | 0.6667 | +0.1717 | −3.80 |
| 90-100 | 18 | 0.9483 | 1.0000 | −0.0517 | +1.00 |

Moneyline picks scored 50-60 win **79.6%** of the time (z = +7.98). The score is
not merely unbiased at the aggregate level — it is **massively mis-ordered
within** the market: its lowest-confidence moneyline picks are its best. The
top-band aggregate cancels out precisely because a +26.5pt error at the bottom
and a +17pt error at the top happen to sum to ≈0.

This is why "moneyline is calibrated" must not be read as "moneyline is good".
The correct statement is narrower: **the mean is right, the ordering is wrong.**

## Brier: the model does not beat climatology, in any market

| group | model Brier | climatology Brier | skill |
|---|---|---|---|
| pooled | 0.2608 | 0.2465 | **−5.8%** |
| MONEYLINE | 0.2333 | 0.2229 | **−4.7%** |
| SPREAD | 0.3007 | 0.2483 | **−21.1%** |
| TOTAL | 0.2635 | 0.2497 | −5.5% |

Predicting each market's own base rate for every pick beats the model on Brier
everywhere. Negative skill on a probability score means the probability
*variation* is worse than no variation — the model is adding noise, not
resolution, even where its mean is unbiased.

This is the most consequential line in the report and it is independent of the
calibration question.

## It is improving across versions

| version | n | mean p | mean y | gap | p |
|---|---|---|---|---|---|
| v5.0.0 | 175 | 0.6587 | 0.4800 | +0.1787 | 2.9e-07 |
| v5.1.0 | 586 | 0.6097 | 0.5171 | +0.0927 | 2.8e-06 |
| v5.2.6 | 297 | 0.6768 | 0.5421 | +0.1347 | 5.4e-07 |
| v5.2.7 | 1,599 | 0.6534 | 0.5872 | **+0.0662** | 1.0e-08 |

The gap has roughly halved, but remains statistically significant on the largest
sample. Version stratification is confounded with market mix — this table does
not establish that the fix is in v5.2.7.

## What this does and does not establish

Establishes, on this sample:
- The pooled inflation is a market-pooling artifact, not a uniform score defect.
- Spread/total confidence is monotonically anti-predictive at the top.
- Moneyline `p` is unbiased in the mean but badly mis-ordered.
- No market beats its own base rate on Brier.

Does **not** establish:
- Anything about the 2,385-pick cut in `compute.ts` (different sample).
- That the model is unprofitable — Brier is a scoring rule, not P&L. Posted
  prices, stake sizing and line shopping are not in this file.
- Cause. Market mix, selection effects (picks are only published above a
  threshold) and version drift are all entangled here. A stratified regression
  is the next step, not a claim.

## Recommended next steps, in order

1. **Do not publish spread/total picks with a probability attached.** The number
   is inverted where it matters most. Either model the market as a binary with a
   proper win-probability target, or publish spread/total without a confidence
   figure.
2. **Do not use `confidence/100` as `P(win)` for spreads/totals** in
   `expectedWinRate`, Brier, or any ROI calculation. This is exactly the
   `compute.ts:74-90` warning, now quantified.
3. **Investigate moneyline ordering separately.** Unbiased mean + inverted
   ordering is a training-target or feature-sign problem, not a scaling problem.
   A calibration map would paper over it and leave the ranking broken.
4. **Report Brier against climatology, never against 0.25.** A coin-flip baseline
   is wrong for a 66%-mean sample; the real bar is the base rate, and the model
   is under it in every market.

## Reproduce

```
python scripts/ops/calibration_analysis.py
python scripts/ops/calibration_analysis.py --json --by-version
```

19 tests in `tests/test_calibration_analysis.py`, including the Poisson-binomial
z against hand-derived values (z = +2.0 for 60/100 at p=0.5) rather than against
the script's own output.
