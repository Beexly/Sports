# Decisive test: the EPA residual is raw EPA in disguise (r = 1.000)

The whole point of residualisation is to change the ordering — to strip situational advantage out of
team quality. Tested directly: pearson and spearman between each team's **raw mean EPA** and its
**mean residual** across 33 team codes (n>=200 plays each).

- **Pearson 1.000 · Spearman 0.999**

The residual ranking is the raw ranking. LAR 0.104 raw / 0.150 resid, BUF 0.071/0.121 at the top;
CLE −0.200/−0.144, NYJ −0.164/−0.109, LV −0.163/−0.107 at the bottom. The residual rescales the
variable and reorders almost nothing.

## Why the earlier models looked like they were doing something
They were reporting a *stable ordering*, and the ordering is stable precisely because it is raw EPA.
Every "identical across four models" observation from the previous cycle is explained by this: the
basis never had enough weight to move teams past each other.

## What that means for primitive #1
Context-adjusted EPA as commonly specified — regress EPA on down/distance/field position/score/time,
keep the residual, rank by it — is **rank-equivalent to raw EPA** on this data. It is a defensible
display transform and an indefensible selection criterion.

To actually change an ordering you need a basis with real situational bite: score-state × time
interaction (garbage time), opponent quality, personnel, and down-distance interaction terms. The linear
version here has 4 degrees of freedom against 1.41 SD of noise; there is simply no headroom.

## Caveats
- Linear least squares basis (down, distance, yardline only) — the GBM version could in principle
  differ, but it scored 0.0012 holdout R², so it cannot rescue the ordering either.
- 33 codes includes a blank/unknown bucket.
- EPA sign ambiguity from earlier notes stands; irrelevant to a rank test.
