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
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function quantile(values: readonly number[], probability: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  // Split-conformal finite-sample quantile with the (n+1) correction: the ceil((n+1) * p)-th
  // order statistic. Without it the residual quantile is too small on small samples, so
  // intervals run narrower than target coverage. ceil((n+1)*p) >= ceil(n*p) => intervals only widen.
  const rank = Math.ceil((sorted.length + 1) * probability);
  const index = Math.min(sorted.length - 1, Math.max(0, rank - 1));
  return sorted[index]!;
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
    const lower = Math.max(0, observation.predictedMean - residualQuantile);
    const upper = observation.predictedMean + residualQuantile;
    const covered = observation.actualFantasyPoints >= lower && observation.actualFantasyPoints <= upper;
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
      upper: round4(upper),
      alpha: round4(current.alpha),
      residualQuantile: round4(residualQuantile),
      covered,
    };
  });
}
