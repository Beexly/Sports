/**
 * Turnover-luck decomposition: occurrence (partially skill) vs recovery
 * (near-pure noise), per team, per game-sample.
 *
 * WHY THIS EXISTS
 * ----------------
 * The engine's core rating is Elo, and Elo is fit on final score margins.
 * A turnover swings the scoreboard the same way whether it was earned or
 * lucky, so raw Elo bakes turnover luck directly into team strength: a team
 * with strong underlying process (forces fumbles, generates picks) but a
 * bad recovery/interception-conversion record reads as WORSE than its
 * process deserves, and a team riding lucky recoveries reads as BETTER.
 * This repo's own research log (AGENTS.md "Gap analysis: what the Elo
 * engine does NOT use") names turnover-luck regression as "the single
 * biggest upgrade available to an Elo-based engine" and the methods
 * literature pass (v2 dossier §3) gives the numbers this module is built
 * on: fumble-RECOVERY year-to-year correlation measures 0.00 to -0.02
 * (near-pure noise; Stuart), while forced-fumble OCCURRENCE is weakly
 * repeatable (partially skill). The engine rule that follows, already
 * agreed in this repo: model occurrence, regress recovery toward the
 * league mean, and count FORCED fumbles, never RECOVERED fumbles, in any
 * team-strength feature. This module IS that rule, as a pure function.
 *
 * DECOMPOSITION
 * -------------
 * Two components, kept separate all the way through and never summed into
 * one scalar (a caller who wants a single number is making a weighting
 * decision this module has not fit and will not invent):
 *
 *   1. OCCURRENCE (`forcedFumbleOverExpected`, `interceptionOverExpected`):
 *      actual rate minus a league baseline rate, both denominated per the
 *      correct opportunity count (forced fumbles per PLAY, interceptions
 *      per opponent DROPBACK, mirroring this repo's own
 *      `defense_detail_2025/2026.csv` convention: INT forced rate per
 *      opponent dropback, forced-fumble rate per play). This is the
 *      partially-skill component and is reported AT FACE VALUE, not
 *      shrunk, because occurrence is not the noisy half.
 *   2. RECOVERY (`recoveryShareOverExpected`, `regressedRecoveryShare`):
 *      the team's own fumble-recovery share (recovered / (forced +
 *      recovered-by-opponent-of-own-fumbles is NOT what we have; see
 *      `TurnoverLuckInput` doc) minus the league baseline recovery share,
 *      then SHRUNK toward that baseline via `shrinkToLeagueMean` (named,
 *      tested, not a magic constant) because year-to-year recovery
 *      correlation is measured at ~0.00 to -0.02: almost the entire
 *      deviation from the league mean is noise and should regress almost
 *      all the way back.
 *
 * `expectedRegressionPoints` is the headline read: the recovery component
 * converted to an approximate point swing (turnovers x POINTS_PER_TURNOVER,
 * itself a cited, overridable constant) a team should expect to gain or
 * lose as a lucky/unlucky recovery record reverts toward the mean. It is a
 * DIRECTIONAL estimate for a human or a downstream weighting step to read,
 * not a score. See "NOT WIRED IN" below for exactly what it is missing to
 * become admissible as a scoring input.
 *
 * WORKED CASE (this repo's own lab note, cited to sanity-check the sign
 * and magnitude, not fit to it): one team forced 19 fumbles (+6.5 over
 * expectation) but recovered only 26.3%, about 20 points of recovery share
 * below the ~46.3% league baseline this module also uses as its default.
 * Process good, results unlucky, positive regression expected. That is
 * exactly the shape `computeTurnoverLuck` is built to surface: a strong
 * positive `forcedFumbleOverExpected` alongside a strong negative
 * `recoveryShareOverExpected`, netting to a positive expected-regression
 * estimate once the recovery share reverts.
 *
 * PRE-REGISTERED KILL LINE (before any backtest; none has been run; this
 * file carries zero fitted parameters and zero measured results)
 * ------------------------------------------------------------------------
 * On held-out, out-of-sample settled games, this signal should be
 * discarded (dropped from any future feature set, not merely down-
 * weighted) if EITHER of the following holds:
 *   (a) the measured year-to-year (or, absent enough seasons, split-half)
 *       correlation of a team's OWN recovery share, on OUR data, is NOT
 *       close to zero, i.e. materially above roughly 0.10 -- because then
 *       the premise that recovery is near-pure noise does not reproduce
 *       here and the shrinkage target and strength this module assumes
 *       are simply wrong; or
 *   (b) `expectedRegressionPoints`, computed at a game's kickoff from
 *       only that team's PRIOR games, does NOT correlate with that
 *       team's next-game turnover margin in the theoretically predicted
 *       direction (a team with a large positive expected-regression
 *       estimate should, on average, see its turnover margin move toward
 *       neutral, not away from it) at better than chance on a reasonable
 *       sample.
 * Either failure means the decomposition is not earning its keep and the
 * honest move is to cut it, not keep re-deriving the shrinkage strength
 * until something passes. NOT RUN. No production or backtest data has
 * touched this module.
 *
 * NOT WIRED IN
 * ------------
 * Pure, offline, zero I/O. Not imported by scoring.ts or any live pick
 * path. MODEL_VERSION is untouched; this module does not rank, gate or
 * publish anything, only computes a decomposition. Admissibility for
 * future wiring: a caller needs, per team, `forcedFumbleOverExpected`,
 * `interceptionOverExpected` (the occurrence/skill half, used at face
 * value) and `regressedRecoveryShare` together with `expectedRegressionPoints`
 * (the recovery/luck half, already shrunk) and the `sampleSize` /
 * `null`-vs-populated state to decide whether to trust a given team's
 * read this week. The combining WEIGHT between occurrence and the
 * regression estimate, and between this signal and Elo, is a calibration
 * decision this module has not fit and will not invent; whoever wires
 * this in owns that combination and the MODEL_VERSION bump it requires.
 * Note also that this module has no notion of RECOVERED-fumbles-by-team
 * feeding into any strength feature: per the engine rule above, recovered
 * fumbles never enter a team-strength number, and this module enforces
 * that by construction (`fumblesRecoveredByTeam` is consumed only to
 * derive the recovery-SHARE ratio, never surfaced as a raw count).
 */

/**
 * One team's raw counting inputs over some sample of games (a season, a
 * trailing window -- caller's choice; this module is sample-agnostic
 * beyond the minimum-size gate).
 *
 * Recovery-share convention: `fumblesForced` is the number of TIMES this
 * team's defense forced an opponent fumble (the occurrence event);
 * `fumblesRecoveredByTeam` is how many of those specific forced fumbles
 * this team's defense itself recovered (as opposed to the opponent
 * recovering its own fumble). `recoveryShare = fumblesRecoveredByTeam /
 * fumblesForced` is undefined when `fumblesForced` is 0, which
 * `computeTurnoverLuck` handles by omitting the recovery component for
 * that team (see `TurnoverLuckResult.recoveryShare`), never by defaulting
 * it to a neutral rate.
 */
export interface TurnoverLuckInput {
  readonly team: string;
  /** Total defensive plays faced, the occurrence denominator for forced fumbles. */
  readonly defensivePlays: number;
  /** Opponent dropbacks faced, the occurrence denominator for interceptions. */
  readonly opponentDropbacks: number;
  /** Fumbles this team's defense FORCED (occurrence event; never "recovered"). */
  readonly fumblesForced: number;
  /** Of those forced fumbles, how many this team's own defense recovered. */
  readonly fumblesRecoveredByTeam: number;
  /** Interceptions this team's defense recorded. */
  readonly interceptions: number;
}

/** League-wide baseline rates the occurrence/recovery components are measured against. */
export interface LeagueTurnoverBaseline {
  /** League forced-fumble rate per defensive play. */
  readonly forcedFumbleRatePerPlay: number;
  /** League interception rate per opponent dropback. */
  readonly interceptionRatePerDropback: number;
  /**
   * League fumble-RECOVERY share (the forcing defense's own recovery rate
   * on fumbles it forced). Default 0.463 -- this repo's own measured
   * 2025 league baseline (AGENTS.md "ENGINE BENCHMARK: TURNOVER-LUCK
   * OCCURRENCE VS RECOVERY", `turnover_luck_2025.csv`).
   */
  readonly recoveryShare: number;
}

/** This repo's own measured 2025 league recovery-share baseline; see `LeagueTurnoverBaseline` doc. */
export const DEFAULT_LEAGUE_RECOVERY_SHARE = 0.463;

/**
 * Approximate point value of one turnover, used only to convert the
 * regressed recovery-share deviation into an interpretable point swing.
 * This is a commonly cited rule-of-thumb order of magnitude, NOT a fitted
 * constant; overridable, and callers that need a precise figure should
 * supply their own rather than trust this default for anything scored.
 */
export const DEFAULT_POINTS_PER_TURNOVER = 4.5;

export interface TurnoverLuckOptions {
  /**
   * Minimum defensive plays AND minimum opponent dropbacks required before
   * a team's occurrence components are computed; below it the whole result
   * is `null` for that team (see `computeTurnoverLuck` return contract).
   * Default 100 defensive plays / 20 opponent dropbacks (roughly a
   * quarter-to-half season's worth; chosen to keep an occurrence RATE from
   * being dominated by single-game noise, not fit to any outcome).
   */
  readonly minDefensivePlays?: number;
  readonly minOpponentDropbacks?: number;
  /**
   * Minimum forced fumbles required before the RECOVERY component (as
   * opposed to the occurrence component) is computed; below it
   * `recoveryShare` is omitted (`null`) even though the occurrence
   * components may still be populated, because a recovery-share ratio
   * over a handful of forced fumbles is nearly pure sampling noise on top
   * of a signal that is already near-pure noise. Default 5.
   */
  readonly minFumblesForced?: number;
  /**
   * Shrinkage strength toward the league recovery-share mean, in [0, 1]:
   * 0 leaves the raw observed share untouched, 1 collapses it entirely to
   * the league mean. Default 0.9 -- deliberately AGGRESSIVE, not a
   * halfway compromise, because the cited year-to-year recovery
   * correlation (~0.00 to -0.02) is close enough to zero that the honest
   * read is "almost all of the deviation is noise," and 0.9 reflects that
   * rather than splitting the difference with the occurrence component's
   * un-shrunk treatment. See `shrinkToLeagueMean`.
   */
  readonly recoveryShrinkage?: number;
  readonly leagueBaseline?: LeagueTurnoverBaseline;
  /** See `DEFAULT_POINTS_PER_TURNOVER`. */
  readonly pointsPerTurnover?: number;
}

const DEFAULT_MIN_DEFENSIVE_PLAYS = 100;
const DEFAULT_MIN_OPPONENT_DROPBACKS = 20;
const DEFAULT_MIN_FUMBLES_FORCED = 5;
const DEFAULT_RECOVERY_SHRINKAGE = 0.9;

/**
 * Measured, not assumed. Computed from this repo's own 2025 lab export
 * `docs/research/2026-09-17/gse-lab/defense_detail_2025.csv` (32 teams, REG,
 * the same filtered sample as `team_metrics_2025.csv`), as POOLED LEAGUE
 * TOTALS rather than a mean of per-team rates, because a mean of rates weights
 * a low-snap defense equally with a high-snap one and is a different statistic:
 *
 *   forced fumbles 404 / defensive plays 29239 = 0.013817
 *   interceptions  329 / dropbacks faced 17626 = 0.018666
 *
 * (The mean-of-team-rates reads 0.013837 and 0.018673 on this sample, so the
 * choice is immaterial here; it is stated so a future editor recomputing these
 * knows which definition to reproduce.)
 *
 * These replace two invented placeholders (0.0096 and 0.024) that were wrong in
 * OPPOSITE directions: the fumble rate understated the league by about 44% and
 * the interception rate overstated it by about 29%. This baseline is SUBTRACTED
 * to produce "over expected", so a wrong baseline is not noise, it shifts every
 * team's occurrence reading the same way and would have made the whole league
 * look fumble-lucky and interception-unlucky at once.
 */
export const DEFAULT_LEAGUE_BASELINE: LeagueTurnoverBaseline = {
  forcedFumbleRatePerPlay: 0.013817,
  interceptionRatePerDropback: 0.018666,
  recoveryShare: DEFAULT_LEAGUE_RECOVERY_SHARE,
};

/**
 * Shrink an observed rate toward a league mean by a named, explicit
 * strength in [0, 1]. `strength = 0` returns `observed` unchanged;
 * `strength = 1` returns `leagueMean` unchanged; values between are a
 * linear (convex) blend. This is the ONLY place shrinkage math lives in
 * this module -- never inlined at a call site -- so the strength is
 * reviewable and testable in isolation from the rest of the decomposition.
 */
export function shrinkToLeagueMean(observed: number, leagueMean: number, strength: number): number {
  if (!Number.isFinite(strength) || strength < 0 || strength > 1) {
    throw new RangeError(`shrinkToLeagueMean: strength must be in [0, 1], got ${strength}`);
  }
  return observed * (1 - strength) + leagueMean * strength;
}

/** The occurrence half: partially-skill deviations from the league baseline, at face value (never shrunk here). */
export interface TurnoverOccurrence {
  readonly forcedFumbleRatePerPlay: number;
  /** `forcedFumbleRatePerPlay` minus the league baseline rate. Positive = forcing more than expected. */
  readonly forcedFumbleOverExpected: number;
  readonly interceptionRatePerDropback: number;
  /** `interceptionRatePerDropback` minus the league baseline rate. Positive = intercepting more than expected. */
  readonly interceptionOverExpected: number;
}

/** The recovery half: near-pure-noise deviation from the league baseline, reported both raw and shrunk. */
export interface TurnoverRecovery {
  readonly fumblesForced: number;
  readonly fumblesRecoveredByTeam: number;
  /** `fumblesRecoveredByTeam / fumblesForced`. Only present when `fumblesForced >= minFumblesForced`. */
  readonly recoveryShare: number;
  /** `recoveryShare` minus the league baseline recovery share (raw, UNSHRUNK). Negative = recovering less than expected (unlucky). */
  readonly recoveryShareOverExpected: number;
  /** `recoveryShare` shrunk toward the league baseline per `shrinkToLeagueMean` -- the honest best estimate of this team's TRUE recovery rate going forward. */
  readonly regressedRecoveryShare: number;
  /**
   * Approximate point swing this team should expect to gain (positive) or
   * lose (negative) as `recoveryShare` reverts toward `regressedRecoveryShare`:
   * `(regressedRecoveryShare - recoveryShare) * fumblesForced * pointsPerTurnover`.
   * A team currently UNDER-recovering (negative `recoveryShareOverExpected`)
   * gets a POSITIVE expected-regression estimate, i.e. positive news going
   * forward; a lucky over-recovering team gets a negative one.
   */
  readonly expectedRegressionPoints: number;
}

export interface TurnoverLuckResult {
  readonly team: string;
  readonly defensivePlays: number;
  readonly opponentDropbacks: number;
  readonly occurrence: TurnoverOccurrence;
  /** `null` when `fumblesForced` is below `minFumblesForced` -- NOT a neutral/zero recovery read. */
  readonly recovery: TurnoverRecovery | null;
}

/**
 * Compute the turnover-luck decomposition for one team's counting inputs.
 * Returns `null`, never a neutral default, when `input.defensivePlays` or
 * `input.opponentDropbacks` is below the configured minimum -- per this
 * codebase's standing invariant, a signal with insufficient data gets NO
 * VOTE, and a caller must never read `null` as agreement, disagreement, or
 * a league-average zero. Within a populated result, `recovery` is
 * INDEPENDENTLY nulled per `minFumblesForced` for the same reason: an
 * occurrence rate can be trustworthy on a sample too thin for the noisier
 * recovery ratio to mean anything.
 */
export function computeTurnoverLuck(
  input: TurnoverLuckInput,
  options: TurnoverLuckOptions = {},
): TurnoverLuckResult | null {
  const minDefensivePlays = options.minDefensivePlays ?? DEFAULT_MIN_DEFENSIVE_PLAYS;
  const minOpponentDropbacks = options.minOpponentDropbacks ?? DEFAULT_MIN_OPPONENT_DROPBACKS;
  const minFumblesForced = options.minFumblesForced ?? DEFAULT_MIN_FUMBLES_FORCED;
  const recoveryShrinkage = options.recoveryShrinkage ?? DEFAULT_RECOVERY_SHRINKAGE;
  const leagueBaseline = options.leagueBaseline ?? DEFAULT_LEAGUE_BASELINE;
  const pointsPerTurnover = options.pointsPerTurnover ?? DEFAULT_POINTS_PER_TURNOVER;

  if (
    !Number.isFinite(input.defensivePlays) ||
    !Number.isFinite(input.opponentDropbacks) ||
    !Number.isFinite(input.fumblesForced) ||
    !Number.isFinite(input.fumblesRecoveredByTeam) ||
    !Number.isFinite(input.interceptions)
  ) {
    return null;
  }
  if (input.defensivePlays < minDefensivePlays || input.opponentDropbacks < minOpponentDropbacks) {
    return null;
  }
  if (input.fumblesForced < 0 || input.fumblesRecoveredByTeam < 0 || input.interceptions < 0) {
    return null;
  }
  if (input.fumblesRecoveredByTeam > input.fumblesForced) {
    // A team cannot recover more of its own forced fumbles than it forced.
    // Malformed input: refuse rather than compute a share above 1.
    return null;
  }

  const forcedFumbleRatePerPlay = input.fumblesForced / input.defensivePlays;
  const interceptionRatePerDropback = input.interceptions / input.opponentDropbacks;

  const occurrence: TurnoverOccurrence = {
    forcedFumbleRatePerPlay,
    forcedFumbleOverExpected: forcedFumbleRatePerPlay - leagueBaseline.forcedFumbleRatePerPlay,
    interceptionRatePerDropback,
    interceptionOverExpected: interceptionRatePerDropback - leagueBaseline.interceptionRatePerDropback,
  };

  let recovery: TurnoverRecovery | null = null;
  if (input.fumblesForced >= minFumblesForced) {
    const recoveryShare = input.fumblesRecoveredByTeam / input.fumblesForced;
    const regressedRecoveryShare = shrinkToLeagueMean(recoveryShare, leagueBaseline.recoveryShare, recoveryShrinkage);
    const expectedRegressionPoints =
      (regressedRecoveryShare - recoveryShare) * input.fumblesForced * pointsPerTurnover;
    recovery = {
      fumblesForced: input.fumblesForced,
      fumblesRecoveredByTeam: input.fumblesRecoveredByTeam,
      recoveryShare,
      recoveryShareOverExpected: recoveryShare - leagueBaseline.recoveryShare,
      regressedRecoveryShare,
      expectedRegressionPoints,
    };
  }

  return {
    team: input.team,
    defensivePlays: input.defensivePlays,
    opponentDropbacks: input.opponentDropbacks,
    occurrence,
    recovery,
  };
}
