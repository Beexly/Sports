/**
 * Adaptive risk limits with regime conditioning — arXiv 2504.01781
 * ("Adaptive Risk Limits for...").
 *
 * ADDITIVE utility. Not wired into any staking path (wiring changes real
 * stakes and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: replace static max-exposure caps with
 * regime-conditional bounds. The regime state is (CLV-volatility bucket,
 * drawdown bucket): limits tighten when recent CLV volatility is high or
 * the bankroll sits in a drawdown, and relax in calm/up regimes. A
 * smoothing pass caps week-to-week limit changes so a single volatile week
 * cannot slam the book shut (or fling it open).
 *
 * ACCEPTANCE GATE (improvement-ledger): ADOPT iff on the 2022-2025
 * walk-forward adaptive limits cut max drawdown by >=15% relative vs
 * static caps at >=95% of the static caps' final bankroll.
 */

export type VolBucket = "calm" | "elevated" | "turbulent";
export type DrawdownBucket = "none" | "shallow" | "deep";

/** Bucket recent CLV volatility (stdev of per-pick CLV in units). */
export function volatilityBucket(clvStd: number): VolBucket {
  if (clvStd >= 0.5) return "turbulent";
  if (clvStd >= 0.2) return "elevated";
  return "calm";
}

/** Bucket the current drawdown fraction. */
export function drawdownBucket(drawdown: number): DrawdownBucket {
  if (drawdown >= 0.08) return "deep";
  if (drawdown >= 0.03) return "shallow";
  return "none";
}

export type RegimeMultiplierTable = Readonly<
  Record<VolBucket, Readonly<Record<DrawdownBucket, number>>>
>;

/** Default multiplier table: tighter limits in worse regimes. */
export const DEFAULT_REGIME_MULTIPLIERS: RegimeMultiplierTable = {
  calm: { none: 1.25, shallow: 1.0, deep: 0.6 },
  elevated: { none: 1.0, shallow: 0.8, deep: 0.5 },
  turbulent: { none: 0.7, shallow: 0.5, deep: 0.3 },
};

/** Regime-conditional risk limit = base limit x table multiplier. */
export function adaptiveRiskLimit(
  baseLimit: number,
  vol: VolBucket,
  dd: DrawdownBucket,
  table: RegimeMultiplierTable = DEFAULT_REGIME_MULTIPLIERS,
): number {
  return baseLimit * table[vol][dd];
}

/**
 * Smooth week-to-week limit transitions: the published limit moves toward
 * the target by at most maxStepFraction of the previous limit per week.
 */
export function smoothRiskLimit(
  previousLimit: number,
  targetLimit: number,
  maxStepFraction = 0.25,
): number {
  if (!(previousLimit > 0)) return targetLimit;
  const maxStep = previousLimit * maxStepFraction;
  const delta = targetLimit - previousLimit;
  const clipped = Math.min(Math.max(delta, -maxStep), maxStep);
  return previousLimit + clipped;
}
