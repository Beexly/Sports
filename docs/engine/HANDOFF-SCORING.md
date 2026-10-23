# HANDOFF — scoring.ts wiring status
**Date:** 2026-10-23  
**Branch:** hermes/ship-night-findings  
**File:** packages/prediction-engine/src/scoring.ts (87,838 bytes, commit 5d1cce26)

## What is live

- `coachTrailFactors` is called at all three scoring sites (spread, total, moneyline).
- `coachSupport(coachTrailFactors(...))` is called at all three sites. An Out on the picked side lowers confidence and can withhold the pick (Flowers Out → conf 45, pick withheld). Signed. Empty coachTrail adds zero.
- `...coachFactors` is prepended to the published `factors` array at all three sites (commit 5d1cce26). The stored trail now leads with L0/L1/L2 or the collector named gaps.
- The text prefix (`coachNote`) leads the reasoning string.

## What is not live

- `simulateCoachGame` is never called from scoring.ts. The Class A Markov simulator (4th-down policy, Sinkhorn targets, kneel/pressure constants) exists in `packages/prediction-engine/src/coach-sim/` but does not produce the projection that scoring publishes.
- The 52-source knowledge base in `docs/engine/intel/kb/` is not read by any scoring path. It is reference material. A producer must emit typed factors from it before it can vote.
- L3–L7 families (situations, venue/weather/refs, tracking/corpus, conflict adjudication, full trail) are not in the confidence sum or the factors array. They are documented in SIGNAL-CENSUS.md as disconnected or trail-only.
- No mutation test currently asserts that a coach factor appears in the published `factors` array. The existing tests cover the text prefix and the confidence number.

## Next exact work

1. Call `simulateCoachGame` from the scoring path and use its projection (not the market line) as the baseline expectation. The simulator input must be built from the same coachTrail that feeds coachSupport.
2. For each family in SIGNAL-CENSUS.md that is not REACHES THE DECISION: write a producer that returns FactorDetail[], call it in scoring.ts, prepend the result to factors, and add its weight sum to the confidence composite. Mutation test required.
3. Do not treat the kb files as wired. They are raw material. A producer is the wiring.

## Verification

```bash
# Confirm coachFactors is in the factors array
gh api repos/Beexly/Sports/git/blobs/1245058a86e1b83c2f24188c6c0ef806b089ddcd --jq .content | base64 -d | grep -c "...coachFactors"
# Expected: 3
```

