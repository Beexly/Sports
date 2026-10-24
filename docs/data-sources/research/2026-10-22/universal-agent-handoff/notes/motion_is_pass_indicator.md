# Motion is a PASS indicator, not a coverage indicator

Third and decisive test. Two hypotheses: motion predicts coverage (the brief's premise), or motion
predicts something else.

## Motion -> pass, overwhelmingly
- pass rate with motion: **0.999** (1,765 of 1,766 plays)
- pass rate without: **0.650**
- chi-square **p = 2.8e-205**

Motion nearly *entails* a pass in this dataset.

## Motion -> coverage, still nothing
- 8-class `team_coverage_type` distribution, motion vs not: p = **0.128**; shares are near-identical
  (Cover 1: 20.0% vs 20.5%, Cover 3: 36.9% vs 36.0%).
- Restricted to 3rd/4th down, the natural home of disguise: man 44.4% vs 43.3%, p = **0.687**.

## Synthesis — correct the premise
Motion tells you a pass is coming almost certainly, and then tells you almost nothing about the
coverage behind it. So its job in a pipeline is as a **filter** (select the pass subset, ~100% purity,
instead of 65%) and as a *sample-selection device for tracking work*, not as a coverage predictor.

Everything that predicts coverage must come after the pass is known: leverage, depth of defenders,
displacement after the snap. That is consistent with both ablations — pre-snap categorical shape
topped out at ~0.70 AUC and adds ~0.01.

## Caveats
- Motion flag is at-the-snap only; it does not record reaction, which is the HMM's target.
- 1,722 motion plays, 1.7% prevalence. The 99.9% pass rate is strong enough to survive that thinness;
  the null coverage tests are weaker on 446 third-down motion plays.
