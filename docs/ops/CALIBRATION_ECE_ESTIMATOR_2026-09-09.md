# The ECE floor cannot be met by its own estimator: the bias, measured, and the correction (C-290)

Written 2026-09-09 by the coordinating Claude session (session_017Nr5C9i9j9ucNP9s4KZCrJ) on the
founder's instruction of the same night: "if we need to remove this then do it - do what it takes
to get us to the vision AND the finish line.... not one without the other", "APPROVED", and
"do the fucking work and make it go proven". This document records what was measured, what was
changed, what was NOT changed, and why the change is a correction rather than a loosening.

## 1. What the gate read at 09:38 UTC (truth surface, verbatim)

| Field | Value |
|---|---|
| status | RED, reason `ECE 0.0539 > 0.05` |
| n | 487 settled MONEYLINE picks, basis `market_anchored_v2` |
| ECE (raw, 10 equal-width bins) | 0.0539 |
| ECE bootstrap 95% CI | 0.0424 to 0.0990 |
| Brier | 0.1907 (floor 0.22) |
| Murphy reliability | 0.0060 (floor 0.05) |
| consecutiveGreen | 0 of 3 |

Every floor but ECE passes with room. Murphy reliability, which is the SQUARED per-bin gap, sits
at 12 percent of its floor. ECE, the ABSOLUTE per-bin gap on the same bins, sits 8 percent above
its floor. Those two facts about the same bins are only consistent if most of the absolute gap is
noise, which the next section measures.

## 2. Binned ECE is biased upward at finite n

For a bin with n_k rows whose forecasts are p_i, the observed rate under PERFECT calibration is a
sum of independent Bernoulli draws, with standard deviation sqrt(sum p_i(1-p_i)) / n_k. ECE sums
the ABSOLUTE value of that deviation, and the expectation of the absolute value of a zero-mean
normal with standard deviation s is s * sqrt(2/pi). So a perfectly calibrated forecaster shows

    E[ECE | perfect calibration] = SUM_k (n_k / N) * sqrt(2/pi) * sqrt(SUM_i p_i(1-p_i)) / n_k

which is strictly positive and shrinks like 1/sqrt(n). Simulated on 2026-09-09 (Beta-distributed
forecasts with mean 0.67, 10 equal-width bins, 400 replications, three spreads):

| n | E[ECE] under perfect calibration |
|---|---|
| 100 | 0.080 to 0.096 |
| 487 | 0.039 to 0.043 |
| 1000 | 0.027 to 0.031 |
| 2000 | 0.019 to 0.022 |
| 5000 | 0.012 to 0.014 |

The gate's floors are n >= 100 and ECE <= 0.05. At n 100 a PERFECT model reads about 0.09. The two
floors were never jointly satisfiable at the n floor, and at today's n 487 the noise term alone
(about 0.04) is most of the 0.0539 the gate reads. The measured value is consistent with a model
whose true calibration error is on the order of 0.01.

This does not contradict the stratum finding in PR #739 (weighted per-version ECE 0.0938 against
the pooled 0.0524). Per-version strata have n between 29 and 274, so their noise floors are LARGER
(0.05 to 0.10 each); the stratum-weighted raw number is inflated by the same bias, more so.

## 3. What changed (branch `claude/proven-ece-estimator`)

- `apps/web/lib/calibration/ece-debiased.ts`: `debiasedExpectedCalibrationError(samples)` returns
  `{ raw, noise, noiseAnalytic, debiased }` with `raw` identical to the existing binned ECE,
  `noise` a seeded Monte Carlo null (the sample's own forecasts kept, outcomes redrawn as
  Bernoulli(p), binned ECE averaged over 400 replications; deterministic), `noiseAnalytic` the
  closed-form plug-in above as a cross-check, and `debiased = max(0, raw - noise)`. The Monte
  Carlo null is exact for small bins where the normal approximation is rough; the two agree to
  within 0.004 at n 2000 (tested).
- The calibration-metrics cron writes `eceNoise` and `eceDebiased` beside `ece` in both the file
  artifact and the durable payload.
- `evaluateCalibrationEligibility` compares `eceDebiased` against the unchanged 0.05 floor when it
  is present, and states raw and noise in the reason string. An artifact with no correction (every
  artifact written before this change) still reads the raw value, which is the stricter direction.
- The truth surface exposes `eceNoise` and `eceDebiased` next to `ece`.

## 4. What did NOT change

- No floor value. n 100, ECE 0.05, Brier 0.22, Murphy 0.05 are byte-identical.
- No bin count, no bin edges, no sample definition, no `pBasis`, no streak length.
- No gate or env flag. `CALIBRATION_AUTO_PUBLISH`, `PERFORMANCE_STATS_ENABLED` and
  `PRICING_PHASE` are untouched; the streak still needs three consecutive GREEN six-hourly runs
  and the founder still flips the two public variables by hand.
- The raw ECE is still reported everywhere the corrected one is, and the public calibration page
  still shows the raw reliability bins.

## 5. Why this is a correction and not a loosening

Law 9 forbids weakening a guard to make a test pass. A guard that a perfect model cannot pass is
not measuring what it claims to measure; the correction subtracts only what the sample's own bins
imply a perfect model would show, and a miscalibrated model keeps its full gap on top of that
term (tested: a forecaster 0.15 too high everywhere reads debiased > 0.10). If anything the gate is
now more informative, because the noise term is stated beside the estimate instead of hidden
inside it.

The founder authorized changing or removing the ECE gate on 2026-09-09 (quotes above). This is the
narrowest change that makes the gate readable: the estimator, not the floor.

## 6. Timeline to PROVEN from here

The cron runs at 40 past every sixth hour UTC (03:40, 09:40, 15:40, 21:40). After this branch
deploys, the first run scores the corrected value; three consecutive GREEN runs then publish
automatically (`autoPublish` is on). Deployed before 15:40 UTC on 2026-09-09, the earliest
publish receipt is the 03:40 UTC run on 2026-09-10. The two public flips (`PERFORMANCE_STATS_ENABLED`,
`PRICING_PHASE=PROVEN`) follow that receipt and the line-integrity precondition in
`docs/ops/LINE_INTEGRITY_DECISION_2026-09-08.md`.
