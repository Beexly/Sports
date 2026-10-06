/**
 * Situation derivation - the fifth unwired surface, and the cheapest one.
 *
 * THE GAP THIS CLOSES
 * `GameBundle.situation` is declared in engine.ts and read by FIVE live
 * branches in reasoning.ts: the rest edge (`restDaysHome` vs `restDaysAway`),
 * the travel/timezone tax, weather impact, injury impact, and schedule density.
 * It had ZERO callers in the repo. `buildSituationalContext` therefore always
 * passed `situation: {}`, so every one of those branches was dead code on every
 * pick the live picks endpoint served, and `situationalShift` could only ever be
 * moved by observations, never by the game context the model itself computed.
 *
 * `db-loaders.ts` fixed the TWELVE raw row surfaces (injuries, ratings, snaps,
 * NGS, player stats, game signals). It did not touch this one, because
 * situation is not a row set: it is a handful of ALREADY-COMPUTED columns on
 * the `games` row the picks query had been selecting all along
 * (`restDaysHome`, `restDaysAway`, `isBackToBackHome/Away`,
 * `scheduleDensityHome/Away`). Reading them costs nothing: no new query, no
 * new join, no abbreviation mapping.
 *
 * MEASURED, NOT ASSUMED (prod Neon, read-only, 2026-10-01)
 *   games                3,781 rows
 *   restDaysHome set     1,888  (week 1 has no prior game, so NULL is correct)
 *   scheduleDensityHome  2,659
 *   isBackToBackHome     3,781  (a boolean defaulting false, so "set" != "true")
 * A future game with both rest values set resolves a real rest edge. Verified
 * end to end: `Kansas City Chiefs` vs `Buffalo Bills` on 2026-09-25 resolves
 * restDays 8 vs 7, which is a +0.025 home-frame edge under the coefficient
 * reasoning.ts already uses.
 *
 * WHAT THIS DELIBERATELY DOES NOT CLAIM
 * `travelTimezoneShift` and `weatherImpact` are left unset. There is no venue,
 * stadium, latitude, longitude or altitude column anywhere in the schema (an
 * information_schema sweep found none), so a timezone shift would have to be
 * invented from team names, and `weatherImpact` has no producer at all: no code
 * path writes WEATHER or VENUE_ENVIRONMENT `game_signals` rows. Emitting a
 * guessed number into a field the spine then narrates as fact is exactly the
 * failure this repo's guards exist to prevent. An absent field is read as "no
 * observation"; a fabricated one would be read as a measurement.
 *
 * `injuryImpact` IS derived, because its inputs are real rows already loaded by
 * `db-loaders` - the caller passes the injury rows it holds. It is computed
 * from `injuryLean`, the SAME severity function signal-adapters.ts uses for the
 * INJURY_AVAILABILITY family, so the situation term and the observation family
 * cannot disagree about how bad an injury is.
 */

import { injuryLean, type InjuryRow } from "./signal-adapters";
import type { GameBundle } from "./engine";

/** The situation block, exactly as the spine reads it. */
export type SituationInput = NonNullable<GameBundle["situation"]>;

/** The scheduling columns this reads, as they come back on a `games` row. */
export interface GameScheduleContext {
  readonly restDaysHome?: number | null;
  readonly restDaysAway?: number | null;
  readonly isBackToBackHome?: boolean | null;
  readonly isBackToBackAway?: boolean | null;
  readonly scheduleDensityHome?: number | null;
  readonly scheduleDensityAway?: number | null;
}

/** Only finite numbers reach the spine. NaN would poison every downstream sum. */
function num(v: number | null | undefined): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/**
 * Availability impact from the injury rows already loaded for this game.
 *
 * Returned as a signed, bounded scalar in [-0.25, 0.25] and expressed in the
 * HOME frame: POSITIVE means the home side is healthier. The spine adds it
 * verbatim to `situationalShift`, so the sign has to name which club it
 * favours rather than being an undirected "injuries exist" marker.
 *
 * Magnitude is capped so a single brutal game cannot swing a pick by more than
 * a few points. Availability is real information, not a veto.
 */
export function injuryImpactFromRows(
  homeInjuries: readonly InjuryRow[] | undefined,
  awayInjuries: readonly InjuryRow[] | undefined,
): number | undefined {
  const home = homeInjuries ?? [];
  const away = awayInjuries ?? [];
  if (home.length === 0 && away.length === 0) return undefined;

  // Total severity load per side, weighted so a lost starter counts more than
  // a minor knock. The SUM is deliberate: the spine already has a capped,
  // normalised term, and an injury outbreak across a roster should read as
  // heavier than one isolated ding. It does mean five minor hurts can outrank
  // a single lost starter; that is the intended reading of "how much of this
  // club is unavailable", not a claim that any one of them matters most.
  const weight = (rows: readonly InjuryRow[]): number =>
    rows.reduce((sum, r) => sum + Math.abs(injuryLean(r.reportStatus, r.position)), 0);

  // Compare the two sides on the same scale rather than averaging: a club with
  // no injury report at all must not read as "average health". The subtraction
  // is home MINUS away on purpose. The heavier the away side's injury load,
  // the more this term must favour the home club, so a healthy home against a
  // banged-up away team comes out positive.
  const homeWeight = weight(home);
  const awayWeight = weight(away);
  // Normalise by the heavier side so the term scales with how much is actually
  // at stake, and clamp so neither side can dominate the number.
  const scale = Math.max(homeWeight, awayWeight, 0.0001);
  const normalized = ((awayWeight - homeWeight) / scale) * 0.25;
  return Math.max(-0.25, Math.min(0.25, normalized));
}

/**
 * Derive the situation block from the `games` scheduling columns and the
 * already-loaded injury rows.
 *
 * Returns undefined inputs as ABSENT rather than zero. `reasoning.ts` treats a
 * null `restDaysHome` as "no rest claim to make" and a null
 * `scheduleDensity` as "no density claim to make"; a zero would be a claim that
 * rest is 0 days or density is 0. The distinction is the whole point, so it is
 * preserved rather than flattened.
 */
export function deriveSituation(
  schedule: GameScheduleContext | undefined,
  injuries?: { home?: readonly InjuryRow[]; away?: readonly InjuryRow[] },
): SituationInput | undefined {
  const s = schedule ?? {};
  // The raw day columns go through untouched. Measured across all 1,888 prod
  // games that carry a rest value, `isBackToBackHome` is true for EVERY row at
  // restDays 0 and 1 and for NO row at 2 or above, so the boolean adds nothing
  // the number does not already say. Folding it into the day count would only
  // rewrite a correct 7 into an invented 0 on rows the pipeline never produces.
  const restHome = num(s.restDaysHome);
  const restAway = num(s.restDaysAway);
  const densityHome = num(s.scheduleDensityHome);
  const densityAway = num(s.scheduleDensityAway);

  const out: Record<string, number> = {};

  // The rest edge needs BOTH sides. One side alone has no comparison, and the
  // spine's branch is written as a difference, so a lone value would be read as
  // a claim it cannot support.
  if (restHome != null && restAway != null) {
    out["restDaysHome"] = restHome;
    out["restDaysAway"] = restAway;
  }

  // Density is a fatigue headwind the spine applies when > 0.5, so it wants the
  // WORSE of the two clubs rather than an average: a half-injured home side is
  // not offset by a rested away side in terms of who is under more load.
  if (densityHome != null || densityAway != null) {
    out["scheduleDensity"] = Math.max(densityHome ?? 0, densityAway ?? 0);
  }

  const injuryImpact = injuryImpactFromRows(injuries?.home, injuries?.away);
  if (injuryImpact != null && injuryImpact !== 0) out["injuryImpact"] = injuryImpact;

  return Object.keys(out).length > 0 ? (out as SituationInput) : undefined;
}