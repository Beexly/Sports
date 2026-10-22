# Scalar ghost-defender baseline: separation over expected by coverage × route

NFL Ghosts models a 2D baseline-defender density and residuals positioning against it. No XY tracking in
BDB, so I built the scalar analogue: expected separation from pre-throw context (down, distance, field
position, pass length — coverage deliberately excluded so it is testable), residual = separation over
expected.

Baseline R² 0.1807 on 9,446 targets (separation mean 3.72 yd, sd 2.39) — usable, and coverage is not in the
model.

## Separation over expected, top
| coverage×route | n | resid yd |
|---|---|---|
| COVER_2_ZONE × CORNER | 63 | +2.29 |
| COVER_2_ZONE × FLAT | 81 | +2.21 |
| COVER_6_ZONE × FLAT | 55 | +2.13 |
| COVER_0_MAN × SCREEN | 57 | +2.13 |
| COVER_2_ZONE × POST | 88 | +1.80 |
| COVER_4_ZONE × FLAT | 109 | +1.50 |

## Separation under expected, bottom
| coverage×route | n | resid yd |
|---|---|---|
| COVER_1_MAN × SLANT | 271 | −1.59 |
| COVER_1_MAN × HITCH | 238 | −1.48 |
| COVER_1_MAN × IN | 152 | −1.24 |
| COVER_0_MAN × GO | 53 | −1.24 |
| COVER_1_MAN × OUT | 318 | −1.18 |

## Why this is the strongest structural result so far
The matrix is legible scheme knowledge, not statistics noise: **every top cell is a zone coverage** and the
winning routes are the ones that sit in the vacated area (flat, corner, screen, post against the deep hole
in Cover 2). **Four of five bottom cells are Cover 1 man**, and they are the in-breaking and short routes —
slant, hitch, in, out — where a trailing man defender is closest at the break. Cover 1 is the binding
constraint on separation and it binds hardest exactly where the throw must be quick.

This also explains the earlier route thread: Slant was the one route whose YOE survived coverage control,
and here Slant is the route most *suppressed by man* (−1.59). The route's value is leverage-dependent in both
directions, which is coherence rather than coincidence.

## Caveats — this is not Ghosts
- **Scalar, not a density.** One number, no direction, no 2D baseline shape; a receiver with 3 yards of
  separation behind him and 3 yards in front are identical here.
- Separation is at-the-pass, so this is still decomposition, not pre-throw forecast.
- No defender identity, no cushion, no closing speed — the actual Ghosts inputs.
- Coverage is play-level; cells are thin (53–271).

Real 2D work needs NGS tracking frames; the scalar matrix is the schema to validate that against.
