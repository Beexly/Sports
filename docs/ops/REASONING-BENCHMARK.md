# Reasoning benchmark — baseline

Run 2026-10-23 against production, `hermes_ro`, READ-ONLY. n=552 settled picks that
carry both `factorBreakdown.fairProbability` and `marketFairProb`.

Run it with:

```
cd apps/web
export DATABASE_URL=$(neon connection-string main --project-id summer-brook-99380762 --role-name hermes_ro | tail -1)
NODE_PATH=<repo parent>/node_modules npx tsx scripts/bench-reasoning.mts 4000
```

## Result

| component | score | floor | verdict |
|---|---|---|---|
| grounding | 0.9855 | 0.90 | pass — citations resolve |
| consistency | 0.9534 | 0.95 | pass — 103/552 still inconsistent |
| specificity | 0.5889 | — | thin; templated prose |
| rubric | 86.86 | 70 | pass |
| Brier | **0.2532** | ≤ market | **fail** |
| market Brier | 0.2158 | — | the bar |

`leaderboardReady: false`. One blocker: `Brier worse than the market`.

## What this says

1. **The engine's own probability loses to the market by 0.037 Brier at n=552.**
   This is the same fact that made `marketFairProb` the ranking basis — the
   ranking was fixed, the published number was not. Until `fairProbability`
   beats the close, any claim that the reasoning is superior is calibration
   theatre.
2. **The reasoning is a market echo.** The current template is "SIDE line backed
   by N% of M bookmakers. Fair value: X%. Edge: Y%." It names no situational
   surface — no wind, pressure, availability, entropy. Specificity 0.59 is the
   arithmetic ceiling of a five-slot template.
3. **103 internal inconsistencies.** Mostly the printed "Fair value: X%" not
   matching the stored `fairProbability` for that pick — the template rounds and
   then states a different number than the one it is scoring against.

## Known scoring limits

- `side` is inferred from `selection` vs `homeTeamName`; picks with a null game
  join fall back to `AWAY`.
- Only 552 of 3,763 settled rows carry `fairProbability`; 3,211 are skipped as
  unpriced. A wider run cannot fix that — it is a generation-time gap.
- Grounding is scored against `factorBreakdown` keys plus the pick's own market
  columns. The templated phrases cite those columns, so scoring them as
  hallucinations was an artefact of looking only inside the breakdown.

## Next targets, in order

1. Stop printing a fair value that disagrees with the stored probability.
2. Make the template cite real surfaces, so specificity is earned rather than
   inert.
3. Recalibrate `fairProbability` toward the market until Brier ≤ marketBrier,
   then measure the gap again. Re-run this bench unchanged each time.
