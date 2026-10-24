# Coverage does NOT explain the route residuals — self-refutation

Last note guessed the route residuals were "picking up coverage". Tested it: added coverage type
(8 classes, dummied) to the yards expectation and re-derived YOE.

| route | base YOE | +coverage | change |
|---|---|---|---|
| SCREEN | 2.367 | 2.346 | −1% |
| CROSS | 1.575 | 1.487 | −6% |
| POST | 1.301 | 1.373 | +6% |
| GO | 1.281 | 1.211 | −5% |
| FLAT | 0.498 | 0.456 | −8% |
| SLANT | 0.459 | 0.368 | **−20%** |
| CORNER | −0.374 | −0.404 | +8% |
| IN | −1.067 | −0.993 | −7% |
| HITCH | −1.926 | −1.813 | −6% |
| OUT | −2.187 | −2.172 | −1% |

Route-level correlation between the two versions is **0.999**. The guess was wrong: coverage is not the
mechanism. Shrinkage is mostly single digits and the largest is Slant at −20%, which is still 0.37 yards
of unexplained payoff after coverage is held.

## What that leaves
Route identity carries information that separation, depth and coverage together do not. The plausible
remaining explanations are things the features don't hold: run-after-catch leverage by route (screens and
crossers put receivers in space facing upfield, outs run them to the sideline), and the fact that
separation is measured at the pass rather than where the ball is caught. Both point to the same missing
construct — space *after* the catch point — which the pre-catch columns cannot supply.

## Caveats
- Coverage is the play-level label, applied to every route on that play; it cannot capture
  route-specific matching (a crosser against Cover 2 hole vs Cover 1 trail).
- Ridge refits per version; both share the same 5 base features.
- Same survivorship and at-the-pass separation caveats as before.
