# Context-adjusted EPA residualisation (mission primitive 1)

Built the residualiser the brief asks for: regress EPA on the situational basis, keep the residual as
"pure" context value. HistGradientBoosting on down, distance, field position, |score diff|, quarter —
no opponent, no personnel. Then residual leaders by possessing team.

## Two runs, deliberately reported together
| basis | in-sample R² | sd(resid) | top residual | bottom residual |
|---|---|---|---|---|
| down, dist, diff, quarter | 0.0087 | 1.4133 | LAR +0.141, BUF +0.110, BAL +0.065 | CLE −0.152, LV −0.119, NYJ −0.117 |
| + field position | 0.0152 | — | LAR +0.150, BUF +0.121, BAL +0.071, GB +0.071 | CLE −0.139, NYJ −0.105, LV −0.105 |

Field position nearly doubles the explained variance (0.0087 -> 0.0152) and the ordering barely moves —
LAR and BUF lead both, CLE bottoms both. That stability is the useful part; it means the residual is
measuring team quality, not feature noise.

## What a 1.5% R² means
The situational basis explains ~1.5% of EPA variance. Everything else — personnel, opponent, coverage,
execution — lives in the residual by construction. So the residual is *very* broad: sd 1.41 EPA on a
mean of −0.01. Any claim that a residual gap is "pure context" has to survive that width.

## Caveats
- In-sample R² (no holdout reported here); would drop out of sample.
- No opponent adjustment, so face-of-schedule leaks into team residuals.
- The EPA sign ambiguity from the previous note carries over — relative ordering only.
- `resid` uses the possession team, which is how the BDB data labels it, but 48% of rows are defenders
  so possession must be joined explicitly, never inferred from `team_abbr`.

## Verdict
The machinery is reproducible and the ranking is stable, but at 1.5% baseline R² this is a screening
stat, not a valuation. It needs opponent and personnel terms before anyone quotes it.
