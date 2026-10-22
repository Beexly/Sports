# Testing my own prediction: unbalanced exposure does let the residual move

Last note claimed the residual only reorders under unbalanced exposure, and named short windows. Tested
it on windows of the same data, defensive-quality basis included throughout:

| window | teams | pearson vs raw | spearman |
|---|---|---|---|
| full season | 33 | 0.998 | 0.995 |
| weeks 1–4 | 33 | 0.996 | 0.994 |
| weeks 1–2 | 33 | **0.994** | **0.986** |

Monotone in the predicted direction — the shorter the window, the less the residual reproduces raw EPA.
The mechanism is confirmed even though the magnitude is modest.

Rank movement in the extreme case (weeks 1–2, n>=30): mean |shift| **1.21** positions, max 4, and the
top five finally *does* permute — raw gives LAR, IND, TB, SEA, BUF; residual gives LAR, IND, **SEA, TB**,
BUF. Two swaps against 0.48 and zero swaps on the full season.

## Honest weight
A 1.21-rank mean shift on 33 teams is real but small. Early-season windows are also the noisiest
(n>=30 plays per team), so part of the movement is noise, not adjustment. The clean statement is:
residualisation moves rankings proportionally to how unbalanced the exposure is, and at no window tested
does it move them far.

## Practical upshot
If a residualised EPA is quoted at all, quote the window with it — a season-long figure is raw EPA, a
two-week figure is a different (noisier) number that at least behaves like an adjustment. Never compare a
short-window residual against a full-season one.

## Caveats
- LOO defensive strength is computed within the same window, so it is very thin in weeks 1–2.
- Weeks 1–2 also carry offseason-scheme noise; the two effects are not separated here.
- EPA sign ambiguity throughout the thread.
