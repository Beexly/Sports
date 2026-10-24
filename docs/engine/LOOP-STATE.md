# LOOP STATE — 10_23 (1).docx plan

**Updated:** 2026-10-24. **Branch:** `hermes/ship-night-findings` (PR #1195).

The 21-wakeup marker called the plan complete. That was wrong about the drive loop. `simulateCoachGame` was still `margin = 3 + coachSupport*0.15` and `n` was unused. The drive loop is now the sample underneath that same location.

## Drive loop (this commit)

`packages/prediction-engine/src/coach-sim/markov-simulator.ts`

- Location is unchanged when `staffAggression` is omitted or PHI: margin `3 + coachSupport*0.15 + kneel haircut`, total `46.5 + coachSupport*0.15`. Injury still splits half onto the margin. Scoring's override gate is the same.
- `n` sets the total band. It is not a fixed ±7.
- Home staff aggression is applied inside the drive (4th-down policy on the live state). Away stays PHI. At n=2,000, home staff 0.51 vs 0.94 moves the margin by about 5 points.
- Kneel uses `kneelProbability`. Field goals score only at 48–52 yards (`FG_MAKE_50` 0.641). Sack conversion is pinned and unused: there is no pressure frequency (`SIM_GAPS.pressureRate = null`).
- Unpinned rates that only move the ball to a 4th down are listed in `SIM_GAPS`. They do not choose the side on the scoring path.

## Completion status of the docx items

| item | state | proof |
|---|---|---|
| 1. L3 travel wall | CLOSED | audit row 423 mi BAL-CIN, pinned test, `engine/travel-factor.ts` wired to trail |
| 2. snap/PFR -> UsageShift | CLOSED | `usageShiftsFromSnaps` + `usageShiftsFromPfr`, 7 tests, measured Lamar/Flowers/Bateman/Robinson rows |
| 3. marginMean off stub | CLOSED | responds to injuryDropOff (0->4 moves margin -2.0), pinned. Constant 3 is still the location prior. |
| 4. drive loop | CLOSED | see above. `markov-simulator.test.ts` |
| 6. scores24 conclusions | PARTIAL | 10 of 12 ingested (`kb/scores24/week8-predictions.json`); LV@LAR + SEA@KC = no published conclusion |
| 6. referees/squads | DISPOSITIONED | no route in rapi client; GraphQL POST browser-gated |
| 7. proprietary seven | CLOSED | 2 measured (QPTSR, DWP) + 5 honest gaps |
| 8. psychology tensor | CLOSED | grudge = named gap (ledger absent), PROE override does not fire |
| 9. reconciliation daemon | CLOSED | hash-gated recompute, Tuesday 04:00 CT callable, no Neon write |
| 10. equation server | DISPOSITIONED | gap doc. Not a 50,000-equation server. |

## Re-arm triggers

1. PR #1195 merged.
2. `pbp_participation` publishes a 2026 asset.
3. FTN account exists.
4. NGS session capture provided.
5. scores24 publishes LV@LAR / SEA@KC conclusions.
6. A pressure frequency is measured. Until then sacks stay out of the drive loop.

## Standing verification

```
cd packages/prediction-engine && node ../../node_modules/vitest/vitest.mjs run src/coach-sim/markov-simulator.test.ts
```
