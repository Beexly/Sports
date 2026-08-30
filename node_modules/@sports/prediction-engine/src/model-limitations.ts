/**
 * Model-limitations / uncertainty disclosure — turns a point estimate into an
 * HONEST band: a Wilson confidence interval, a reliability tier, and explicit
 * limitation flags ("small sample", "stale data", "regime shift"). The most
 * on-brand primitive we have: a trust product must show its uncertainty and say
 * when NOT to trust it, not just a confident percentage.
 *
 * Returns TOKEN flags (UI maps to vetted copy). Pure, no I/O.
 */

export interface UncertaintyInput {
  /** Point estimate P(side), 0–1. */
  readonly probability: number;
  /** Effective sample size behind the estimate (comparable settled cases / evidence). */
  readonly sampleSize: number;
  /** Optional evidence health 0–100; low → caveat. */
  readonly evidenceScore?: number;
  /** Optional hours since the underlying data was fresh. */
  readonly dataAgeHours?: number;
  /** Optional flag that current conditions look unlike the training regime. */
  readonly regimeShift?: boolean;
}

export type ReliabilityTier = "high" | "moderate" | "low" | "insufficient";
export type LimitationFlag = "small_sample" | "low_evidence" | "stale_data" | "regime_shift" | "wide_interval";

export interface UncertaintyDisclosure {
  readonly probability: number;
  readonly intervalLow: number;
  readonly intervalHigh: number;
  readonly intervalWidth: number;
  readonly reliability: ReliabilityTier;
  /** False when the band is so wide / sample so thin we should not lead with a hard number. */
  readonly trustworthy: boolean;
  readonly flags: readonly LimitationFlag[];
}

const Z_95 = 1.96;

/** Wilson score interval for a proportion — well-behaved at small n and extreme p. */
export function wilsonInterval(p: number, n: number, z = Z_95): { low: number; high: number } {
  if (n <= 0) return { low: 0, high: 1 };
  const pp = clamp01(p);
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (pp + z2 / (2 * n)) / denom;
  const margin = (z / denom) * Math.sqrt((pp * (1 - pp)) / n + z2 / (4 * n * n));
  return { low: clamp01(center - margin), high: clamp01(center + margin) };
}

export function assessUncertainty(input: UncertaintyInput): UncertaintyDisclosure {
  const n = Math.max(0, input.sampleSize);
  const { low, high } = wilsonInterval(input.probability, n);
  const width = high - low;

  const flags: LimitationFlag[] = [];
  if (n < 30) flags.push("small_sample");
  if ((input.evidenceScore ?? 100) < 40) flags.push("low_evidence");
  if ((input.dataAgeHours ?? 0) > 24) flags.push("stale_data");
  if (input.regimeShift) flags.push("regime_shift");
  if (width > 0.25) flags.push("wide_interval");

  const reliability: ReliabilityTier =
    n < 10
      ? "insufficient"
      : width <= 0.1 && flags.length === 0
        ? "high"
        : width <= 0.2
          ? "moderate"
          : "low";

  return {
    probability: round4(clamp01(input.probability)),
    intervalLow: round4(low),
    intervalHigh: round4(high),
    intervalWidth: round4(width),
    reliability,
    trustworthy: reliability === "high" || reliability === "moderate",
    flags,
  };
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}
function round4(x: number): number {
  return Number(x.toFixed(4));
}
