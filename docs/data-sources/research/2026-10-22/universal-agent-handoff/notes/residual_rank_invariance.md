# Why residualisation cannot reorder: the situations are the same

Added the terms the previous cycle said were missing — time remaining, down×distance interaction,
down×time. Result: **pearson still 1.000, spearman 0.999.** Not a wobble. So the failure is not the
feature list.

## The reason, measured
Across-team spread of each team's *mean* situational state (n>=200 plays, 33 codes):

| basis variable | across-team mean | sd | CV |
|---|---|---|---|
| down | 1.83 | 0.027 | **1.5%** |
| yards to go | 8.45 | 0.167 | **2.0%** |
| yardline | 29.73 | 0.549 | **1.8%** |

Every team plays an almost identical average down, distance and field position. With 1.5–2.0% of
between-team variation to work with, there is nothing for a residual to reorder — each team's
adjustment is a near-constant shift.

## The sharper part
The small differences that do exist **align with team quality rather than offsetting it**: LAR has the
best situation mix (down 1.78, 8.90 ytg, 28.89 yl) and sits top; CLE has the worst (1.86, 8.72, 30.16)
and sits bottom. Good offences convert third downs, so they get more first downs and shorter
distances. Adjusting for situation therefore *double-counts* quality — which is exactly why the
correlation pins at 1.000 rather than merely staying high.

## What this means for the metric
Context-adjusted EPA in this form is rank-invariant **by construction**, not by model weakness. If the
goal is a metric that reorders, it must condition on something a team does not control and that varies
by opponent — defensive quality faced, coverage shell, weather, venue — not on its own down and
distance.

The one place it could still earn its keep is *within-team, within-game* attribution (was this play
harder than usual for this team?), where the situation does vary. As a season-long team ranking it is
raw EPA with extra steps.
