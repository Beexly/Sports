/**
 * Conformal-Kelly stake sizing.
 *
 * Stake for one pick is proportional to edge / (interval width)^2:
 *
 *   raw    = fraction * edge / width^2
 *   stake  = min(raw, perPickCap, grossCap - grossUsed)  (floored at 0)
 *
 * The conformal prediction-interval width replaces the Kelly variance term, so
 * uncertain picks (wide intervals) are shrunk quadratically. A fractional
 * multiplier (e.g. 0.25) keeps the growth-optimal stake conservative.
 *
 * Pure TypeScript, no I/O. All money units are caller-defined (units or dollars).
 *
 * Reference: arXiv:2608.01494v1 — Conformal Kelly: Conformal Prediction
 * Intervals as the Scale in Fractional Kelly.
 *
 * ACCEPTANCE GATE: season-long lockbox beats flat stakes and 0.25-Kelly;
 * reject if cap-binding frequency exceeds 90%.
 */
export interface ConformalKellyParams {
  /** Fractional Kelly multiplier, e.g. 0.25. Must be > 0. */
  readonly fraction: number;
  /** Max stake on a single pick, same units as bankroll. Must be > 0. */
  readonly perPickCap: number;
  /** Max total exposure across all open picks. Must be > 0. */
  readonly grossCap: number;
}

export interface ConformalKellyQuote {
  /** Model edge as a decimal (model prob - market prob), can be negative. */
  readonly edge: number;
  /** Conformal interval width for the pick (>= 0). Wider = more uncertain. */
  readonly intervalWidth: number;
}

export interface ConformalKellyResult {
  /** Final stake after caps and flooring (>= 0). */
  readonly stake: number;
  /** True when a cap (per-pick or gross) bound the stake. */
  readonly capBound: boolean;
  /** The uncapped raw stake, for diagnostics. */
  readonly rawStake: number;
}

/**
 * Size one pick with conformal-Kelly scaling.
 *
 * @param quote  Edge and conformal interval width for the pick.
 * @param params Fractional multiplier and caps.
 * @param grossUsed  Current gross exposure (same units). Defaults to 0.
 * @throws when params are non-positive or inputs are not finite.
 */
export function conformalKellyStake(
  quote: ConformalKellyQuote,
  params: ConformalKellyParams,
  grossUsed = 0,
): ConformalKellyResult {
  const { edge, intervalWidth } = quote;
  const { fraction, perPickCap, grossCap } = params;
  for (const [name, v] of [
    ["edge", edge],
    ["intervalWidth", intervalWidth],
    ["fraction", fraction],
    ["perPickCap", perPickCap],
    ["grossCap", grossCap],
    ["grossUsed", grossUsed],
  ] as const) {
    if (!Number.isFinite(v)) throw new Error(`conformalKellyStake: ${name} must be finite`);
  }
  if (fraction <= 0) throw new Error("conformalKellyStake: fraction must be > 0");
  if (perPickCap <= 0) throw new Error("conformalKellyStake: perPickCap must be > 0");
  if (grossCap <= 0) throw new Error("conformalKellyStake: grossCap must be > 0");
  if (intervalWidth < 0) throw new Error("conformalKellyStake: intervalWidth must be >= 0");
  if (grossUsed < 0) throw new Error("conformalKellyStake: grossUsed must be >= 0");

  // Non-positive edge or a degenerate (zero-width) interval -> no bet.
  // Zero width would imply infinite precision; treat as no signal, not infinite stake.
  const rawStake = edge > 0 && intervalWidth > 0 ? (fraction * edge) / (intervalWidth * intervalWidth) : 0;
  const grossRoom = Math.max(0, grossCap - grossUsed);
  const capped = Math.min(rawStake, perPickCap, grossRoom);
  const stake = Math.max(0, capped);
  return { stake, capBound: stake < rawStake - 1e-12, rawStake };
}

/**
 * Cap-binding frequency over a set of sized picks (the gate's reject statistic).
 * Returns the fraction of picks where a cap bound the stake.
 */
export function capBindingFrequency(results: readonly ConformalKellyResult[]): number {
  if (results.length === 0) throw new Error("capBindingFrequency: need at least one result");
  return results.filter((r) => r.capBound).length / results.length;
}
