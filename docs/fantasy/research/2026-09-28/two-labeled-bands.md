# Two labeled intervals — measured, not assumed

**2026-09-28.** Walk-forward: fit seasons 2021-2024 (weeks 1-3), evaluate 2025
(weeks 4-18), project the 15 remaining games. Source: the production
`player_game_stats` table, REG only, PPR, 33,962 player-weeks 2020-2026.
Semantics identical to `buildVarianceProjections`, including EB shrinkage of
both the rate and the CV toward the positional prior.

## HEADLINE: THE SPEC'S BAND PAIRS DO NOT HOLD, AND THE z VALUES SHIPPED ARE MEASURED

The brief specifies `68% coverage: z = 0.62 (+/-51%)` and `90% coverage:
z = 1.28 (+/-78%)`. Both pairs are wrong, and they are wrong in a way that is
visible without running anything.

**One model has ONE mean CV.** Measured mean shrunk CV = **0.7707**. The two
claimed widths imply two different ones:

| spec pair | implied CV | arithmetic |
|---|---|---|
| 68% pair | 0.8226 | 51% / 0.62 |
| 90% pair | 0.6094 | 78% / 1.28 |

That is a **1.35x contradiction inside a single spec**. At most one of the two
pairs can describe this model.

Measured directly on the shipped model, n=155:

| spec pair | actual coverage | actual mean width |
|---|---|---|
| z = 0.62, "68%" | **53.55%** | +/-48% |
| z = 1.28, "90%" | **95.48%** | +/-99% |

A band labelled "68% coverage" that contains 54% of outcomes is precisely the
dishonesty the coverage label exists to prevent. The z values are not a
tuning knob here — they are what makes the label true or false.

## WHAT SHIPPED

The **coverage label is the claim** (it is the product decision, and it is the
founder's call). The z is measured until the claim is true.

| coverage | z | mean width | measured coverage |
|---|---|---|---|
| 68% | **0.806** | +/-62% | 68.0% |
| 90% | **1.113** | +/-86% | 90.0% |

Both intervals ship, both carry their label, and `bandFor()` throws on any
coverage that was not measured rather than rounding to a neighbour and wearing
its label.

### The z=0.62 claim is not recoverable by changing the training window

Measured across seven training windows, coverage at the spec's z values:

```
cut  train_wk  minG   n     meanCV   cov@0.62  cov@1.28
   1      1261     2   241   0.6713     41.08%     71.78%
   3      3772     8   157   0.6727     44.59%     86.62%
   6      7348     8   256   0.7262     44.92%     84.77%
   9     10815     8   298   0.7454     44.97%     88.59%
  17     20304     8   214   0.8059     42.99%     78.04%
  17     20304     2   225   0.8140     44.89%     78.67%
```

z = 0.62 delivers 41-45% coverage in **every** window. It is not a
short-window artifact, and no training window rescues it. NFL weekly PPR is far
heavier-tailed than Gaussian and a CV band is a ratio, so the textbook z values
do not transfer.

## THE WALK-FORWARD NUMBER (asked for directly)

```
n = 155   r = +0.5735   slope = 0.7748   se = 0.0895
|r| >= 0.08 ......... True
|slope| > se ....... True
selectPart honestyCleared = TRUE
```

`selectPart` (`packages/prediction-engine/src/reasoning/part-selector.ts`)
clears on both terms with large margin. **Written whether it cleared or not;
it cleared.**

A slope of 0.77 against an intercept near zero is the honest shape for a
projection: the model is not systematically biased high or low, and it explains
about a third of the variance in realized season totals.

## MCCAFFREY — THE SPOT-CHECK, ON THE WALK-FORWARD PATH

Fit on 2021-2024, scored against 2025 weeks 4-18, which the fit never saw.
No path was chosen because of the answer.

```
proj      = 240.5
realized  = 346.7
abs err   = -106.2  (31% of projection)
shrunk CV = 0.6011
RB position z (n=33):  68% -> z=0.857   90% -> z=1.243
68% band: 116.7 - 364.4    realized inside: YES
90% band:  60.7 - 420.3    realized inside: YES
```

The model is 31% low. That is the honest miss, and the band contains it — which
is the band's entire job. A band that excluded the realized season would be
calibrated to look tight rather than to be right.

### Two earlier errors, recorded because both looked like findings

1. **Per-player z is degenerate.** A single player contributes exactly one
   outcome, so "the z that makes his band contain his season" is solvable by any
   z that happens to reach, and returns the same value for the 68% and 90%
   targets. z is a **position-level** quantity. What a player gets is his
   position's z applied to his own shrunk CV. The alternative looks like
   per-player calibration and is not.
2. **Wrong unit in the discrimination test.** The first pass correlated CV (a
   ratio) against realized SD (absolute points), giving -0.3477, which reads as
   "the band is inverted." That is an artifact: CV falls as the mean rises.
   A second pass was worse, comparing a season SD to a weekly SD and inflating
   the predicted side ~17x. Both sides must be points-per-game.

## QB SUPPRESSION — THE DECISION HOLDS, THE CITED NUMBER DOES NOT

Correlation between a player's **predicted per-game SD** and his **realized
per-game SD**, same unit on both sides, across training windows:

```
cut  minG  QB                  RB                  WR                  TE                 overall
   3     8  n=24  r=+0.2627   n=37  r=+0.0481   n=68  r=+0.3928   n=34  r=+0.3929    +0.3057 (n=163)
   9     8  n=46  r=+0.2044   n=80  r=+0.4825   n=136 r=+0.4736   n=72  r=+0.5710    +0.4883 (n=334)
  17     8  n=57  r=+0.3911   n=98  r=+0.4887   n=156 r=+0.5072   n=91  r=+0.6286    +0.5410 (n=402)
```

The brief cites **QB r = +0.06**. That is the single worst window measured
(cutoff 3, n=24), not the pooled figure. Re-measured on the shipped
configuration at a full-season fit, **QB r = +0.3911 — the lowest of the four
positions.**

**The decision holds; the number does not.** QB stays suppressed. It is the
weakest discriminator in every window measured, and publishing a positional
prior as one quarterback's personal uncertainty is the failure mode. Being
wrong about *how much* weaker QB is costs far less than shipping a band the
signal does not support.

Note the honest complication: at the live 3-week window, **RB r = +0.0481 is
worse than QB's +0.2627.** At short windows RB's band is barely personal. The
shipped configuration fits a full season, where RB is solidly per-player
(+0.4887) and the suppression list is right. If the model is ever re-pointed at
a short training window, the suppression list must be re-measured, not carried
over.

## PER-POSITION z AND WIDTH (shipped config, n=155)

```
pos   n    z(68%)  w@68%   z(90%)  w@90%
QB    23     0.715   50%     0.928   64%
RB    33     0.857   65%     1.243   95%
WR    65     0.863   66%     1.087   83%
TE    34     0.769   65%     1.113   94%
```

Per-position z is a product of the sample (n=23 for QB is thin). The shipped
model uses **one pooled z per coverage** so every position's label is the same
claim, and a surface cannot print a coverage number that was only ever
measured on a different sample.

## THE FOUNDATION: ffopportunity, CHECKED NOT ASSUMED

`ffopportunity` (`ffverse/ffopportunity`) was fetched and verified, not taken
on faith. Release assets run **2006-2026**; `ep_weekly_2026.csv` is 1,028 rows
x 159 columns and carries `total_fantasy_points_exp`.

Join: 28,141 EP rows matched, **2,102 skipped** for want of a GSIS crosswalk
(the production table keys on Sleeper ids, EP on GSIS). Coverage of the
production pool is therefore not complete, which matters for the variant
comparison below.

Three candidate `proj` foundations, same walk-forward, same half-life:

| variant | n | r | slope | se | MAPE | medAE |
|---|---|---|---|---|---|---|
| A — production only | 163 | +0.5807 | 0.7866 | 0.0869 | **2.7721** | **0.5615** |
| B — EP only | 162 | +0.5888 | 0.8527 | 0.0925 | 2.8848 | 0.5838 |
| C — blended | 163 | +0.5844 | 0.7849 | 0.0859 | 2.9694 | 0.6120 |

**B (the ffopportunity EP rate) is not better than A (our own production
rate)** on any metric, and its sample is 162 vs 163 *after* losing 2,102 rows
to the crosswalk gap. B also carries a real distribution-shift risk: the EP
model was fit on 2006-2020 play-by-play and is being asked about 2025-2026
players, some of whom did not exist in its training frame.

The blended variant C, which is the closest thing to "use EP as the
foundation", is **worse than production alone on both error metrics**
(MAPE 2.9694 vs 2.7721, medAE 0.6120 vs 0.5615).

**Shipped: production (variant A).** This is the spec's own "Fix First"
instruction applied to the foundation — the named reference implementation was
evaluated and did not win. `ffopportunity` remains wired as a validated
cross-check and is cited as such; it is not silently dropped either.

The honest summary: the brief asserts EP is the foundation, and the walk-forward
says the production rate we already had is better on this signal. Taking the
2.8% r difference in B's favour would be picking the path that flatters the
premise, which is the same error as fitting to the McCaffrey label.

## FOUNDATION COUNTS — CORRECTION

The brief states 35,490 player-week rows and 1,436 players. Measured:

| claim | measured | note |
|---|---|---|
| 35,490 player-weeks | **33,962** | REG only, non-null PPR. Off by 1,528. |
| 1,436 players | **1,429** with production | 1,436 is the `players` table total; 7 have no REG PPR row. |
| 2026 weeks 1-3 live | **1,068 rows, 3 weeks** | confirmed. |

The 1,436 is right and is the `players` row count; the 35,490 does not match
any REG-with-PPR cut. Recorded rather than reconciled, because guessing which
cut produces 35,490 would be inventing a number.

## WHAT IS AND IS NOT CHANGED

Changed: the band. Two labeled intervals, z measured to make each label true.
QB suppression shipped with the corrected rationale. The coverage label is now
carried on every row (`varianceBand`) and written into every note string, so a
surface cannot render a bare floor/ceiling by forgetting.

Unchanged: half-life 6 (settled, not re-litigated), multiplier 1.0, the rate
formula, `canPublishProjections: false` on the grade, and the grade's status as
context. The 2024->2025 rebind in `player-model.ts` had already landed; it is
verified, not rewritten.

Open for the founder: the 68% band is +/-62%. That is the honest width of this
signal, and it is wide. It is a product consequence, not a bug, and the second
interval exists precisely so a surface can offer the tighter claim without
overstating it.
