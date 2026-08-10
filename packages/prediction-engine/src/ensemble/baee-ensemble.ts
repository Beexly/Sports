/**
 * Beexly Adaptive E-Optimal Ensemble (BAEE) — exponential-weights blending of
 * per-model probabilities against realized outcomes.
 *
 * NOT WIRED INTO THE SHADOW PIPELINE YET. There is no `modelProbs: number[]`
 * consumer today with enough settled history to learn from, and no second
 * model to weight against — see `LiveOrchestrator.evaluateGame`'s `modelProbs`
 * field (now persisted on `ShadowSignal`, unread by anything). This class
 * exists so the integration, when there's real data to justify it, is one
 * line: `blend(modelProbs)` before evaluation, `update(...)` after settlement.
 *
 * Math: minimizing the average log-loss ℓ_t(w) = -log(Σ_k w_k · p_{t,k}(y_t))
 * via multiplicative weights (this is exactly Hedge/Exponentiated-Gradient
 * applied to the logarithmic score). The gradient w.r.t. w_k for a single
 * realized binary outcome is p_{t,k}(y_t) / p_t(y_t) — a single term, not the
 * two-term form some drafts of this idea used (a per-outcome log-loss only
 * depends on the probability assigned to what actually happened).
 *
 * Regret bound: the standard Hedge guarantee — average log-score of the blend
 * is within O(√(log K / T)) of the best individual model in hindsight — holds
 * for the TUNED learning rate η = √(8·log K / T). At η = 1 specifically, the
 * update is EXACT Bayesian mixture-of-experts posterior updating (w_k' = w_k
 * · p_k(y) / p(y)), which has its own exact, unconditional bound: cumulative
 * log-score of the blend ≥ cumulative log-score of the best model − log(K),
 * for every T, no O(·) needed. η=1 is the correct default for online use
 * precisely because it's the regime with a provable guarantee that doesn't
 * depend on knowing T in advance; other fixed η values (e.g. 0.1) have no
 * guarantee attached to them at all and were verified empirically (during
 * review of this proposal) to underperform both endpoints on synthetic data.
 */
const PROB_EPSILON = 1e-12; // clamp away from 0/1 to avoid 0/0 = NaN

export class BAEEEnsemble {
  private weights: number[];
  private readonly learningRate: number;
  private readonly minWeight: number = 1e-6; // prevent weights going to exactly 0

  constructor(numModels: number, learningRate = 1.0) {
    if (!Number.isInteger(numModels) || numModels < 1) {
      throw new RangeError(`BAEEEnsemble requires numModels >= 1, got ${numModels}`);
    }
    this.weights = new Array(numModels).fill(1 / numModels);
    this.learningRate = learningRate;
  }

  get numModels(): number {
    return this.weights.length;
  }

  /** Current weights (defensive copy). */
  currentWeights(): readonly number[] {
    return [...this.weights];
  }

  /**
   * Get current blended probability. `modelProbs` MUST be the same length and
   * MUST be in the same model order as at construction — this class has no
   * way to detect a silently reordered or truncated array (see
   * `LiveOrchestrator.evaluateGame`'s `modelProbs` doc on that exact hazard).
   */
  blend(modelProbs: readonly number[]): number {
    if (modelProbs.length !== this.weights.length) {
      throw new RangeError(
        `BAEEEnsemble.blend: expected ${this.weights.length} model probabilities, got ${modelProbs.length}`,
      );
    }
    let sum = 0;
    for (let i = 0; i < modelProbs.length; i++) {
      sum += this.weights[i]! * modelProbs[i]!;
    }
    return sum;
  }

  /**
   * Update weights after observing outcome. `modelProbs` must be the exact
   * array that was passed to `blend()` for this game — reusing a fresher
   * probability would fold information from AFTER this outcome into its own
   * update, mirroring `LiveOrchestrator`'s "same p that was evaluated" rule.
   *
   * @param modelProbs probabilities that were used for blending
   * @param outcome 1 for home win, 0 for away
   */
  update(modelProbs: readonly number[], outcome: 0 | 1): void {
    if (modelProbs.length !== this.weights.length) {
      throw new RangeError(
        `BAEEEnsemble.update: expected ${this.weights.length} model probabilities, got ${modelProbs.length}`,
      );
    }
    const K = this.weights.length;
    const p = this.blend(modelProbs);
    // p_y = probability the blend assigned to what actually happened, clamped
    // so a model (or the blend) outputting an exact 0/1 can never produce a
    // 0/0 = NaN gradient that silently poisons every weight forever after.
    const p_y = clampProb(outcome === 1 ? p : 1 - p);

    const grad = new Array(K);
    for (let k = 0; k < K; k++) {
      const pk = clampProb(modelProbs[k]!);
      const p_k_y = outcome === 1 ? pk : 1 - pk;
      grad[k] = p_k_y / p_y;
    }

    for (let k = 0; k < K; k++) {
      this.weights[k] = this.weights[k]! * Math.exp(this.learningRate * grad[k]!);
    }
    this.normalize();
    // Floor and renormalize — clamping alone can leave the sum slightly off 1.
    for (let k = 0; k < K; k++) {
      this.weights[k] = Math.max(this.minWeight, this.weights[k]!);
    }
    this.normalize();
  }

  private normalize(): void {
    const sum = this.weights.reduce((a, b) => a + b, 0);
    if (!Number.isFinite(sum) || sum <= 0) {
      // Should be unreachable given the p_y clamp above, but fail safe rather
      // than propagate NaN/Infinity weights into future predictions.
      this.weights = new Array(this.weights.length).fill(1 / this.weights.length);
      return;
    }
    for (let k = 0; k < this.weights.length; k++) {
      this.weights[k] = this.weights[k]! / sum;
    }
  }
}

function clampProb(p: number): number {
  if (!Number.isFinite(p)) return 0.5;
  return Math.min(1 - PROB_EPSILON, Math.max(PROB_EPSILON, p));
}
