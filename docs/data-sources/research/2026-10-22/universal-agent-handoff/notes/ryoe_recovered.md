# RYOE recovered — and the expectation is context-flat like xComp

Probed the sibling of the completion leader route: `/api/leaders/expectation/ery/week?season=&week=`
returns `expectedRushYards`, `rushYardsOverExpected`, `rushYards`. Weekly **and** season scopes work for all
three products (`completion`, `yac`, `ery`). Harvested 200 rows (160 ERY across weeks 1–7 + 20 per product at
season scope) to `extracted_data/ngs_all_expectation_2025.csv`.

## Identity verified again, exactly
`rushYardsOverExpected = rushYards − expectedRushYards` on all 160 rows, **max residual 0.0**. Same pure
residual construction as YACoE. All three expectation products are now recovered, so no NGS expected-value
metric remains behind the paywall.

## But the ERY expectation does not behave like a context model
- expectedRushYards mean 5.15, sd 3.48
- spearman(expected, yardline) = **−0.032, p = 0.69** — flat
- binned by yardline: 20–40 **4.77** · 40–60 **5.51** · 60–80 **5.46** · 80–101 **4.65**
- corr(actual yards, expected) = **0.141**

Expected rush yards sit at ~5.2 almost regardless of where the ball is. Only the goal-line-adjacent bin dips
(4.65), where the field physically compresses. A conventional xYards model would slope from own-territory
runs upward into space; this one does not.

## What that tells us about the production engine
The same signature as completionProbability: **the served expectations are dominated by tracking
conditioning** (defenders in the box, leverage, closing speed) to a degree that washes out the static context
terms. That is defensible modelling — it is genuinely per-play rather than per-down-and-distance — but it
means none of these three fields is a substitute for a context baseline, and low corr(actual, expected) is
expected rather than alarming when the model already knows the defenders' positions.

Practical consequence for the reconstruction thread: NGS gives us **per-play tracking-conditioned** expected
values, while BDB gives us **context-conditioned** ones. They are different estimators, and scoring one
against the other is only valid on matched feature sets.

## Caveats
- Leader cap of 20 rows/week, so highlight-selected again (long runs over-represented).
- `ryoe` as a bare segment 403s; the resource is `ery`.
- Season scope here returned only 20 rows per product — same cap, so season is per-week-equivalent depth,
  not a full player leaderboard.
- yardline bins uneven (1 row in 0–20).
