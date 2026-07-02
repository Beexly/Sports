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

/**
 * One dated sample for a group (e.g. a receiver's avg_separation in a single
 * week), used to build a RECENCY-WEIGHTED observation below.
 */
export interface DatedSample {
  readonly value: number; // the measurement that week
  readonly count: number; // targets behind it that week
  readonly ageWeeks: number; // how many weeks ago (0 = most recent)
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

/**
 * Recency-weighted observation (the honest kernel inside "Barbour-OU flows").
 *
 * A player's true separation ability is not static across a season — it drifts
 * with form, health, and scheme, and reverts toward a personal baseline. An
 * Ornstein-Uhlenbeck process is exactly "mean-reverting drift"; the practical,
 * non-ornamental consequence is that RECENT weeks should count more than old
 * ones. We fold a player's dated weekly samples into a single observation
 * whose mean and EFFECTIVE sample size are exponentially discounted by age
 * (half-life in weeks). The result drops straight into fitShrinkage, whose
 * pull-toward-population IS the mean reversion. No new machinery, real lift.
 *
 * halfLifeWeeks <= 0 disables decay (every week counts equally).
 */
export function recencyWeightedObservation(
  key: string,
  samples: readonly DatedSample[],
  halfLifeWeeks: number,
): GroupObservation {
  const valid = samples.filter((s) => s.count > 0 && Number.isFinite(s.value));
  if (valid.length === 0) return { key, mean: 0, count: 0 };
  const decay = (age: number): number =>
    halfLifeWeeks > 0 ? Math.pow(0.5, Math.max(0, age) / halfLifeWeeks) : 1;

  // Effective count = Σ (targets · recency); mean = recency-and-count-weighted.
  let wSum = 0;
  let wxSum = 0;
  for (const s of valid) {
    const w = s.count * decay(s.ageWeeks);
    wSum += w;
    wxSum += w * s.value;
  }
  return { key, mean: wxSum / wSum, count: wSum };
}

/**
 * Stratified (hierarchical) shrinkage — the honest kernel inside "exchangeable
 * occlusion graphs". Players are exchangeable WITHIN a role, not across the
 * whole league: a slot receiver and a boundary X have different separation
 * baselines, so a thin-sample player should borrow strength from PEERS, not
 * from a league-wide mean that washes the role out.
 *
 * We fit a separate ShrinkageModel per stratum, but only when the stratum has
 * enough groups to estimate its own hyperparameters (minGroupsPerStratum);
 * thin strata fall back to a global fit so we never trade a noisy league prior
 * for an even noisier tiny-stratum prior. Returns one merged estimate map.
 */
export function fitStratifiedShrinkage(
  observations: readonly GroupObservation[],
  stratumOf: (o: GroupObservation) => string,
  opts: { minGroupsPerStratum?: number; withinVariance?: number } = {},
): ReadonlyMap<string, ShrunkEstimate> {
  const minGroups = opts.minGroupsPerStratum ?? 8;
  const global = fitShrinkage(observations, opts.withinVariance);

  const byStratum = new Map<string, GroupObservation[]>();
  for (const o of observations) {
    const s = stratumOf(o);
    const arr = byStratum.get(s);
    if (arr) arr.push(o);
    else byStratum.set(s, [o]);
  }

  const out = new Map<string, ShrunkEstimate>();
  for (const [, group] of byStratum) {
    if (group.length >= minGroups) {
      const local = fitShrinkage(group, opts.withinVariance);
      for (const o of group) {
        const est = local.estimates.get(o.key);
        if (est) out.set(o.key, est);
      }
    } else {
      // Too few peers to trust a role-specific prior: keep the global estimate.
      for (const o of group) {
        const est = global.estimates.get(o.key);
        if (est) out.set(o.key, est);
      }
    }
  }
  return out;
}
