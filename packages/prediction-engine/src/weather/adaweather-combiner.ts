/**
 * Hybrid offline/online exponentially-weighted CRPS combiner (AdaWeather).
 *
 * Each of K probabilistic forecast members carries a cumulative CRPS. Weights
 * follow the exponential-weights (Hedge) rule:
 *
 *   w_k = exp(-eta * S_k) / sum_j exp(-eta * S_j),   S_k = cumulative CRPS
 *
 * Hybrid mode mixes a slow offline weight vector (long archive, stable) with a
 * fast online vector (recent window, adaptive):
 *
 *   w = (1 - alpha) * w_offline + alpha * w_online
 *
 * so the pool tracks regime shifts while retaining climatological memory.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2606.02663 — AdaWeather: Adaptively Mixing Probabilistic
 * Weather Forecasts with Log Scores.
 *
 * ACCEPTANCE GATE: hybrid combiner beats the best single member on rolling CRPS.
 */
export interface HybridCombinerParams {
  /** Learning rate eta > 0. Larger = faster adaptation to recent skill. */
  readonly eta: number;
  /** Mixing weight on the online vector in [0, 1]. */
  readonly alpha: number;
}

/** Exponential weights from cumulative scores (lower score = better). */
export function exponentialWeights(cumulativeScores: readonly number[], eta: number): number[] {
  if (cumulativeScores.length === 0) throw new Error("exponentialWeights: need at least one member");
  if (!(eta > 0) || !Number.isFinite(eta)) throw new Error("exponentialWeights: eta must be > 0");
  for (const s of cumulativeScores) {
    if (!Number.isFinite(s)) throw new Error("exponentialWeights: scores must be finite");
  }
  const min = Math.min(...cumulativeScores);
  const exps = cumulativeScores.map((s) => Math.exp(-eta * (s - min)));
  const total = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / total);
}

/** Hybrid blend of offline and online weight vectors. */
export function hybridWeights(
  offline: readonly number[],
  online: readonly number[],
  alpha: number,
): number[] {
  if (offline.length === 0 || offline.length !== online.length) {
    throw new Error("hybridWeights: offline and online must be non-empty and same length");
  }
  if (!(alpha >= 0 && alpha <= 1) || !Number.isFinite(alpha)) {
    throw new Error("hybridWeights: alpha must be in [0, 1]");
  }
  const blended = offline.map((w, k) => (1 - alpha) * w + alpha * (online[k] ?? 0));
  const total = blended.reduce((a, b) => a + b, 0);
  if (!(total > 0)) throw new Error("hybridWeights: weights must sum to a positive value");
  return blended.map((w) => w / total);
}

/** Full hybrid combiner from cumulative CRPS histories. */
export function adaWeatherWeights(
  offlineCrps: readonly number[],
  onlineCrps: readonly number[],
  params: HybridCombinerParams,
): number[] {
  const wOff = exponentialWeights(offlineCrps, params.eta);
  const wOn = exponentialWeights(onlineCrps, params.eta);
  return hybridWeights(wOff, wOn, params.alpha);
}

/** CRPS of a forecast CDF ensemble against one observation (discrete form). */
export function crpsEnsemble(memberValues: readonly number[], observation: number): number {
  if (memberValues.length === 0) throw new Error("crpsEnsemble: need at least one member");
  const m = memberValues.length;
  const meanAbsErr = memberValues.reduce((a, x) => a + Math.abs(x - observation), 0) / m;
  let spread = 0;
  for (const x of memberValues) for (const y of memberValues) spread += Math.abs(x - y);
  spread /= 2 * m * m;
  return meanAbsErr - spread;
}
