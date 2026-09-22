/**
 * Strong Aggregating Algorithm (SAA) — Brier-mixable generalized prediction.
 *
 * Replaces simple-average ensemble combining. Per expert k, weight
 *   w_k ∝ exp(-η · cumulativeBrierLoss_k),  η = 1
 * over GSE's sub-expert probability outputs plus a consensus-odds market expert.
 * Weights update online after each slate as new outcomes settle.
 *
 * @see arXiv:0710.0485v2 — "Predicting Under the Brier Game with Expert Advice"
 *
 * ACCEPTANCE GATE: ADOPT iff on the 2024 chronological run SAA satisfies the
 * regret bound empirically AND beats both the simple average and the median
 * expert on mean Brier score. If it merely ties the simple average (within
 * 0.001), reject. The gate is a backtest concern; this module is the pure
 * online kernel and is NOT wired into any live path.
 */

/** Brier score for a single binary forecast. */
export function brierScore(p: number, y: 0 | 1): number {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new Error(`brierScore: probability out of range: ${p}`);
  }
  return (p - y) * (p - y);
}

/**
 * SAA expert weights from cumulative Brier losses. Degenerate loss vectors
 * (all equal / non-finite) fall back to the uniform mixture instead of NaN.
 */
export function saaWeights(cumulativeBrier: readonly number[], eta = 1): number[] {
  if (cumulativeBrier.length === 0) return [];
  const unnormalized = cumulativeBrier.map((L) => Math.exp(-eta * L));
  const total = unnormalized.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0) {
    return cumulativeBrier.map(() => 1 / cumulativeBrier.length);
  }
  return unnormalized.map((w) => w / total);
}

/** Weighted aggregate probability under the SAA mixture. */
export function saaAggregate(probabilities: readonly number[], weights: readonly number[]): number {
  if (probabilities.length === 0) throw new Error("saaAggregate: empty probabilities");
  if (probabilities.length !== weights.length) {
    throw new Error(
      `saaAggregate: length mismatch (${probabilities.length} vs ${weights.length})`,
    );
  }
  return probabilities.reduce((acc, p, i) => acc + (weights[i] ?? 0) * p, 0);
}

/**
 * Online update: fold one settled slate into the cumulative losses and return
 * the refreshed weight vector. `losses` is mutated in place and also returned.
 */
export function saaUpdate(
  probabilities: readonly number[],
  outcome: 0 | 1,
  losses: number[],
  eta = 1,
): { weights: number[]; losses: number[] } {
  if (probabilities.length !== losses.length) {
    throw new Error("saaUpdate: probabilities/losses length mismatch");
  }
  probabilities.forEach((p, i) => {
    losses[i] = (losses[i] ?? 0) + brierScore(p, outcome);
  });
  return { weights: saaWeights(losses, eta), losses };
}

/** Regret of the SAA aggregate vs the single best expert in hindsight. */
export function saaRegret(aggregateBrier: number, bestExpertBrier: number): number {
  return aggregateBrier - bestExpertBrier;
}
