# HANDOFF — scoring.ts wiring status

**Date:** 2026-10-23  
**Branch:** hermes/ship-night-findings  
**File:** packages/prediction-engine/src/scoring.ts (87,838 bytes, commit 5d1cce26)

## DOCTRINE — READ THIS FIRST

**Reading the books, the lines, and the numbers is the LAST thing we do.**

The engine produces the play from the coach reading: usage, health, matchups, situations, venue, weather, refs, tracking, conflict adjudication. The market is one small input that arrives at Step N. It does not set the baseline expectation. It does not lead the trail. It does not decide the side.

If a trail leads with Bookmaker Consensus or Pricing Edge while L0–L6 exist, the trail is wrong. If the projection is anchored to `avgSpread` or `spread_line` before the coach simulation has run, the architecture is wrong.

## What is live

- `coachTrailFactors` is called at all three scoring sites (spread, total, moneyline).
- `coachSupport(coachTrailFactors(...))` is called at all three sites. An Out on the picked side lowers confidence and can withhold the pick. Signed. Empty coachTrail adds zero.
- `...coachFactors` is prepended to the published `factors` array at all three sites (commit 5d1cce26). The stored trail now leads with L0/L1/L2 or the collector named gaps.
- The text prefix (`coachNote`) leads the reasoning string.

## What is not live — the doctrine is not yet satisfied

- `simulateCoachGame` is never called from scoring.ts. The Class A Markov simulator exists in `packages/prediction-engine/src/coach-sim/` but does not produce the projection that scoring publishes. The baseline expectation is still `avgSpread` from the books.
- The 52-source knowledge base in `docs/engine/intel/kb/` is not read by any scoring path. It is reference material. A producer must emit typed factors from it before it can vote.
- L3–L7 families (situations, venue/weather/refs, tracking/corpus, conflict adjudication, full trail) are not in the confidence sum or the factors array.
- The market comparison happens inside the scoring function, not after a locked coach projection.

## Next exact work — in this order

1. Call `simulateCoachGame` first. Build its input from the coachTrail. Use its `marginMean` / `scoreMean` as the baseline expectation. Do not read `avgSpread` until after the coach projection is locked.
2. For each family in SIGNAL-CENSUS.md that is not REACHES THE DECISION: write a producer that returns FactorDetail[], call it in scoring.ts, prepend the result to factors, and add its weight sum to the confidence composite. Mutation test required.
3. Only after the coach projection is locked: read the books, compute the edge against the locked projection, and emit PLAY / ALT / PASS-on-price. The market never chooses the side. It only prices the side the coach already chose.
4. Do not treat the kb files as wired. They are raw material. A producer is the wiring.

## Verification

```bash
# Confirm coachFactors is in the factors array
gh api repos/Beexly/Sports/git/blobs/1245058a86e1b83c2f24188c6c0ef806b089ddcd --jq .content | base64 -d | grep -c "...coachFactors"
# Expected: 3
```

