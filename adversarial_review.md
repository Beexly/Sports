# Adversarial Review of TE Target Rate SHADOW Metric

## Assumptions and What Might Break If Wrong
1. **Assumption:** nflverse `posteam` reliably identifies the offense.
   - *If wrong:* Target assignment could flip, assigning TE target propensities to the defense or corrupting the `totalDropbacks` baseline.
2. **Assumption:** `game_id` strings safely sort chronologically using a naive string split or alphanumeric sort (e.g. `2025_01` vs `2025_10`).
   - *If wrong:* The rolling 16-game window would grab random subsets of the season instead of the actual trailing window. The custom `compareGames` splitting logic prevents this by casting to int.
3. **Assumption:** TE position tags from nflverse remain stable.
   - *If wrong:* Downstream code reading "TE" would miss targets if a new abbreviation like "TE/H-Back" is used.
4. **Assumption:** The target QB must cross 200 total career dropbacks or 80 rolling dropbacks to have sufficient sample size.
   - *If wrong:* Nulls would be emitted too often (shrinking the metric availability) or too rarely (returning overly noisy metric calculations).

## Attempts to Break the Code
1. **Attempt:** Pass plays ahead of the target game (leakage).
   - *Result:* Test `enforces strict point-in-time discipline` verifies that games with `compareGames(play.gameId, targetGameId) >= 0` are bypassed, keeping the metric completely blind to the future.
2. **Attempt:** Pass QBs with tiny target samples (e.g., 8 dropbacks).
   - *Result:* The floor thresholds successfully trigger, returning `null` for `career` and `rolling16` rather than generating a noisy, unstable fraction.
3. **Attempt:** Introduce a league mean that might skew shrinkage improperly.
   - *Result:* The calculation builds a custom `leagueMean` dynamically from the passed dataset, avoiding a hardcoded float like 0.219 that could drift and become inaccurate.

The code and tests survive the adversarial review.
