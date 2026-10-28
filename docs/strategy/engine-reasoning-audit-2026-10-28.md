# Engine reasoning audit — 2026-10-28

Question asked: is the engine fully reasoning, fully wired for play-by-play, coach-first with the
line read last?

**Answer: the order and the wiring are right. The location is not.** The engine cannot produce a
team-specific projection, and in practice the market still chooses the side.

Everything below was measured on `72224d70`+, not inferred.

---

## What is genuinely wired

**The doctrine is enforced by the type system, not by convention.**
`CoachLockPacket` (`engine/coach-projection.ts:32-42`) has no odds field at all. `readCoachLock` is
the literal first statement of `scoreSpreadPick` (`scoring.ts:712`), before any bookmaker filter
runs. The comment on line 49 says so and the code matches it. Odds cannot leak into the lock.

**The simulation runs.** `scoring.ts` → `engine/coach-projection.ts` → `coach-sim/index.ts` →
`coach-sim/locked-projection.ts:185` → `simulateCoachGame`. The review's claim that "scoring does
not invoke simulateCoachGame" is literally true and misleading: it goes through coach-projection.

**The reasoning layers are invoked.** Each factor builder is called exactly once on the path —
`usageFactors`, `availabilityFactors`, `shadowCoverageFactors`, `trenchContinuityFactors`,
`travelFactor`, `coachTrailFactors`. L0/L1/L2/L3 are real call sites, not dead imports.

**The seal holds.** `lockCoachProjection` runs the tau/seal guards, and the projection is hashed
before any price is read.

## What is not wired — the actual problem

### 1. The location is a league-average constant

`coach-sim/markov-simulator.ts:265-272`:

```
total  = 46.5 + coachSupport * 0.15 - injury
margin = 3   + coachSupport * 0.15 + KNEEL_HAIRCUT * 0.1 - injury * 0.5
```

`pointLocation` takes **only** `coachSupport` and `injuryDropOff`. There is no team strength, no
opponent quality, no pace, no environment, no personnel — nothing that distinguishes KC from CAR.
The play-by-play loop runs, but from a fixed starting point that does not know who is playing.

### 2. The coach shift cannot clear the stub, so the market picks the side

`coachOverridesStub` is `|marginMean - 3| >= 3` (`coach-projection.ts:81`). With the 0.15 multiplier
that needs `coachSupport >= 20`.

Measured, one strong starter out:

| Quantity | Value |
|---|---|
| `coachSupport` | −5.000 |
| `coachShift` (×0.15) | −0.750 |
| `marginMean` | 1.669 (stub 3) |
| `coachOverridesStub` | **false** |
| `marginSide` | HOME — but that is the stub's sign, not a decision |

`coachSupport` is a plain sum of factor weights (`coach-support.ts:9-11`), and weights are
fractions. Reaching 20 needs roughly four simultaneous strong injuries. **In normal weeks the
engine never chooses a side; `scoring.ts` falls through to the market.**

### 2b. The simulator can reason per drive — the projection starves it

`markov-simulator.ts` accepts `belichickHome`/`belichickAway`, evaluates them at 205-206, and feeds
them into the drive loop at 402 and 470 for special-teams and defensive decisions. That is real
in-drive reasoning over scheme and ST metrics.

But `engine/coach-projection.ts` — the only caller on the scoring path — never mentions belichick.
Measured: `lockCoachProjection` called without them returns `marginMean 1.669`, identical to the
stub path, because `metricsHome`/`metricsAway` are null.

So the loop is capable and the input is empty. That is a wiring gap, not a capability gap.

### 2c. A team-strength rating already exists and is unwired

`decision/2001-09097v1-gap-stat-ratings.ts` implements exactly what the location lacks: a 4-way
per-team rating (home/away offense/defense) on EPA/play, pressure rate, first-down rate and
explosive rate, with `predictStatDifferential(table, home, away)` returning the differential.
It is `ENABLED = false` and its own header says "NOT wired into any publish path."

No duplicate implementation exists — it is the only GAP table in the tree. Step 1 below is
therefore wiring, not writing.

### 3. Two real inputs are disconnected by name

`coach-projection.ts:83-84` records both as gaps:

- `injuryDropOff` is passed as 0 — availability weights are confidence points, not score points.
- `staffAggression` never reaches the trail; the drive loop uses `STAFF_AGGRESSION.PHI` for both
  staffs, so the staff residual is identically zero.

### 4. `ENABLED = false` is inert

`acceptance-gate.ts:20` states it: *"The gate is inert metadata. Importing this module changes no
prediction."* Nothing reads the flag. 199 modules declare it; 195 are imported somewhere; **146 are
not reachable from `scoring.ts` at all** (53 are, transitively). "Disabled" means "not wired into a
caller", not "returns nothing" — so the flag cannot be used to judge what is live.

## What this means for trust

The engine will produce a number for every game, and the number will be honest about its own
provenance. But today that number is *league average adjusted by coach signal*, priced against the
market. It is not yet a projection of these two teams.

The line is read last, correctly. It is also, in most weeks, still doing the work the reasoning
should be doing.

## What closing it takes, in order

1. **Feed the location** — and use what already exists. Wire `predictStatDifferential` from
   `decision/2001-09097v1-gap-stat-ratings.ts` into `pointLocation` so margin starts from the
   matchup. Supply `belichickHome`/`belichickAway` from `coach-projection.ts` so the drive loop
   stops running blind. Neither needs new code.
2. **Re-scale the coach shift** so a real signal can move the side — either raise the 0.15
   multiplier or lower the stub threshold, and measure which calibrates better.
3. **Connect `injuryDropOff`** by converting availability weights to score points.
4. **Connect `staffAggression`** to the trail instead of defaulting both staffs to PHI.
5. **Then** re-run the calibration check, because all four change the output distribution.

Until step 1 lands, "fully reasoning" is not true and should not be claimed.
