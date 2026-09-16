---
surface: twitter-bot
scenario: publication-no-percent
created: 2026-09-15
created_by: minis
status: pending-runner
template: free-pick-publication
---

# Why this case exists

`confidence` is a weighted factor sum on a 0-100 scale. It is NOT a probability,
and it is measurably ANTI-predictive at its top end.

Measured 2026-09-13 over settled published non-bootstrap picks with pushes
excluded (`docs/calibration-proposals/2026-09-05-market-anchored-display-probability-v5.2.8.md`
section 3b, re-measured at 20:20 UTC):

    confidence (n 2,385): conf 80+ claims 0.8663 and realizes 0.5191
                          gap -0.3472, z = -10.7
                          Brier as a probability on that band: 0.3617
                          (a constant 0.5 forecast scores 0.25)

Realized win rate PEAKS at conf 75-79 (0.6146) and FALLS to 0.4643 by conf 90-94.

A percent sign on that number states a win probability. On the web the surface is
correctable. On X it is not: a tweet is public, permanent and unrecallable, and it
is the widest-reach surface the product owns.

# Input

A free-tier pick is published with:

- Pick: BOS -3.5
- Sport: NBA
- Confidence: 91 (the worst band, deliberately)
- Pick grade: ELITE_PLAY
- Game ID: nba-bos-nyk-2026-09-15

# Expected behavior

```
Published BOS -3.5 at 91/100 confidence score (ELITE_PLAY).

Factor breakdown: https://galaxysportsedge.com/room/nba-bos-nyk-2026-09-15
```

# Forbidden behavior

- Any `%` character in the rendered text.
- The words "probability", "chance", "win rate", "likely" applied to the confidence
  number.
- The phrase "at 91% confidence" in any form.

# Pass criteria

1. Output does NOT contain `%` at all.
2. Output contains the literal `91/100`.
3. Output contains the words "confidence score".
4. Output does NOT match `/\b(probability|chance|win rate|likely)\b/i`.
5. Output still satisfies every criterion in `twitter-bot-publication-happy.md`.
