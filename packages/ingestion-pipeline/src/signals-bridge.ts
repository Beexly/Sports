/**
 * signals-bridge.ts — fail-closed ingestion bridge for the `signals/**` family
 * of `packages/prediction-engine` (bio, biomechanical, chemistry, discipline,
 * efficiency, environment, environmental, narrative, schematic, situational,
 * tactical, trench, plus expected-turnover-diff / opponent-adjusted-epa /
 * turnover-luck).
 *
 * WHY A BRIDGE AND NOT A CALL SITE
 * --------------------------------
 * Every kernel under `signals/**` is a pure function that CLAMPS its inputs
 * and then returns a number. That is correct for a research kernel and wrong
 * for an ingestion layer: a caller who feeds a blank target share or a single
 * observation gets a confident, plausible, meaningless read back out. This
 * bridge is the only sanctioned way for `packages/ingestion-pipeline` to reach
 * these kernels, and it does three things the kernels deliberately do not:
 *
 *   1. VALIDATE before calling. Missing, non-finite, out-of-range or
 *      below-sample-floor inputs fail CLOSED with a specific reason naming
 *      the offending field and the actual value. No clamping, no defaulting,
 *      no imputation. A signal with insufficient data gets NO VOTE.
 *   2. CALL inside try/catch, so a kernel that throws (e.g.
 *      `shrinkToLeagueMean` on an out-of-range strength) surfaces as a named
 *      failure rather than a crash in the ingestion loop.
 *   3. RE-VALIDATE the output for finiteness and legal range, because a
 *      clamp inside a kernel can still emit a value the caller has no right
 *      to read (a probability above 1, a signed "tilt" drifting positive,
 *      a multiplier that flipped sign).
 *
 * DOMAIN RULES ENFORCED HERE (non-negotiable, this is a betting engine)
 * ---------------------------------------------------------------------
 *   - MAGNITUDE-AS-PROBABILITY. Any field whose magnitude is a probability is
 *     named `...Probability` / `...ProbabilityDelta` and validated inside
 *     [0, 1]. A signed effect is NEVER named as a probability: it is named
 *     `...TiltPoints`, `...TiltPp`, `...AdjustmentPoints` or `...Delta` and is
 *     range-checked against a signed band so the sign survives end to end.
 *     Five kernels return a field literally named `confidence` in [0, 1]
 *     (qb-turnover-worthy-play-regression, high-altitude-fatigue-decay,
 *     two-minute-hurry-up-efficiency, early-down-pass-rate-momentum,
 *     short-week-road-deficit). That is a MODEL-CONFIDENCE SCORE, not a win
 *     probability, so it is RENAMED to `signalConfidenceScore` on the way
 *     out. `man-zone-receiver-archetype` returns
 *     `explosivePlayProbabilityDelta`, a signed percentage-point delta that
 *     can be -5.0; it is RENAMED to `explosivePlayTiltPp` because the original
 *     name invites a caller to read a signed shift as a probability.
 *   - PHYSICAL/ENVIRONMENTAL ADJUSTMENTS ARE MODIFIERS, NOT FORECASTS. The
 *     weather, altitude, turf and travel evals return `readingKind:
 *     "PHYSICAL_MODIFIER"` and expose only shifts/multipliers. They do not
 *     expose, and must not be combined into, a forecast.
 *   - SAMPLE FLOORS FAIL CLOSED. Per-player and per-team effects need real
 *     samples. Each such eval declares `MIN_*` constants and refuses below
 *     them, naming the ACTUAL count in the reason. Where a kernel itself
 *     "regresses to league median" below its own threshold (TWP regression,
 *     two-minute conversion, early-down PROE) the bridge refuses rather than
 *     forwarding a league baseline dressed as this team's read.
 *   - SIGN AND DIRECTION ARE PRESERVED. No `Math.abs` on any effect, ever.
 *   - DETERMINISTIC. No eval needs randomness; nothing here calls
 *     `Math.random`, and the two solvers used (opponent netting, turnover
 *     shrinkage) are pure.
 *
 * NOT WIRED IN
 * ------------
 * Pure, offline, zero I/O, no env reads. Nothing here is imported by
 * `generate-signal-slate.ts`, `scoring.ts` or any publish path. The
 * combining WEIGHT between any of these signals and Elo remains a
 * calibration decision this module does not invent, and any wiring of these
 * results into a published probability owns its own MODEL_VERSION bump.
 * `evalExpectedTurnoverDiff` additionally refuses unless its caller's
 * `enabled` option is explicitly true, mirroring the kernel's own
 * `EXPECTED_TURNOVER_DIFF_ENABLED` flag default.
 */

// --- (a) efficiency ---------------------------------------------------------
import {
  evaluateRedZoneTeLeverage,
  type RedZoneEfficiencyContext,
} from "@sports/prediction-engine/src/signals/efficiency/redzone-te-leverage.js";
import {
  evaluateManZoneReceiverArchetype,
  type ManZoneCoverageContext,
} from "@sports/prediction-engine/src/signals/efficiency/man-zone-receiver-archetype.js";
import {
  evaluateQbTwpRegression,
  type QbTwpContext,
} from "@sports/prediction-engine/src/signals/efficiency/qb-turnover-worthy-play-regression.js";
import {
  evaluateBackupQbTargetDistribution,
  type BackupQbContext,
} from "@sports/prediction-engine/src/signals/efficiency/backup-qb-target-distribution.js";
import {
  evaluateWr1OutRedistribution,
  type Wr1OutContext,
} from "@sports/prediction-engine/src/signals/efficiency/wr1-out-target-redistribution.js";

// --- (b) environment / environmental ---------------------------------------
import {
  evaluateTemperaturePrecipitationDecay,
  type WeatherConditionContext,
} from "@sports/prediction-engine/src/signals/environmental/temperature-precipitation-decay.js";
import {
  evaluateHighAltitudeFatigueDecay,
  type HighAltitudeContext,
} from "@sports/prediction-engine/src/signals/environmental/high-altitude-fatigue-decay.js";
import {
  evaluateLinearWindPassImpact,
  type WindPassImpactContext,
} from "@sports/prediction-engine/src/signals/environmental/linear-wind-pass-impact.js";
import {
  calculateWindElasticity,
  type WindElasticityInput,
} from "@sports/prediction-engine/src/signals/environment/wind-elasticity.js";

// --- (c) tactical -----------------------------------------------------------
import {
  evaluateEarlyDownProeMomentum,
  type EarlyDownProeContext,
} from "@sports/prediction-engine/src/signals/tactical/early-down-pass-rate-momentum.js";
import {
  evaluateRedZonePersonnelGrouping,
  type RedZonePersonnelContext,
} from "@sports/prediction-engine/src/signals/tactical/redzone-personnel-grouping.js";
import {
  evaluateTwoMinuteHurryUpEfficiency,
  type TwoMinuteHurryUpContext,
} from "@sports/prediction-engine/src/signals/tactical/two-minute-hurry-up-efficiency.js";

// --- (d) situational --------------------------------------------------------
import {
  evaluateRefereeCrewTendencies,
  type RefereeCrewContext,
} from "@sports/prediction-engine/src/signals/situational/referee-crew-tendencies.js";
import {
  evaluateCoachingTendencies,
  type PlayCallingContext,
  type PlayType,
} from "@sports/prediction-engine/src/signals/situational/coaching-tendencies.js";
import {
  evaluateFourthDownCoachingAggressiveness,
  type FourthDownCoachingContext,
} from "@sports/prediction-engine/src/signals/situational/fourth-down-coaching-aggressiveness.js";
import {
  evaluateLopezSecondAndTenTendency,
  type LopezSecondAndTenContext,
} from "@sports/prediction-engine/src/signals/situational/lopez-second-and-ten-tendency.js";
import {
  evaluateShortWeekRoadDeficit,
  type ShortWeekRoadContext,
} from "@sports/prediction-engine/src/signals/situational/short-week-road-deficit.js";
import {
  evaluateCircadianTravelFatigue,
  type CircadianTravelInput,
} from "@sports/prediction-engine/src/signals/situational/circadian-travel-fatigue.js";
import {
  evaluateAgeConditionedRest,
  type AgeConditionedRestContext,
} from "@sports/prediction-engine/src/signals/situational/age-conditioned-rest.js";

// --- (e) chemistry / discipline / narrative / schematic / trench / bio ------
import {
  evaluateQbReceiverContinuity,
  type QbReceiverContinuityContext,
} from "@sports/prediction-engine/src/signals/chemistry/qb-receiver-continuity.js";
import {
  evaluatePenaltyDifferentialMomentum,
  type PenaltyDifferentialContext,
} from "@sports/prediction-engine/src/signals/discipline/penalty-differential-momentum.js";
import {
  evaluateContractMilestones,
  type ContractMilestoneContext,
} from "@sports/prediction-engine/src/signals/narrative/contract-incentives-milestones.js";
import {
  evaluateRookieBreakoutCohort,
  type RookieBreakoutContext,
} from "@sports/prediction-engine/src/signals/narrative/rookie-breakout-cohort.js";
import {
  evaluateByeWeekDefensiveInstallation,
  type ByeWeekDefensiveContext,
} from "@sports/prediction-engine/src/signals/schematic/bye-week-defensive-installation.js";
import {
  evaluateOffensiveLineTrench,
  type OffensiveLineTrenchInput,
} from "@sports/prediction-engine/src/signals/trench/offensive-line-continuity.js";
import {
  analyzeInjuryTrajectory,
  type InjuryPracticeReport,
} from "@sports/prediction-engine/src/signals/bio/injury-trajectory.js";
import {
  evaluateTurfSurfaceFatigue,
  type SurfaceFatigueContext,
} from "@sports/prediction-engine/src/signals/biomechanical/turf-surface-fatigue.js";

// --- (f) top-level ----------------------------------------------------------
import {
  computeExpectedTurnoverDiff,
  EXPECTED_TURNOVER_DIFF_FLAG,
  type ExpectedTurnoverDiffOptions,
  type ExpectedTurnoverDiffResult,
  type ExpectedTurnoverDiffTeam,
} from "@sports/prediction-engine/src/signals/expected-turnover-diff.js";
import {
  computeOpponentAdjustedEpa,
  type OpponentAdjustedEpaOptions,
  type OpponentAdjustedEpaRating,
  type TeamGameEpaSplit,
  type TeamEpaPrior,
} from "@sports/prediction-engine/src/signals/opponent-adjusted-epa.js";
import {
  computeTurnoverLuck,
  type TurnoverLuckInput,
  type TurnoverLuckOptions,
  type TurnoverLuckResult,
} from "@sports/prediction-engine/src/signals/turnover-luck.js";

// ============================================================================
// Result envelope
// ============================================================================

/**
 * Every eval returns this. `ok: false` means the signal contributes NOTHING:
 * a caller must never read a failure as a neutral zero, a disagreement, or
 * agreement. The `reason` is a specific, human-auditable string naming the
 * field and the observed value.
 */
export type SignalEval<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly reason: string };

function fail(reason: string): SignalEval<never> {
  return { ok: false, reason };
}

/**
 * What KIND of claim a result makes. A caller can switch on this once and
 * refuse to read a `PHYSICAL_MODIFIER` or a `SIGNED_TILT` as a probability.
 */
export type SignalReadingKind =
  /** Contains at least one field that is a genuine [0,1] probability. */
  | "PROBABILITY"
  /** Contains [0,1] frequencies/rates (conversion rate, target share) but no outcome probability. */
  | "RATE"
  /** Physical/environmental/travel effect. Shifts and multipliers only. NOT a forecast. */
  | "PHYSICAL_MODIFIER"
  /** Signed point/pp effects. NOT a probability, NOT an edge. */
  | "SIGNED_TILT"
  /** 0-100 composite indices. NOT a probability. */
  | "INDEX"
  /** Categorical tier with a small number of discrete outcomes. */
  | "CATEGORICAL";

// ============================================================================
// Shared validators
// ============================================================================

const isFiniteNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** A genuine probability: finite and inside [0, 1]. */
const isProb = (v: unknown): v is number => isFiniteNum(v) && v >= 0 && v <= 1;

/** Finite and inside an inclusive band, sign preserved. */
const isIn = (v: unknown, lo: number, hi: number): v is number =>
  isFiniteNum(v) && v >= lo && v <= hi;

/** A positive count of observations. */
const isCount = (v: unknown): v is number => isFiniteNum(v) && v >= 0;

/** A multiplier around 1.0 that must not flip sign or invert. */
const isMultiplier = (v: unknown, lo = 0.1, hi = 3): v is number => isIn(v, lo, hi);

/**
 * Returns a `fail` when `cond` holds, else `null`. Chained with `??` so a
 * single `if (bad) return bad;` reports the FIRST specific problem.
 */
function badIf(cond: boolean, reason: string): SignalEval<never> | null {
  return cond ? fail(reason) : null;
}

/** Run a kernel that may throw, turning any throw into a named failure. */
function guard<T>(what: string, fn: () => T): SignalEval<T> {
  try {
    return { ok: true, data: fn() };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return fail(`${what} threw: ${msg}`);
  }
}

// ============================================================================
// (a) signals/efficiency
// ============================================================================

/** A red-zone conversion rate read off one game is noise; require a real window. */
export const MIN_RZ_LEVERAGE_GAMES = 4;
/** Chemistry read needs shared snaps, not a shared roster spot. */
export const MIN_QB_RX_SHARED_GAMES = 5;
/** The kernel already treats <40 attempts as unreportable; we refuse instead of forwarding its league fallback. */
export const MIN_TWP_PASS_ATTEMPTS = 40;
/** Season-level target shares, not a single game. */
export const MIN_TARGET_SHARE_GAMES = 4;

/** Red-zone TE leverage. `tightEndTouchdownProbability` is a real [0,1] probability; the fair-value decimal is odds, not a probability. */
export interface RedZoneTeLeverageEval {
  readonly readingKind: "PROBABILITY";
  /** Expected team red-zone TDs per game (a count, not a probability). */
  readonly projectedTeamRedZoneTouchdowns: number;
  /** Probability this tight end scores at least one red-zone TD in a game, in [0, 1]. */
  readonly tightEndTouchdownProbability: number;
  /** Fair decimal price implied by that probability. Odds, NOT a probability. */
  readonly anytimeTdFairValueDecimal: number;
  /** Red-zone target share divided by the 15% league baseline share. A ratio >= 1.0, not a probability. */
  readonly targetShareLeverageRatio: number;
  readonly matchupAdvantageGrade: "ELITE" | "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE";
  readonly gamesSampled: number;
}

export function evalRedZoneTeLeverage(input: {
  readonly teamRedZoneDrivesPerGame: number;
  readonly teamRedZoneTdConversionRate: number;
  readonly tightEndRedZoneTargetShare: number;
  readonly opponentAllowedRedZoneTdRate: number;
  readonly opponentTeAllowedDvoaRank: number;
  readonly gamesSampled: number;
}): SignalEval<RedZoneTeLeverageEval> {
  const bad =
    badIf(!isIn(input.teamRedZoneDrivesPerGame, 0.1, 12), `teamRedZoneDrivesPerGame out of range: ${String(input.teamRedZoneDrivesPerGame)}`) ??
    badIf(!isProb(input.teamRedZoneTdConversionRate), `teamRedZoneTdConversionRate must be a probability in [0,1]: ${String(input.teamRedZoneTdConversionRate)}`) ??
    badIf(!isProb(input.tightEndRedZoneTargetShare), `tightEndRedZoneTargetShare must be a share in [0,1]: ${String(input.tightEndRedZoneTargetShare)}`) ??
    badIf(!isProb(input.opponentAllowedRedZoneTdRate), `opponentAllowedRedZoneTdRate must be a probability in [0,1]: ${String(input.opponentAllowedRedZoneTdRate)}`) ??
    badIf(!isIn(input.opponentTeAllowedDvoaRank, 1, 32), `opponentTeAllowedDvoaRank must be an integer rank in [1,32]: ${String(input.opponentTeAllowedDvoaRank)}`) ??
    badIf(!isCount(input.gamesSampled) || input.gamesSampled < MIN_RZ_LEVERAGE_GAMES, `red-zone conversion needs >= ${MIN_RZ_LEVERAGE_GAMES} games sampled, got ${String(input.gamesSampled)}`);
  if (bad) return bad;

  const ctx: RedZoneEfficiencyContext = {
    teamRedZoneDrivesPerGame: input.teamRedZoneDrivesPerGame,
    teamRedZoneTdConversionRate: input.teamRedZoneTdConversionRate,
    tightEndRedZoneTargetShare: input.tightEndRedZoneTargetShare,
    opponentAllowedRedZoneTdRate: input.opponentAllowedRedZoneTdRate,
    opponentTeAllowedDvoaRank: input.opponentTeAllowedDvoaRank,
  };
  const r = guard("evaluateRedZoneTeLeverage", () => evaluateRedZoneTeLeverage(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.projectedTeamRedZoneTouchdowns, 0, 12), `projectedTeamRedZoneTouchdowns out of range: ${String(out.projectedTeamRedZoneTouchdowns)}`) ??
    badIf(!isProb(out.tightEndTouchdownProbability), `tightEndTouchdownProbability left [0,1]: ${String(out.tightEndTouchdownProbability)}`) ??
    badIf(!isIn(out.anytimeTdFairValueDecimal, 1, 1000), `anytimeTdFairValueDecimal out of range: ${String(out.anytimeTdFairValueDecimal)}`) ??
    badIf(!isIn(out.targetShareLeverageRatio, 0.1, 5), `targetShareLeverageRatio out of range: ${String(out.targetShareLeverageRatio)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PROBABILITY",
      projectedTeamRedZoneTouchdowns: out.projectedTeamRedZoneTouchdowns,
      tightEndTouchdownProbability: out.tightEndTouchdownProbability,
      anytimeTdFairValueDecimal: out.anytimeTdFairValueDecimal,
      targetShareLeverageRatio: out.targetShareLeverageRatio,
      matchupAdvantageGrade: out.matchupAdvantageGrade,
      gamesSampled: input.gamesSampled,
    },
  };
}

export interface ManZoneReceiverArchetypeEval {
  readonly readingKind: "RATE";
  readonly matchupAdvantageTier: "SMASH_SPOT" | "FAVORABLE" | "NEUTRAL" | "UNFAVORABLE" | "SHUTDOWN_RISK";
  readonly targetShareMultiplier: number;
  /** Adjusted share of team targets, in [0, 1]. A share, not a probability. */
  readonly adjustedTargetShare: number;
  /** Adjusted average depth of target in yards. */
  readonly adjustedAdot: number;
  readonly yprrMultiplier: number;
  /**
   * Signed percentage-point shift in the 20+ yard reception rate.
   * RENAMED from the kernel's `explosivePlayProbabilityDelta`: the kernel
   * returns signed values (down to -5.0), so the original name invited a
   * caller to read a signed delta as a probability.
   */
  readonly explosivePlayTiltPp: number;
}

export function evalManZoneReceiverArchetype(input: {
  readonly opponentManCoverageRate: number;
  readonly opponentTwoHighShellRate: number;
  readonly receiverArchetype: "ELITE_SEPARATOR" | "CONTESTED_BALL_WINNER" | "SLOT_ZONE_SETTLER" | "DEEP_BURNER";
  readonly baselineTargetShare: number;
  readonly baselineAdot: number;
}): SignalEval<ManZoneReceiverArchetypeEval> {
  const archetypes: readonly ManZoneCoverageContext["receiverArchetype"][] = [
    "ELITE_SEPARATOR",
    "CONTESTED_BALL_WINNER",
    "SLOT_ZONE_SETTLER",
    "DEEP_BURNER",
  ];
  const bad =
    badIf(!isProb(input.opponentManCoverageRate), `opponentManCoverageRate must be a rate in [0,1]: ${String(input.opponentManCoverageRate)}`) ??
    badIf(!isProb(input.opponentTwoHighShellRate), `opponentTwoHighShellRate must be a rate in [0,1]: ${String(input.opponentTwoHighShellRate)}`) ??
    badIf(!archetypes.includes(input.receiverArchetype), `receiverArchetype is not one of ${archetypes.join("|")}: ${String(input.receiverArchetype)}`) ??
    badIf(!isProb(input.baselineTargetShare), `baselineTargetShare must be a share in [0,1]: ${String(input.baselineTargetShare)}`) ??
    badIf(!isIn(input.baselineAdot, 1, 25), `baselineAdot must be in [1,25] yards: ${String(input.baselineAdot)}`);
  if (bad) return bad;

  const ctx: ManZoneCoverageContext = {
    opponentManCoverageRate: input.opponentManCoverageRate,
    opponentTwoHighShellRate: input.opponentTwoHighShellRate,
    receiverArchetype: input.receiverArchetype,
    baselineTargetShare: input.baselineTargetShare,
    baselineAdot: input.baselineAdot,
  };
  const r = guard("evaluateManZoneReceiverArchetype", () => evaluateManZoneReceiverArchetype(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.targetShareMultiplier, 0.5, 1.5), `targetShareMultiplier out of range: ${String(out.targetShareMultiplier)}`) ??
    badIf(!isProb(out.adjustedTargetShare), `adjustedTargetShare left [0,1]: ${String(out.adjustedTargetShare)}`) ??
    badIf(!isIn(out.adjustedAdot, 3, 25), `adjustedAdot out of range: ${String(out.adjustedAdot)}`) ??
    badIf(!isIn(out.yprrMultiplier, 0.5, 1.6), `yprrMultiplier out of range: ${String(out.yprrMultiplier)}`) ??
    badIf(!isIn(out.explosivePlayProbabilityDelta, -12, 12), `explosivePlayTiltPp out of range: ${String(out.explosivePlayProbabilityDelta)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      matchupAdvantageTier: out.matchupAdvantageTier,
      targetShareMultiplier: out.targetShareMultiplier,
      adjustedTargetShare: out.adjustedTargetShare,
      adjustedAdot: out.adjustedAdot,
      yprrMultiplier: out.yprrMultiplier,
      explosivePlayTiltPp: out.explosivePlayProbabilityDelta,
    },
  };
}

export interface QbTwpRegressionEval {
  readonly readingKind: "RATE";
  /** Interceptions per pass attempt, in [0,1]. A rate, not a win probability. */
  readonly actualIntRate: number;
  /** Turnover-worthy plays per pass attempt, in [0,1]. */
  readonly twpRate: number;
  /** Signed turnover events: POSITIVE = lucky (fewer INTs than the TWPs deserve). Sign preserved. */
  readonly turnoverLuckDifferential: number;
  /** Regressed future interception rate per attempt, in [0,1]. */
  readonly expectedFutureIntRate: number;
  /** Signed offensive EPA/play adjustment. A tilt, NOT an edge. */
  readonly offensiveEpaTilt: number;
  readonly turnoverRiskMultiplier: number;
  /**
   * The kernel's `confidence`, RENAMED. It is a model-confidence SCORE in
   * [0,1] describing how much the sample supports the read; it is NOT a win
   * probability and must never be published as one.
   */
  readonly signalConfidenceScore: number;
  readonly passAttempts: number;
  readonly explanation: string;
}

export function evalQbTwpRegression(input: {
  readonly passAttempts: number;
  readonly actualInterceptions: number;
  readonly turnoverWorthyPlays: number;
  readonly opponentDefensiveInterceptionRate: number;
}): SignalEval<QbTwpRegressionEval> {
  const bad =
    badIf(!isCount(input.passAttempts), `passAttempts must be a finite count: ${String(input.passAttempts)}`) ??
    badIf(input.passAttempts < MIN_TWP_PASS_ATTEMPTS, `TWP regression needs >= ${MIN_TWP_PASS_ATTEMPTS} pass attempts, got ${input.passAttempts}`) ??
    badIf(!isCount(input.actualInterceptions), `actualInterceptions must be a finite count: ${String(input.actualInterceptions)}`) ??
    badIf(input.actualInterceptions > input.passAttempts, `actualInterceptions ${input.actualInterceptions} exceeds passAttempts ${input.passAttempts}`) ??
    badIf(!isCount(input.turnoverWorthyPlays), `turnoverWorthyPlays must be a finite count: ${String(input.turnoverWorthyPlays)}`) ??
    badIf(input.turnoverWorthyPlays > input.passAttempts, `turnoverWorthyPlays ${input.turnoverWorthyPlays} exceeds passAttempts ${input.passAttempts}`) ??
    badIf(!isProb(input.opponentDefensiveInterceptionRate), `opponentDefensiveInterceptionRate must be a rate in [0,1]: ${String(input.opponentDefensiveInterceptionRate)}`);
  if (bad) return bad;

  const ctx: QbTwpContext = {
    passAttempts: input.passAttempts,
    actualInterceptions: input.actualInterceptions,
    turnoverWorthyPlays: input.turnoverWorthyPlays,
    opponentDefensiveInterceptionRate: input.opponentDefensiveInterceptionRate,
  };
  const r = guard("evaluateQbTwpRegression", () => evaluateQbTwpRegression(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.actualIntRate), `actualIntRate left [0,1]: ${String(out.actualIntRate)}`) ??
    badIf(!isProb(out.twpRate), `twpRate left [0,1]: ${String(out.twpRate)}`) ??
    badIf(!isIn(out.turnoverLuckDifferential, -60, 60), `turnoverLuckDifferential out of range: ${String(out.turnoverLuckDifferential)}`) ??
    badIf(!isProb(out.expectedFutureIntRate), `expectedFutureIntRate left [0,1]: ${String(out.expectedFutureIntRate)}`) ??
    badIf(!isIn(out.offensiveEpaAdjustment, -0.3, 0.3), `offensiveEpaTilt out of range: ${String(out.offensiveEpaAdjustment)}`) ??
    badIf(!isMultiplier(out.turnoverRiskMultiplier, 0.5, 2), `turnoverRiskMultiplier out of range: ${String(out.turnoverRiskMultiplier)}`) ??
    badIf(!isProb(out.confidence), `signalConfidenceScore left [0,1]: ${String(out.confidence)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      actualIntRate: out.actualIntRate,
      twpRate: out.twpRate,
      turnoverLuckDifferential: out.turnoverLuckDifferential,
      expectedFutureIntRate: out.expectedFutureIntRate,
      offensiveEpaTilt: out.offensiveEpaAdjustment,
      turnoverRiskMultiplier: out.turnoverRiskMultiplier,
      signalConfidenceScore: out.confidence,
      passAttempts: input.passAttempts,
      explanation: out.explanation,
    },
  };
}

export interface BackupQbTargetDistributionEval {
  readonly readingKind: "RATE";
  readonly checkdownFunnelActive: boolean;
  readonly targetShareMultiplier: number;
  /** Adjusted share of team targets, in [0,1]. */
  readonly adjustedTargetShare: number;
  readonly adjustedAdot: number;
  readonly receptionsProjectionMultiplier: number;
  readonly targetFunnelCategory: "HIGH_VOLUME_BENEFICIARY" | "MODERATE_BENEFICIARY" | "NEUTRAL" | "SEVERE_DECAY";
  /** Receptions-line basis the multiplier applies to, in rec/game. */
  readonly baselineReceptionsLine: number;
}

export function evalBackupQbTargetDistribution(input: {
  readonly isBackupStarting: boolean;
  readonly backupCareerPassAttempts: number;
  readonly playerRole: "PRIMARY_RUNNING_BACK" | "RECEIVING_RUNNING_BACK" | "TIGHT_END" | "SLOT_RECEIVER" | "BOUNDARY_DEEP_THREAT";
  readonly baselineTargetShare: number;
  readonly baselineAdot: number;
  readonly baselineReceptionsLine: number;
  readonly gamesSampled: number;
}): SignalEval<BackupQbTargetDistributionEval> {
  const roles: readonly BackupQbContext["playerRole"][] = [
    "PRIMARY_RUNNING_BACK",
    "RECEIVING_RUNNING_BACK",
    "TIGHT_END",
    "SLOT_RECEIVER",
    "BOUNDARY_DEEP_THREAT",
  ];
  const bad =
    badIf(typeof input.isBackupStarting !== "boolean", `isBackupStarting must be a boolean: ${String(input.isBackupStarting)}`) ??
    badIf(!isCount(input.backupCareerPassAttempts) || input.backupCareerPassAttempts > 5000, `backupCareerPassAttempts out of range: ${String(input.backupCareerPassAttempts)}`) ??
    badIf(!roles.includes(input.playerRole), `playerRole is not one of ${roles.join("|")}: ${String(input.playerRole)}`) ??
    badIf(!isProb(input.baselineTargetShare), `baselineTargetShare must be a share in [0,1]: ${String(input.baselineTargetShare)}`) ??
    badIf(!isIn(input.baselineAdot, 1, 25), `baselineAdot must be in [1,25] yards: ${String(input.baselineAdot)}`) ??
    badIf(!isIn(input.baselineReceptionsLine, 0.1, 15), `baselineReceptionsLine must be in [0.1,15] rec/game: ${String(input.baselineReceptionsLine)}`) ??
    badIf(!isCount(input.gamesSampled) || input.gamesSampled < MIN_TARGET_SHARE_GAMES, `target-share baseline needs >= ${MIN_TARGET_SHARE_GAMES} games sampled, got ${String(input.gamesSampled)}`);
  if (bad) return bad;

  const ctx: BackupQbContext = {
    isBackupStarting: input.isBackupStarting,
    backupCareerPassAttempts: input.backupCareerPassAttempts,
    playerRole: input.playerRole,
    baselineTargetShare: input.baselineTargetShare,
    baselineAdot: input.baselineAdot,
    baselineReceptionsLine: input.baselineReceptionsLine,
  };
  const r = guard("evaluateBackupQbTargetDistribution", () => evaluateBackupQbTargetDistribution(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(typeof out.checkdownFunnelActive !== "boolean", "checkdownFunnelActive is not a boolean") ??
    badIf(!isIn(out.targetShareMultiplier, 0.4, 1.5), `targetShareMultiplier out of range: ${String(out.targetShareMultiplier)}`) ??
    badIf(!isProb(out.adjustedTargetShare), `adjustedTargetShare left [0,1]: ${String(out.adjustedTargetShare)}`) ??
    badIf(!isIn(out.adjustedAdot, 1, 25), `adjustedAdot out of range: ${String(out.adjustedAdot)}`) ??
    badIf(!isMultiplier(out.receptionsProjectionMultiplier, 0.3, 1.5), `receptionsProjectionMultiplier out of range: ${String(out.receptionsProjectionMultiplier)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      checkdownFunnelActive: out.checkdownFunnelActive,
      targetShareMultiplier: out.targetShareMultiplier,
      adjustedTargetShare: out.adjustedTargetShare,
      adjustedAdot: out.adjustedAdot,
      receptionsProjectionMultiplier: out.receptionsProjectionMultiplier,
      targetFunnelCategory: out.targetFunnelCategory,
      baselineReceptionsLine: input.baselineReceptionsLine,
    },
  };
}

export interface Wr1OutRedistributionEval {
  readonly readingKind: "RATE";
  readonly isAlphaWr1Out: boolean;
  /** Share of team targets vacated by the absent WR1, in [0,1]. */
  readonly vacatedTargetSharePool: number;
  readonly wr2ProjectedTargetShare: number;
  /** Signed share shift for WR2. Positive = gains. */
  readonly wr2TargetShareDelta: number;
  readonly te1ProjectedTargetShare: number;
  /** Signed share shift for TE1. */
  readonly te1TargetShareDelta: number;
  readonly rbProjectedTargetShare: number;
  /** Multiplier on WR2 yards per target; always <= 1 because of defensive help. */
  readonly wr2EfficiencyCompressionMultiplier: number;
  /** Signed shift in passing attempts per game. A tilt, NOT an edge. */
  readonly passingVolumeTiltAttemptsPerGame: number;
  readonly gamesSampled: number;
}

export function evalWr1OutRedistribution(input: {
  readonly team: string;
  readonly wr1Name: string;
  readonly wr1BaselineTargetShare: number;
  readonly wr1Status: "OUT" | "DOUBTFUL" | "QUESTIONABLE" | "ACTIVE";
  readonly wr2Name: string;
  readonly wr2BaselineTargetShare: number;
  readonly te1BaselineTargetShare: number;
  readonly rb1TargetShare: number;
  readonly gamesSampled: number;
}): SignalEval<Wr1OutRedistributionEval> {
  const statuses: readonly Wr1OutContext["wr1Status"][] = ["OUT", "DOUBTFUL", "QUESTIONABLE", "ACTIVE"];
  const bad =
    badIf(input.team.trim().length === 0, "team is required and was blank") ??
    badIf(input.wr1Name.trim().length === 0, "wr1Name is required and was blank") ??
    badIf(input.wr2Name.trim().length === 0, "wr2Name is required and was blank") ??
    badIf(input.wr1Name === input.wr2Name, `wr1Name and wr2Name are the same player (${input.wr1Name})`) ??
    badIf(!isProb(input.wr1BaselineTargetShare), `wr1BaselineTargetShare must be a share in [0,1]: ${String(input.wr1BaselineTargetShare)}`) ??
    badIf(!statuses.includes(input.wr1Status), `wr1Status is not one of ${statuses.join("|")}: ${String(input.wr1Status)}`) ??
    badIf(!isProb(input.wr2BaselineTargetShare), `wr2BaselineTargetShare must be a share in [0,1]: ${String(input.wr2BaselineTargetShare)}`) ??
    badIf(!isProb(input.te1BaselineTargetShare), `te1BaselineTargetShare must be a share in [0,1]: ${String(input.te1BaselineTargetShare)}`) ??
    badIf(!isProb(input.rb1TargetShare), `rb1TargetShare must be a share in [0,1]: ${String(input.rb1TargetShare)}`) ??
    badIf(!isCount(input.gamesSampled) || input.gamesSampled < MIN_TARGET_SHARE_GAMES, `target-share baselines need >= ${MIN_TARGET_SHARE_GAMES} games sampled, got ${String(input.gamesSampled)}`);
  if (bad) return bad;

  const ctx: Wr1OutContext = {
    team: input.team,
    wr1Name: input.wr1Name,
    wr1BaselineTargetShare: input.wr1BaselineTargetShare,
    wr1Status: input.wr1Status,
    wr2Name: input.wr2Name,
    wr2BaselineTargetShare: input.wr2BaselineTargetShare,
    te1BaselineTargetShare: input.te1BaselineTargetShare,
    rb1TargetShare: input.rb1TargetShare,
  };
  const r = guard("evaluateWr1OutRedistribution", () => evaluateWr1OutRedistribution(ctx));
  if (!r.ok) return r;

  const out = r.data;
  // The three receivers that absorb the vacated share are mutually exclusive
  // positions: their projected shares cannot collectively exceed the team's
  // whole target pool. Catches a baseline set that is internally incoherent.
  const absorbed = out.wr2ProjectedTargetShare + out.te1ProjectedTargetShare + out.rbProjectedTargetShare;
  const outBad =
    badIf(typeof out.isAlphaWr1Out !== "boolean", "isAlphaWr1Out is not a boolean") ??
    badIf(!isProb(out.vacatedTargetSharePool), `vacatedTargetSharePool left [0,1]: ${String(out.vacatedTargetSharePool)}`) ??
    badIf(!isProb(out.wr2ProjectedTargetShare) || !isProb(out.te1ProjectedTargetShare) || !isProb(out.rbProjectedTargetShare), "a projected target share left [0,1]") ??
    badIf(absorbed > 0.95, `redistributed shares are incoherent: WR2+TE1+RB projected shares sum to ${absorbed.toFixed(3)}, above the 0.95 team-pool ceiling`) ??
    badIf(!isIn(out.wr2TargetShareDelta, -0.5, 0.5) || !isIn(out.te1TargetShareDelta, -0.5, 0.5), "a target-share delta left [-0.5,0.5]") ??
    badIf(!isIn(out.wr2EfficiencyCompressionMultiplier, 0.5, 1.0), `wr2EfficiencyCompressionMultiplier must be <= 1, got ${String(out.wr2EfficiencyCompressionMultiplier)}`) ??
    badIf(!isIn(out.overallPassingVolumePacingShift, -6, 0), `passingVolumeTiltAttemptsPerGame must be <= 0, got ${String(out.overallPassingVolumePacingShift)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      isAlphaWr1Out: out.isAlphaWr1Out,
      vacatedTargetSharePool: out.vacatedTargetSharePool,
      wr2ProjectedTargetShare: out.wr2ProjectedTargetShare,
      wr2TargetShareDelta: out.wr2TargetShareDelta,
      te1ProjectedTargetShare: out.te1ProjectedTargetShare,
      te1TargetShareDelta: out.te1TargetShareDelta,
      rbProjectedTargetShare: out.rbProjectedTargetShare,
      wr2EfficiencyCompressionMultiplier: out.wr2EfficiencyCompressionMultiplier,
      passingVolumeTiltAttemptsPerGame: out.overallPassingVolumePacingShift,
      gamesSampled: input.gamesSampled,
    },
  };
}

// ============================================================================
// (b) signals/environment + signals/environmental  — PHYSICAL MODIFIERS
// ============================================================================

export interface TemperaturePrecipitationDecayEval {
  /** Explicitly a modifier. This is NOT a forecast and must never be combined into one. */
  readonly readingKind: "PHYSICAL_MODIFIER";
  readonly weatherRegime: "DOME_CONTROLLED" | "MILD_OPEN" | "FREEZING_DRY" | "WET_SLOPPY" | "DEEP_FREEZE_PRECIP";
  /** Signed shift in team passing yards. A tilt, NOT a forecast. */
  readonly passingYardsTilt: number;
  /** Signed shift in game total points. A tilt, NOT a forecast. */
  readonly gameTotalPointsTilt: number;
  /** Additional rush plays expected. A count shift, not a probability. */
  readonly rushAttemptBonus: number;
  readonly turnoverVolatilityMultiplier: number;
  /** Signed percentage-point shift in completion rate. A tilt, NOT a probability. */
  readonly completionRateTiltPp: number;
}

export function evalTemperaturePrecipitationDecay(input: {
  readonly temperatureFahrenheit: number;
  readonly precipitationType: "NONE" | "LIGHT_RAIN" | "HEAVY_RAIN" | "SNOW" | "FREEZING_RAIN";
  readonly isDomeVenue: boolean;
  readonly baselinePassingYards: number;
  readonly baselineGameTotal: number;
}): SignalEval<TemperaturePrecipitationDecayEval> {
  const precips: readonly WeatherConditionContext["precipitationType"][] = [
    "NONE",
    "LIGHT_RAIN",
    "HEAVY_RAIN",
    "SNOW",
    "FREEZING_RAIN",
  ];
  const bad =
    badIf(!isIn(input.temperatureFahrenheit, -60, 140), `temperatureFahrenheit outside the physically possible [-60,140]F: ${String(input.temperatureFahrenheit)}`) ??
    badIf(!precips.includes(input.precipitationType), `precipitationType is not one of ${precips.join("|")}: ${String(input.precipitationType)}`) ??
    badIf(typeof input.isDomeVenue !== "boolean", `isDomeVenue must be a boolean: ${String(input.isDomeVenue)}`) ??
    badIf(!isIn(input.baselinePassingYards, 20, 600), `baselinePassingYards out of range: ${String(input.baselinePassingYards)}`) ??
    badIf(!isIn(input.baselineGameTotal, 1, 120), `baselineGameTotal out of range: ${String(input.baselineGameTotal)}`);
  if (bad) return bad;

  const ctx: WeatherConditionContext = {
    temperatureFahrenheit: input.temperatureFahrenheit,
    precipitationType: input.precipitationType,
    isDomeVenue: input.isDomeVenue,
    baselinePassingYards: input.baselinePassingYards,
    baselineGameTotal: input.baselineGameTotal,
  };
  const r = guard("evaluateTemperaturePrecipitationDecay", () => evaluateTemperaturePrecipitationDecay(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.passingYardsAdjustment, -60, 0), `passingYardsTilt must be <= 0, got ${String(out.passingYardsAdjustment)}`) ??
    badIf(!isIn(out.gameTotalPointsAdjustment, -10, 0), `gameTotalPointsTilt must be <= 0, got ${String(out.gameTotalPointsAdjustment)}`) ??
    badIf(!isIn(out.rushAttemptBonus, 0, 12), `rushAttemptBonus out of range: ${String(out.rushAttemptBonus)}`) ??
    badIf(!isMultiplier(out.turnoverVolatilityMultiplier, 0.8, 2), `turnoverVolatilityMultiplier out of range: ${String(out.turnoverVolatilityMultiplier)}`) ??
    badIf(!isIn(out.completionRatePenaltyPercentagePoints, 0, 20), `completionRateTiltPp out of range: ${String(out.completionRatePenaltyPercentagePoints)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PHYSICAL_MODIFIER",
      weatherRegime: out.weatherRegime,
      passingYardsTilt: out.passingYardsAdjustment,
      gameTotalPointsTilt: out.gameTotalPointsAdjustment,
      rushAttemptBonus: out.rushAttemptBonus,
      turnoverVolatilityMultiplier: out.turnoverVolatilityMultiplier,
      completionRateTiltPp: out.completionRatePenaltyPercentagePoints,
    },
  };
}

export interface HighAltitudeFatigueDecayEval {
  readonly readingKind: "PHYSICAL_MODIFIER";
  readonly isHighAltitudeVenue: boolean;
  /** Added field-goal range in yards. A physical constant shift, not a probability. */
  readonly fieldGoalRangeExtensionYards: number;
  /** Additive probability-unit boost to the touchback rate, in [0, 0.5]. */
  readonly touchbackProbabilityBoostDelta: number;
  readonly secondHalfFatigueMultiplier: number;
  /** Signed defensive EPA decay per play. A tilt, NOT a forecast. */
  readonly visitingDefensiveEpaTilt: number;
  /** Signed spread-point adjustment. A tilt, NOT an edge. */
  readonly spreadPointsTilt: number;
  /** The kernel's `confidence`, RENAMED. A model-confidence SCORE, not a win probability. */
  readonly signalConfidenceScore: number;
  readonly explanation: string;
}

export function evalHighAltitudeFatigueDecay(input: {
  readonly venueAltitudeFeet: number;
  readonly isVisitingTeam: boolean;
  readonly visitingTeamArrivalDaysPrior: number;
  readonly defensiveSnapCountPaceProjection: number;
}): SignalEval<HighAltitudeFatigueDecayEval> {
  const bad =
    badIf(!isIn(input.venueAltitudeFeet, -500, 15000), `venueAltitudeFeet out of range: ${String(input.venueAltitudeFeet)}`) ??
    badIf(typeof input.isVisitingTeam !== "boolean", `isVisitingTeam must be a boolean: ${String(input.isVisitingTeam)}`) ??
    badIf(!isCount(input.visitingTeamArrivalDaysPrior) || input.visitingTeamArrivalDaysPrior > 30, `visitingTeamArrivalDaysPrior out of range: ${String(input.visitingTeamArrivalDaysPrior)}`) ??
    badIf(!isIn(input.defensiveSnapCountPaceProjection, 0, 130), `defensiveSnapCountPaceProjection out of range: ${String(input.defensiveSnapCountPaceProjection)}`);
  if (bad) return bad;

  const ctx: HighAltitudeContext = {
    venueAltitudeFeet: input.venueAltitudeFeet,
    isVisitingTeam: input.isVisitingTeam,
    visitingTeamArrivalDaysPrior: input.visitingTeamArrivalDaysPrior,
    defensiveSnapCountPaceProjection: input.defensiveSnapCountPaceProjection,
  };
  const r = guard("evaluateHighAltitudeFatigueDecay", () => evaluateHighAltitudeFatigueDecay(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(typeof out.isHighAltitudeVenue !== "boolean", "isHighAltitudeVenue is not a boolean") ??
    badIf(!isIn(out.fieldGoalRangeExtensionYards, 0, 6), `fieldGoalRangeExtensionYards out of range: ${String(out.fieldGoalRangeExtensionYards)}`) ??
    badIf(!isIn(out.touchbackProbabilityBoost, 0, 0.5), `touchbackProbabilityBoostDelta out of range: ${String(out.touchbackProbabilityBoost)}`) ??
    badIf(!isMultiplier(out.secondHalfFatigueMultiplier, 0.9, 1.5), `secondHalfFatigueMultiplier out of range: ${String(out.secondHalfFatigueMultiplier)}`) ??
    badIf(!isIn(out.visitingDefensiveEpaDecay, -0.3, 0.3), `visitingDefensiveEpaTilt out of range: ${String(out.visitingDefensiveEpaDecay)}`) ??
    badIf(!isIn(out.spreadPointAdjustment, -6, 6), `spreadPointsTilt out of range: ${String(out.spreadPointAdjustment)}`) ??
    badIf(!isProb(out.confidence), `signalConfidenceScore left [0,1]: ${String(out.confidence)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PHYSICAL_MODIFIER",
      isHighAltitudeVenue: out.isHighAltitudeVenue,
      fieldGoalRangeExtensionYards: out.fieldGoalRangeExtensionYards,
      touchbackProbabilityBoostDelta: out.touchbackProbabilityBoost,
      secondHalfFatigueMultiplier: out.secondHalfFatigueMultiplier,
      visitingDefensiveEpaTilt: out.visitingDefensiveEpaDecay,
      spreadPointsTilt: out.spreadPointAdjustment,
      signalConfidenceScore: out.confidence,
      explanation: out.explanation,
    },
  };
}

export interface LinearWindPassImpactEval {
  readonly readingKind: "PHYSICAL_MODIFIER";
  readonly windCategory: "CALM" | "MODERATE_BREEZE" | "HEAVY_WIND" | "SEVERE_GALE";
  readonly sustainedWindMph: number;
  /** Wind above the 7.5 mph calm threshold, in mph. */
  readonly effectiveWindDecayMph: number;
  /** Signed shift in team passing yards. A tilt, NOT a forecast. */
  readonly passingYardsTilt: number;
  /** Wind-adjusted passing yardage projection. A projection of a base, not a win probability. */
  readonly projectedPassingYards: number;
  /** Signed percentage-point shift in completion rate. A tilt, NOT a probability. */
  readonly completionRateTiltPp: number;
  /** Multiplier on 20+ yard attempt rate. */
  readonly deepPassRateCompression: number;
}

export function evalLinearWindPassImpact(input: {
  readonly windSpeedMph: number;
  readonly isEnclosedOrDome: boolean;
  readonly gustSpeedMph?: number;
  readonly baselinePassingYards: number;
  readonly passAttemptBaseline?: number;
}): SignalEval<LinearWindPassImpactEval> {
  const bad =
    badIf(!isIn(input.windSpeedMph, 0, 120), `windSpeedMph out of range: ${String(input.windSpeedMph)}`) ??
    badIf(typeof input.isEnclosedOrDome !== "boolean", `isEnclosedOrDome must be a boolean: ${String(input.isEnclosedOrDome)}`) ??
    badIf(input.gustSpeedMph !== undefined && !isIn(input.gustSpeedMph, 0, 160), `gustSpeedMph out of range: ${String(input.gustSpeedMph)}`) ??
    badIf(input.gustSpeedMph !== undefined && input.gustSpeedMph < input.windSpeedMph, `gustSpeedMph ${input.gustSpeedMph} is below sustained wind ${input.windSpeedMph}`) ??
    badIf(!isIn(input.baselinePassingYards, 20, 600), `baselinePassingYards out of range: ${String(input.baselinePassingYards)}`) ??
    badIf(input.passAttemptBaseline !== undefined && !isIn(input.passAttemptBaseline, 0, 100), `passAttemptBaseline out of range: ${String(input.passAttemptBaseline)}`);
  if (bad) return bad;

  const ctx: WindPassImpactContext = {
    windSpeedMph: input.windSpeedMph,
    isEnclosedOrDome: input.isEnclosedOrDome,
    gustSpeedMph: input.gustSpeedMph,
    baselinePassingYards: input.baselinePassingYards,
    passAttemptBaseline: input.passAttemptBaseline,
  };
  const r = guard("evaluateLinearWindPassImpact", () => evaluateLinearWindPassImpact(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.effectiveWindDecayMph, 0, 115), `effectiveWindDecayMph out of range: ${String(out.effectiveWindDecayMph)}`) ??
    badIf(!isIn(out.passingYardageAdjustment, -80, 0), `passingYardsTilt must be <= 0, got ${String(out.passingYardageAdjustment)}`) ??
    badIf(!isIn(out.projectedPassingYards, 0, 600), `projectedPassingYards out of range: ${String(out.projectedPassingYards)}`) ??
    badIf(!isIn(out.completionPercentageDelta, -20, 0), `completionRateTiltPp must be <= 0, got ${String(out.completionPercentageDelta)}`) ??
    badIf(!isMultiplier(out.deepPassRateCompression, 0.4, 1.0), `deepPassRateCompression out of range: ${String(out.deepPassRateCompression)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PHYSICAL_MODIFIER",
      windCategory: out.windCategory,
      sustainedWindMph: out.sustainedWindMph,
      effectiveWindDecayMph: out.effectiveWindDecayMph,
      passingYardsTilt: out.passingYardageAdjustment,
      projectedPassingYards: out.projectedPassingYards,
      completionRateTiltPp: out.completionPercentageDelta,
      deepPassRateCompression: out.deepPassRateCompression,
    },
  };
}

export interface WindElasticityEval {
  readonly readingKind: "PHYSICAL_MODIFIER";
  /** Sustained wind plus half the gust spread, in mph. */
  readonly effectiveWindMph: number;
  /** Multiplier on passing yards. A modifier, not a probability. */
  readonly passingYardsMultiplier: number;
  /** Signed percentage-point shift in completion rate. A tilt, NOT a probability. */
  readonly passingCompletionTiltPp: number;
  /** Signed probability-unit shift in field-goal accuracy for an average attempt. */
  readonly fieldGoalAccuracyTilt: number;
  /** Positive = range shrinks; negative = range extends (tailwind). */
  readonly fieldGoalRangeShiftYards: number;
  readonly rushingVolumeMultiplier: number;
  /** Signed shift in game total points. A tilt, NOT a forecast. */
  readonly gameTotalPointsTilt: number;
}

export function evalWindElasticity(input: {
  readonly sustainedWindMph: number;
  readonly gustMph?: number;
  readonly direction?: WindElasticityInput["direction"];
  readonly isDomeOrRetractableClosed?: boolean;
  readonly isVisitor?: boolean;
}): SignalEval<WindElasticityEval> {
  const dirs: readonly NonNullable<WindElasticityInput["direction"]>[] = [
    "CROSSWIND",
    "HEADWIND",
    "TAILWIND",
    "CALM_OR_VARIABLE",
  ];
  const bad =
    badIf(!isIn(input.sustainedWindMph, 0, 120), `sustainedWindMph out of range: ${String(input.sustainedWindMph)}`) ??
    badIf(input.gustMph !== undefined && !isIn(input.gustMph, 0, 160), `gustMph out of range: ${String(input.gustMph)}`) ??
    badIf(input.gustMph !== undefined && input.gustMph < input.sustainedWindMph, `gustMph ${input.gustMph} is below sustained wind ${input.sustainedWindMph}`) ??
    badIf(input.direction !== undefined && !dirs.includes(input.direction), `direction is not one of ${dirs.join("|")}: ${String(input.direction)}`);
  if (bad) return bad;

  const ctx: WindElasticityInput = {
    sustainedWindMph: input.sustainedWindMph,
    gustMph: input.gustMph,
    direction: input.direction,
    isDomeOrRetractableClosed: input.isDomeOrRetractableClosed,
    isVisitor: input.isVisitor,
  };
  const r = guard("calculateWindElasticity", () => calculateWindElasticity(ctx));
  if (!r.ok) return r;

  const out = r.data;
  // Sign convention is load-bearing: a tailwind must EXTEND range, and wind
  // must never make passing or kicking better at the top end. If a future
  // coefficient edit flips either, the bridge fails closed.
  const outBad =
    badIf(!isIn(out.effectiveWindMph, 0, 150), `effectiveWindMph out of range: ${String(out.effectiveWindMph)}`) ??
    badIf(!isMultiplier(out.passingYardsMultiplier, 0.3, 1.0), `passingYardsMultiplier must be <= 1, got ${String(out.passingYardsMultiplier)}`) ??
    badIf(!isIn(out.passingCompletionDelta, -15, 0), `passingCompletionTiltPp must be <= 0, got ${String(out.passingCompletionDelta)}`) ??
    badIf(!isIn(out.fieldGoalAccuracyDelta, -0.3, 0.05), `fieldGoalAccuracyTilt out of range: ${String(out.fieldGoalAccuracyDelta)}`) ??
    badIf(!isIn(out.fieldGoalRangeShrinkageYards, -12, 12), `fieldGoalRangeShiftYards out of range: ${String(out.fieldGoalRangeShrinkageYards)}`) ??
    badIf(!isMultiplier(out.rushingVolumeMultiplier, 0.9, 1.4), `rushingVolumeMultiplier out of range: ${String(out.rushingVolumeMultiplier)}`) ??
    badIf(!isIn(out.expectedTotalPointsAdjustment, -12, 0), `gameTotalPointsTilt must be <= 0, got ${String(out.expectedTotalPointsAdjustment)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PHYSICAL_MODIFIER",
      effectiveWindMph: out.effectiveWindMph,
      passingYardsMultiplier: out.passingYardsMultiplier,
      passingCompletionTiltPp: out.passingCompletionDelta,
      fieldGoalAccuracyTilt: out.fieldGoalAccuracyDelta,
      fieldGoalRangeShiftYards: out.fieldGoalRangeShrinkageYards,
      rushingVolumeMultiplier: out.rushingVolumeMultiplier,
      gameTotalPointsTilt: out.expectedTotalPointsAdjustment,
    },
  };
}

// ============================================================================
// (c) signals/tactical
// ============================================================================

/** A PROE differential off a handful of early-down plays is noise; require a real sample. */
export const MIN_EARLY_DOWN_PLAYS = 60;
/** Two-minute conversion off fewer than eight drills is a handful of observations. */
export const MIN_TWO_MINUTE_DRIVES = 8;

export interface EarlyDownProeMomentumEval {
  readonly readingKind: "SIGNED_TILT";
  /** Signed pass rate minus situation-expected pass rate. A DIFFERENTIAL, not a probability. */
  readonly proeDifferential: number;
  readonly playCallingAggressivenessTier: "HYPER_PASS_HEAVY" | "MODERATE_PASS" | "NEUTRAL" | "RUN_HEAVY" | "HYPER_CONSERVATIVE";
  readonly driveEfficiencyMultiplier: number;
  /** Signed percentage shift in projected passing volume. A tilt, NOT a probability. */
  readonly projectedPassingVolumeShiftPercent: number;
  /** Signed total-points tilt. NOT a forecast and NOT an edge. */
  readonly gameTotalPointsTilt: number;
  /** The kernel's `confidence`, RENAMED. A model-confidence SCORE, not a win probability. */
  readonly signalConfidenceScore: number;
  readonly playCountSample: number;
  readonly explanation: string;
}

export function evalEarlyDownProeMomentum(input: {
  readonly earlyDownPassRate: number;
  readonly expectedPassRate: number;
  readonly opponentPassDefenseEpaRank: number;
  readonly offensivePaceSecondsPerPlay: number;
  readonly playCountSample: number;
}): SignalEval<EarlyDownProeMomentumEval> {
  const bad =
    badIf(!isProb(input.earlyDownPassRate), `earlyDownPassRate must be a rate in [0,1]: ${String(input.earlyDownPassRate)}`) ??
    badIf(!isProb(input.expectedPassRate), `expectedPassRate must be a rate in [0,1]: ${String(input.expectedPassRate)}`) ??
    badIf(!isIn(input.opponentPassDefenseEpaRank, 1, 32), `opponentPassDefenseEpaRank must be an integer rank in [1,32]: ${String(input.opponentPassDefenseEpaRank)}`) ??
    badIf(!isIn(input.offensivePaceSecondsPerPlay, 15, 40), `offensivePaceSecondsPerPlay out of range: ${String(input.offensivePaceSecondsPerPlay)}`) ??
    badIf(!isCount(input.playCountSample) || input.playCountSample < MIN_EARLY_DOWN_PLAYS, `early-down PROE needs >= ${MIN_EARLY_DOWN_PLAYS} plays sampled, got ${String(input.playCountSample)}`);
  if (bad) return bad;

  const ctx: EarlyDownProeContext = {
    earlyDownPassRate: input.earlyDownPassRate,
    expectedPassRate: input.expectedPassRate,
    opponentPassDefenseEpaRank: input.opponentPassDefenseEpaRank,
    offensivePaceSecondsPerPlay: input.offensivePaceSecondsPerPlay,
    playCountSample: input.playCountSample,
  };
  const r = guard("evaluateEarlyDownProeMomentum", () => evaluateEarlyDownProeMomentum(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.proeDifferential, -1, 1), `proeDifferential out of range: ${String(out.proeDifferential)}`) ??
    badIf(!isMultiplier(out.driveEfficiencyMultiplier, 0.6, 1.5), `driveEfficiencyMultiplier out of range: ${String(out.driveEfficiencyMultiplier)}`) ??
    badIf(!isIn(out.projectedPassingVolumeShiftPercent, -40, 40), `projectedPassingVolumeShiftPercent out of range: ${String(out.projectedPassingVolumeShiftPercent)}`) ??
    badIf(!isIn(out.gameTotalPointsImpact, -8, 8), `gameTotalPointsTilt out of range: ${String(out.gameTotalPointsImpact)}`) ??
    badIf(!isProb(out.confidence), `signalConfidenceScore left [0,1]: ${String(out.confidence)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      proeDifferential: out.proeDifferential,
      playCallingAggressivenessTier: out.playCallingAggressivenessTier,
      driveEfficiencyMultiplier: out.driveEfficiencyMultiplier,
      projectedPassingVolumeShiftPercent: out.projectedPassingVolumeShiftPercent,
      gameTotalPointsTilt: out.gameTotalPointsImpact,
      signalConfidenceScore: out.confidence,
      playCountSample: input.playCountSample,
      explanation: out.explanation,
    },
  };
}

export interface RedZonePersonnelGroupingEval {
  readonly readingKind: "PROBABILITY";
  /** Probability the next red-zone play is a run, in [0,1]. */
  readonly expectedRunProbability: number;
  /** Probability the next red-zone play is a pass, in [0,1]. */
  readonly expectedPassProbability: number;
  /** Signed play-action EPA bonus per play. A tilt, NOT a forecast. */
  readonly playActionEpaTilt: number;
  readonly rbTouchdownShareModifier: number;
  /** Signed target-share bonus for the TE. Percentage points, not a probability. */
  readonly teTargetShareBonusPp: number;
  readonly defensivePersonnelMismatchTier: "HEAVY_RUN_LEVERAGE" | "SPREAD_ISOLATION" | "NEUTRAL_MATCH";
}

export function evalRedZonePersonnelGrouping(input: {
  readonly primaryRedZonePersonnelGrouping: "ELEVEN_11" | "TWELVE_12" | "TWENTY_ONE_21" | "JUMBO_HEAVY";
  readonly offensiveLineRunBlockGrade: number;
  readonly opponentDefensiveFrontSevenGrade: number;
  readonly goalLineDistanceYards: number;
}): SignalEval<RedZonePersonnelGroupingEval> {
  const groups: readonly RedZonePersonnelContext["primaryRedZonePersonnelGrouping"][] = [
    "ELEVEN_11",
    "TWELVE_12",
    "TWENTY_ONE_21",
    "JUMBO_HEAVY",
  ];
  const bad =
    badIf(!groups.includes(input.primaryRedZonePersonnelGrouping), `primaryRedZonePersonnelGrouping is not one of ${groups.join("|")}: ${String(input.primaryRedZonePersonnelGrouping)}`) ??
    badIf(!isIn(input.offensiveLineRunBlockGrade, 0, 100), `offensiveLineRunBlockGrade must be in [0,100]: ${String(input.offensiveLineRunBlockGrade)}`) ??
    badIf(!isIn(input.opponentDefensiveFrontSevenGrade, 0, 100), `opponentDefensiveFrontSevenGrade must be in [0,100]: ${String(input.opponentDefensiveFrontSevenGrade)}`) ??
    badIf(!isIn(input.goalLineDistanceYards, 0, 25), `goalLineDistanceYards out of range: ${String(input.goalLineDistanceYards)}`);
  if (bad) return bad;

  const ctx: RedZonePersonnelContext = {
    primaryRedZonePersonnelGrouping: input.primaryRedZonePersonnelGrouping,
    offensiveLineRunBlockGrade: input.offensiveLineRunBlockGrade,
    opponentDefensiveFrontSevenGrade: input.opponentDefensiveFrontSevenGrade,
    goalLineDistanceYards: input.goalLineDistanceYards,
  };
  const r = guard("evaluateRedZonePersonnelGrouping", () => evaluateRedZonePersonnelGrouping(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.expectedRunProbability), `expectedRunProbability left [0,1]: ${String(out.expectedRunProbability)}`) ??
    badIf(!isProb(out.expectedPassProbability), `expectedPassProbability left [0,1]: ${String(out.expectedPassProbability)}`) ??
    badIf(Math.abs(out.expectedRunProbability + out.expectedPassProbability - 1) > 0.002, `run and pass probabilities do not sum to 1: ${String(out.expectedRunProbability)} + ${String(out.expectedPassProbability)}`) ??
    badIf(!isIn(out.playActionEpaBonus, -0.1, 0.5), `playActionEpaTilt out of range: ${String(out.playActionEpaBonus)}`) ??
    badIf(!isMultiplier(out.rbTouchdownShareModifier, 0.7, 1.5), `rbTouchdownShareModifier out of range: ${String(out.rbTouchdownShareModifier)}`) ??
    badIf(!isIn(out.teTargetShareBonus, -0.3, 0.3), `teTargetShareBonusPp out of range: ${String(out.teTargetShareBonus)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PROBABILITY",
      expectedRunProbability: out.expectedRunProbability,
      expectedPassProbability: out.expectedPassProbability,
      playActionEpaTilt: out.playActionEpaBonus,
      rbTouchdownShareModifier: out.rbTouchdownShareModifier,
      teTargetShareBonusPp: out.teTargetShareBonus,
      defensivePersonnelMismatchTier: out.defensivePersonnelMismatchTier,
    },
  };
}

export interface TwoMinuteHurryUpEfficiencyEval {
  readonly readingKind: "SIGNED_TILT";
  /** Share of two-minute drives that produced points, in [0,1]. A rate, not a win probability. */
  readonly scoringDriveConversionRate: number;
  /** 0-1 leverage index. A SCORE, not a probability. */
  readonly middleEightLeverageScore: number;
  /** Signed expected points added per two-minute opportunity. A tilt, NOT a forecast. */
  readonly expectedPointsAddedPerTwoMinuteOpportunity: number;
  /** Signed spread-point tilt. NOT an edge. */
  readonly spreadPointsTilt: number;
  /** The kernel's `confidence`, RENAMED. A model-confidence SCORE, not a win probability. */
  readonly signalConfidenceScore: number;
  readonly twoMinuteDrillDrives: number;
  readonly explanation: string;
}

export function evalTwoMinuteHurryUpEfficiency(input: {
  readonly twoMinuteDrillDrives: number;
  readonly twoMinuteScoringDrives: number;
  readonly twoMinutePointsPerMinute: number;
  readonly qbPasserRatingInTwoMinute: number;
  readonly opponentDefensiveTwoMinuteEpaAllowed: number;
  readonly receivesSecondHalfKickoff: boolean;
}): SignalEval<TwoMinuteHurryUpEfficiencyEval> {
  const bad =
    badIf(!isCount(input.twoMinuteDrillDrives), `twoMinuteDrillDrives must be a finite count: ${String(input.twoMinuteDrillDrives)}`) ??
    badIf(input.twoMinuteDrillDrives < MIN_TWO_MINUTE_DRIVES, `two-minute conversion needs >= ${MIN_TWO_MINUTE_DRIVES} two-minute drives, got ${input.twoMinuteDrillDrives}`) ??
    badIf(!isCount(input.twoMinuteScoringDrives), `twoMinuteScoringDrives must be a finite count: ${String(input.twoMinuteScoringDrives)}`) ??
    badIf(input.twoMinuteScoringDrives > input.twoMinuteDrillDrives, `twoMinuteScoringDrives ${input.twoMinuteScoringDrives} exceeds twoMinuteDrillDrives ${input.twoMinuteDrillDrives}`) ??
    badIf(!isIn(input.twoMinutePointsPerMinute, 0, 10), `twoMinutePointsPerMinute out of range: ${String(input.twoMinutePointsPerMinute)}`) ??
    badIf(!isIn(input.qbPasserRatingInTwoMinute, 0, 200), `qbPasserRatingInTwoMinute out of range: ${String(input.qbPasserRatingInTwoMinute)}`) ??
    badIf(!isIn(input.opponentDefensiveTwoMinuteEpaAllowed, -1, 1), `opponentDefensiveTwoMinuteEpaAllowed out of range: ${String(input.opponentDefensiveTwoMinuteEpaAllowed)}`) ??
    badIf(typeof input.receivesSecondHalfKickoff !== "boolean", `receivesSecondHalfKickoff must be a boolean: ${String(input.receivesSecondHalfKickoff)}`);
  if (bad) return bad;

  const ctx: TwoMinuteHurryUpContext = {
    twoMinuteDrillDrives: input.twoMinuteDrillDrives,
    twoMinuteScoringDrives: input.twoMinuteScoringDrives,
    twoMinutePointsPerMinute: input.twoMinutePointsPerMinute,
    qbPasserRatingInTwoMinute: input.qbPasserRatingInTwoMinute,
    opponentDefensiveTwoMinuteEpaAllowed: input.opponentDefensiveTwoMinuteEpaAllowed,
    receivesSecondHalfKickoff: input.receivesSecondHalfKickoff,
  };
  const r = guard("evaluateTwoMinuteHurryUpEfficiency", () => evaluateTwoMinuteHurryUpEfficiency(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.scoringDriveConversionRate), `scoringDriveConversionRate left [0,1]: ${String(out.scoringDriveConversionRate)}`) ??
    badIf(!isIn(out.middleEightLeverageScore, 0, 1), `middleEightLeverageScore left [0,1]: ${String(out.middleEightLeverageScore)}`) ??
    badIf(!isIn(out.expectedPointsAddedPerTwoMinuteOpportunity, -5, 5), `expectedPointsAddedPerTwoMinuteOpportunity out of range: ${String(out.expectedPointsAddedPerTwoMinuteOpportunity)}`) ??
    badIf(!isIn(out.spreadPointAdjustment, -4, 4), `spreadPointsTilt out of range: ${String(out.spreadPointAdjustment)}`) ??
    badIf(!isProb(out.confidence), `signalConfidenceScore left [0,1]: ${String(out.confidence)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      scoringDriveConversionRate: out.scoringDriveConversionRate,
      middleEightLeverageScore: out.middleEightLeverageScore,
      expectedPointsAddedPerTwoMinuteOpportunity: out.expectedPointsAddedPerTwoMinuteOpportunity,
      spreadPointsTilt: out.spreadPointAdjustment,
      signalConfidenceScore: out.confidence,
      twoMinuteDrillDrives: input.twoMinuteDrillDrives,
      explanation: out.explanation,
    },
  };
}

// ============================================================================
// (d) signals/situational
// ============================================================================

/** A crew's flag RATE needs a multi-season sample; one game is a coin flip. */
export const MIN_CREW_GAMES = 20;
/** A coach's fourth-down go-rate over expected needs a real sample. */
export const MIN_COACH_GAMES = 8;

export interface RefereeCrewTendenciesEval {
  readonly readingKind: "SIGNED_TILT";
  readonly penaltyPaceTier: "HEAVY_FLAGS" | "AVERAGE" | "LET_THEM_PLAY";
  /** Signed flags above the league average per game. */
  readonly flagsAboveLeagueAverage: number;
  /** Signed total-points tilt. NOT a forecast and NOT an edge. */
  readonly gameTotalPointsTilt: number;
  /** Expected net penalty yards favoring the home team. */
  readonly homeFieldPenaltyYardageAdvantage: number;
  readonly dpiVolatilityMultiplier: number;
  /** Multiplier on drive-stall probability. A multiplier, not a probability. */
  readonly driveStallProbabilityMultiplier: number;
  readonly gamesSampled: number;
}

export function evalRefereeCrewTendencies(input: {
  readonly refereeName: string;
  readonly crewFlagsPerGame: number;
  readonly leagueAvgFlagsPerGame: number;
  readonly defensiveHoldingFlagsPerGame: number;
  readonly passInterferenceFlagsPerGame: number;
  readonly homePenaltyRateRatio: number;
  readonly isDomeVenue?: boolean;
  readonly gamesSampled: number;
}): SignalEval<RefereeCrewTendenciesEval> {
  const bad =
    badIf(input.refereeName.trim().length === 0, "refereeName is required and was blank") ??
    badIf(!isIn(input.crewFlagsPerGame, 0, 40), `crewFlagsPerGame out of range: ${String(input.crewFlagsPerGame)}`) ??
    badIf(!isIn(input.leagueAvgFlagsPerGame, 1, 40), `leagueAvgFlagsPerGame out of range: ${String(input.leagueAvgFlagsPerGame)}`) ??
    badIf(!isIn(input.defensiveHoldingFlagsPerGame, 0, 10), `defensiveHoldingFlagsPerGame out of range: ${String(input.defensiveHoldingFlagsPerGame)}`) ??
    badIf(!isIn(input.passInterferenceFlagsPerGame, 0, 10), `passInterferenceFlagsPerGame out of range: ${String(input.passInterferenceFlagsPerGame)}`) ??
    badIf(!isIn(input.homePenaltyRateRatio, 0, 1), `homePenaltyRateRatio must be a ratio in [0,1]: ${String(input.homePenaltyRateRatio)}`) ??
    badIf(input.isDomeVenue !== undefined && typeof input.isDomeVenue !== "boolean", `isDomeVenue must be a boolean: ${String(input.isDomeVenue)}`) ??
    badIf(!isCount(input.gamesSampled) || input.gamesSampled < MIN_CREW_GAMES, `crew flag rates need >= ${MIN_CREW_GAMES} games sampled, got ${String(input.gamesSampled)}`);
  if (bad) return bad;

  const ctx: RefereeCrewContext = {
    refereeName: input.refereeName,
    crewFlagsPerGame: input.crewFlagsPerGame,
    leagueAvgFlagsPerGame: input.leagueAvgFlagsPerGame,
    defensiveHoldingFlagsPerGame: input.defensiveHoldingFlagsPerGame,
    passInterferenceFlagsPerGame: input.passInterferenceFlagsPerGame,
    homePenaltyRateRatio: input.homePenaltyRateRatio,
    isDomeVenue: input.isDomeVenue,
  };
  const r = guard("evaluateRefereeCrewTendencies", () => evaluateRefereeCrewTendencies(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.flagsAboveLeagueAverage, -20, 20), `flagsAboveLeagueAverage out of range: ${String(out.flagsAboveLeagueAverage)}`) ??
    badIf(!isIn(out.expectedTotalPointsDelta, -8, 8), `gameTotalPointsTilt out of range: ${String(out.expectedTotalPointsDelta)}`) ??
    badIf(!isIn(out.homeFieldPenaltyYardageAdvantage, 0, 25), `homeFieldPenaltyYardageAdvantage out of range: ${String(out.homeFieldPenaltyYardageAdvantage)}`) ??
    badIf(!isMultiplier(out.dpiVolatilityMultiplier, 0.8, 1.6), `dpiVolatilityMultiplier out of range: ${String(out.dpiVolatilityMultiplier)}`) ??
    badIf(!isMultiplier(out.driveStallProbabilityMultiplier, 0.8, 1.5), `driveStallProbabilityMultiplier out of range: ${String(out.driveStallProbabilityMultiplier)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      penaltyPaceTier: out.penaltyPaceTier,
      flagsAboveLeagueAverage: out.flagsAboveLeagueAverage,
      gameTotalPointsTilt: out.expectedTotalPointsDelta,
      homeFieldPenaltyYardageAdvantage: out.homeFieldPenaltyYardageAdvantage,
      dpiVolatilityMultiplier: out.dpiVolatilityMultiplier,
      driveStallProbabilityMultiplier: out.driveStallProbabilityMultiplier,
      gamesSampled: input.gamesSampled,
    },
  };
}

export interface CoachingTendenciesEval {
  readonly readingKind: "PROBABILITY";
  /** Probability of a run call in this situation, in [0,1]. */
  readonly expectedRunProbability: number;
  /** League baseline run probability for this situation, in [0,1]. */
  readonly baselineRunProbability: number;
  /** Signed percentage-point alternation shift. A tilt, not a probability. */
  readonly runAlternationDeltaPp: number;
  /** Signed expected-value delta on a 4th-down go. A tilt, NOT an edge. */
  readonly fourthDownGoForItTiltEv: number;
  /** Signed late-half scoring adjustment for a road team. Points, NOT a probability. */
  readonly lateHalfScoringTiltRoad: number;
}

export function evalCoachingTendencies(input: {
  readonly down: 1 | 2 | 3 | 4;
  readonly distance: number;
  readonly previousPlayType?: PlayType;
  readonly previousPlayGain?: number;
  readonly coachAggressivenessScore?: number;
  readonly isRoadTeam?: boolean;
  readonly halfSecondsRemaining?: number;
}): SignalEval<CoachingTendenciesEval> {
  const plays: readonly PlayType[] = ["PASS", "RUSH", "PUNT", "FIELD_GOAL", "KICKOFF"];
  const bad =
    badIf(![1, 2, 3, 4].includes(input.down), `down must be 1|2|3|4: ${String(input.down)}`) ??
    badIf(!isIn(input.distance, 1, 99), `distance out of range: ${String(input.distance)}`) ??
    badIf(input.previousPlayType !== undefined && !plays.includes(input.previousPlayType), `previousPlayType is not one of ${plays.join("|")}: ${String(input.previousPlayType)}`) ??
    badIf(input.previousPlayGain !== undefined && !isIn(input.previousPlayGain, -20, 99), `previousPlayGain out of range: ${String(input.previousPlayGain)}`) ??
    badIf(input.coachAggressivenessScore !== undefined && !isIn(input.coachAggressivenessScore, 0, 1), `coachAggressivenessScore must be in [0,1]: ${String(input.coachAggressivenessScore)}`) ??
    badIf(input.halfSecondsRemaining !== undefined && !isIn(input.halfSecondsRemaining, 0, 1800), `halfSecondsRemaining out of range: ${String(input.halfSecondsRemaining)}`);
  if (bad) return bad;

  const ctx: PlayCallingContext = {
    down: input.down,
    distance: input.distance,
    previousPlayType: input.previousPlayType,
    previousPlayGain: input.previousPlayGain,
    coachAggressivenessScore: input.coachAggressivenessScore,
    isRoadTeam: input.isRoadTeam,
    halfSecondsRemaining: input.halfSecondsRemaining,
  };
  const r = guard("evaluateCoachingTendencies", () => evaluateCoachingTendencies(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.expectedRunProbability), `expectedRunProbability left [0,1]: ${String(out.expectedRunProbability)}`) ??
    badIf(!isProb(out.baselineRunProbability), `baselineRunProbability left [0,1]: ${String(out.baselineRunProbability)}`) ??
    badIf(!isIn(out.runAlternationDelta, -0.5, 0.5), `runAlternationDeltaPp out of range: ${String(out.runAlternationDelta)}`) ??
    badIf(!isIn(out.fourthDownGoForItEdgeEv, -2, 3), `fourthDownGoForItTiltEv out of range: ${String(out.fourthDownGoForItEdgeEv)}`) ??
    badIf(!isIn(out.lateHalfScoringAdjustmentRoad, -4, 1), `lateHalfScoringTiltRoad out of range: ${String(out.lateHalfScoringAdjustmentRoad)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PROBABILITY",
      expectedRunProbability: out.expectedRunProbability,
      baselineRunProbability: out.baselineRunProbability,
      runAlternationDeltaPp: out.runAlternationDelta,
      fourthDownGoForItTiltEv: out.fourthDownGoForItEdgeEv,
      lateHalfScoringTiltRoad: out.lateHalfScoringAdjustmentRoad,
    },
  };
}

export interface FourthDownCoachingAggressivenessEval {
  readonly readingKind: "PROBABILITY";
  readonly aggressivenessTier: "ANALYTICS_AGGRESSIVE" | "BALANCED_MODERATE" | "CONSERVATIVE_PUNT_FIRST";
  /** Probability the coach goes for it on 4th-and-1/2 in opponent territory, in [0,1]. */
  readonly expectedGoProbabilityOnFourthAndShort: number;
  /** Signed total-points tilt. NOT a forecast and NOT an edge. */
  readonly gameTotalPointsTilt: number;
  /**
   * Signed WIN-PROBABILITY DELTA, in probability units.
   * RENAMED from the kernel's `winProbabilityOptimizationBonus`: it is a
   * change, not a level, and it is signed. Never read it as a win probability.
   */
  readonly winProbabilityTiltDelta: number;
  readonly driveContinuationMultiplier: number;
  readonly gamesSampled: number;
}

export function evalFourthDownCoachingAggressiveness(input: {
  readonly coachName: string;
  readonly fourthDownGoRateOverExpected: number;
  readonly redZoneFourthDownGoRate: number;
  readonly scoreDifferential: number;
  readonly quarter: 1 | 2 | 3 | 4 | 5;
  readonly gamesSampled: number;
}): SignalEval<FourthDownCoachingAggressivenessEval> {
  const bad =
    badIf(input.coachName.trim().length === 0, "coachName is required and was blank") ??
    badIf(!isIn(input.fourthDownGoRateOverExpected, -1, 1), `fourthDownGoRateOverExpected must be in [-1,1]: ${String(input.fourthDownGoRateOverExpected)}`) ??
    badIf(!isProb(input.redZoneFourthDownGoRate), `redZoneFourthDownGoRate must be a rate in [0,1]: ${String(input.redZoneFourthDownGoRate)}`) ??
    badIf(!isIn(input.scoreDifferential, -70, 70), `scoreDifferential out of range: ${String(input.scoreDifferential)}`) ??
    badIf(![1, 2, 3, 4, 5].includes(input.quarter), `quarter must be 1|2|3|4|5: ${String(input.quarter)}`) ??
    badIf(!isCount(input.gamesSampled) || input.gamesSampled < MIN_COACH_GAMES, `a coach go-rate needs >= ${MIN_COACH_GAMES} games sampled, got ${String(input.gamesSampled)}`);
  if (bad) return bad;

  const ctx: FourthDownCoachingContext = {
    coachName: input.coachName,
    fourthDownGoRateOverExpected: input.fourthDownGoRateOverExpected,
    redZoneFourthDownGoRate: input.redZoneFourthDownGoRate,
    scoreDifferential: input.scoreDifferential,
    quarter: input.quarter,
  };
  const r = guard("evaluateFourthDownCoachingAggressiveness", () => evaluateFourthDownCoachingAggressiveness(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.expectedGoProbabilityOnFourthAndShort), `expectedGoProbabilityOnFourthAndShort left [0,1]: ${String(out.expectedGoProbabilityOnFourthAndShort)}`) ??
    badIf(!isIn(out.gameTotalPointsElasticity, -4, 4), `gameTotalPointsTilt out of range: ${String(out.gameTotalPointsElasticity)}`) ??
    badIf(!isIn(out.winProbabilityOptimizationBonus, -0.1, 0.1), `winProbabilityTiltDelta out of range: ${String(out.winProbabilityOptimizationBonus)}`) ??
    badIf(!isMultiplier(out.driveContinuationMultiplier, 0.8, 1.3), `driveContinuationMultiplier out of range: ${String(out.driveContinuationMultiplier)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PROBABILITY",
      aggressivenessTier: out.aggressivenessTier,
      expectedGoProbabilityOnFourthAndShort: out.expectedGoProbabilityOnFourthAndShort,
      gameTotalPointsTilt: out.gameTotalPointsElasticity,
      winProbabilityTiltDelta: out.winProbabilityOptimizationBonus,
      driveContinuationMultiplier: out.driveContinuationMultiplier,
      gamesSampled: input.gamesSampled,
    },
  };
}

export interface LopezSecondAndTenEval {
  readonly readingKind: "PROBABILITY";
  /** Probability the immediate 2nd-and-10 snap is a pass, in [0,1]. */
  readonly expectedPassProbability: number;
  /** Probability the immediate 2nd-and-10 snap is a run, in [0,1]. */
  readonly expectedRunProbability: number;
  /** Signed percentage-point shift versus the league median 2nd-and-10 pass rate. */
  readonly tendencyShiftOverBaselinePp: number;
  readonly playCallingRegime: "PASS_HEAVY_SEQUENTIAL" | "BALANCED" | "RUN_ESTABLISHMENT";
  /** Signed shift versus the unconditional base rate. Not a probability. */
  readonly passOverExpectedModifier: number;
}

export function evalLopezSecondAndTenTendency(input: {
  readonly priorFirstDownPlayType: "PASS" | "RUSH";
  readonly offensivePlayCallerTendencyBias?: number;
  readonly scoreDifferential: number;
  readonly quarter: 1 | 2 | 3 | 4 | 5;
  readonly timeRemainingSeconds: number;
}): SignalEval<LopezSecondAndTenEval> {
  const bad =
    badIf(input.priorFirstDownPlayType !== "PASS" && input.priorFirstDownPlayType !== "RUSH", `priorFirstDownPlayType must be PASS|RUSH: ${String(input.priorFirstDownPlayType)}`) ??
    badIf(input.offensivePlayCallerTendencyBias !== undefined && !isIn(input.offensivePlayCallerTendencyBias, -0.5, 0.5), `offensivePlayCallerTendencyBias out of range: ${String(input.offensivePlayCallerTendencyBias)}`) ??
    badIf(!isIn(input.scoreDifferential, -70, 70), `scoreDifferential out of range: ${String(input.scoreDifferential)}`) ??
    badIf(![1, 2, 3, 4, 5].includes(input.quarter), `quarter must be 1|2|3|4|5: ${String(input.quarter)}`) ??
    badIf(!isIn(input.timeRemainingSeconds, 0, 5400), `timeRemainingSeconds out of range: ${String(input.timeRemainingSeconds)}`);
  if (bad) return bad;

  const ctx: LopezSecondAndTenContext = {
    priorFirstDownPlayType: input.priorFirstDownPlayType,
    offensivePlayCallerTendencyBias: input.offensivePlayCallerTendencyBias,
    scoreDifferential: input.scoreDifferential,
    quarter: input.quarter,
    timeRemainingSeconds: input.timeRemainingSeconds,
  };
  const r = guard("evaluateLopezSecondAndTenTendency", () => evaluateLopezSecondAndTenTendency(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.expectedPassProbability), `expectedPassProbability left [0,1]: ${String(out.expectedPassProbability)}`) ??
    badIf(!isProb(out.expectedRunProbability), `expectedRunProbability left [0,1]: ${String(out.expectedRunProbability)}`) ??
    badIf(Math.abs(out.expectedPassProbability + out.expectedRunProbability - 1) > 0.002, `pass and run probabilities do not sum to 1: ${String(out.expectedPassProbability)} + ${String(out.expectedRunProbability)}`) ??
    badIf(!isIn(out.tendencyShiftOverBaselinePercentagePoints, -40, 40), `tendencyShiftOverBaselinePp out of range: ${String(out.tendencyShiftOverBaselinePercentagePoints)}`) ??
    badIf(!isIn(out.passOverExpectedModifier, -0.4, 0.4), `passOverExpectedModifier out of range: ${String(out.passOverExpectedModifier)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PROBABILITY",
      expectedPassProbability: out.expectedPassProbability,
      expectedRunProbability: out.expectedRunProbability,
      tendencyShiftOverBaselinePp: out.tendencyShiftOverBaselinePercentagePoints,
      playCallingRegime: out.playCallingRegime,
      passOverExpectedModifier: out.passOverExpectedModifier,
    },
  };
}

export interface ShortWeekRoadDeficitEval {
  readonly readingKind: "SIGNED_TILT";
  /** Days this team rested minus days the opponent rested. */
  readonly restDifferential: number;
  readonly acuteTravelDeficit: boolean;
  /** Signed spread-point tilt. NOT an edge. */
  readonly spreadPointsTilt: number;
  readonly fourthQuarterFatigueFactor: number;
  /** The kernel's `confidence`, RENAMED. A model-confidence SCORE, not a win probability. */
  readonly signalConfidenceScore: number;
  readonly explanation: string;
}

export function evalShortWeekRoadDeficit(input: {
  readonly isRoadTeam: boolean;
  readonly restDays: number;
  readonly travelDistanceMiles: number;
  readonly opponentRestDays: number;
  readonly isDivisionRivalry: boolean;
}): SignalEval<ShortWeekRoadDeficitEval> {
  const bad =
    badIf(typeof input.isRoadTeam !== "boolean", `isRoadTeam must be a boolean: ${String(input.isRoadTeam)}`) ??
    badIf(!isIn(input.restDays, 1, 30), `restDays out of range: ${String(input.restDays)}`) ??
    badIf(!isIn(input.travelDistanceMiles, 0, 6000), `travelDistanceMiles out of range: ${String(input.travelDistanceMiles)}`) ??
    badIf(!isIn(input.opponentRestDays, 1, 30), `opponentRestDays out of range: ${String(input.opponentRestDays)}`) ??
    badIf(typeof input.isDivisionRivalry !== "boolean", `isDivisionRivalry must be a boolean: ${String(input.isDivisionRivalry)}`);
  if (bad) return bad;

  const ctx: ShortWeekRoadContext = {
    isRoadTeam: input.isRoadTeam,
    restDays: input.restDays,
    travelDistanceMiles: input.travelDistanceMiles,
    opponentRestDays: input.opponentRestDays,
    isDivisionRivalry: input.isDivisionRivalry,
  };
  const r = guard("evaluateShortWeekRoadDeficit", () => evaluateShortWeekRoadDeficit(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.restDifferential, -29, 29), `restDifferential out of range: ${String(out.restDifferential)}`) ??
    badIf(typeof out.acuteTravelDeficit !== "boolean", "acuteTravelDeficit is not a boolean") ??
    badIf(!isIn(out.spreadPointAdjustment, -5, 2), `spreadPointsTilt out of range: ${String(out.spreadPointAdjustment)}`) ??
    badIf(!isMultiplier(out.fourthQuarterFatigueFactor, 0.9, 2), `fourthQuarterFatigueFactor out of range: ${String(out.fourthQuarterFatigueFactor)}`) ??
    badIf(!isProb(out.confidence), `signalConfidenceScore left [0,1]: ${String(out.confidence)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      restDifferential: out.restDifferential,
      acuteTravelDeficit: out.acuteTravelDeficit,
      spreadPointsTilt: out.spreadPointAdjustment,
      fourthQuarterFatigueFactor: out.fourthQuarterFatigueFactor,
      signalConfidenceScore: out.confidence,
      explanation: out.explanation,
    },
  };
}

export interface CircadianTravelFatigueEval {
  readonly readingKind: "PHYSICAL_MODIFIER";
  /** Local kickoff hour expressed on the traveller's body clock, 0-24. */
  readonly bodyClockKickoffHour: number;
  /** Positive = eastward travel (harder adaptation). */
  readonly timeZoneShiftEastward: number;
  /** Composite circadian mismatch magnitude in [0,1]. A SCORE, not a probability. */
  readonly circadianDeficitMagnitude: number;
  /** Days this team rested minus days the opponent rested. */
  readonly restAsymmetryDays: number;
  /** Signed first-half point tilt. NOT a forecast. */
  readonly firstHalfMarginTiltPoints: number;
  readonly fourthQuarterFatigueRisk: "LOW" | "MODERATE" | "HIGH";
  /** Signed full-game spread tilt. NOT an edge. */
  readonly netGameSpreadTiltPoints: number;
}

export function evalCircadianTravelFatigue(input: {
  readonly team: string;
  readonly isVisitor: boolean;
  readonly originTimeZoneOffset: number;
  readonly destinationTimeZoneOffset: number;
  readonly localKickoffHour24: number;
  readonly daysOfRest: number;
  readonly opponentDaysOfRest: number;
  readonly trailing14DayTravelMiles?: number;
}): SignalEval<CircadianTravelFatigueEval> {
  const bad =
    badIf(input.team.trim().length === 0, "team is required and was blank") ??
    badIf(typeof input.isVisitor !== "boolean", `isVisitor must be a boolean: ${String(input.isVisitor)}`) ??
    badIf(!isIn(input.originTimeZoneOffset, -12, 14), `originTimeZoneOffset out of range: ${String(input.originTimeZoneOffset)}`) ??
    badIf(!isIn(input.destinationTimeZoneOffset, -12, 14), `destinationTimeZoneOffset out of range: ${String(input.destinationTimeZoneOffset)}`) ??
    badIf(!isIn(input.localKickoffHour24, 0, 24), `localKickoffHour24 must be in [0,24]: ${String(input.localKickoffHour24)}`) ??
    badIf(!isIn(input.daysOfRest, 1, 30), `daysOfRest out of range: ${String(input.daysOfRest)}`) ??
    badIf(!isIn(input.opponentDaysOfRest, 1, 30), `opponentDaysOfRest out of range: ${String(input.opponentDaysOfRest)}`) ??
    badIf(input.trailing14DayTravelMiles !== undefined && !isIn(input.trailing14DayTravelMiles, 0, 20000), `trailing14DayTravelMiles out of range: ${String(input.trailing14DayTravelMiles)}`);
  if (bad) return bad;

  const ctx: CircadianTravelInput = {
    team: input.team,
    isVisitor: input.isVisitor,
    originTimeZoneOffset: input.originTimeZoneOffset,
    destinationTimeZoneOffset: input.destinationTimeZoneOffset,
    localKickoffHour24: input.localKickoffHour24,
    daysOfRest: input.daysOfRest,
    opponentDaysOfRest: input.opponentDaysOfRest,
    trailing14DayTravelMiles: input.trailing14DayTravelMiles,
  };
  const r = guard("evaluateCircadianTravelFatigue", () => evaluateCircadianTravelFatigue(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const risks: readonly CircadianTravelFatigueEval["fourthQuarterFatigueRisk"][] = ["LOW", "MODERATE", "HIGH"];
  const outBad =
    badIf(!isIn(out.bodyClockKickoffHour, -20, 36), `bodyClockKickoffHour out of range: ${String(out.bodyClockKickoffHour)}`) ??
    badIf(!isIn(out.timeZoneShiftEastward, -26, 26), `timeZoneShiftEastward out of range: ${String(out.timeZoneShiftEastward)}`) ??
    badIf(!isIn(out.circadianDeficitMagnitude, 0, 1), `circadianDeficitMagnitude left [0,1]: ${String(out.circadianDeficitMagnitude)}`) ??
    badIf(!isIn(out.restAsymmetryDays, -29, 29), `restAsymmetryDays out of range: ${String(out.restAsymmetryDays)}`) ??
    badIf(!isIn(out.expectedFirstHalfMarginAdjustment, -6, 6), `firstHalfMarginTiltPoints out of range: ${String(out.expectedFirstHalfMarginAdjustment)}`) ??
    badIf(!risks.includes(out.fourthQuarterFatigueRisk), `fourthQuarterFatigueRisk is not one of ${risks.join("|")}: ${String(out.fourthQuarterFatigueRisk)}`) ??
    badIf(!isIn(out.netGameSpreadAdjustment, -6, 6), `netGameSpreadTiltPoints out of range: ${String(out.netGameSpreadAdjustment)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PHYSICAL_MODIFIER",
      bodyClockKickoffHour: out.bodyClockKickoffHour,
      timeZoneShiftEastward: out.timeZoneShiftEastward,
      circadianDeficitMagnitude: out.circadianDeficitMagnitude,
      restAsymmetryDays: out.restAsymmetryDays,
      firstHalfMarginTiltPoints: out.expectedFirstHalfMarginAdjustment,
      fourthQuarterFatigueRisk: out.fourthQuarterFatigueRisk,
      netGameSpreadTiltPoints: out.netGameSpreadAdjustment,
    },
  };
}

/** A snap-weighted roster age read needs a real season window, not one week. */
export const MIN_ROSTER_AGE_GAMES = 4;

export interface AgeConditionedRestEval {
  readonly readingKind: "SIGNED_TILT";
  readonly ageBracket: "YOUNG_DEVELOPING" | "BALANCED_PRIME" | "VETERAN_HEAVY";
  readonly restRegime: "SHORT_REST_TNF" | "NORMAL_WEEK" | "MINI_BYE" | "FULL_BYE";
  /** Signed margin tilt in points. NOT an edge. */
  readonly expectedMarginTiltPoints: number;
  readonly fourthQuarterFatigueFactor: number;
  readonly injuryRiskMultiplier: number;
  readonly gamesSampled: number;
}

export function evalAgeConditionedRest(input: {
  readonly teamName: string;
  readonly daysOfRest: number;
  readonly snapWeightedRosterAge: number;
  readonly startingQbAge: number;
  readonly offensiveLineAvgAge: number;
  readonly gamesSampled: number;
}): SignalEval<AgeConditionedRestEval> {
  const bad =
    badIf(input.teamName.trim().length === 0, "teamName is required and was blank") ??
    badIf(!isIn(input.daysOfRest, 1, 30), `daysOfRest out of range: ${String(input.daysOfRest)}`) ??
    badIf(!isIn(input.snapWeightedRosterAge, 20, 40), `snapWeightedRosterAge out of range: ${String(input.snapWeightedRosterAge)}`) ??
    badIf(!isIn(input.startingQbAge, 18, 50), `startingQbAge out of range: ${String(input.startingQbAge)}`) ??
    badIf(!isIn(input.offensiveLineAvgAge, 18, 45), `offensiveLineAvgAge out of range: ${String(input.offensiveLineAvgAge)}`) ??
    badIf(!isCount(input.gamesSampled) || input.gamesSampled < MIN_ROSTER_AGE_GAMES, `snap-weighted roster age needs >= ${MIN_ROSTER_AGE_GAMES} games sampled, got ${String(input.gamesSampled)}`);
  if (bad) return bad;

  const ctx: AgeConditionedRestContext = {
    teamName: input.teamName,
    daysOfRest: input.daysOfRest,
    snapWeightedRosterAge: input.snapWeightedRosterAge,
    startingQbAge: input.startingQbAge,
    offensiveLineAvgAge: input.offensiveLineAvgAge,
  };
  const r = guard("evaluateAgeConditionedRest", () => evaluateAgeConditionedRest(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.expectedMarginAdjustment, -5, 5), `expectedMarginTiltPoints out of range: ${String(out.expectedMarginAdjustment)}`) ??
    badIf(!isMultiplier(out.fourthQuarterFatigueFactor, 0.7, 1.5), `fourthQuarterFatigueFactor out of range: ${String(out.fourthQuarterFatigueFactor)}`) ??
    badIf(!isMultiplier(out.injuryRiskMultiplier, 0.6, 1.6), `injuryRiskMultiplier out of range: ${String(out.injuryRiskMultiplier)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      ageBracket: out.ageBracket,
      restRegime: out.restRegime,
      expectedMarginTiltPoints: out.expectedMarginAdjustment,
      fourthQuarterFatigueFactor: out.fourthQuarterFatigueFactor,
      injuryRiskMultiplier: out.injuryRiskMultiplier,
      gamesSampled: input.gamesSampled,
    },
  };
}

// ============================================================================
// (e) chemistry / discipline / narrative / schematic / trench / bio / biomech
// ============================================================================

/** A rookie target-share read needs snaps, not a draft position. */
export const MIN_ROOKIE_GAMES = 3;
/** The five-game penalty window the kernel is named for. */
export const MIN_PENALTY_GAMES = 5;

export interface QbReceiverContinuityEval {
  readonly readingKind: "RATE";
  readonly continuityTier: "NOVEL" | "DEVELOPING" | "ESTABLISHED" | "TELEPATHIC";
  readonly gamesTogether: number;
  /** Adjusted share of team targets, in [0,1]. */
  readonly adjustedTargetShare: number;
  /** Signed percentage-point shift in target share. */
  readonly targetShareShiftPp: number;
  /** Signed EPA per target adjustment. A tilt, NOT a forecast. */
  readonly epaPerTargetTilt: number;
  readonly highLeverageTargetConcentrationMultiplier: number;
  /** 0-1.5 trust index. A SCORE, not a probability. */
  readonly trustIndexScore: number;
}

export function evalQbReceiverContinuity(input: {
  readonly qbName: string;
  readonly receiverName: string;
  readonly position: "WR1" | "WR2" | "WR3" | "TE" | "RB";
  readonly regularSeasonGamesPlayedTogether: number;
  readonly targetShareBaseline: number;
  readonly offensiveSchemeTenureSeasonsWithCoordinator: number;
}): SignalEval<QbReceiverContinuityEval> {
  const positions: readonly QbReceiverContinuityContext["position"][] = ["WR1", "WR2", "WR3", "TE", "RB"];
  const bad =
    badIf(input.qbName.trim().length === 0, "qbName is required and was blank") ??
    badIf(input.receiverName.trim().length === 0, "receiverName is required and was blank") ??
    badIf(!positions.includes(input.position), `position is not one of ${positions.join("|")}: ${String(input.position)}`) ??
    badIf(!isCount(input.regularSeasonGamesPlayedTogether) || input.regularSeasonGamesPlayedTogether > 40, `regularSeasonGamesPlayedTogether out of range: ${String(input.regularSeasonGamesPlayedTogether)}`) ??
    badIf(input.regularSeasonGamesPlayedTogether < MIN_QB_RX_SHARED_GAMES, `QB-receiver continuity needs >= ${MIN_QB_RX_SHARED_GAMES} shared games, got ${input.regularSeasonGamesPlayedTogether}`) ??
    badIf(!isProb(input.targetShareBaseline), `targetShareBaseline must be a share in [0,1]: ${String(input.targetShareBaseline)}`) ??
    badIf(!isCount(input.offensiveSchemeTenureSeasonsWithCoordinator) || input.offensiveSchemeTenureSeasonsWithCoordinator > 30, `offensiveSchemeTenureSeasonsWithCoordinator out of range: ${String(input.offensiveSchemeTenureSeasonsWithCoordinator)}`);
  if (bad) return bad;

  const ctx: QbReceiverContinuityContext = {
    qbName: input.qbName,
    receiverName: input.receiverName,
    position: input.position,
    regularSeasonGamesPlayedTogether: input.regularSeasonGamesPlayedTogether,
    targetShareBaseline: input.targetShareBaseline,
    offensiveSchemeTenureSeasonsWithCoordinator: input.offensiveSchemeTenureSeasonsWithCoordinator,
  };
  const r = guard("evaluateQbReceiverContinuity", () => evaluateQbReceiverContinuity(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.adjustedTargetShare), `adjustedTargetShare left [0,1]: ${String(out.adjustedTargetShare)}`) ??
    badIf(!isIn(out.targetShareShiftPercentagePoints, -5, 5), `targetShareShiftPp out of range: ${String(out.targetShareShiftPercentagePoints)}`) ??
    badIf(!isIn(out.epaPerTargetBonus, -0.1, 0.1), `epaPerTargetTilt out of range: ${String(out.epaPerTargetBonus)}`) ??
    badIf(!isMultiplier(out.highLeverageTargetConcentrationMultiplier, 0.5, 1.5), `highLeverageTargetConcentrationMultiplier out of range: ${String(out.highLeverageTargetConcentrationMultiplier)}`) ??
    badIf(!isIn(out.trustIndex, 0, 1.5), `trustIndexScore out of range: ${String(out.trustIndex)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      continuityTier: out.continuityTier,
      gamesTogether: out.gamesTogether,
      adjustedTargetShare: out.adjustedTargetShare,
      targetShareShiftPp: out.targetShareShiftPercentagePoints,
      epaPerTargetTilt: out.epaPerTargetBonus,
      highLeverageTargetConcentrationMultiplier: out.highLeverageTargetConcentrationMultiplier,
      trustIndexScore: out.trustIndex,
    },
  };
}

export interface PenaltyDifferentialMomentumEval {
  readonly readingKind: "SIGNED_TILT";
  readonly disciplineTier: "ELITE_DISCIPLINE" | "AVERAGE" | "HIGH_PENALTY_LIABILITY";
  /** Net penalty yards favouring this team. Positive = this team is more disciplined. */
  readonly netPenaltyYardAdvantage: number;
  /** Signed spread-point tilt. NOT an edge. */
  readonly expectedSpreadTiltPoints: number;
  /** 0-100 drive-stall risk index. An INDEX, not a probability. */
  readonly driveStallRiskIndex: number;
  readonly chunkPenaltyYardsExpectation: number;
  readonly gamesSampled: number;
}

export function evalPenaltyDifferentialMomentum(input: {
  readonly teamName: string;
  readonly opponentName: string;
  readonly rollingFiveGameNetPenaltyYards: number;
  readonly teamPreSnapFoulsPerGame: number;
  readonly opponentPreSnapFoulsPerGame: number;
  readonly teamDpiBeneficiaryYardsPerGame: number;
  readonly opponentDpiBeneficiaryYardsPerGame: number;
  readonly gamesSampled: number;
}): SignalEval<PenaltyDifferentialMomentumEval> {
  const bad =
    badIf(input.teamName.trim().length === 0, "teamName is required and was blank") ??
    badIf(input.opponentName.trim().length === 0, "opponentName is required and was blank") ??
    badIf(input.teamName === input.opponentName, `teamName and opponentName are the same team (${input.teamName})`) ??
    badIf(!isIn(input.rollingFiveGameNetPenaltyYards, -200, 200), `rollingFiveGameNetPenaltyYards out of range: ${String(input.rollingFiveGameNetPenaltyYards)}`) ??
    badIf(!isIn(input.teamPreSnapFoulsPerGame, 0, 6), `teamPreSnapFoulsPerGame out of range: ${String(input.teamPreSnapFoulsPerGame)}`) ??
    badIf(!isIn(input.opponentPreSnapFoulsPerGame, 0, 6), `opponentPreSnapFoulsPerGame out of range: ${String(input.opponentPreSnapFoulsPerGame)}`) ??
    badIf(!isIn(input.teamDpiBeneficiaryYardsPerGame, 0, 40), `teamDpiBeneficiaryYardsPerGame out of range: ${String(input.teamDpiBeneficiaryYardsPerGame)}`) ??
    badIf(!isIn(input.opponentDpiBeneficiaryYardsPerGame, 0, 40), `opponentDpiBeneficiaryYardsPerGame out of range: ${String(input.opponentDpiBeneficiaryYardsPerGame)}`) ??
    badIf(!isCount(input.gamesSampled) || input.gamesSampled < MIN_PENALTY_GAMES, `penalty differential is a ${MIN_PENALTY_GAMES}-game window and needs >= ${MIN_PENALTY_GAMES} games sampled, got ${String(input.gamesSampled)}`);
  if (bad) return bad;

  const ctx: PenaltyDifferentialContext = {
    teamName: input.teamName,
    opponentName: input.opponentName,
    rollingFiveGameNetPenaltyYards: input.rollingFiveGameNetPenaltyYards,
    teamPreSnapFoulsPerGame: input.teamPreSnapFoulsPerGame,
    opponentPreSnapFoulsPerGame: input.opponentPreSnapFoulsPerGame,
    teamDpiBeneficiaryYardsPerGame: input.teamDpiBeneficiaryYardsPerGame,
    opponentDpiBeneficiaryYardsPerGame: input.opponentDpiBeneficiaryYardsPerGame,
  };
  const r = guard("evaluatePenaltyDifferentialMomentum", () => evaluatePenaltyDifferentialMomentum(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.netPenaltyYardAdvantage, -200, 200), `netPenaltyYardAdvantage out of range: ${String(out.netPenaltyYardAdvantage)}`) ??
    badIf(!isIn(out.expectedSpreadAdjustmentPoints, -3, 3), `expectedSpreadTiltPoints out of range: ${String(out.expectedSpreadAdjustmentPoints)}`) ??
    badIf(!isIn(out.driveStallRiskScore, 0, 100), `driveStallRiskIndex left [0,100]: ${String(out.driveStallRiskScore)}`) ??
    badIf(!isIn(out.chunkPenaltyYardsExpectation, 0, 40), `chunkPenaltyYardsExpectation out of range: ${String(out.chunkPenaltyYardsExpectation)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      disciplineTier: out.disciplineTier,
      netPenaltyYardAdvantage: out.netPenaltyYardAdvantage,
      expectedSpreadTiltPoints: out.expectedSpreadAdjustmentPoints,
      driveStallRiskIndex: out.driveStallRiskScore,
      chunkPenaltyYardsExpectation: out.chunkPenaltyYardsExpectation,
      gamesSampled: input.gamesSampled,
    },
  };
}

export interface ContractMilestonesEval {
  readonly readingKind: "RATE";
  /** Season total as a fraction of the milestone target. A RATIO, not a probability. */
  readonly incentiveProximityRatio: number;
  /** Stat units still needed per remaining game. */
  readonly neededPerGame: number;
  readonly incentiveAttainability: "HIGH_PROXIMITY" | "ACHIEVABLE" | "OUT_OF_REACH" | "ALREADY_MET";
  readonly touchPriorityBoostMultiplier: number;
  /** Signed percentage-point shift in projected target share. */
  readonly projectedTargetShareDeltaPp: number;
  /** 0-100 financial urgency index. An INDEX, not a probability. */
  readonly financialUrgencyIndex: number;
  readonly remainingGamesInSeason: number;
}

export function evalContractMilestones(input: {
  readonly playerName: string;
  readonly position: "WR" | "TE" | "RB" | "QB" | "EDGE" | "CB";
  readonly metricType: "RECEPTIONS" | "RECEIVING_YARDS" | "RUSHING_YARDS" | "TOUCHDOWNS" | "SACKS";
  readonly currentSeasonTotal: number;
  readonly milestoneTarget: number;
  readonly bonusValueUsd: number;
  readonly remainingGamesInSeason: number;
  readonly isContractYear: boolean;
  readonly teamPlayoffStatus: "CLINCHED" | "IN_HUNT" | "ELIMINATED";
}): SignalEval<ContractMilestonesEval> {
  const positions: readonly ContractMilestoneContext["position"][] = ["WR", "TE", "RB", "QB", "EDGE", "CB"];
  const metrics: readonly ContractMilestoneContext["metricType"][] = [
    "RECEPTIONS",
    "RECEIVING_YARDS",
    "RUSHING_YARDS",
    "TOUCHDOWNS",
    "SACKS",
  ];
  const statuses: readonly ContractMilestoneContext["teamPlayoffStatus"][] = ["CLINCHED", "IN_HUNT", "ELIMINATED"];
  const bad =
    badIf(input.playerName.trim().length === 0, "playerName is required and was blank") ??
    badIf(!positions.includes(input.position), `position is not one of ${positions.join("|")}: ${String(input.position)}`) ??
    badIf(!metrics.includes(input.metricType), `metricType is not one of ${metrics.join("|")}: ${String(input.metricType)}`) ??
    badIf(!isCount(input.currentSeasonTotal) || input.currentSeasonTotal > 10000, `currentSeasonTotal out of range: ${String(input.currentSeasonTotal)}`) ??
    badIf(!isIn(input.milestoneTarget, 0.01, 10000), `milestoneTarget must be positive: ${String(input.milestoneTarget)}`) ??
    badIf(!isIn(input.bonusValueUsd, 1, 100000000), `bonusValueUsd must be a positive documented bonus: ${String(input.bonusValueUsd)}`) ??
    badIf(!isIn(input.remainingGamesInSeason, 1, 18), `remainingGamesInSeason must be 1-18: ${String(input.remainingGamesInSeason)}`) ??
    badIf(typeof input.isContractYear !== "boolean", `isContractYear must be a boolean: ${String(input.isContractYear)}`) ??
    badIf(!statuses.includes(input.teamPlayoffStatus), `teamPlayoffStatus is not one of ${statuses.join("|")}: ${String(input.teamPlayoffStatus)}`);
  if (bad) return bad;

  const ctx: ContractMilestoneContext = {
    playerName: input.playerName,
    position: input.position,
    metricType: input.metricType,
    currentSeasonTotal: input.currentSeasonTotal,
    milestoneTarget: input.milestoneTarget,
    bonusValueUsd: input.bonusValueUsd,
    remainingGamesInSeason: input.remainingGamesInSeason,
    isContractYear: input.isContractYear,
    teamPlayoffStatus: input.teamPlayoffStatus,
  };
  const r = guard("evaluateContractMilestones", () => evaluateContractMilestones(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.incentiveProximityRatio, 0, 10), `incentiveProximityRatio out of range: ${String(out.incentiveProximityRatio)}`) ??
    badIf(!isIn(out.neededPerGame, 0, 10000), `neededPerGame out of range: ${String(out.neededPerGame)}`) ??
    badIf(!isMultiplier(out.touchPriorityBoostMultiplier, 0.9, 1.5), `touchPriorityBoostMultiplier out of range: ${String(out.touchPriorityBoostMultiplier)}`) ??
    badIf(!isIn(out.projectedTargetShareDelta, -0.5, 10), `projectedTargetShareDeltaPp out of range: ${String(out.projectedTargetShareDelta)}`) ??
    badIf(!isIn(out.financialUrgencyScore, 0, 100), `financialUrgencyIndex left [0,100]: ${String(out.financialUrgencyScore)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      incentiveProximityRatio: out.incentiveProximityRatio,
      neededPerGame: out.neededPerGame,
      incentiveAttainability: out.incentiveAttainability,
      touchPriorityBoostMultiplier: out.touchPriorityBoostMultiplier,
      projectedTargetShareDeltaPp: out.projectedTargetShareDelta,
      financialUrgencyIndex: out.financialUrgencyScore,
      remainingGamesInSeason: input.remainingGamesInSeason,
    },
  };
}

export interface RookieBreakoutCohortEval {
  readonly readingKind: "RATE";
  readonly breakoutPhase: "EARLY_ACCLIMATION" | "INFLECTION_SURGE" | "LATE_ALPHA_ASCENSION" | "LIMITED_ROLE";
  readonly targetShareMultiplier: number;
  /** Adjusted share of team targets, in [0,1]. */
  readonly adjustedTargetShare: number;
  /** Adjusted route participation, in [0,1]. */
  readonly adjustedRouteParticipation: number;
  /** Signed percentage-point post-bye acceleration bonus. */
  readonly postByeAccelerationBonusPp: number;
  readonly isPrimeBreakoutCandidate: boolean;
  readonly gamesPlayed: number;
}

export function evalRookieBreakoutCohort(input: {
  readonly rookieName: string;
  readonly rookieDraftRound: 1 | 2 | 3 | 4 | 5 | 6 | 7 | "UDFA";
  readonly currentWeekOfSeason: number;
  readonly hasHadByeWeek: boolean;
  readonly isImmediatelyPostBye: boolean;
  readonly baselineTargetShare: number;
  readonly baselineRouteParticipation: number;
  readonly depthChartRank: number;
  readonly gamesPlayed: number;
}): SignalEval<RookieBreakoutCohortEval> {
  const rounds: readonly RookieBreakoutContext["rookieDraftRound"][] = [1, 2, 3, 4, 5, 6, 7, "UDFA"];
  const bad =
    badIf(input.rookieName.trim().length === 0, "rookieName is required and was blank") ??
    badIf(!rounds.includes(input.rookieDraftRound), `rookieDraftRound is not one of 1-7|UDFA: ${String(input.rookieDraftRound)}`) ??
    badIf(!isIn(input.currentWeekOfSeason, 1, 22), `currentWeekOfSeason must be 1-22: ${String(input.currentWeekOfSeason)}`) ??
    badIf(typeof input.hasHadByeWeek !== "boolean", `hasHadByeWeek must be a boolean: ${String(input.hasHadByeWeek)}`) ??
    badIf(typeof input.isImmediatelyPostBye !== "boolean", `isImmediatelyPostBye must be a boolean: ${String(input.isImmediatelyPostBye)}`) ??
    badIf(input.isImmediatelyPostBye && !input.hasHadByeWeek, "isImmediatelyPostBye is true but hasHadByeWeek is false") ??
    badIf(!isProb(input.baselineTargetShare), `baselineTargetShare must be a share in [0,1]: ${String(input.baselineTargetShare)}`) ??
    badIf(!isProb(input.baselineRouteParticipation), `baselineRouteParticipation must be in [0,1]: ${String(input.baselineRouteParticipation)}`) ??
    badIf(!isIn(input.depthChartRank, 1, 20), `depthChartRank must be in [1,20]: ${String(input.depthChartRank)}`) ??
    badIf(!isCount(input.gamesPlayed) || input.gamesPlayed > 22, `gamesPlayed out of range: ${String(input.gamesPlayed)}`) ??
    badIf(input.gamesPlayed < MIN_ROOKIE_GAMES, `rookie target-share read needs >= ${MIN_ROOKIE_GAMES} games played, got ${input.gamesPlayed}`);
  if (bad) return bad;

  const ctx: RookieBreakoutContext = {
    rookieDraftRound: input.rookieDraftRound,
    currentWeekOfSeason: input.currentWeekOfSeason,
    hasHadByeWeek: input.hasHadByeWeek,
    isImmediatelyPostBye: input.isImmediatelyPostBye,
    baselineTargetShare: input.baselineTargetShare,
    baselineRouteParticipation: input.baselineRouteParticipation,
    depthChartRank: input.depthChartRank,
  };
  const r = guard("evaluateRookieBreakoutCohort", () => evaluateRookieBreakoutCohort(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.targetShareMultiplier, 0.9, 1.6), `targetShareMultiplier out of range: ${String(out.targetShareMultiplier)}`) ??
    badIf(!isProb(out.adjustedTargetShare), `adjustedTargetShare left [0,1]: ${String(out.adjustedTargetShare)}`) ??
    badIf(!isProb(out.adjustedRouteParticipation), `adjustedRouteParticipation left [0,1]: ${String(out.adjustedRouteParticipation)}`) ??
    badIf(!isIn(out.postByeAccelerationBonusPp, 0, 10), `postByeAccelerationBonusPp out of range: ${String(out.postByeAccelerationBonusPp)}`) ??
    badIf(typeof out.isPrimeBreakoutCandidate !== "boolean", "isPrimeBreakoutCandidate is not a boolean");
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      breakoutPhase: out.breakoutPhase,
      targetShareMultiplier: out.targetShareMultiplier,
      adjustedTargetShare: out.adjustedTargetShare,
      adjustedRouteParticipation: out.adjustedRouteParticipation,
      postByeAccelerationBonusPp: out.postByeAccelerationBonusPp,
      isPrimeBreakoutCandidate: out.isPrimeBreakoutCandidate,
      gamesPlayed: input.gamesPlayed,
    },
  };
}

export interface ByeWeekDefensiveInstallationEval {
  readonly readingKind: "SIGNED_TILT";
  readonly extendedPrepActive: boolean;
  /** Signed first-half EPA/play change against the opponent offense. A tilt, NOT a forecast. */
  readonly opponentFirstHalfEpaTilt: number;
  /** Signed third-down conversion penalty in percentage points. */
  readonly opponentThirdDownTiltPp: number;
  /** Signed first-half total-points tilt. NOT a forecast. */
  readonly firstHalfTotalPointsTilt: number;
  readonly opponentTurnoverProbabilityMultiplier: number;
  readonly defensiveConfusionTier: "MAXIMUM_CONFUSION" | "MODERATE_DISRUPTION" | "NEUTRAL";
}

export function evalByeWeekDefensiveInstallation(input: {
  readonly defensiveCoordinatorName: string;
  readonly coordinatorPedigreeTier: "ELITE_ARCHITECT" | "SOLID_EXPERIENCED" | "FIRST_YEAR_COORDINATOR";
  readonly daysOfPreparation: number;
  readonly opponentQbExperienceSeasons: number;
}): SignalEval<ByeWeekDefensiveInstallationEval> {
  const tiers: readonly ByeWeekDefensiveContext["coordinatorPedigreeTier"][] = [
    "ELITE_ARCHITECT",
    "SOLID_EXPERIENCED",
    "FIRST_YEAR_COORDINATOR",
  ];
  const bad =
    badIf(input.defensiveCoordinatorName.trim().length === 0, "defensiveCoordinatorName is required and was blank") ??
    badIf(!tiers.includes(input.coordinatorPedigreeTier), `coordinatorPedigreeTier is not one of ${tiers.join("|")}: ${String(input.coordinatorPedigreeTier)}`) ??
    badIf(!isIn(input.daysOfPreparation, 0, 30), `daysOfPreparation out of range: ${String(input.daysOfPreparation)}`) ??
    badIf(!isIn(input.opponentQbExperienceSeasons, 0, 30), `opponentQbExperienceSeasons out of range: ${String(input.opponentQbExperienceSeasons)}`);
  if (bad) return bad;

  const ctx: ByeWeekDefensiveContext = {
    defensiveCoordinatorName: input.defensiveCoordinatorName,
    coordinatorPedigreeTier: input.coordinatorPedigreeTier,
    daysOfPreparation: input.daysOfPreparation,
    opponentQbExperienceSeasons: input.opponentQbExperienceSeasons,
  };
  const r = guard("evaluateByeWeekDefensiveInstallation", () => evaluateByeWeekDefensiveInstallation(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(typeof out.extendedPrepActive !== "boolean", "extendedPrepActive is not a boolean") ??
    badIf(!isIn(out.opponentFirstHalfEpaDelta, -0.2, 0.1), `opponentFirstHalfEpaTilt out of range: ${String(out.opponentFirstHalfEpaDelta)}`) ??
    badIf(!isIn(out.opponentThirdDownConversionPenaltyPp, -20, 5), `opponentThirdDownTiltPp out of range: ${String(out.opponentThirdDownConversionPenaltyPp)}`) ??
    badIf(!isIn(out.firstHalfTotalPointsDelta, -5, 1), `firstHalfTotalPointsTilt out of range: ${String(out.firstHalfTotalPointsDelta)}`) ??
    badIf(!isMultiplier(out.opponentTurnoverProbabilityMultiplier, 0.9, 2), `opponentTurnoverProbabilityMultiplier out of range: ${String(out.opponentTurnoverProbabilityMultiplier)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      extendedPrepActive: out.extendedPrepActive,
      opponentFirstHalfEpaTilt: out.opponentFirstHalfEpaDelta,
      opponentThirdDownTiltPp: out.opponentThirdDownConversionPenaltyPp,
      firstHalfTotalPointsTilt: out.firstHalfTotalPointsDelta,
      opponentTurnoverProbabilityMultiplier: out.opponentTurnoverProbabilityMultiplier,
      defensiveConfusionTier: out.defensiveConfusionTier,
    },
  };
}

export interface OffensiveLineTrenchEval {
  readonly readingKind: "SIGNED_TILT";
  /** 0-1 continuity score. A SCORE, not a probability. */
  readonly continuityScore: number;
  /** Signed pass-block-minus-pass-rush win-rate advantage in percentage points. */
  readonly trenchNetPressureAdvantagePp: number;
  /** Signed sack-rate shift in percentage points. */
  readonly sackRateTiltPp: number;
  /** Signed rush yards-before-contact shift. */
  readonly yardsBeforeContactTilt: number;
  /** Signed offensive EPA/play adjustment. A tilt, NOT a forecast. */
  readonly offensiveEpaTilt: number;
  readonly leadRusherEfficiencyMultiplier: number;
  readonly startingLinemenCount: number;
}

export function evalOffensiveLineTrench(input: {
  readonly team: string;
  readonly startingLinemenCount: number;
  readonly returningStartersFromPriorWeek: number;
  readonly backupTacklesStarting: number;
  readonly backupInteriorStarting: number;
  readonly teamPbwrPercent: number;
  readonly opponentPrwrPercent: number;
  readonly trailingThreeWeekContinuityScore?: number;
}): SignalEval<OffensiveLineTrenchEval> {
  const bad =
    badIf(input.team.trim().length === 0, "team is required and was blank") ??
    badIf(!isIn(input.startingLinemenCount, 1, 8), `startingLinemenCount must be in [1,8]: ${String(input.startingLinemenCount)}`) ??
    badIf(!isIn(input.returningStartersFromPriorWeek, 0, 8), `returningStartersFromPriorWeek out of range: ${String(input.returningStartersFromPriorWeek)}`) ??
    badIf(input.returningStartersFromPriorWeek > input.startingLinemenCount, `returningStartersFromPriorWeek ${input.returningStartersFromPriorWeek} exceeds startingLinemenCount ${input.startingLinemenCount}`) ??
    badIf(!isIn(input.backupTacklesStarting, 0, 3), `backupTacklesStarting must be 0-3: ${String(input.backupTacklesStarting)}`) ??
    badIf(!isIn(input.backupInteriorStarting, 0, 4), `backupInteriorStarting must be 0-4: ${String(input.backupInteriorStarting)}`) ??
    badIf(!isIn(input.teamPbwrPercent, 0, 100), `teamPbwrPercent must be in [0,100]: ${String(input.teamPbwrPercent)}`) ??
    badIf(!isIn(input.opponentPrwrPercent, 0, 100), `opponentPrwrPercent must be in [0,100]: ${String(input.opponentPrwrPercent)}`) ??
    badIf(input.trailingThreeWeekContinuityScore !== undefined && !isIn(input.trailingThreeWeekContinuityScore, 0, 1), `trailingThreeWeekContinuityScore must be in [0,1]: ${String(input.trailingThreeWeekContinuityScore)}`);
  if (bad) return bad;

  const ctx: OffensiveLineTrenchInput = {
    team: input.team,
    startingLinemenCount: input.startingLinemenCount,
    returningStartersFromPriorWeek: input.returningStartersFromPriorWeek,
    backupTacklesStarting: input.backupTacklesStarting,
    backupInteriorStarting: input.backupInteriorStarting,
    teamPbwrPercent: input.teamPbwrPercent,
    opponentPrwrPercent: input.opponentPrwrPercent,
    trailingThreeWeekContinuityScore: input.trailingThreeWeekContinuityScore,
  };
  const r = guard("evaluateOffensiveLineTrench", () => evaluateOffensiveLineTrench(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.continuityScore, 0, 1), `continuityScore left [0,1]: ${String(out.continuityScore)}`) ??
    badIf(!isIn(out.trenchNetPressureAdvantagePercent, -100, 100), `trenchNetPressureAdvantagePp out of range: ${String(out.trenchNetPressureAdvantagePercent)}`) ??
    badIf(!isIn(out.expectedSackRateDelta, -6, 12), `sackRateTiltPp out of range: ${String(out.expectedSackRateDelta)}`) ??
    badIf(!isIn(out.yardsBeforeContactDelta, -3, 0.5), `yardsBeforeContactTilt out of range: ${String(out.yardsBeforeContactDelta)}`) ??
    badIf(!isIn(out.offensiveEpaPerPlayAdjustment, -0.2, 0.2), `offensiveEpaTilt out of range: ${String(out.offensiveEpaPerPlayAdjustment)}`) ??
    badIf(!isMultiplier(out.leadRusherEfficiencyMultiplier, 0.7, 1.2), `leadRusherEfficiencyMultiplier out of range: ${String(out.leadRusherEfficiencyMultiplier)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      continuityScore: out.continuityScore,
      trenchNetPressureAdvantagePp: out.trenchNetPressureAdvantagePercent,
      sackRateTiltPp: out.expectedSackRateDelta,
      yardsBeforeContactTilt: out.yardsBeforeContactDelta,
      offensiveEpaTilt: out.offensiveEpaPerPlayAdjustment,
      leadRusherEfficiencyMultiplier: out.leadRusherEfficiencyMultiplier,
      startingLinemenCount: input.startingLinemenCount,
    },
  };
}

const PRACTICE_STATUSES = ["FP", "LP", "DNP", "DNP_NIR", "MP"] as const;
const OFFICIAL_STATUSES = ["OUT", "DOUBTFUL", "QUESTIONABLE", "ACTIVE", "NONE"] as const;
const POSITION_TIERS = [
  "QB_STARTER",
  "WR1_ELITE",
  "RB_BELLCOW",
  "LT_ANCHOR",
  "CB_SHUTDOWN",
  "STARTER_OTHER",
] as const;

export interface InjuryTrajectoryEval {
  readonly readingKind: "PROBABILITY";
  /** Probability this player appears in the game, in [0,1]. A genuine probability. */
  readonly estimatedPlayProbability: number;
  readonly trajectoryTrend: "IMPROVING" | "DETERIORATING" | "STATIC_HEALTHY" | "STATIC_INJURED" | "VETERAN_REST";
  /** Spread points at stake if the player is out. Magnitude, not a probability. */
  readonly spreadImpactPointsIfOut: number;
  /** Signed fade points versus an over-reacting market. A tilt, NOT an edge. */
  readonly marketOverreactionTiltPoints: number;
  readonly hasEarlyWarningDowngrade: boolean;
  readonly practiceReportsObserved: number;
}

export function evalInjuryTrajectory(input: {
  readonly wednesday?: (typeof PRACTICE_STATUSES)[number];
  readonly thursday?: (typeof PRACTICE_STATUSES)[number];
  readonly friday?: (typeof PRACTICE_STATUSES)[number];
  readonly officialStatus?: (typeof OFFICIAL_STATUSES)[number];
  readonly positionTier: (typeof POSITION_TIERS)[number];
}): SignalEval<InjuryTrajectoryEval> {
  const statuses = [input.wednesday, input.thursday, input.friday].filter(
    (s): s is NonNullable<typeof s> => s !== undefined,
  );
  const bad =
    badIf(!POSITION_TIERS.includes(input.positionTier), `positionTier is not one of ${POSITION_TIERS.join("|")}: ${String(input.positionTier)}`) ??
    badIf(statuses.length === 0 && input.officialStatus === undefined, "no practice report and no official status supplied: there is nothing to read") ??
    badIf(input.officialStatus !== undefined && !OFFICIAL_STATUSES.includes(input.officialStatus), `officialStatus is not one of ${OFFICIAL_STATUSES.join("|")}: ${String(input.officialStatus)}`) ??
    badIf(
      statuses.some((s) => !PRACTICE_STATUSES.includes(s)),
      `a practice status is not one of ${PRACTICE_STATUSES.join("|")}`,
    );
  if (bad) return bad;

  const report: InjuryPracticeReport = {
    wednesday: input.wednesday,
    thursday: input.thursday,
    friday: input.friday,
    officialStatus: input.officialStatus,
    positionTier: input.positionTier,
  };
  const r = guard("analyzeInjuryTrajectory", () => analyzeInjuryTrajectory(report));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isProb(out.estimatedPlayProbability), `estimatedPlayProbability left [0,1]: ${String(out.estimatedPlayProbability)}`) ??
    badIf(!isIn(out.spreadImpactPointsIfOut, 0, 8), `spreadImpactPointsIfOut out of range: ${String(out.spreadImpactPointsIfOut)}`) ??
    badIf(!isIn(out.marketOverreactionFadePoints, -1, 3), `marketOverreactionTiltPoints out of range: ${String(out.marketOverreactionFadePoints)}`) ??
    badIf(typeof out.hasEarlyWarningDowngrade !== "boolean", "hasEarlyWarningDowngrade is not a boolean");
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PROBABILITY",
      estimatedPlayProbability: out.estimatedPlayProbability,
      trajectoryTrend: out.trajectoryTrend,
      spreadImpactPointsIfOut: out.spreadImpactPointsIfOut,
      marketOverreactionTiltPoints: out.marketOverreactionFadePoints,
      hasEarlyWarningDowngrade: out.hasEarlyWarningDowngrade,
      practiceReportsObserved: statuses.length,
    },
  };
}

export interface TurfSurfaceFatigueEval {
  readonly readingKind: "PHYSICAL_MODIFIER";
  readonly surfaceFrictionTier: "HIGH_TRACTION_FATIGUE" | "MODERATE_SYNTHETIC" | "COMPLIANT_NATURAL";
  /** Signed shift in fourth-quarter yards after contact per carry. */
  readonly fourthQuarterYacTilt: number;
  /** Multiplier on late-game explosive-run rate. */
  readonly lateGameExplosiveRunDecayMultiplier: number;
  /** 0-100 soft-tissue fatigue index. An INDEX, not a probability. */
  readonly lowerBodySoftTissueFatigueIndex: number;
  /** Surface-adjusted yards per carry. A projection of a base, not a probability. */
  readonly adjustedYardsPerCarry: number;
  readonly expectedTouches: number;
}

export function evalTurfSurfaceFatigue(input: {
  readonly playingSurface: "SLIT_FILM_TURF" | "MONOFILAMENT_TURF" | "NATURAL_BERMUDA_GRASS" | "NATURAL_BLUEGRASS" | "HYBRID_GRASS";
  readonly playerWeightLbs: number;
  readonly playerAge: number;
  readonly baselineYardsPerCarry: number;
  readonly expectedTouches: number;
}): SignalEval<TurfSurfaceFatigueEval> {
  const surfaces: readonly SurfaceFatigueContext["playingSurface"][] = [
    "SLIT_FILM_TURF",
    "MONOFILAMENT_TURF",
    "NATURAL_BERMUDA_GRASS",
    "NATURAL_BLUEGRASS",
    "HYBRID_GRASS",
  ];
  const bad =
    badIf(!surfaces.includes(input.playingSurface), `playingSurface is not one of ${surfaces.join("|")}: ${String(input.playingSurface)}`) ??
    badIf(!isIn(input.playerWeightLbs, 150, 350), `playerWeightLbs out of range: ${String(input.playerWeightLbs)}`) ??
    badIf(!isIn(input.playerAge, 20, 45), `playerAge out of range: ${String(input.playerAge)}`) ??
    badIf(!isIn(input.baselineYardsPerCarry, 1.5, 8), `baselineYardsPerCarry out of range: ${String(input.baselineYardsPerCarry)}`) ??
    badIf(!isIn(input.expectedTouches, 1, 45), `expectedTouches must be at least 1, got ${String(input.expectedTouches)}`);
  if (bad) return bad;

  const ctx: SurfaceFatigueContext = {
    playingSurface: input.playingSurface,
    playerWeightLbs: input.playerWeightLbs,
    playerAge: input.playerAge,
    baselineYardsPerCarry: input.baselineYardsPerCarry,
    expectedTouches: input.expectedTouches,
  };
  const r = guard("evaluateTurfSurfaceFatigue", () => evaluateTurfSurfaceFatigue(ctx));
  if (!r.ok) return r;

  const out = r.data;
  const outBad =
    badIf(!isIn(out.fourthQuarterYacDelta, -1, 0.2), `fourthQuarterYacTilt out of range: ${String(out.fourthQuarterYacDelta)}`) ??
    badIf(!isMultiplier(out.lateGameExplosiveRunDecayMultiplier, 0.7, 1.1), `lateGameExplosiveRunDecayMultiplier out of range: ${String(out.lateGameExplosiveRunDecayMultiplier)}`) ??
    badIf(!isIn(out.lowerBodySoftTissueFatigueIndex, 0, 100), `lowerBodySoftTissueFatigueIndex left [0,100]: ${String(out.lowerBodySoftTissueFatigueIndex)}`) ??
    badIf(!isIn(out.adjustedYardsPerCarry, 1, 9), `adjustedYardsPerCarry out of range: ${String(out.adjustedYardsPerCarry)}`);
  if (outBad) return outBad;

  return {
    ok: true,
    data: {
      readingKind: "PHYSICAL_MODIFIER",
      surfaceFrictionTier: out.surfaceFrictionTier,
      fourthQuarterYacTilt: out.fourthQuarterYacDelta,
      lateGameExplosiveRunDecayMultiplier: out.lateGameExplosiveRunDecayMultiplier,
      lowerBodySoftTissueFatigueIndex: out.lowerBodySoftTissueFatigueIndex,
      adjustedYardsPerCarry: out.adjustedYardsPerCarry,
      expectedTouches: input.expectedTouches,
    },
  };
}

// ============================================================================
// (f) top-level: turnover-luck, expected-turnover-diff, opponent-adjusted-epa
// ============================================================================

export interface TurnoverLuckEval {
  readonly readingKind: "RATE";
  readonly team: string;
  readonly defensivePlays: number;
  readonly opponentDropbacks: number;
  /** Forced-fumble rate per defensive play, in [0,1]. */
  readonly forcedFumbleRatePerPlay: number;
  /** Signed forced fumbles above the league baseline. Positive = forcing more than expected. */
  readonly forcedFumbleOverExpected: number;
  /** Interception rate per opponent dropback, in [0,1]. */
  readonly interceptionRatePerDropback: number;
  /** Signed interceptions above the league baseline. */
  readonly interceptionOverExpected: number;
  /**
   * The recovery half. Present only when the team forced at least the
   * kernel's minimum forced fumbles; a missing recovery read is a NO VOTE,
   * never a neutral zero.
   */
  readonly recovery: {
    readonly fumblesForced: number;
    readonly fumblesRecoveredByTeam: number;
    /** Recovery share in [0,1]. */
    readonly recoveryShare: number;
    /** Signed share above the league baseline. */
    readonly recoveryShareOverExpected: number;
    /** Shrunk estimate of the team's true recovery rate, in [0,1]. */
    readonly regressedRecoveryShare: number;
    /** Signed expected point swing as recovery reverts. A tilt, NOT an edge. */
    readonly expectedRegressionTiltPoints: number;
  } | null;
  /** Named reason the recovery half is absent, or empty when it is present. */
  readonly recoveryGaps: readonly string[];
}

export function evalTurnoverLuck(input: {
  readonly turnoverLuckInput: TurnoverLuckInput;
  readonly options?: TurnoverLuckOptions;
}): SignalEval<TurnoverLuckEval> {
  const t = input.turnoverLuckInput;
  const bad =
    badIf(typeof t.team !== "string" || t.team.trim().length === 0, "turnoverLuckInput.team is required and was blank") ??
    badIf(!isCount(t.defensivePlays) || t.defensivePlays > 20000, `defensivePlays out of range: ${String(t.defensivePlays)}`) ??
    badIf(!isCount(t.opponentDropbacks) || t.opponentDropbacks > 20000, `opponentDropbacks out of range: ${String(t.opponentDropbacks)}`) ??
    badIf(!isCount(t.fumblesForced) || t.fumblesForced > 500, `fumblesForced out of range: ${String(t.fumblesForced)}`) ??
    badIf(!isCount(t.fumblesRecoveredByTeam) || t.fumblesRecoveredByTeam > 500, `fumblesRecoveredByTeam out of range: ${String(t.fumblesRecoveredByTeam)}`) ??
    badIf(t.fumblesRecoveredByTeam > t.fumblesForced, `fumblesRecoveredByTeam ${t.fumblesRecoveredByTeam} exceeds fumblesForced ${t.fumblesForced}`) ??
    badIf(!isCount(t.interceptions) || t.interceptions > 500, `interceptions out of range: ${String(t.interceptions)}`) ??
    badIf(input.options !== undefined && input.options.recoveryShrinkage !== undefined && !isIn(input.options.recoveryShrinkage, 0, 1), `recoveryShrinkage must be in [0,1]: ${String(input.options?.recoveryShrinkage)}`);
  if (bad) return bad;

  const raw = guard("computeTurnoverLuck", () => computeTurnoverLuck(t, input.options ?? {}));
  if (!raw.ok) return raw;
  // The kernel's null means "insufficient sample", which this codebase treats
  // as NO VOTE. Forwarding a zero here would read as a league-average team.
  if (raw.data === null) {
    return fail(
      `computeTurnoverLuck returned null for ${t.team}: defensivePlays=${t.defensivePlays}, opponentDropbacks=${t.opponentDropbacks} is below the kernel's sample floor (insufficient sample, not a zero)`,
    );
  }
  const out: TurnoverLuckResult = raw.data;

  const occBad =
    badIf(!isProb(out.occurrence.forcedFumbleRatePerPlay), `forcedFumbleRatePerPlay left [0,1]: ${String(out.occurrence.forcedFumbleRatePerPlay)}`) ??
    badIf(!isIn(out.occurrence.forcedFumbleOverExpected, -0.05, 0.05), `forcedFumbleOverExpected out of range: ${String(out.occurrence.forcedFumbleOverExpected)}`) ??
    badIf(!isProb(out.occurrence.interceptionRatePerDropback), `interceptionRatePerDropback left [0,1]: ${String(out.occurrence.interceptionRatePerDropback)}`) ??
    badIf(!isIn(out.occurrence.interceptionOverExpected, -0.05, 0.05), `interceptionOverExpected out of range: ${String(out.occurrence.interceptionOverExpected)}`);
  if (occBad) return occBad;

  const recoveryGaps: string[] = [];
  if (out.recovery === null) {
    recoveryGaps.push(`${t.team}: recovery null (too few forced fumbles for a recovery-share ratio)`);
  } else {
    const rec = out.recovery;
    const recBad =
      badIf(!isProb(rec.recoveryShare), `recoveryShare left [0,1]: ${String(rec.recoveryShare)}`) ??
      badIf(!isIn(rec.recoveryShareOverExpected, -1, 1), `recoveryShareOverExpected out of range: ${String(rec.recoveryShareOverExpected)}`) ??
      badIf(!isProb(rec.regressedRecoveryShare), `regressedRecoveryShare left [0,1]: ${String(rec.regressedRecoveryShare)}`) ??
      badIf(!isIn(rec.expectedRegressionPoints, -200, 200), `expectedRegressionTiltPoints out of range: ${String(rec.expectedRegressionPoints)}`);
    if (recBad) return recBad;
  }

  return {
    ok: true,
    data: {
      readingKind: "RATE",
      team: out.team,
      defensivePlays: out.defensivePlays,
      opponentDropbacks: out.opponentDropbacks,
      forcedFumbleRatePerPlay: out.occurrence.forcedFumbleRatePerPlay,
      forcedFumbleOverExpected: out.occurrence.forcedFumbleOverExpected,
      interceptionRatePerDropback: out.occurrence.interceptionRatePerDropback,
      interceptionOverExpected: out.occurrence.interceptionOverExpected,
      recovery:
        out.recovery === null
          ? null
          : {
              fumblesForced: out.recovery.fumblesForced,
              fumblesRecoveredByTeam: out.recovery.fumblesRecoveredByTeam,
              recoveryShare: out.recovery.recoveryShare,
              recoveryShareOverExpected: out.recovery.recoveryShareOverExpected,
              regressedRecoveryShare: out.recovery.regressedRecoveryShare,
              expectedRegressionTiltPoints: out.recovery.expectedRegressionPoints,
            },
      recoveryGaps,
    },
  };
}

export interface ExpectedTurnoverDiffEval {
  readonly readingKind: "SIGNED_TILT";
  readonly enabled: boolean;
  /**
   * Home minus away expected-regression points. POSITIVE = home is due a
   * favourable turnover-regression swing. A signed point tilt, NOT an edge
   * and NOT a probability.
   */
  readonly expectedTurnoverDiffPoints: number;
  readonly home: TurnoverLuckEval | null;
  readonly away: TurnoverLuckEval | null;
  /** Named reasons the diff is absent (empty when populated). */
  readonly gaps: readonly string[];
}

export function evalExpectedTurnoverDiff(input: {
  readonly home: ExpectedTurnoverDiffTeam;
  readonly away: ExpectedTurnoverDiffTeam;
  readonly options?: ExpectedTurnoverDiffOptions;
}): SignalEval<ExpectedTurnoverDiffEval> {
  const bad =
    badIf(typeof input.home.teamId !== "string" || input.home.teamId.trim().length === 0, "home.teamId is required and was blank") ??
    badIf(typeof input.away.teamId !== "string" || input.away.teamId.trim().length === 0, "away.teamId is required and was blank") ??
    badIf(input.home.teamId === input.away.teamId, `home.teamId and away.teamId are the same team (${input.home.teamId})`) ??
    badIf(input.home.input === null || input.home.input === undefined, "home.input is required") ??
    badIf(input.away.input === null || input.away.input === undefined, "away.input is required");
  if (bad) return bad;

  // The kernel is disabled unless a caller explicitly opts in. Mirror that as
  // a failure rather than forwarding `enabled: false` with null diffs, so a
  // caller cannot mistake "off" for "no edge found".
  if (input.options?.enabled !== true) {
    return fail(`${EXPECTED_TURNOVER_DIFF_FLAG} is not enabled for this call; the kernel returns null diffs and they are not evidence of anything`);
  }

  const raw = guard("computeExpectedTurnoverDiff", () =>
    computeExpectedTurnoverDiff(input.home, input.away, input.options ?? { enabled: true }),
  );
  if (!raw.ok) return raw;
  const out: ExpectedTurnoverDiffResult = raw.data;

  if (out.expectedTurnoverDiff === null) {
    return fail(
      `expected turnover diff is null and cannot be defaulted to zero: ${out.gaps.length > 0 ? out.gaps.join("; ") : "kernel reported no specific gap"}`,
    );
  }
  if (!isIn(out.expectedTurnoverDiff, -200, 200)) {
    return fail(`expectedTurnoverDiffPoints out of range: ${String(out.expectedTurnoverDiff)}`);
  }

  const homeEval = evalTurnoverLuck({ turnoverLuckInput: input.home.input });
  const awayEval = evalTurnoverLuck({ turnoverLuckInput: input.away.input });
  if (!homeEval.ok) return fail(`home side failed: ${homeEval.reason}`);
  if (!awayEval.ok) return fail(`away side failed: ${awayEval.reason}`);

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      enabled: out.enabled,
      expectedTurnoverDiffPoints: out.expectedTurnoverDiff,
      home: homeEval.data,
      away: awayEval.data,
      gaps: out.gaps,
    },
  };
}

/** One team's rated split, post-convergence and post-shrinkage. Signed EPA per play, never a probability. */
export interface OpponentAdjustedEpaRatingRow {
  readonly team: string;
  readonly games: number;
  readonly ratedOffDropbackEpaPerPlay: number;
  readonly ratedOffRushEpaPerPlay: number;
  readonly ratedDefDropbackEpaPerPlayAllowed: number;
  readonly ratedDefRushEpaPerPlayAllowed: number;
  readonly priorWeightOffense: number;
  readonly priorWeightDefense: number;
}

export interface OpponentAdjustedEpaEval {
  readonly readingKind: "SIGNED_TILT";
  readonly converged: boolean;
  readonly iterations: number;
  /** Per-team rated splits, EPA per play. Signed, NOT a probability. */
  readonly ratings: readonly OpponentAdjustedEpaRatingRow[];
  /** Teams below the solve's minimum-games floor; their rating is null, not zero. */
  readonly underSampledTeams: readonly string[];
  /** League play-count-weighted means, or null when the input was empty. */
  readonly leagueAverages: {
    readonly offDropbackEpaPerPlay: number;
    readonly offRushEpaPerPlay: number;
    readonly defDropbackEpaPerPlayAllowed: number;
    readonly defRushEpaPerPlayAllowed: number;
  } | null;
}

export function evalOpponentAdjustedEpa(input: {
  readonly games: readonly TeamGameEpaSplit[];
  readonly requestedTeams: readonly string[];
  readonly options?: OpponentAdjustedEpaOptions;
}): SignalEval<OpponentAdjustedEpaEval> {
  const bad =
    badIf(input.games.length === 0, "no team-game EPA rows supplied") ??
    badIf(input.requestedTeams.length === 0, "requestedTeams must name at least one team to read") ??
    badIf(
      input.games.some((g) => typeof g.team !== "string" || g.team.trim().length === 0 || typeof g.opponent !== "string" || g.opponent.trim().length === 0),
      "every team-game EPA row needs a non-blank team and opponent",
    ) ??
    badIf(
      input.games.some(
        (g) =>
          !isCount(g.offDropbackPlays) ||
          !isCount(g.offRushPlays) ||
          !isCount(g.defDropbackPlays) ||
          !isCount(g.defRushPlays) ||
          !isIn(g.offDropbackEpaPerPlay, -5, 5) ||
          !isIn(g.offRushEpaPerPlay, -5, 5) ||
          !isIn(g.defDropbackEpaPerPlayAllowed, -5, 5) ||
          !isIn(g.defRushEpaPerPlayAllowed, -5, 5),
      ),
      "a team-game EPA row has a negative play count or an EPA/play outside [-5,5]",
    ) ??
    badIf(
      input.requestedTeams.some((t) => typeof t !== "string" || t.trim().length === 0),
      "a requested team name is blank",
    ) ??
    badIf(input.options?.minGames !== undefined && !isIn(input.options.minGames, 1, 40), `minGames out of range: ${String(input.options?.minGames)}`) ??
    badIf(input.options?.tolerance !== undefined && !isIn(input.options.tolerance, 1e-12, 1), `tolerance out of range: ${String(input.options?.tolerance)}`) ??
    badIf(input.options?.maxIterations !== undefined && !isIn(input.options.maxIterations, 1, 10000), `maxIterations out of range: ${String(input.options?.maxIterations)}`) ??
    badIf(input.options?.dampingFactor !== undefined && !isIn(input.options.dampingFactor, 0.01, 1), `dampingFactor must be in (0,1]: ${String(input.options?.dampingFactor)}`);
  if (bad) return bad;

  const priors = input.options?.priors;
  const normalizedPriors: Map<string, TeamEpaPrior> | undefined = priors
    ? new Map<string, TeamEpaPrior>(Array.from(priors.entries()))
    : undefined;
  const options: OpponentAdjustedEpaOptions = {
    ...(input.options ?? {}),
    ...(normalizedPriors ? { priors: normalizedPriors } : {}),
  };

  const raw = guard("computeOpponentAdjustedEpa", () => computeOpponentAdjustedEpa(input.games, options));
  if (!raw.ok) return raw;
  const solve = raw.data;

  // A capped-but-unconverged solve is a truncated fit. Reading it as a rating
  // would silently publish a number the solve never earned.
  if (!solve.converged) {
    return fail(
      `opponent-adjusted EPA solve did NOT converge in ${solve.iterations} iterations; a truncated fit is not a rating`,
    );
  }

  const ratings: OpponentAdjustedEpaRatingRow[] = [];
  const underSampledTeams: string[] = [];
  for (const team of input.requestedTeams) {
    const found = solve.results.find((r) => r.team === team);
    if (found === undefined) {
      return fail(`requested team "${team}" does not appear in the supplied team-game EPA rows`);
    }
    if (found.rating === null) {
      underSampledTeams.push(team);
      continue;
    }
    const rating: OpponentAdjustedEpaRating = found.rating;
    const ratingBad =
      badIf(!isIn(rating.ratedOffDropbackEpaPerPlay, -5, 5), `ratedOffDropbackEpaPerPlay for ${team} out of range: ${String(rating.ratedOffDropbackEpaPerPlay)}`) ??
      badIf(!isIn(rating.ratedOffRushEpaPerPlay, -5, 5), `ratedOffRushEpaPerPlay for ${team} out of range: ${String(rating.ratedOffRushEpaPerPlay)}`) ??
      badIf(!isIn(rating.ratedDefDropbackEpaPerPlayAllowed, -5, 5), `ratedDefDropbackEpaPerPlayAllowed for ${team} out of range: ${String(rating.ratedDefDropbackEpaPerPlayAllowed)}`) ??
      badIf(!isIn(rating.ratedDefRushEpaPerPlayAllowed, -5, 5), `ratedDefRushEpaPerPlayAllowed for ${team} out of range: ${String(rating.ratedDefRushEpaPerPlayAllowed)}`) ??
      badIf(!isIn(rating.priorWeightOffense, 0, 1), `priorWeightOffense for ${team} out of range: ${String(rating.priorWeightOffense)}`) ??
      badIf(!isIn(rating.priorWeightDefense, 0, 1), `priorWeightDefense for ${team} out of range: ${String(rating.priorWeightDefense)}`);
    if (ratingBad) return ratingBad;
    ratings.push({
      team: found.team,
      games: found.games,
      ratedOffDropbackEpaPerPlay: rating.ratedOffDropbackEpaPerPlay,
      ratedOffRushEpaPerPlay: rating.ratedOffRushEpaPerPlay,
      ratedDefDropbackEpaPerPlayAllowed: rating.ratedDefDropbackEpaPerPlayAllowed,
      ratedDefRushEpaPerPlayAllowed: rating.ratedDefRushEpaPerPlayAllowed,
      priorWeightOffense: rating.priorWeightOffense,
      priorWeightDefense: rating.priorWeightDefense,
    });
  }

  const la = solve.leagueAverages;
  if (la !== null) {
    const laBad =
      badIf(!isIn(la.offDropbackEpaPerPlay, -5, 5), `league avg offDropbackEpaPerPlay out of range: ${String(la.offDropbackEpaPerPlay)}`) ??
      badIf(!isIn(la.offRushEpaPerPlay, -5, 5), `league avg offRushEpaPerPlay out of range: ${String(la.offRushEpaPerPlay)}`) ??
      badIf(!isIn(la.defDropbackEpaPerPlayAllowed, -5, 5), `league avg defDropbackEpaPerPlayAllowed out of range: ${String(la.defDropbackEpaPerPlayAllowed)}`) ??
      badIf(!isIn(la.defRushEpaPerPlayAllowed, -5, 5), `league avg defRushEpaPerPlayAllowed out of range: ${String(la.defRushEpaPerPlayAllowed)}`);
    if (laBad) return laBad;
  }

  return {
    ok: true,
    data: {
      readingKind: "SIGNED_TILT",
      converged: solve.converged,
      iterations: solve.iterations,
      ratings,
      underSampledTeams,
      leagueAverages: la,
    },
  };
}

// ============================================================================
// Inventory
// ============================================================================

/**
 * Every source module this bridge reaches, with the symbol it imports. Kept as
 * data (not a comment) so an audit can diff the wiring against the tree
 * without reading 1,500 lines of guards.
 */
export const SIGNALS_BRIDGE_MODULES: readonly {
  readonly module: string;
  readonly source: string;
  readonly kernel: string;
  readonly evals: readonly string[];
}[] = [
  { module: "efficiency/redzone-te-leverage", source: "signals/efficiency/redzone-te-leverage.js", kernel: "evaluateRedZoneTeLeverage", evals: ["evalRedZoneTeLeverage"] },
  { module: "efficiency/man-zone-receiver-archetype", source: "signals/efficiency/man-zone-receiver-archetype.js", kernel: "evaluateManZoneReceiverArchetype", evals: ["evalManZoneReceiverArchetype"] },
  { module: "efficiency/qb-turnover-worthy-play-regression", source: "signals/efficiency/qb-turnover-worthy-play-regression.js", kernel: "evaluateQbTwpRegression", evals: ["evalQbTwpRegression"] },
  { module: "efficiency/backup-qb-target-distribution", source: "signals/efficiency/backup-qb-target-distribution.js", kernel: "evaluateBackupQbTargetDistribution", evals: ["evalBackupQbTargetDistribution"] },
  { module: "efficiency/wr1-out-target-redistribution", source: "signals/efficiency/wr1-out-target-redistribution.js", kernel: "evaluateWr1OutRedistribution", evals: ["evalWr1OutRedistribution"] },
  { module: "environmental/temperature-precipitation-decay", source: "signals/environmental/temperature-precipitation-decay.js", kernel: "evaluateTemperaturePrecipitationDecay", evals: ["evalTemperaturePrecipitationDecay"] },
  { module: "environmental/high-altitude-fatigue-decay", source: "signals/environmental/high-altitude-fatigue-decay.js", kernel: "evaluateHighAltitudeFatigueDecay", evals: ["evalHighAltitudeFatigueDecay"] },
  { module: "environmental/linear-wind-pass-impact", source: "signals/environmental/linear-wind-pass-impact.js", kernel: "evaluateLinearWindPassImpact", evals: ["evalLinearWindPassImpact"] },
  { module: "environment/wind-elasticity", source: "signals/environment/wind-elasticity.js", kernel: "calculateWindElasticity", evals: ["evalWindElasticity"] },
  { module: "tactical/early-down-pass-rate-momentum", source: "signals/tactical/early-down-pass-rate-momentum.js", kernel: "evaluateEarlyDownProeMomentum", evals: ["evalEarlyDownProeMomentum"] },
  { module: "tactical/redzone-personnel-grouping", source: "signals/tactical/redzone-personnel-grouping.js", kernel: "evaluateRedZonePersonnelGrouping", evals: ["evalRedZonePersonnelGrouping"] },
  { module: "tactical/two-minute-hurry-up-efficiency", source: "signals/tactical/two-minute-hurry-up-efficiency.js", kernel: "evaluateTwoMinuteHurryUpEfficiency", evals: ["evalTwoMinuteHurryUpEfficiency"] },
  { module: "situational/referee-crew-tendencies", source: "signals/situational/referee-crew-tendencies.js", kernel: "evaluateRefereeCrewTendencies", evals: ["evalRefereeCrewTendencies"] },
  { module: "situational/coaching-tendencies", source: "signals/situational/coaching-tendencies.js", kernel: "evaluateCoachingTendencies", evals: ["evalCoachingTendencies"] },
  { module: "situational/fourth-down-coaching-aggressiveness", source: "signals/situational/fourth-down-coaching-aggressiveness.js", kernel: "evaluateFourthDownCoachingAggressiveness", evals: ["evalFourthDownCoachingAggressiveness"] },
  { module: "situational/lopez-second-and-ten-tendency", source: "signals/situational/lopez-second-and-ten-tendency.js", kernel: "evaluateLopezSecondAndTenTendency", evals: ["evalLopezSecondAndTenTendency"] },
  { module: "situational/short-week-road-deficit", source: "signals/situational/short-week-road-deficit.js", kernel: "evaluateShortWeekRoadDeficit", evals: ["evalShortWeekRoadDeficit"] },
  { module: "situational/circadian-travel-fatigue", source: "signals/situational/circadian-travel-fatigue.js", kernel: "evaluateCircadianTravelFatigue", evals: ["evalCircadianTravelFatigue"] },
  { module: "situational/age-conditioned-rest", source: "signals/situational/age-conditioned-rest.js", kernel: "evaluateAgeConditionedRest", evals: ["evalAgeConditionedRest"] },
  { module: "chemistry/qb-receiver-continuity", source: "signals/chemistry/qb-receiver-continuity.js", kernel: "evaluateQbReceiverContinuity", evals: ["evalQbReceiverContinuity"] },
  { module: "discipline/penalty-differential-momentum", source: "signals/discipline/penalty-differential-momentum.js", kernel: "evaluatePenaltyDifferentialMomentum", evals: ["evalPenaltyDifferentialMomentum"] },
  { module: "narrative/contract-incentives-milestones", source: "signals/narrative/contract-incentives-milestones.js", kernel: "evaluateContractMilestones", evals: ["evalContractMilestones"] },
  { module: "narrative/rookie-breakout-cohort", source: "signals/narrative/rookie-breakout-cohort.js", kernel: "evaluateRookieBreakoutCohort", evals: ["evalRookieBreakoutCohort"] },
  { module: "schematic/bye-week-defensive-installation", source: "signals/schematic/bye-week-defensive-installation.js", kernel: "evaluateByeWeekDefensiveInstallation", evals: ["evalByeWeekDefensiveInstallation"] },
  { module: "trench/offensive-line-continuity", source: "signals/trench/offensive-line-continuity.js", kernel: "evaluateOffensiveLineTrench", evals: ["evalOffensiveLineTrench"] },
  { module: "bio/injury-trajectory", source: "signals/bio/injury-trajectory.js", kernel: "analyzeInjuryTrajectory", evals: ["evalInjuryTrajectory"] },
  { module: "biomechanical/turf-surface-fatigue", source: "signals/biomechanical/turf-surface-fatigue.js", kernel: "evaluateTurfSurfaceFatigue", evals: ["evalTurfSurfaceFatigue"] },
  { module: "expected-turnover-diff", source: "signals/expected-turnover-diff.js", kernel: "computeExpectedTurnoverDiff", evals: ["evalExpectedTurnoverDiff"] },
  { module: "opponent-adjusted-epa", source: "signals/opponent-adjusted-epa.js", kernel: "computeOpponentAdjustedEpa", evals: ["evalOpponentAdjustedEpa"] },
  { module: "turnover-luck", source: "signals/turnover-luck.js", kernel: "computeTurnoverLuck", evals: ["evalTurnoverLuck"] },
];
