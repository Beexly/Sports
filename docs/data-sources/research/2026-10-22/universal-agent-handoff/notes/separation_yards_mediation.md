# Yards per target: suppressed by depth, and largely mediated by catch

Closed the harvest gap (`recYards` now collected; 236 rows, 236 with yards). 173 receivers at >=3 targets.

- raw corr(separation residual, yards per target) = **0.223** — modest
- **partial controlling depth = 0.382** — it RISES
- partial controlling depth *and* catch rate = **0.156**
- regression: separation **+1.344 yards per target** per yard of separation, depth +0.373, R² 0.225

## The suppression, which is the real story
Raw correlation understates the effect because depth pulls the two sides apart: deeper targets produce more
yards per target but *less* separation, so the two terms cancel in the raw figure. Once depth is controlled real
space, the relationship nearly doubles to 0.382 and prices at 1.34 yards per target per yard of separation —
a large number, roughly a yard and a third of offence for every yard a receiver gets open.

## But most of it runs through the catch
Controlling catch rate as well drops the partial to 0.156. So separation's yard value is substantially
*mediated*: it raises catch probability, and the yards follow from the completion. The direct path — extra
separation producing extra yards on a catch — is real but secondary.

That ordering matters for how the metric should be used. Separation is a **catch-probability** feature first;
using it as a direct yards regressor double-counts the completion it already causes.

## Caveats
- Suppression means the raw 0.223 should never be quoted alone — it is the most misleading number here.
- Mediation tested by partialling a downstream variable (catch), not by formal path decomposition.
- Same aggregate, single-season, 3-target-minimum limits as the preceding notes; `yds` is the receiver's game
  total, which includes any YAC.
- 173 rows is small for a two-control partial.
