/**
 * Projection basis gate — what a projection is ALLOWED to be built from, and
 * what it must say about itself.
 *
 * WHY THIS EXISTS, stated plainly because an earlier version of this reasoning
 * was wrong and cost a day. On the eve of Week 1 there are ZERO current-season
 * game rows, by definition: the season has not been played. Refusing to
 * project until current-season data exists would mean never projecting Week 1
 * at all - and Week 1 is the largest slate of the year. Prior-season
 * production is not "stale data" for a Week 1 projection; it is the correct
 * and only available basis, and it is what every projection system uses.
 *
 * What IS unacceptable is silence about it. A Week 1 number built on last
 * season must SAY it is built on last season, so a reader can weigh it. And
 * the same number in Week 8, still built on last season while eight weeks of
 * current data sit unused, is a genuine defect.
 *
 * So this gate has exactly two jobs:
 *   1. ACCEPT a prior-season basis early in a new season, and hand back the
 *      label the surface must show.
 *   2. REFUSE a basis that is actually indefensible - two seasons behind, a
 *      prior season once the current one is well underway, a sample too thin
 *      to mean anything, or a future season.
 *
 * It never invents, never silently downgrades, and never returns "ok" without
 * a label. Pure: no clock, no DB, no env.
 */

/** Below this many games behind a player's number, there is nothing to project from. */
export const MIN_GAMES_FOR_BASIS = 4;

/**
 * How many weeks into a new season a PRIOR-season basis stays admissible.
 *
 * DERIVED from MIN_GAMES_FOR_BASIS, not chosen. It was an independent literal
 * 3, and the two constants did not compose: by target week W a player has
 * played at most W-1 games, so a current-season basis cannot reach the 4-game
 * floor until week 5 — while a prior-season basis was refused from week 4.
 * Week 4 therefore admitted NO basis at all, current or prior, and the graded
 * pool would have been empty for that entire week. Found in review, after the
 * first fix for the post-grace failure exposed it.
 *
 * Tying the window to the sample requirement makes the handoff exact: prior
 * season is admissible through week MIN_GAMES_FOR_BASIS, and at the first week
 * it is refused the current season can already supply the required games.
 * Changing MIN_GAMES_FOR_BASIS now moves this with it, so the gap cannot
 * silently reopen (C-225).
 */
export const PRIOR_SEASON_GRACE_WEEKS = MIN_GAMES_FOR_BASIS;

export type ProjectionBasisCode =
  | "CURRENT_SEASON"
  | "PRIOR_SEASON_EARLY"
  | "REFUSED_TOO_OLD"
  | "REFUSED_PRIOR_SEASON_TOO_LATE"
  | "REFUSED_THIN_SAMPLE"
  | "REFUSED_FUTURE_BASIS"
  | "REFUSED_UNUSABLE_INPUT";

export interface ProjectionBasisInput {
  /** Season the projection is FOR. */
  readonly targetSeason: number;
  /** Week within the target season, 1-based. */
  readonly targetWeek: number;
  /** Season the underlying numbers actually come from. */
  readonly basisSeason: number;
  /** Games behind this player's number in that basis season. */
  readonly gamesBehind: number;
}

export type ProjectionBasis =
  | {
      readonly ok: true;
      readonly code: Extract<ProjectionBasisCode, "CURRENT_SEASON" | "PRIOR_SEASON_EARLY">;
      readonly basisSeason: number;
      readonly targetSeason: number;
      readonly targetWeek: number;
      readonly gamesBehind: number;
      /** Customer-facing. Never empty on an accepted basis. */
      readonly label: string;
    }
  | {
      readonly ok: false;
      readonly code: Exclude<ProjectionBasisCode, "CURRENT_SEASON" | "PRIOR_SEASON_EARLY">;
      readonly reason: string;
    };

const isUsableInt = (n: number): boolean => Number.isFinite(n) && Number.isInteger(n);

/**
 * Decide whether `basisSeason` may support a projection for
 * `targetSeason`/`targetWeek`, and produce the label if so.
 */
export function evaluateProjectionBasis(input: ProjectionBasisInput): ProjectionBasis {
  const { targetSeason, targetWeek, basisSeason, gamesBehind } = input;

  // Malformed input is refused rather than coerced. A NaN week must not be
  // able to buy a projection by defaulting to 1.
  if (
    !isUsableInt(targetSeason) ||
    !isUsableInt(basisSeason) ||
    !isUsableInt(targetWeek) ||
    targetWeek < 1 ||
    !Number.isFinite(gamesBehind) ||
    gamesBehind < 0
  ) {
    return {
      ok: false,
      code: "REFUSED_UNUSABLE_INPUT",
      reason: "Projection basis inputs are not usable whole numbers.",
    };
  }

  if (basisSeason > targetSeason) {
    return {
      ok: false,
      code: "REFUSED_FUTURE_BASIS",
      reason: `Basis season ${basisSeason} is later than the target season ${targetSeason}.`,
    };
  }

  if (gamesBehind < MIN_GAMES_FOR_BASIS) {
    return {
      ok: false,
      code: "REFUSED_THIN_SAMPLE",
      reason: `Only ${gamesBehind} game(s) behind this number; ${MIN_GAMES_FOR_BASIS} are required.`,
    };
  }

  if (basisSeason === targetSeason) {
    return {
      ok: true,
      code: "CURRENT_SEASON",
      basisSeason,
      targetSeason,
      targetWeek,
      gamesBehind,
      label: `${targetSeason} season form, ${gamesBehind} games`,
    };
  }

  if (basisSeason === targetSeason - 1) {
    if (targetWeek > PRIOR_SEASON_GRACE_WEEKS) {
      return {
        ok: false,
        code: "REFUSED_PRIOR_SEASON_TOO_LATE",
        reason:
          `Week ${targetWeek} of ${targetSeason} is past the prior-season grace window ` +
          `(${PRIOR_SEASON_GRACE_WEEKS} weeks); ${targetSeason} data should be in use by now.`,
      };
    }
    return {
      ok: true,
      code: "PRIOR_SEASON_EARLY",
      basisSeason,
      targetSeason,
      targetWeek,
      gamesBehind,
      // Names the season the number came from, not the season it is for.
      //
      // The parenthetical is WEEK-1 ONLY. Found in review: it was
      // unconditional, so in Weeks 2 and 3 - both still inside the grace
      // window - the label told a customer "no 2026 games played yet" after
      // one or two weeks of 2026 football had been played. A false statement
      // inside the provenance line is worse than no provenance line.
      label:
        targetWeek <= 1
          ? `${basisSeason} season basis, ${gamesBehind} games (no ${targetSeason} games played yet)`
          : `${basisSeason} season basis, ${gamesBehind} games (${targetSeason} Week ${targetWeek}; ` +
            `${targetSeason} sample not yet large enough)`,
    };
  }

  return {
    ok: false,
    code: "REFUSED_TOO_OLD",
    reason: `Basis season ${basisSeason} is ${targetSeason - basisSeason} seasons behind ${targetSeason}.`,
  };
}

/** True when the basis was accepted. Narrowing helper for call sites. */
export function basisAccepted(b: ProjectionBasis): b is Extract<ProjectionBasis, { ok: true }> {
  return b.ok;
}
