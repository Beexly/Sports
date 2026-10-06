# Half-life sweep + band calibration — and a correction to my own claim

**2026-09-28.** `.hermes/scratch/halflife.py` (75m31s) and
`.hermes/scratch/bandwidth.py`. 33,962 REG player-weeks, seasons 2020-2026.

## CORRECTION FIRST

In `bb7e91558` I wrote that **"a 6-week half-life makes this model structurally
pessimistic on a player coming off a bad season."** That was measured on
McCaffrey — one player. The 5-year walk-forward does not support it as a
general claim:

```
=== WALK-FORWARD, all years pooled (train < Y, score Y) ===
 half-life     MAPE   medAE%      n
         5   0.5093    29.80   1892
         6   0.4949    28.37   1892     <- founder-specified
         8   0.4838    26.22   1892     <- best pooled MAPE
        12   0.4887    23.99   1892
        52   0.5774    20.28   1892
```

**6 is not broken. It is within 2.3% of the best pooled MAPE.** The stated
mechanism (recency weighting concentrates on an injury season) is real *for
McCaffrey* and I over-generalized it from n=1 to the model. That was the same
error as the spec's spot-check: one case promoted to a law.

**The half-life stays at 6. Nothing was retuned.** I am explicitly not taking
the 2.3% — the spec fixed 6, the gain is inside walk-forward noise, and silently
retuning it is the same class of move as fitting to the label leak.

### And the sweep says 6 is not even the best single choice

```
=== STABILITY: is the winner good in EVERY holdout year? ===
 half-life    2021    2022    2023    2024    2025
         3  0.6459  0.5110  0.5049  0.5881  0.5984
         5  0.5822  0.4614  0.4510  0.5190  0.5295   <- best in 2025
         6  0.5606  0.4470  0.4352  0.4936  0.5325
         8  0.5280  0.4274  0.4180  0.4624  0.5706
        16  0.4684  0.3828  0.4122  0.4442  0.7652
        52  0.4239  0.3656  0.4748  0.5181  1.0425
```

The pooled winner (8) is **the worst of the short half-lives in 2025**, and long
half-lives collapse on the most recent holdout (0.53 → 1.04). MAPE and median
also disagree in direction: MAPE prefers 8, median absolute error prefers 52
(20.28%), because MAPE punishes the tail — a 2-point dud scored against a 8-point
projection is a 233% error that no median notices. **"The best half-life" was
never a well-posed question.** 6 is a defensible middle, not an optimum, and
saying so is more useful than a false peak.

## THE ACTUAL PROBLEM: THE BAND IS TOO WIDE TO MEAN ANYTHING

```
=== BAND COVERAGE vs MULTIPLIER z, band = proj*(1 +/- z*CV) ===
     z  coverage
  0.50     58.7%
  0.75     77.7%
  1.00     92.5%     <- the spec's multiplier
  1.50     98.9%
  2.50    100.0%
```

**At the spec's z=1, 92.5% of realized season totals fall inside the band.** A
floor/ceiling that contains 92.5% of outcomes says "maybe" about every player
equally. As a draft surface it does not discriminate.

z needed for conventional targets:

| target coverage | z | resulting mean band |
|---|---|---|
| 95% | 1.18 | ±96% |
| 90% | 0.96 | ±78% |
| 80% | 0.79 | ±64% |
| 68% | 0.62 | ±51% |
| 50% | 0.41 | ±34% |

Note the shape: even a **50%-coverage band is ±34% of projection**. That is not
a bug in the calibration, it is the honest width of NFL fantasy scoring. It
means a *narrow* fantasy floor/ceiling cannot be built from this signal at all,
and anyone who ships one is choosing a z to look decisive, not to be right.

## DOES THE WIDTH MEAN ANYTHING PER-PLAYER?

```
  [confounded] corr(CV, realized SD)          = -0.3477
  [honest]     corr(predicted SD, realized SD) = +0.5366  (n=373)

    QB: r=+0.0636  n= 48  pred SD=  8.8  real SD=  7.5
    RB: r=+0.6251  n= 88  pred SD=  6.4  real SD=  4.9
    WR: r=+0.5699  n=147  pred SD=  6.3  real SD=  5.3
    TE: r=+0.2957  n= 84  pred SD=  5.0  real SD=  4.2
```

**The band width is real signal, and it works for RBs and WRs (r ≈ 0.57-0.63).
It carries almost nothing for QBs (r = +0.06).** A quarterback's band is
essentially the positional prior restated: the model knows the average QB is
volatile and cannot tell this one from that one. Drafting a floor/ceiling for
QB off this model would be presenting a prior as a player's own uncertainty.

## TWO ERRORS I MADE AND CORRECTED, RECORDED BECAUSE THEY MATTER

1. **The interpolation loop searched for a descending coverage pair** while
   coverage ascends with z, so every target printed "not reached." The coverage
   table was always right; the target lookup was broken.
2. **I correlated CV (a ratio) against realized SD (absolute points)** and got
   −0.3477, which reads as "the band is inverted." It is an artifact: CV falls
   as the mean rises, so high-scoring players look less volatile. Worse, my
   first "fix" multiplied predicted SD by remaining games and compared a
   *season* SD to a *weekly* one, inflating the predicted side ~17x (QB pred
   110.3 vs real 7.5). The corrected per-game comparison gives **+0.5366**.

Neither error survived contact with the units. The band is not inverted. I would
rather ship the corrected number than the dramatic one.

## WHAT IS AND IS NOT CHANGED

Changed: nothing in the model. The half-life stays 6. The band multiplier stays
1.0. Both are now backed by a measured curve and a named open question.

Open, and a product decision rather than a modelling one: **what coverage
should a fantasy floor/ceiling claim?** The curve above is the input. A
90%-honest band is ±78% and will look useless next to a feed's ±25%; a 25% band
is a claim this signal cannot support for anyone, and cannot support for QBs at
any width. Recommending one is a product call about what a user is owed, not a
statistical one, so I am not making it unilaterally.
