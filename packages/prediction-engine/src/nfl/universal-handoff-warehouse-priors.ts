/**
 * Stream 14C — warehouse priors with a point-in-time filter (RT-04 hardened).
 *
 * The warehouse (1.94 GB, `~/nfl-farm/extracted_data`) is a historical
 * corpus, not a live oracle. Every record carries a `knownAt` timestamp; the
 * only records a backtest may see are those with `knownAt <= asOf`. This
 * module implements that filter and five priors that the downstream
 * aggregator consumes:
 *
 *   1. reward balance vs pass-heavy team context
 *   2. misleading-minimum volume
 *   3. prospect linguistic bias
 *   4. rolling schedule volatility
 *   5. aging curves by position
 *
 * Each prior returns a z-score, the adjusted mean, the league prior mean,
 * the sample size, and a plain-language note. A prior that cannot be
 * measured returns `zScore: null` rather than a fabricated number.
 */

import { clamp, mean, sd } from "./osf-math-core.js";

export interface KnownAtRecord {
  knownAt: string;
  [key: string]: unknown;
}

export interface FilterKnownAtResult<T extends KnownAtRecord> {
  admitted: T[];
  excluded: number;
  asOf: string;
  note: string;
}

/**
 * Keeps only records whose ISO `knownAt` is at or before `asOf`. Invalid
 * timestamps are excluded and counted; they are never silently admitted.
 * The comparison is inclusive at the boundary.
 */
export function filterKnownAt<T extends KnownAtRecord>(
  records: readonly T[],
  asOf: string,
): FilterKnownAtResult<T> {
  const cutoff = Date.parse(asOf);
  if (!Number.isFinite(cutoff)) throw new Error(`asOf is not an ISO timestamp: ${asOf}`);
  const admitted: T[] = [];
  const seen = new Set<string>();
  let excluded = 0;
  for (const record of records) {
    const stamp = Date.parse(record.knownAt);
    if (!Number.isFinite(stamp)) {
      excluded += 1;
      continue;
    }
    // Optional season/week hygiene when the record carries them.
    const season = record["season"];
    const week = record["week"];
    if (season !== undefined || week !== undefined) {
      if (
        !Number.isInteger(season) ||
        !Number.isInteger(week) ||
        (season as number) < 1999 ||
        (season as number) > 2100 ||
        (week as number) < 1 ||
        (week as number) > 22
      ) {
        throw new RangeError(`record ${record.knownAt} has invalid season/week: ${String(season)}/${String(week)}`);
      }
    }
    const gameId = record["gameId"];
    const playId = record["playId"];
    if (gameId !== undefined && playId !== undefined) {
      const key = `${String(gameId)}:${String(playId)}`;
      if (seen.has(key)) {
        excluded += 1;
        continue;
      }
      seen.add(key);
    }
    if (stamp <= cutoff) admitted.push(record);
    else excluded += 1;
  }
  return {
    admitted,
    excluded,
    asOf,
    note: `admitted ${admitted.length} of ${records.length} records with knownAt <= ${asOf}`,
  };
}

export interface WarehousePriorResult {
  family: string;
  zScore: number | null;
  adjustedMean: number;
  priorMean: number;
  sampleSize: number;
  note: string;
}

function zScore(value: number, referenceMean: number, referenceSd: number): number | null {
  if (!(referenceSd > 0)) return null;
  return (value - referenceMean) / referenceSd;
}

export interface RewardBalanceInput {
  teamPassRate: number;
  leaguePassRate: number;
  leaguePassRateSd: number;
  playerTargetShare: number;
  leagueTargetShare: number;
  leagueTargetShareSd: number;
  games: number;
  priorStrength?: number;
}

/**
 * Reward-balance check. A receiver on a pass-heavy team gets volume that is
 * a team artifact rather than a player skill; the target share is shrunk
 * toward the league mean and the team pass-rate z-score is reported
 * separately so the caller can discount the volume if the team context is
 * extreme.
 */
export function evaluateRewardBalancePassHeavy(input: RewardBalanceInput): WarehousePriorResult {
  const values = [
    input.teamPassRate,
    input.leaguePassRate,
    input.playerTargetShare,
    input.leagueTargetShare,
  ];
  if (!values.every(Number.isFinite)) throw new Error("reward-balance inputs must be finite");
  if (input.games < 0) throw new Error("games must be non-negative");
  const k = input.priorStrength ?? 4;
  if (!(k >= 0)) throw new Error("priorStrength must be non-negative");
  const weight = input.games / (input.games + k);
  const adjustedMean =
    weight * input.playerTargetShare + (1 - weight) * input.leagueTargetShare;
  const teamZ = zScore(input.teamPassRate, input.leaguePassRate, input.leaguePassRateSd);
  const shareZ = zScore(input.playerTargetShare, input.leagueTargetShare, input.leagueTargetShareSd);
  const z =
    shareZ === null || teamZ === null
      ? shareZ
      : shareZ - 0.5 * Math.max(0, teamZ);
  return {
    family: "reward_balance_pass_heavy",
    zScore: z,
    adjustedMean,
    priorMean: input.leagueTargetShare,
    sampleSize: input.games,
    note:
      teamZ !== null && teamZ > 1
        ? "team pass rate is more than one sd above league; target share discounted by half the team z"
        : "target share shrunk toward league mean; team context not extreme",
  };
}

export interface MisleadingMinimumInput {
  observedValue: number;
  /** The value the player produced in a neutral, non-blown-out game. */
  neutralContextValue: number;
  /** Number of neutral-context games behind the reference value. */
  neutralGames: number;
  leagueMean: number;
  leagueSd: number;
}

/**
 * A player's worst game is often a misleading minimum (blowout, injury,
 * weather). The adjusted mean blends the observed value with the neutral
 * context value, weighted by the number of neutral games, and never lets a
 * single outlier define the prior.
 */
export function evaluateMisleadingMinimum(input: MisleadingMinimumInput): WarehousePriorResult {
  const values = [input.observedValue, input.neutralContextValue, input.leagueMean, input.leagueSd];
  if (!values.every(Number.isFinite)) throw new Error("misleading-minimum inputs must be finite");
  if (input.neutralGames < 0) throw new Error("neutralGames must be non-negative");
  const weight = input.neutralGames / (input.neutralGames + 1);
  const adjustedMean = weight * input.neutralContextValue + (1 - weight) * input.observedValue;
  return {
    family: "misleading_minimum",
    zScore: zScore(adjustedMean, input.leagueMean, input.leagueSd),
    adjustedMean,
    priorMean: input.leagueMean,
    sampleSize: input.neutralGames + 1,
    note:
      input.observedValue < input.neutralContextValue
        ? "observed minimum was below the neutral-context value; blended toward neutral"
        : "observed value was not a misleading minimum; blended upward only slightly",
  };
}

export interface ProspectLinguisticBiasInput {
  traitScore: number;
  positionBaseRate: number;
  schoolBias: number;
  sampleSize: number;
  leagueSd: number;
}

/**
 * De-biases a scouting-language trait score by the position base rate and
 * the school exposure offset. The adjusted value is
 * `traitScore - positionBaseRate - schoolBias`; the z-score is against the
 * league sd of the adjusted trait.
 */
export function evaluateProspectLinguisticBias(
  input: ProspectLinguisticBiasInput,
): WarehousePriorResult {
  const values = [input.traitScore, input.positionBaseRate, input.schoolBias, input.leagueSd];
  if (!values.every(Number.isFinite)) throw new Error("prospect-linguistic inputs must be finite");
  if (input.sampleSize < 0) throw new Error("sampleSize must be non-negative");
  const adjustedMean = input.traitScore - input.positionBaseRate - input.schoolBias;
  return {
    family: "prospect_linguistic_bias",
    zScore: zScore(adjustedMean, 0, input.leagueSd),
    adjustedMean,
    priorMean: 0,
    sampleSize: input.sampleSize,
    note:
      input.schoolBias !== 0
        ? `school exposure offset of ${input.schoolBias} removed before scoring`
        : "position base rate removed; no school offset supplied",
  };
}

export interface RollingScheduleVolatilityInput {
  weeklyValues: readonly number[];
  window: number;
  leagueVolatilitySd: number;
}

/**
 * Rolling schedule volatility: the standard deviation of the last `window`
 * weekly values, z-scored against the league volatility sd. A volatile
 * player is not the same asset as a stable one with the same mean, which is
 * why this is a separate prior rather than a variance penalty folded into
 * the mean.
 */
export function evaluateRollingScheduleVolatility(
  input: RollingScheduleVolatilityInput,
): WarehousePriorResult {
  const { weeklyValues, window, leagueVolatilitySd } = input;
  if (weeklyValues.length === 0) throw new Error("weeklyValues are required");
  if (!Number.isInteger(window) || window < 2) throw new Error("window must be an integer >= 2");
  if (!(leagueVolatilitySd > 0)) throw new Error("leagueVolatilitySd must be positive");
  if (weeklyValues.some((v) => !Number.isFinite(v))) throw new Error("weeklyValues must be finite");
  const slice = weeklyValues.slice(-window);
  const volatility = slice.length < 2 ? 0 : sd(slice);
  return {
    family: "rolling_schedule_volatility",
    zScore: zScore(volatility, 0, leagueVolatilitySd),
    adjustedMean: volatility,
    priorMean: 0,
    sampleSize: slice.length,
    note:
      slice.length < window
        ? `only ${slice.length} of ${window} requested weeks are available`
        : `volatility over the last ${window} weeks`,
  };
}

export type AgingPosition = "QB" | "RB" | "WR" | "TE";

export interface AgingCurveInput {
  position: AgingPosition;
  age: number;
  /** Peak age for the position from the caller's measured curve. */
  peakAge: number;
  /** Fractional decline per year after the peak. */
  declinePerYear: number;
  /** Fractional rise per year before the peak. */
  risePerYear: number;
}

export interface AgingCurveResult extends WarehousePriorResult {
  ageMultiplier: number;
  phase: "ascending" | "peak" | "declining";
}

/**
 * Positional aging curve. The multiplier is
 * `1 + risePerYear * (age - peakAge)` before the peak and
 * `1 - declinePerYear * (age - peakAge)` after it, floored at zero.
 * Peak age, rise, and decline are required: the corpus does not publish a
 * single universal curve, and inventing one would hide the assumption.
 */
export function evaluateAgingCurvesByPosition(input: AgingCurveInput): AgingCurveResult {
  const { position, age, peakAge, declinePerYear, risePerYear } = input;
  if (!Number.isFinite(age) || age < 18 || age > 45) throw new Error("age must be between 18 and 45");
  if (!Number.isFinite(peakAge)) throw new Error("peakAge must be finite");
  if (declinePerYear < 0 || risePerYear < 0) throw new Error("curve slopes must be non-negative");
  const delta = age - peakAge;
  const ageMultiplier =
    delta >= 0 ? clamp(1 - declinePerYear * delta, 0, 1.5) : clamp(1 + risePerYear * Math.abs(delta), 0, 1.5);
  const phase: AgingCurveResult["phase"] = delta > 0.5 ? "declining" : delta < -0.5 ? "ascending" : "peak";
  return {
    family: `aging_curve_${position.toLowerCase()}`,
    zScore: null,
    adjustedMean: ageMultiplier,
    priorMean: 1,
    sampleSize: 1,
    note: `${position} aging curve at age ${age} (peak ${peakAge}); phase ${phase}`,
    ageMultiplier,
    phase,
  };
}

export { mean, sd, clamp };
