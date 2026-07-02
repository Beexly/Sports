/**
 * Provenance is the law of this engine: every reconstructed value carries an
 * unforgeable tag saying it was ESTIMATED from public aggregates, never
 * measured. The type system makes an un-tagged value impossible to emit, so
 * the honesty doctrine ("no synthetic data presented as real") is enforced at
 * compile time, not by reviewer vigilance.
 */

export type ReconstructionMethod =
  | "empirical-bayes-shrinkage" // aggregate de-noised toward population
  | "covariate-adjusted" // shrinkage + calibrated play-context model
  | "physical-feasibility-envelope"; // kinematic bounds, no point claim

/** How much to trust this estimate, and exactly why it is an estimate. */
export interface Provenance {
  readonly kind: "RECONSTRUCTED"; // never "MEASURED" — that value does not exist here
  readonly method: ReconstructionMethod;
  /**
   * Cleared aggregate sources this value was derived from. Raw NFL frames,
   * Big Data Bowl data, and broadcast scraping are NEVER valid entries — the
   * only legal inputs are public aggregates.
   */
  readonly inputs: readonly string[];
  /**
   * Is the play-context adjustment layer fitted yet? Until a legal historical
   * join (or a real tracking calibration set) fits it, covariate effects are
   * inert and this is false. A consumer can refuse uncalibrated features.
   */
  readonly calibrated: boolean;
  /** Plain-language label for any surface that ever shows this value. */
  readonly disclosure: string;
}

/** A reconstructed scalar: point estimate + honest interval + provenance. */
export interface ReconstructedFeature {
  readonly value: number;
  /** Central (1 - alpha) interval. Wide is honest when calibration is thin. */
  readonly interval: readonly [low: number, high: number];
  readonly alpha: number; // e.g. 0.2 for an 80% interval
  readonly provenance: Provenance;
}

/**
 * Cleared input namespaces (the part before ":"). The doctrine — only legal
 * aggregates, never raw frames / Big Data Bowl / scraped video — is now
 * ENFORCED here, not merely asserted in a comment: makeProvenance throws on any
 * input outside this allowlist, so a value tagged RECONSTRUCTED cannot claim a
 * forbidden source. Add a namespace here only when its license is cleared.
 */
export const CLEARED_INPUT_NAMESPACES: readonly string[] = [
  "nflverse", // aggregated NGS / PBP (CC-BY, community-compiled)
  "pfr", // Pro Football Reference advanced aggregates
  "calibration", // an internal calibration truth set (e.g. NGS Highlights coords, transformative)
];

export function makeProvenance(
  method: ReconstructionMethod,
  inputs: readonly string[],
  calibrated: boolean,
): Provenance {
  for (const input of inputs) {
    const namespace = input.split(":")[0]!;
    if (!CLEARED_INPUT_NAMESPACES.includes(namespace)) {
      throw new Error(
        `makeProvenance: input "${input}" is not a cleared source. ` +
          `Reconstruction may only cite ${CLEARED_INPUT_NAMESPACES.join(", ")} — never raw frames, ` +
          "Big Data Bowl, or scraped video. The honesty doctrine is enforced, not optional.",
      );
    }
  }
  return {
    kind: "RECONSTRUCTED",
    method,
    inputs,
    calibrated,
    disclosure: calibrated
      ? "Estimated from public NFL aggregates (reconstructed, not measured tracking)."
      : "Estimated from public NFL aggregates; play-context model uncalibrated (reconstructed, not measured).",
  };
}

/**
 * Build a reconstructed feature and guarantee its interval is ordered and
 * contains the point. Throws on incoherent inputs so a bad estimate can never
 * silently ship as a confident one.
 */
export function reconstructed(
  value: number,
  interval: readonly [number, number],
  alpha: number,
  provenance: Provenance,
): ReconstructedFeature {
  const [low, high] = interval;
  if (!Number.isFinite(value) || !Number.isFinite(low) || !Number.isFinite(high)) {
    throw new Error("reconstructed: non-finite estimate");
  }
  if (low > high) throw new Error("reconstructed: interval reversed");
  if (value < low || value > high) throw new Error("reconstructed: point outside interval");
  if (alpha <= 0 || alpha >= 1) throw new Error("reconstructed: alpha must be in (0,1)");
  return { value, interval, alpha, provenance };
}
