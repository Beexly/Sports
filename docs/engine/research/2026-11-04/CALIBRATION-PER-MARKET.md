# Calibration must be fit per market — measured, 2026-11-04

## Headline

Fitting one calibration map across all three markets produces the best-looking
number in this document and the worst decision available. Fit per market, and
never refit moneyline.

Measured out-of-sample on a 70/30 **time** hold-out of 2,662 settled picks,
using the repo's own reference implementation
(`scripts/calibration-offline/run.mjs`):

| market | n | eceRaw | eceCir | delta | verdict |
|---|---|---|---|---|---|
| MONEYLINE | 1,219 | 0.0911 | 0.3169 | **+0.2258** | calibration HURTS — leave raw |
| SPREAD | 795 | 0.3314 | 0.0272 | **−0.3042** | calibration helps |
| TOTAL | 648 | 0.1512 | 0.0169 | **−0.1343** | calibration helps |
| POOLED | 2,662 | 0.1907 | **0.0006** | −0.1901 | **MUST NOT BE USED** |

## The pooled trap

Look at the pooled row. ECE falls to 0.0006 — two orders of magnitude better than
any per-market fit. Anyone tuning on ECE would pick it immediately.

It is an artefact. An isotonic map fit on the pooled distribution and scored on
the pooled distribution learns the aggregate relationship and then reports that it
predicted it. The number measures the fit's self-consistency, not its usefulness.
Split the pool and the same technique gives a map that triples moneyline's error.

The reason is that the three markets do not mean the same thing by a probability:

- **MONEYLINE** is already close to calibrated. There is almost nothing to
  correct, so any fitted map mostly encodes noise — and it costs 3.5× the error.
- **SPREAD** confidence is inverted. High confidence predicts *lower* win rates.
  A monotone refit is close to the correct fix.
- **TOTAL** is overconfident. A milder version of the same.

One monotone map cannot serve a market that needs no correction and a market that
needs an inverted one. It averages them into something that fits neither.

## What this changes

1. **Moneyline is excluded from calibration.** Applying a map to it is not a
   neutral act; it is measured harm. This contradicts the earlier reading that
   moneyline was "calibrated and therefore safe to leave in the pool" — leaving
   it in the pool is exactly what corrupts the other two.
2. **Spread and Total each get their own map.** Not one shared "non-moneyline"
   map.
3. **Pooled calibration is rejected on measurement, not taste.** The 0.0006 is
   the evidence for rejecting it, not a reason to adopt it.

## Caveat — do not skip this

The spread and total improvements are large enough to distrust. CIR with ~20
distinct blocks fit on ~556 training rows can chase noise even when scored on a
hold-out, and a 12× ECE reduction on 239 test rows is not a normal result.

Treat 0.0272 and 0.0169 as **upper bounds on the improvement**, and re-measure on
a second, later hold-out window before anything is wired into live scoring. The
moneyline finding (+0.2258) is the robust one: it is a degradation, and
degradations are much harder to manufacture by overfitting than improvements are.

## Method

- Source: `apps/web/__tests__/calibration-audit/evidence/prod-settled-sample-full.csv`
  (2,662 rows: `id,p,y,pick_type,model_version,in_play`), grouped by `pick_type`.
- Split: 70/30 **in file order**, i.e. a time hold-out. Never a random shuffle —
  a shuffle leaks later games into training.
- Fit: isotonic (CIR/PAVA) on train, scored on test.
- Metric: ECE over 10 equal-width bins **of the calibrated probability**.
- Runner: `scripts/calibration-offline/run.mjs` — the repo's implementation, one
  code path for all four rows.

An earlier version of `calibration_per_market.py` reimplemented isotonic and ECE
in Python and disagreed with the runner on every raw ECE (moneyline 0.1483 vs
0.0911; spread 0.2126 vs 0.3314). It also binned on the raw probability while
substituting the calibrated value, which is invalid for a step function. It was
replaced with a wrapper that calls the reference runner rather than a second
opinion that could not be reconciled.

## Status

**Not wired into live scoring.** Per the calibration pipeline's own rule, this
stays R&D until `CALIBRATION_ADJUSTMENTS_ENABLED` plus a human MODEL_VERSION gate.
No prediction output has been changed by this work.

Reproduce:

```
python scripts/ops/calibration_per_market.py
```
