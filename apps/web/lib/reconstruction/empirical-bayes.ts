/**
 * Empirical-Bayes shrinkage — the exact, parameter-free core.
 *
 * A receiver's weekly NGS avg_separation is a noisy average over a handful of
 * targets. A player with 2 targets and 4.0 yards of separation is far less
 * trustworthy than one with 40 targets at 3.2. Empirical Bayes de-noises each
 * player's aggregate by pulling it toward the league mean in proportion to how
 * little data backs it — the classic James-Stein result, and provably better
 * (lower total squared error) than taking the raw averages at face value.
 *
 * There is nothing fabricated here: μ, τ², and every shrinkage weight are
 * computed from the observed aggregates themselves. No invented coefficients.
 */

export interface GroupObservation {
  readonly key: string; // e.g. receiver gsis id + week
  readonly mean: number; // the reported aggregate (e.g. avg_separation)
  readonly count: number; // sample size behind it (targets)
}

export interface ShrunkEstimate {
  readonly key: string;
  readonly raw: number;
  readonly shrunk: number; // posterior mean: the de-noised tendency
  readonly weight: number; // 0..1 trust placed in this player's own data
  readonly posteriorSd: number; // uncertainty of the shrunk estimate
}

export interface ShrinkageModel {
  readonly populationMean: number; // μ
  readonly betweenVariance: number; // τ² (true spread across players)
  readonly withinVariance: number; // σ² (per-target measurement noise)
  readonly estimates: ReadonlyMap<string, ShrunkEstimate>;
}

/**
 * Fit the shrinkage hyperparameters and shrink every group.
 *
 * @param withinVariance σ² — variance of a single measurement (one target).
 *   Supply the known/estimated per-target spread of the metric. If omitted, it
 *   is estimated from the pooled dispersion of the observations.
 */
export function fitShrinkage(
  observations: readonly GroupObservation[],
  withinVariance?: number,
): ShrinkageModel {
  const valid = observations.filter((o) => o.count > 0 && Number.isFinite(o.mean));
  const n = valid.length;
  if (n === 0) {
    return {
      populationMean: 0,
      betweenVariance: 0,
      withinVariance: withinVariance ?? 0,
      estimates: new Map(),
    };
  }

  // Count-weighted population mean μ — heavier samples carry more of the mean.
  const totalCount = valid.reduce((s, o) => s + o.count, 0);
  const mu = valid.reduce((s, o) => s + o.mean * o.count, 0) / totalCount;

  // σ²: per-target noise. Estimate from the count-weighted spread if not given.
  const weightedVar =
    valid.reduce((s, o) => s + o.count * (o.mean - mu) ** 2, 0) / totalCount;
  const sigma2 = withinVariance ?? weightedVar;

  // τ²: true between-player variance = observed spread minus the average
  // sampling noise (method-of-moments). Floored at 0 — never negative.
  const meanSamplingVar =
    valid.reduce((s, o) => s + sigma2 / o.count, 0) / n;
  const tau2 = Math.max(0, weightedVar - meanSamplingVar);

  const estimates = new Map<string, ShrunkEstimate>();
  for (const o of valid) {
    const samplingVar = sigma2 / o.count; // this player's own noise
    // Shrinkage weight: trust the player's data more when between-player
    // spread dwarfs their sampling noise; pull to μ when it does not.
    const w = tau2 <= 0 ? 0 : tau2 / (tau2 + samplingVar);
    const shrunk = mu + w * (o.mean - mu);
    // Posterior variance of the shrunk estimate (Gaussian-Gaussian conjugacy).
    const posteriorVar = tau2 <= 0 ? samplingVar : (tau2 * samplingVar) / (tau2 + samplingVar);
    estimates.set(o.key, {
      key: o.key,
      raw: o.mean,
      shrunk,
      weight: w,
      posteriorSd: Math.sqrt(Math.max(0, posteriorVar)),
    });
  }

  return { populationMean: mu, betweenVariance: tau2, withinVariance: sigma2, estimates };
}
