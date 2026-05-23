# Plan — Cycle 5 · feat(prediction-engine): add extractPickSources utility

## Goal
Expose the list of source names that backed a pick as a top-level deduplicated array. Today the data is nested 3 levels deep at `pick.factorBreakdown.factors[i].evidence.sourceName`. The master prompt Track 1 output spec lists `sources[]` as a peer of `pick / confidence / reasoning` — this aligns the pick shape with that spec.

## Files to touch
1. `packages/prediction-engine/src/pick-sources.ts` — NEW; pure utility
2. `packages/prediction-engine/src/index.ts` — re-export
3. `packages/prediction-engine/src/__tests__/pick-sources.test.ts` — NEW; vitest spec
4. `_logs/CHANGELOG.md` — append entry

## Design

### Public surface
```ts
export function extractPickSources(pick: {
  factorBreakdown: FactorBreakdown;
}): readonly string[];
```

Properties:
- Returns sourceNames from every `factor.evidence` whose `activationStatus === "ACTIVE"` (only the signals that actually drove the score)
- Deduplicates while preserving first-seen order (stable for snapshot tests, deterministic for cache keys)
- Skips factors with no evidence or `MISSING` freshness — those didn't contribute
- Returns `[]` (frozen) when no qualifying sources

### Why ACTIVE-only
A pick's sources should reflect what drove the confidence, not every signal Claude inspected. Shadow / blocked / missing signals are auditable elsewhere (`factorBreakdown.factors[i].evidence.activationStatus`).

## Test plan
- Empty factors → []
- Single factor with ACTIVE source → [sourceName]
- Multiple factors, same source → deduplicated
- Mixed ACTIVE + SHADOW_ONLY → only ACTIVE included
- BLOCKED_* statuses excluded
- Preserves insertion order
- Missing evidence object → skipped (no throw)
- Result frozen / readonly

## Why no Claude
This is pure structural extraction over existing data. Wrapping deterministic field flattening in an LLM call would be cargo-cult AI.

## Rollback
Single commit. Revert removes the helper + test; existing FactorBreakdown shape is untouched, so no caller is affected.

## Commit message
`feat(prediction-engine): add extractPickSources for top-level sources[] aggregation`
