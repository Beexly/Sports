export interface AciObservation {
  readonly sampleId: string;
  readonly position: string;
  readonly predictedMean: number;
  readonly actualFantasyPoints: number;
}

export interface AciInterval {
  readonly sampleId: string;
  readonly position: string;
  readonly lower: number;
  readonly upper: number;
  readonly alpha: number;
  readonly residualQuantile: number;
  readonly covered: boolean;
  /** fail_closed_insufficient_n when ceil((n+1)(1-α)) > n — never clamp to n. */
  readonly status: "ok" | "warmup_point_band" | "fail_closed_insufficient_n";
  readonly qhatInfinite: boolean;
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

/**
 * Split-conformal finite-sample quantile with (n+1) correction.
 * - empty history: 0 (point band warmup — not a coverage claim)
 * - FAIL CLOSED when k = ceil((n+1)*p) > n: +Infinity, never clamp to n
 *   (clamping ships n/(n+1) coverage labeled as 1−α).
 */
function quantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  if (!Number.isFinite(probability) || probability <= 0) return Number.POSITIVE_INFINITY;
  if (probability >= 1) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const k = Math.ceil((n + 1) * probability);
  if (k > n || k < 1) return Number.POSITIVE_INFINITY;
  return sorted[k - 1]!;
}

export function adaptiveConformalIntervals(
  observations: readonly AciObservation[],
  targetCoverage = 0.8,
  learningRate = 0.05,
): readonly AciInterval[] {
  const state = new Map<string, { alpha: number; residuals: number[] }>();
  return observations.map((observation) => {
    const current = state.get(observation.position) ?? { alpha: 1 - targetCoverage, residuals: [] };
    const residualQuantile = quantile(current.residuals, 1 - current.alpha);
    const qhatInfinite = !Number.isFinite(residualQuantile);
    const warmup = current.residuals.length === 0 && !qhatInfinite;
    const lower = qhatInfinite ? 0 : Math.max(0, observation.predictedMean - residualQuantile);
    const upper = qhatInfinite ? Number.POSITIVE_INFINITY : observation.predictedMean + residualQuantile;
    // Fail-closed bands do NOT certify coverage — count as a miss so ACI still learns.
    const covered = qhatInfinite
      ? false
      : observation.actualFantasyPoints >= lower && observation.actualFantasyPoints <= upper;
    const miss = covered ? 0 : 1;
    const alpha = Math.min(
      0.5,
      Math.max(0.02, current.alpha + learningRate * (1 - targetCoverage - miss)),
    );
    current.residuals.push(Math.abs(observation.actualFantasyPoints - observation.predictedMean));
    state.set(observation.position, { alpha, residuals: current.residuals });
    return {
      sampleId: observation.sampleId,
      position: observation.position,
      lower: round4(lower),
      upper: qhatInfinite ? Number.POSITIVE_INFINITY : round4(upper),
      alpha: round4(current.alpha),
      residualQuantile: qhatInfinite ? Number.POSITIVE_INFINITY : round4(residualQuantile),
      covered,
      status: qhatInfinite
        ? ("fail_closed_insufficient_n" as const)
        : warmup
          ? ("warmup_point_band" as const)
          : ("ok" as const),
      qhatInfinite,
    };
  });
}
