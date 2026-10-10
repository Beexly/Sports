# Recruiting Capital Curve Measurement Results

Total games processed: 3046

## Hypothesis 1: Team talent gap vs margin residual
Verdict: SIGNAL

| Bucket | n | mean | SE | t |
|--------|---|------|----|---|
| <-200 | 177 | 6.041 | 1.349 | 4.479 |
| -200..-50 | 619 | 6.405 | 0.744 | 8.615 |
| -50..50 | 854 | 9.549 | 0.672 | 14.203 |
| 50..200 | 653 | 19.621 | 0.894 | 21.951 |
| >200 | 308 | 35.894 | 1.498 | 23.958 |

## Hypothesis 2: Change in two-year average recruiting rating vs margin residual
Verdict: SIGNAL

| Bucket | n | mean | SE | t |
|--------|---|------|----|---|
| <-0.05 | 0 | None | None | None |
| -0.05..-0.01 | 71 | 19.264 | 2.896 | 6.652 |
| -0.01..0.01 | 1718 | 17.512 | 0.612 | 28.619 |
| 0.01..0.05 | 347 | 18.453 | 1.351 | 13.661 |
| >0.05 | 0 | None | None | None |

## Hypothesis 3: Blue-chip sum (5yr) vs margin residual
Verdict: SIGNAL

| Bucket | n | mean | SE | t |
|--------|---|------|----|---|
| 0.0-23.2 | 1225 | 16.458 | 0.701 | 23.491 |
| 23.2-46.4 | 223 | 25.209 | 1.839 | 13.706 |
| 46.4-69.6 | 155 | 24.740 | 2.136 | 11.584 |
| 69.6-92.8 | 41 | 32.134 | 3.853 | 8.339 |
| 92.8-116.0 | 17 | 34.912 | 5.678 | 6.148 |

## Hypothesis 4: Talent gap x coach first-year interaction
Verdict: SIGNAL

### First Year Coach
| Bucket | n | mean | SE | t |
|--------|---|------|----|---|
| <-200 | 0 | None | None | None |
| <-200 | 177 | 6.041 | 1.349 | 4.479 |
| -200..-50 | 0 | None | None | None |
| -200..-50 | 619 | 6.405 | 0.744 | 8.615 |
| -50..50 | 0 | None | None | None |
| -50..50 | 854 | 9.549 | 0.672 | 14.203 |
| 50..200 | 0 | None | None | None |
| 50..200 | 653 | 19.621 | 0.894 | 21.951 |
| >200 | 0 | None | None | None |
| >200 | 308 | 35.894 | 1.498 | 23.958 |

### Not First Year Coach
| Bucket | n | mean | SE | t |
|--------|---|------|----|---|


---

## CORRECTED MEASUREMENT (recruiting_residuals.py — residuals vs closing spine, not raw margins)
The raw-margin tables above are descriptive only. The market question is residual vs close:

**H1 TALENT GAP vs CLOSE RESIDUAL: PRICED.** Slope −0.0008 resid-pts/talent-pt
(−0.08 pts per 100 gap, t≈−0.5, n=2,659). Buckets flat (t between +0.57 and +1.58).
=> Recruiting capital belongs in the PRIOR, not the market-beating layer. Honest null.

**H2 BLUE-CHIP SHARE: tail near-signal.** home share >70%: resid +1.54 (t=+1.81, n=320);
non-monotonic middle buckets => weak evidence, registry diagnostic only.

**H3 MOMENTUM: null.** rising/falling blue-chip delta classes t=1.12/0.42.

VERDICT: the close prices 4/5-star capital almost perfectly. Nobody's edge is a
recruiting-rankings edge at the CLOSE — the capital edge, if any, lives EARLIER
(opening lines, futures, offseason) or in the interaction terms (capital x coaching).
