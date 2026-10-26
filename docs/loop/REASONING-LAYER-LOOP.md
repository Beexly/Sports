# REASONING-LAYER LOOP — every layer, books last

**Purpose:** recurring instruction for the main coding agent.  
**Branch:** `hermes/ship-night-findings` (PR #1195).  
**Rule:** "Wired" means the published reasoning string was read and contains the layer. A commit title, a file existing, or an agent claim does not count.

## Doctrine (do not reopen)

THE PRODUCT IS THE REASONING THROUGH ALL SIGNALS.  
The reasoning engine produces the plays from the game. Books come last and only return PLAY / ALT / PASS-on-price. The market never selects a side and never headlines the Why.

Weekly clock (non-negotiable):
1. USAGE
2. HEALTH (injuries with names)
3. MATCHUPS (player vs player, coach vs coach, scheme vs scheme — using the players health says are playing)
4. SITUATIONS (spot, stakes, divisional, game slot, rest, schedule)
5. VENUES, WEATHER, AND REFS
6. Everything else (narratives, tracking, corpus)
7. MARKET last — price check only

## Per-wakeup contract

On every wakeup:

1. **Verify remote state first.**  
   `scoring.ts` must be the real file (>70k bytes). If it is a placeholder, restore from the last good commit (4142d46 or later verified) and re-verify the remote before any other work.

2. **Read the census.**  
   Open `docs/engine/SIGNAL-CENSUS.md`. Find the highest layer in the weekly clock that is not yet REACHES THE DECISION.

3. **Wire one layer.**  
   - Prefer reconnecting a built-but-disconnected signal over writing a new module.  
   - The layer's output must reach either the decision (side / line / no-bet) or the published trail.  
   - Missing data is a named gap, never a zero and never silent imputation.  
   - Do not wire `factor-narrative.ts` as designed. It narrates market factors as reasons.

4. **Prove it.**  
   - Produce a before/after published reasoning string on at least one real upcoming NFL game.  
   - The after string must contain the layer you just wired.  
   - Mutation proof when possible: flip one real input (named player ruled out, usage shift) and show the trail or the play move.  
   - Update the census row with the disposition, the file:line, and the artifact excerpt.

5. **Verify the remote after every push.**  
   Re-read the changed file from the remote. Confirm size and that the placeholder is not back. A local commit that did not land does not count.

6. **Report the scorecard.**  
   Layer worked, disposition before → after, file:line, artifact excerpt (the actual reasoning sentence), remote SHA and size, remaining layers still disconnected.

## Forbidden

- Market-first reasoning or a Why that is only bookmaker consensus / line movement.
- Placeholders left in `scoring.ts` or any other load-bearing file.
- Claiming "wired" because a file exists or a commit title says so.
- Inventing a number or a signal. Missing data is a named gap.
- Publishing, X posts, flag flips, or silent MODEL_VERSION / grade / gate changes.
- Touching `gse-grok-build-sandbox`.

## Exit condition

The loop ends only when every family in the census is either REACHES THE DECISION or explicitly DISPOSITIONED with a named reason, the L5 reasoning engine is the producer of the published plays, the book path is a pricing service only, and the proof artifacts (3 Week 8 games before/after + mutation + adversary test for Steelers–Browns) exist and have been read.

Until then, the next wakeup continues from the highest unfinished layer in the weekly clock.
