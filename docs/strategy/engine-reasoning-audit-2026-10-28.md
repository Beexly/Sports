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

1. **Feed the location.** Team offensive/defensive EPA and pace from the 2026 pbp into
   `pointLocation` so margin and total start from the matchup, not from 3 and 46.5.
2. **Re-scale the coach shift** so a real signal can move the side — either raise the 0.15
   multiplier or lower the stub threshold, and measure which calibrates better.
3. **Connect `injuryDropOff`** by converting availability weights to score points.
4. **Connect `staffAggression`** to the trail instead of defaulting both staffs to PHI.
5. **Then** re-run the calibration check, because all four change the output distribution.

Until step 1 lands, "fully reasoning" is not true and should not be claimed.
