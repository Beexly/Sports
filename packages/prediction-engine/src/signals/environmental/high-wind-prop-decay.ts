/**
 * High-wind passing-prop decay (Rung 1 descriptive capture; props context ONLY).
 *
 * MEASURED on nflverse 2019-2025 REG pass attempts joined to schedule wind
 * (see docs/research/2026-09-19-opp-adj-epa-path/, allseat_mills.json). These are
 * OUR numbers - the previously circulated lookup (-4.5% / -8.5% yards, -0.028 EPA)
 * did not reproduce and is dead.
 *
 * Measured (attempts n = 66,528 / 6,928 / 1,796):
 *   0-14 mph : baseline (completion 64.56%, YPA 10.962, aDOT>20 share 10.37%)
 *   15-19 mph: completion -1.50pp (Wilson non-overlap vs base - graduated),
 *              YPA -0.318 (-2.9%), aDOT>20 share -16.6% RELATIVE
 *              (Wilson non-overlap - graduated), EPA/dropback swing -0.065
 *   >=20 mph : NOT ESTABLISHED (n=1,796; completion and YPA effects inside noise).
 *              Returns neutral-with-lowSample, never an adjustment.
 *
 * HONESTY INVARIANT: this factor applies to passing-yardage / completion /
 * prop contexts only. Called on a spread, moneyline, or total market context it
 * THROWS - closing totals already price wind, and a spread/total wind addend is
 * BLOCKED by doctrine. Weight 0.00 until a Rung-2 outcome test passes.
 */

export const HIGH_WIND_METHOD_TAG = "high_wind_prop_decay_v1" as const;

export type PropMarketContext = "passing_yards" | "completions" | "passing_props";

/** Thrown when the factor is requested for a market it is forbidden to touch. */
export class WindContextError extends Error {}

export interface WindDecayReading {
  readonly methodTag: typeof HIGH_WIND_METHOD_TAG;
  readonly bin: "0-14" | "15-19" | ">=20";
  readonly applies: boolean;
  /** Completion-rate delta in percentage points vs the 0-14 baseline. */
  readonly completionDeltaPp: number;
  /** Yards-per-attempt delta vs baseline (negative = fewer yards). */
  readonly yardsPerAttemptDelta: number;
  /** Relative change in aDOT>20 target share (negative = fewer deep shots). */
  readonly deepTargetRelativeDelta: number;
  /** True when the bin's effects did not clear Wilson non-overlap. */
  readonly notEstablished: boolean;
}

/** Measured bin effects; nulls where the pre-registered test did not clear. */
export const MEASURED_WIND_TABLE = {
  baseline: { attempts: 66528, completion: 0.6456, yardsPerAttempt: 10.962, aDotGt20Share: 0.1037 },
  mid: {
    attempts: 6928,
    completionDeltaPp: -1.5,
    yardsPerAttemptDelta: -0.318,
    deepTargetRelativeDelta: -0.166,
    epaPerDropbackSwing: -0.065,
  },
  high: { attempts: 1796, established: false },
} as const;

export function windPropDecay(windMph: number, market: PropMarketContext): WindDecayReading {
  if (typeof windMph !== "number" || !Number.isFinite(windMph) || windMph < 0) {
    throw new WindContextError(`high-wind: windMph must be a finite non-negative number, got ${windMph}`);
  }
  const bin: WindDecayReading["bin"] = windMph < 15 ? "0-14" : windMph < 20 ? "15-19" : ">=20";
  if (bin === "0-14") {
    return {
      methodTag: HIGH_WIND_METHOD_TAG,
      bin,
      applies: false,
      completionDeltaPp: 0,
      yardsPerAttemptDelta: 0,
      deepTargetRelativeDelta: 0,
      notEstablished: false,
    };
  }
  if (bin === ">=20") {
    // Not established: returning a zero adjustment with the flag set is honest;
    // inventing a magnitude because the direction looked right is not.
    return {
      methodTag: HIGH_WIND_METHOD_TAG,
      bin,
      applies: false,
      completionDeltaPp: 0,
      yardsPerAttemptDelta: 0,
      deepTargetRelativeDelta: 0,
      notEstablished: true,
    };
  }
  return {
    methodTag: HIGH_WIND_METHOD_TAG,
    bin,
    applies: true,
    completionDeltaPp: MEASURED_WIND_TABLE.mid.completionDeltaPp,
    yardsPerAttemptDelta: MEASURED_WIND_TABLE.mid.yardsPerAttemptDelta,
    deepTargetRelativeDelta: MEASURED_WIND_TABLE.mid.deepTargetRelativeDelta,
    notEstablished: false,
  };
}

/**
 * Guarded entry point for prop pipelines: refuses non-prop markets outright.
 * (spread / moneyline / total are the markets wind addends are BLOCKED on.)
 */
export function windPropDecayGuarded(
  windMph: number,
  market: PropMarketContext | "spread" | "moneyline" | "total",
): WindDecayReading {
  if (market === "spread" || market === "moneyline" || market === "total") {
    throw new WindContextError(
      `high-wind: factor is props-only; refusing market context "${market}" (totals already price wind)`
    );
  }
  return windPropDecay(windMph, market);
}
