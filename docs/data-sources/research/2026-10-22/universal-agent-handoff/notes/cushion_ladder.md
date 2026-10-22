# Model ladder on 256 receivers: cushion adds 0.001 R², nothing else much

Settled the cushion question properly by adding it last to a nested ladder, both seasons pooled (n=256, 72 TE):

| step | R² | separation coef | cushion coef |
|---|---|---|---|
| separation only | 0.212 | +0.0783 | — |
| + depth | 0.272 | +0.0590 | — |
| + cushion | **0.273** | +0.0578utiful | +0.0055 |
| + position | 0.283 | +0.0528 | +0.0082 |
| + targets | 0.283 | +0.0524 | +0.0084 |

Cushion adds **0.001 R²** (0.272 -> 0.273) and 0.000 on the last step. Even with every other term in, its
coefficient stays trivial (+0.005 to +0.008 catch points per yard of cushion). Position adds a real 0.010 —
the TE effect is doing work — and target volume adds nothing.

## What holds
Separation survives the whole ladder: the coefficient moves from +0.0783 down to +0.0524 as controls enter but
never approaches zero. R² .283 is the ceiling this data supports. So the valid model is separation + depth +
position, and cushion is decoration.

## The generalizable lesson
Cushion is the one NGS field that *sounds* contextual and predicts essentially nothing, while separation —
the geometric outcome — does the work. Pre-snap positioning is a weak proxy for post-snap reality, and this is
now the third independent test saying so (corr with separation 0.113, with depth −0.031, incremental R² 0.001).

## Caveats
- n=256 across two seasons; the internship of +0.001 is within noise, so the honest claim is "cushion adds
  nothing measurable", not "cushion adds exactly 0.001".
- Catch rate partly mechanical (separation measured at catch); coefficients are upper-ish.
- Aggregates only; the TE dummy absorbs position, but TE/WR differ in depth and role.
- `targets` as a control is itself an outcome (opportunity), so its null result is not informative about talent.
