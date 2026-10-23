# HANDOFF — scoring.ts wiring status

**Date:** 2026-10-23  
**Branch:** hermes/ship-night-findings

## DOCTRINE

We are the bookmakers. We do not follow the line. We follow the game.

The week starts when the previous game ends. We review film. We measure usage upticks and downticks. We read coverages and schemes. We track pace. We note what we got right and what we got wrong. As the week moves, we learn the opponent: player vs player, coach vs coach, coordinator vs coordinator, receiver vs coverage, back vs blocking scheme. Later we read the injury report: who is playing, who is out, how that changes the matchup. Only after all of that is locked do we sit down and look at the lines. If our total is 43 and the market is 50, we bet. We do not chase.

## Entry point

`packages/prediction-engine/src/coach-sim/locked-projection.ts`

```ts
import { lockCoachProjection } from "./coach-sim/index.js";

const locked = lockCoachProjection({
  homeTeam, awayTeam, week,
  coachSupport, injuryDropOff, shadows, staffAggression,
});
// locked.scoreMean, locked.marginMean, locked.totalP10, locked.totalP90
// No market fields. The books are not an argument.
```

Any agent that prices a play without calling `lockCoachProjection` first is wrong. The books never choose the side. They only price the side the coach already chose.

## What is live

- `lockCoachProjection` is the Class A entry. It takes L0–L5 coach inputs only. It returns a locked projection with an input hash. No OddsInput. No market tokens.
- `coachTrailFactors` and `coachSupport` are called at all three scoring sites. An Out on the picked side lowers confidence. `...coachFactors` is prepended to the published factors array.
- The Markov simulator has 4th-down policy and Sinkhorn target modules.

## What is not live

- `scoring.ts` still computes `avgSpread` from the books and uses it as the baseline. It does not call `lockCoachProjection`.
- The 52-source kb is reference material. No scoring path reads it.
- L3–L7 families are not in the confidence sum or the factors array.

## Next exact work

1. In `scoring.ts`, call `lockCoachProjection` before any book is read. Use `locked.marginMean` / `locked.scoreMean` as the baseline expectation. Do not read `avgSpread` until after the projection is locked.
2. After the projection is locked, read the books. Compute the edge against the locked projection. Emit PLAY / ALT / PASS-on-price. The market never chooses the side.
3. For each family in SIGNAL-CENSUS.md that is not REACHES THE DECISION: write a producer, call it, prepend to factors, add to confidence. Mutation test required.

