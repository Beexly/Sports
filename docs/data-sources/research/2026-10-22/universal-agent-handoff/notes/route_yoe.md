# Route-level YOE / CPOE: screens and crossers overperform, hitches and outs die

Extended the xComp model to a yards expectation (Ridge on separation, pass length, down, distance,
field position) and residualised actual yards on completions (n=6,256). Then aggregated both residuals by
route (n>=100).

| route | n | CPOE | YOE |
|---|---|---|---|
| SCREEN | 781 | 0.122 | **+2.401** |
| CROSS | 958 | 0.274 | +1.502 |
| POST | 304 | 0.466 | +1.278 |
| GO | 402 | 0.550 | +1.187 |
| SLANT | 533 | 0.321 | +0.561 |
| FLAT | 540 | 0.158 | +0.517 |
| CORNER | 187 | 0.439 | −0.353 |
| IN | 408 | 0.347 | −0.958 |
| HITCH | 1222 | 0.271 | −1.933 |
| OUT | 896 | 0.296 | **−2.206** |

## The pattern is coherent, not noise
Two axes separate cleanly. **Difficulty**: Go (0.550), Post (0.466) and Corner (0.439) are the hardest
completions, Screen (0.122) and Flat (0.158) the easiest. **Payoff**: given the depth and separation, a
screen gains 2.4 yards more than expected and an out loses 2.2 fewer. Screens are the boom/bust extreme —
hardest to complete, largest gain when completed — which is exactly the classic screen profile and a good
sign the residuals are measuring something real.

Hitch (−1.93) and Out (−2.21) are the notable negatives: high-volume possession routes that convert far
below their separation and depth. Both are also the routes most punished by tight coverage, which
suggests the residual is picking up coverage rather than route design.

## Caveats
- `pass_length` sits in the expectation, so a screen's negative depth is partly absorbed before the
  residual; the +2.4 is what remains after that, i.e. it is not simply "screens are short".
- YOE conditions on completion only (survivorship) — incomplete passes contribute no yards.
- Separation is at-the-pass, so both residuals inherit the circularity from the previous note.
- Route labels come from charting and are not mutually exclusive in reality (a "cross" can be a
  deep-over conversion); no route×depth interaction term is fitted.
