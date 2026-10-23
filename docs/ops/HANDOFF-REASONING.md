# HANDOFF — reasoning is the product

**To:** main coding agent. **From:** Hermes (overnight session). **Date:** 2026-10-23.
**Branch:** `hermes/ship-night-findings`, PR **#1195**.

## Doctrine

- The reasoning IS the product. Not Brier, not the closing line.
- The engine must reason over as many signals as exist, adjudicate conflicts, and see past market noise.
- Never fabricate. Named evidence, named failures.

## Current state

`factor-narrative.ts` is now committed. It is **not yet wired** into the three reasoning sites in `scoring.ts`.

Nine shadow families remain weight 0 with boilerplate descriptions. They now surface as a compact "Also watching (no weight yet)" clause instead of being silently dropped.

## Next steps (in order)

1. Wire `factorNarrative(factors)` into spread / total / moneyline reasoning strings (append after the claim, before Confidence) and set `reasoningShort` from `factorHeadline` when present.
2. Populate real providers for the shadow families, starting with PLAYER AVAILABILITY (nflverse injuries + ESPN) and VENUE ENVIRONMENT (existing nws-weather).
3. Conflict adjudication when factors disagree.
4. External LLM-judge layer on the reasoning benchmark.

## Fixture traps already hit

- `commenceTime` must be a Date or the freshness gate returns zero picks with no error.
- Thin context fails the publish gate; form buckets are required.
- Globally pinned marketFairProb flags genuine renders as inconsistent.
