# Motion does not predict man coverage here (negative result)

Tested the assumption the mission brief is built on — that pre-snap motion is the diagnostic trigger
for man/zone — against 98,579 labelled plays.

- plays with motion at the snap: **1,722** (1.7%)
- man rate when motion: **0.267** · man rate without: **0.285**
- chi-square on the 2x2: **p = 0.091** — not significant

So motion, as a single boolean, is slightly *associated with zone* and nowhere near definitive.

## What does move inside the motion subset
Man rate by down when motion is true: 1st 0.158 (n=678) · 2nd 0.258 (598) · 3rd 0.425 (409) ·
4th 0.649 (37).

That is a wide, monotone gradient — 0.16 to 0.65 — and it is the same story as the ablation: down and
distance carry the signal; motion only lives inside that context. A defender following a receiver
across the field matters most on 3rd/4th down, where the call is a pass and leverage is real.

## Why the brief's premise needs qualifying
Motion is a *trigger for observation*, not a feature that stands alone. Applying it as a global
feature (1.7% prevalence, p=0.09) is why it looked inert in both earlier models. The correct
formulation is conditional: motion × down × receiver leverage, and ideally per-defender displacement
rather than a team-level flag.

## Caveat
1,722 motion plays across multiple seasons is thin, and the flag records motion *at the snap* only —
not the defender's reaction, which is the thing the HMM would decode.
