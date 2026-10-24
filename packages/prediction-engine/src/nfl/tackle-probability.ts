/**
 * Tackle Probability derivatives from the AWS/NGS video and the two
 * write-ups that sit behind it.
 *
 * Video wqvAiuC7d7U, 1:53, 2024-09-09. The blogs are
 * "Beyond the box score" and "A new take on tackling".
 *
 * Published and used here: 20 features, 11 defenders, 10 Hz, a group
 * tackle is 3 or more, efficiency is successes over attempts, downhill
 * is ahead of the ball carrier along forward progress, upfield is behind,
 * yards saved is expected minus actual, and they aimed the missed-tackle
 * rate at 15-20%.
 *
 * Not published, so not invented: the open-field radius, the chase-down
 * yard minimum, the blocker corridor width, and the metric deltas.
 * Those functions require the missing number as an argument.
 * "Primary tackler" and "forced out of bounds" were not defined beyond
 * the words. They are not implemented.
 */

export const TACKLE_FEATURES_PER_DEFENDER = 20;
export const DEFENDERS_ON_FIELD = 11;
export const TRACKING_HZ = 10;
export const GROUP_TACKLE_MIN = 3;
export const MISSED_TACKLE_RATE_BAND = { low: 0.15, high: 0.2 } as const;

export const TACKLE_DERIVATIVES = [
  "missed-tackles",
  "tackle-efficiency",
  "missed-tackles-forced",
  "group-tackles",
  "players-in-group-tackle",
  "open-field-attempts",
  "tackled-out-of-bounds",
  "primary-tackler",
  "downhill-attempts",
  "upfield-attempts",
  "chase-down-attempts",
  "missed-tackle-yards",
  "tackle-yards-saved",
  "yards-gained-in-group-tackle",
] as const;

export function tacklePlayPoints(durationSeconds: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("duration must be finite and non-negative");
  }
  const frames = Math.round(durationSeconds * TRACKING_HZ);
  return frames * DEFENDERS_ON_FIELD * TACKLE_FEATURES_PER_DEFENDER;
}

export function tackleEfficiency(successes: number, attempts: number): number | null {
  if (!Number.isInteger(successes) || !Number.isInteger(attempts) || successes < 0 || attempts < 0) {
    throw new Error("successes and attempts must be non-negative integers");
  }
  if (successes > attempts) throw new Error("successes cannot exceed attempts");
  if (attempts === 0) return null;
  return successes / attempts;
}

export function missedTackleRateBand(rate: number): "below" | "in-band" | "above" {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) throw new Error("rate must be in [0, 1]");
  if (rate < MISSED_TACKLE_RATE_BAND.low) return "below";
  if (rate > MISSED_TACKLE_RATE_BAND.high) return "above";
  return "in-band";
}

export function isGroupTackle(contributors: number): boolean {
  if (!Number.isInteger(contributors) || contributors < 0) throw new Error("contributors must be a non-negative integer");
  return contributors >= GROUP_TACKLE_MIN;
}

export type TackleApproach = "downhill" | "upfield" | "lateral";

export function tackleApproach(
  carrier: { x: number; y: number },
  defender: { x: number; y: number },
  forward: { x: number; y: number },
): TackleApproach {
  const values = [carrier.x, carrier.y, defender.x, defender.y, forward.x, forward.y];
  if (values.some((v) => !Number.isFinite(v))) throw new Error("positions must be finite");
  if (forward.x === 0 && forward.y === 0) throw new Error("forward progress must be a non-zero vector");
  const along = (defender.x - carrier.x) * forward.x + (defender.y - carrier.y) * forward.y;
  if (along > 0) return "downhill";
  if (along < 0) return "upfield";
  return "lateral";
}

export function isChaseDown(approach: TackleApproach, yardsTraveledUpfield: number, minYards: number): boolean {
  if (!Number.isFinite(yardsTraveledUpfield) || yardsTraveledUpfield < 0) {
    throw new Error("yards traveled must be finite and non-negative");
  }
  if (!Number.isFinite(minYards) || minYards <= 0) throw new Error("min yards must be finite and positive");
  return approach === "upfield" && yardsTraveledUpfield >= minYards;
}

export function isOpenField(otherDefendersWithinRadius: number): boolean {
  if (!Number.isInteger(otherDefendersWithinRadius) || otherDefendersWithinRadius < 0) {
    throw new Error("defender count must be a non-negative integer");
  }
  return otherDefendersWithinRadius === 0;
}

export function blockersBetween(
  defender: { x: number; y: number },
  carrier: { x: number; y: number },
  blockers: readonly { x: number; y: number }[],
  corridorHalfWidth: number,
): number {
  if (!Number.isFinite(corridorHalfWidth) || corridorHalfWidth < 0) {
    throw new Error("corridor half-width must be finite and non-negative");
  }
  const abx = carrier.x - defender.x;
  const aby = carrier.y - defender.y;
  const ab2 = abx * abx + aby * aby;
  if (ab2 === 0) return 0;
  return blockers.filter((blocker) => {
    const t = ((blocker.x - defender.x) * abx + (blocker.y - defender.y) * aby) / ab2;
    if (t <= 0 || t >= 1) return false;
    const closestX = defender.x + t * abx;
    const closestY = defender.y + t * aby;
    return Math.hypot(blocker.x - closestX, blocker.y - closestY) <= corridorHalfWidth;
  }).length;
}

export function encircleQuadrants(bearingsRadians: readonly number[]): number {
  if (bearingsRadians.some((b) => !Number.isFinite(b))) throw new Error("bearings must be finite");
  const occupied = new Set(
    bearingsRadians.map((b) => {
      const wrapped = ((b % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      return Math.min(3, Math.floor(wrapped / (Math.PI / 2)));
    }),
  );
  return occupied.size;
}

export function closingSpeed(
  carrier: { x: number; y: number; sx: number; sy: number },
  defender: { x: number; y: number; sx: number; sy: number },
): number {
  const dx = carrier.x - defender.x;
  const dy = carrier.y - defender.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return 0;
  return ((defender.sx - carrier.sx) * dx + (defender.sy - carrier.sy) * dy) / dist;
}

export function tackleYardsSaved(expectedYards: number, actualYards: number): number {
  if (!Number.isFinite(expectedYards) || !Number.isFinite(actualYards)) throw new Error("yards must be finite");
  return expectedYards - actualYards;
}

export function yardsBetweenTackleAttempts(yardsAtMiss: number, yardsAtNext: number): number {
  if (!Number.isFinite(yardsAtMiss) || !Number.isFinite(yardsAtNext)) throw new Error("yards must be finite");
  return yardsAtNext - yardsAtMiss;
}

/** NFL field width is 160 feet. This is a position check. "Forced" was not defined by NGS. */
export const NFL_FIELD_WIDTH_YARDS = 160 / 3;

export function isPastSideline(y: number, fieldWidthYards = NFL_FIELD_WIDTH_YARDS): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(fieldWidthYards) || fieldWidthYards <= 0) {
    throw new Error("y and field width must be finite, and width must be positive");
  }
  return y < 0 || y > fieldWidthYards;
}

/** Closest defender at the tackle frame. This is an engine definition of "initiating", not an NGS rule. */
export function initiatingDefenderIndex(
  carrier: { x: number; y: number },
  defenders: readonly { x: number; y: number }[],
): number {
  if (defenders.length === 0) throw new Error("at least one defender is required");
  let best = 0;
  let bestDist = Infinity;
  defenders.forEach((defender, i) => {
    const dist = Math.hypot(defender.x - carrier.x, defender.y - carrier.y);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  });
  return best;
}

/* ------------------------------------------------------------------ *
 * Stream 14B — 20-feature Tackle Probability and Missed-Tackle Hazard
 * (RT-02 hardened). The 20 features are named exactly and are measured
 * from tracking-frame quantities. Coefficients are supplied by the
 * caller; the default all-zero vector returns 0.5, which is the honest
 * uncalibrated baseline rather than a fabricated model.
 * ------------------------------------------------------------------ */

export const TACKLE_FEATURE_NAMES = [
  "distance_to_carrier",
  "closing_speed",
  "approach_angle_cos",
  "blockers_between",
  "open_field",
  "defender_speed",
  "defender_acceleration",
  "pursuit_angle_sin",
  "angle_to_sideline",
  "carrier_speed",
  "relative_speed",
  "time_to_intercept",
  "leverage_distance",
  "teammate_support_count",
  "group_tackle_context",
  "down_distance_pressure",
  "yards_to_goal",
  "closing_acceleration",
  "defender_mass_proxy",
  "surface_grip_proxy",
] as const;

export type TackleFeatureName = (typeof TACKLE_FEATURE_NAMES)[number];

export interface TackleProbabilityInput {
  /** Defender-to-carrier distance in yards. */
  distanceToCarrier: number;
  /** Closing speed in yards per second (positive = closing). */
  closingSpeed: number;
  /** cos of the angle between the defender's velocity and the carrier vector. */
  approachAngleCos: number;
  blockersBetween: number;
  openField: boolean;
  defenderSpeed: number;
  defenderAcceleration: number;
  /** sin of the pursuit angle relative to forward progress. */
  pursuitAngleSin: number;
  /** Bearing to the sideline in radians (0 = straight ahead, pi/2 = sideline). */
  angleToSideline: number;
  carrierSpeed: number;
  timeToIntercept: number;
  leverageDistance: number;
  teammateSupportCount: number;
  groupTackleContext: boolean;
  /** 0 = first down, 1 = third/fourth down pressure. */
  downDistancePressure: number;
  yardsToGoal: number;
  closingAcceleration: number;
  /** Normalized 0-1 mass proxy (height/weight percentile). */
  defenderMassProxy: number;
  /** Normalized 0-1 surface grip proxy. */
  surfaceGripProxy: number;
}

export interface TackleFeaturesResult {
  names: readonly TackleFeatureName[];
  values: number[];
  asRecord: Record<TackleFeatureName, number>;
}

/**
 * Builds the 20-feature vector. Every feature is a measured or supplied
 * tracking quantity; no feature is a hidden composite. `relative_speed` is
 * defender speed minus carrier speed, `closing_acceleration` is the signed
 * change supplied by the caller, and `group_tackle_context` is 1 when at
 * least two teammates are within the caller's support radius.
 */
export function computeTackleProbabilityFeatures(input: TackleProbabilityInput): TackleFeaturesResult {
  const values = [
    input.distanceToCarrier,
    input.closingSpeed,
    input.approachAngleCos,
    input.blockersBetween,
    input.openField ? 1 : 0,
    input.defenderSpeed,
    input.defenderAcceleration,
    input.pursuitAngleSin,
    input.angleToSideline,
    input.carrierSpeed,
    input.defenderSpeed - input.carrierSpeed,
    input.timeToIntercept,
    input.leverageDistance,
    input.teammateSupportCount,
    input.groupTackleContext ? 1 : 0,
    input.downDistancePressure,
    input.yardsToGoal,
    input.closingAcceleration,
    input.defenderMassProxy,
    input.surfaceGripProxy,
  ];
  for (const [i, value] of values.entries()) {
    if (!Number.isFinite(value)) throw new Error(`tackle feature ${TACKLE_FEATURE_NAMES[i]} must be finite`);
  }
  if (values.some((v, i) => i !== 1 && i !== 2 && i !== 7 && i !== 8 && i !== 10 && i !== 11 && i !== 12 && i !== 17 && v < 0)) {
    throw new Error("non-signed tackle features must be non-negative");
  }
  const asRecord = Object.fromEntries(
    TACKLE_FEATURE_NAMES.map((name, i) => [name, values[i]!]),
  ) as Record<TackleFeatureName, number>;
  return { names: TACKLE_FEATURE_NAMES, values, asRecord };
}

export interface TackleCoefficients {
  intercept: number;
  weights: readonly number[];
}

/**
 * Probability = 1 / (1 + exp(-(beta0 + sum beta_i x_i))). The coefficient
 * vector must have exactly 20 entries. The all-zero default is explicit:
 * it returns 0.5 and says the model is uncalibrated.
 */
export function computeTackleProbability(
  input: TackleProbabilityInput,
  coefficients: TackleCoefficients = { intercept: 0, weights: new Array(20).fill(0) },
): { probability: number; linearPredictor: number; calibrated: boolean; features: TackleFeaturesResult } {
  const features = computeTackleProbabilityFeatures(input);
  if (coefficients.weights.length !== TACKLE_FEATURE_NAMES.length) {
    throw new Error(`tackle coefficients must have ${TACKLE_FEATURE_NAMES.length} weights`);
  }
  let linear = coefficients.intercept;
  for (let i = 0; i < features.values.length; i += 1) {
    linear += coefficients.weights[i]! * features.values[i]!;
  }
  const calibrated = coefficients.weights.some((w) => w !== 0) || coefficients.intercept !== 0;
  return { probability: 1 / (1 + Math.exp(-linear)), linearPredictor: linear, calibrated, features };
}

export interface MissedTackleHazardInput {
  /** Frame index within the attempt window. */
  frame: number;
  /** Frame duration in seconds (10 Hz default). */
  frameSeconds?: number;
  features: TackleProbabilityInput;
  coefficients: TackleCoefficients;
  /** Baseline hazard per frame h0. */
  baselineHazardPerFrame: number;
}

export interface MissedTackleHazardResult {
  perFrameHazard: number;
  cumulativeMissProbability: number;
  attempts: number;
  expectedMisses: number;
  missedTackleRate: number;
  inBand: boolean;
}

/**
 * Cox-style discrete hazard: h(t) = h0(t) * exp(sum beta_i x_i). The
 * cumulative miss probability over `frame + 1` frames is
 * 1 - exp(-sum h). The rate is reported against the published 15-20% band.
 * `baselineHazardPerFrame` is required; no baseline is invented.
 */
export function computeMissedTackleHazard(input: MissedTackleHazardInput): MissedTackleHazardResult {
  const { frame, features, coefficients, baselineHazardPerFrame } = input;
  const frameSeconds = input.frameSeconds ?? 1 / TRACKING_HZ;
  if (!Number.isInteger(frame) || frame < 0) throw new Error("frame must be a non-negative integer");
  if (!(frameSeconds > 0)) throw new Error("frameSeconds must be positive");
  if (!(baselineHazardPerFrame >= 0)) throw new Error("baselineHazardPerFrame must be non-negative");
  const featureVector = computeTackleProbabilityFeatures(features);
  let linear = 0;
  for (let i = 0; i < featureVector.values.length; i += 1) {
    linear += coefficients.weights[i]! * featureVector.values[i]!;
  }
  const perFrameHazard = baselineHazardPerFrame * Math.exp(linear);
  const cumulative = 1 - Math.exp(-perFrameHazard * (frame + 1) * frameSeconds);
  const band = missedTackleRateBand(cumulative);
  return {
    perFrameHazard,
    cumulativeMissProbability: cumulative,
    attempts: frame + 1,
    expectedMisses: perFrameHazard * (frame + 1) * frameSeconds,
    missedTackleRate: cumulative,
    inBand: band === "in-band",
  };
}

export interface MissedTackleCalibrationInput {
  /** One feature vector per attempted tackle. */
  attempts: readonly TackleProbabilityInput[];
  /** Coefficients with an arbitrary starting intercept. */
  coefficients: TackleCoefficients;
  baselineHazardPerFrame: number;
  /** Target band; defaults to the published 15-20%. */
  targetBand?: { low: number; high: number };
}

export interface MissedTackleCalibrationResult {
  intercept: number;
  achievedRate: number;
  inBand: boolean;
  attempts: number;
  iterations: number;
  targetBand: { low: number; high: number };
}

/**
 * Bisects the intercept so the mean predicted missed-tackle hazard lands
 * inside the 15-20% band. Returns the achieved rate honestly even when the
 * band cannot be reached (for example, a degenerate all-zero feature set
 * that cannot move the hazard). The band is a target, not a guarantee.
 */
export function calibrateMissedTackleBand(input: MissedTackleCalibrationInput): MissedTackleCalibrationResult {
  if (input.attempts.length === 0) throw new Error("calibration requires at least one attempt");
  const band = input.targetBand ?? MISSED_TACKLE_RATE_BAND;
  if (!(band.low > 0 && band.high > band.low && band.high < 1)) {
    throw new Error("target band must satisfy 0 < low < high < 1");
  }
  const meanHazard = (intercept: number): number => {
    const weights = input.coefficients.weights;
    let total = 0;
    for (const attempt of input.attempts) {
      const features = computeTackleProbabilityFeatures(attempt);
      let linear = intercept;
      for (let i = 0; i < features.values.length; i += 1) linear += weights[i]! * features.values[i]!;
      total += 1 - Math.exp(-input.baselineHazardPerFrame * Math.exp(linear) * (1 / TRACKING_HZ));
    }
    return total / input.attempts.length;
  };
  let low = -50;
  let high = 50;
  let intercept = input.coefficients.intercept;
  let achieved = meanHazard(intercept);
  let iterations = 0;
  for (; iterations < 100; iterations += 1) {
    achieved = meanHazard(intercept);
    if (achieved >= band.low && achieved <= band.high) break;
    if (achieved < band.low) low = intercept;
    else high = intercept;
    intercept = (low + high) / 2;
  }
  return {
    intercept,
    achievedRate: achieved,
    inBand: achieved >= band.low && achieved <= band.high,
    attempts: input.attempts.length,
    iterations,
    targetBand: { low: band.low, high: band.high },
  };
}
