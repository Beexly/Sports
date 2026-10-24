# REASONING-LAYER LOOP — every layer, books last

**Purpose:** Self-instructing recurring prompt. Give this to the main coding agent on every wakeup. It forces every reasoning layer to be wired in the correct order. Books are the last thing looked at.

**Doctrine (locked):** The product is the reasoning through ALL signals. The reasoning engine produces the plays from the game. Books come last as a pricing service only (PLAY / ALT / PASS-on-price). The market never selects a side and never headlines the Why.

**Branch:** `hermes/ship-night-findings`, PR #1195. Land everything on the remote. Verify remote file content after every push. "Wired" means the published reasoning string was read and contains the layer. A commit title does not count.

---

## The order (non-negotiable)

Work the highest layer that does not yet REACH THE DECISION. Do not skip.

1. **USAGE** — Who had upticks or downs in usage, script changes, role changes from the games just played. This layer rewrites what each team actually is right now. Nothing downstream may be read off stale ideas of these teams.
2. **HEALTH** — Injuries and availability, with names. The players the health layer says are actually playing.
3. **MATCHUPS** — Player vs player, coach vs coach, scheme vs scheme, using the players from the health layer.
4. **SITUATIONS** — The spot, the stakes, divisional familiarity, game slot (TNF / early / midday / primetime / MNF), rest, schedule.
5. **VENUES / WEATHER / REFS**
6. **EVERYTHING ELSE** — Narratives, tracking, the full corpus, all of it.
7. **BOOKS LAST** — Price check only. The books return PLAY at this price, ALT to this price, or PASS on price for plays the reasoning already likes. The market is one small input inside the reasoning at its proper small weight. It never selects the side.

Each layer is read in light of the layers before it.

---

## Per-wakeup contract

1. Read `docs/engine/SIGNAL-CENSUS.md` (or create it if missing). Find the highest layer that is not REACHES THE DECISION.
2. Wire that layer so its output reaches the decision or the trail. Prefer decision.
3. Prove it:
   - Produce a before/after published artifact on at least one real upcoming NFL game. The reasoning string must contain the layer (names, values, source). Read the artifact. Quote the relevant sentence.
   - Mutation proof: flip one real input in that layer (one named player ruled out, one usage shift) and show the reasoning and the play moving in response.
   - Update the census row to REACHES THE DECISION or REACHES ONLY THE TRAIL, with file:line.
4. After every push, verify the remote file content (size and key string). Do not claim wired until the remote file is read and the artifact is read.
5. Report as a scorecard: layer worked, disposition before/after, file:line, artifact excerpt (quoted), remote sha/size, remaining layers.

## Forbidden

- Market-first reasoning. Books never select the side or headline the Why.
- Placeholders. Never commit a file that contains PLACEHOLDER, REAL_RESTORED_CONTENT, or any string that is not the real content.
- Commit-title-as-proof. A title that says "wired" does not count. The published string must be read.
- Silent zeros. Missing data is a named gap, never a zero.
- Wiring `factor-narrative.ts` as designed. It narrates market factors as reasons. That path is the failure this work exists to kill.
- Inventing a signal, a number, or a wiring claim.

## Definition of done for a layer

- The layer's output appears in the published reasoning trail of a real game (quoted excerpt).
- A mutation of one input in that layer moves the reasoning or the play.
- The census row is updated with file:line and disposition.
- Remote file content was verified after the push.

## Exit condition

Every layer from Usage through Everything Else has REACHES THE DECISION or REACHES ONLY THE TRAIL, with proof. Books are a pricing service only. The published reasoning on a real game is the matchup trail, and the market is supporting context. No layer sits idle.

## Standing rules

- Never fabricate. Named evidence, named failures.
- If you hit a wall, name it exactly: file, line, missing input. Do not route around it silently.
- No publishing, no X posts, no flag flips, no silent MODEL_VERSION / grade / gate changes.
- Units, never dollars.
- The repository's own rules and the reasoning-depth spec govern everything not covered here.

Work until the layer is proven, then stop for the next wakeup. Do not claim the whole engine is done until the exit condition is met.
