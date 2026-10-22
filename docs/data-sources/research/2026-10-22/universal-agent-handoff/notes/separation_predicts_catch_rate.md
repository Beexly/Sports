# Separation over league average predicts catch rate; cushion predicts nothing

First validation of the vendor separation metric. Residual = avgSeparation − league baseline (2.9867), 173
receivers with >=3 targets.

- corr(residual, catch rate) = **0.508**, spearman **0.544**
- tercile catch rates: tight **0.549** · mid **0.666** · wide **0.807** (n=58/57/58)
- corr(cushion, depth of target) = **−0.031**

A 26-point catch-rate spread across terciles on 173 receivers is a strong, clean monotone. The widest-open
receivers catch 81% of targets; the tightest catch 55%.

## What it establishes
The vendor's separation number is not decorative — it carries real predictive load, and the league baseline
gives it a fixed zero. That makes separation-over-average the first NGS contextual metric here that both
(a) has an external anchor and (b) demonstrably works. It is also the correct target for the Ghost-defender
work: reproduce this number from tracking rather than inventing a parallel construct.

## And the negative that pairs with it
Cushion has essentially no relationship to depth of target (−0.031). Combined with the earlier finding that
cushion does not relate to separation (0.113), cushion now looks near-inert on its own: it tells you where a
defender lined up and almost nothing about what happened. Any model leaning on pre-snap cushion is leaning on
very little.

## Caveats
- Catch rate is partly mechanical: separation is recorded at the catch point, and completed targets supply
  that point more reliably than incompletions. So 0.508 is an upper-ish bound on separations clean signal.
- Aggregates only, no variance; `targets>=3` trims the extremes but foreshortens the spread.
- One season, 24 games; baseline may drift by era and is treated as fixed here.
