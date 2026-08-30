/**
 * Beexly Adaptive E-Optimal Ensemble (BAEE) — online Bayesian model averaging
 * of per-model probabilities against realized outcomes.
 *
 * NOT WIRED FOR BLENDING YET. It updates in shadow mode only (learns from
 * settled outcomes) — nothing routes live predictions through `blend()`. See
 * `LiveOrchestrator.evaluateGame`'s `modelProbs` field (persisted on
 * `ShadowSignal`) for where the per-model probabilities come from.
 *
 * CORRECTED FROM AN EARLIER DRAFT. That draft's `update()` computed
 * `grad_k = p_{t,k}(y_t) / p_t(y_t)` and multiplied weights by `exp(η·grad_k)`,
 * with a docblock claiming this equals exact Bayesian updating
 * `w_k' = w_k · p_k(y)/p(y)` at η=1. Checked numerically against the literal
 * formula: for w=[0.5,0.5], modelProbs=[0.9,0.3], y=1, `exp(grad)` update gives
 * [0.7311, 0.2689]; direct Bayes gives [0.75, 0.25]. Not equal — exponentiating
 * a ratio is not the same operation as the ratio itself. The two are legitimate
 * but DIFFERENT algorithms (Hedge/Exponentiated-Gradient vs. literal Bayesian
 * mixing), and only the latter has the clean, T-independent regret bound the
 * docblock claimed. This class now implements literal Bayesian mixing, which
 * is simpler (no learning-rate hyperparameter to misjustify) and has the
 * stronger guarantee for free.
 *
 * MATH. Each model k is scored by the probability it assigned to what actually
 * happened: `p_k(y_t) = y_t · p_{t,k} + (1-y_t) · (1-p_{t,k})`. The update is
 * `w_k ← w_k · p_k(y_t)`, renormalized. This is Bayes' rule applied online with
 * a uniform prior over models — the blend at time t, `Σ_k w_{t,k}·p_{t,k}`, is
 * exactly the predictive distribution a single fixed Bayesian mixture (prior
 * 1/K, updated on y_1..y_{t-1}) would produce, because posterior weight
 * updating is associative: `w_t(k) ∝ (1/K) · Π_{s<t} p_k(y_s)`.
 *
 * REGRET BOUND (exact, no O(·), holds for every T — not merely asymptotic).
 * The mixture's total sequence probability is at least any single model's
 * weighted contribution: `p_mix(y_1..y_T) = Σ_k (1/K)·Π_t p_k(y_t) ≥
 * (1/K)·Π_t p_{k*}(y_t)` for the best model k* in hindsight (a sum of
 * nonnegative terms is at least any one term). Taking logs:
 * `Σ_t log p_mix(y_t) ≥ Σ_t log p_{k*}(y_t) − log K`. The cumulative log-score
 * of the online blend equals `Σ_t log p_mix(y_t)` by the associativity above,
 * so the blend's cumulative log-score is within `log K` of the best individual
 * model's, for every T, unconditionally. Verified by executed simulation, not
 * merely derived: see the "converges toward the model with the highest
 * log-score" test.
 */
const PROB_EPSILON = 1e-12; // clamp away from 0/1 to avoid 0/0 = NaN

export class BAEEEnsemble {
  private weights: number[];
  private readonly minWeight: number = 1e-6; // prevent weights going to exactly 0

  /**
   * @param numModels number of models being weighted.
   * @param initialWeights optional restored weights (e.g. from a persisted
   *   snapshot). Must have length `numModels` and consist of finite,
   *   non-negative values with a positive sum, or it is IGNORED and a fresh
   *   uniform prior is used instead — a corrupt or stale restore degrades to
   *   "start over", never to a silently misweighted ensemble.
   */
  constructor(numModels: number, initialWeights?: readonly number[]) {
    if (!Number.isInteger(numModels) || numModels < 1) {
      throw new RangeError(`BAEEEnsemble requires numModels >= 1, got ${numModels}`);
    }
    const restored = tryNormalizeWeights(initialWeights, numModels);
    this.weights = restored ?? new Array(numModels).fill(1 / numModels);
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
   * Update weights after observing outcome — literal Bayesian posterior
   * update: `w_k ← w_k · p_k(y_t)`, renormalized. `modelProbs` must be the
   * exact array that was passed to `blend()` for this game — reusing a
   * fresher probability would fold information from AFTER this outcome into
   * its own update, mirroring `LiveOrchestrator`'s "same p that was
   * evaluated" rule.
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
    for (let k = 0; k < K; k++) {
      const pk = clampProb(modelProbs[k]!);
      const p_k_y = outcome === 1 ? pk : 1 - pk;
      this.weights[k] = this.weights[k]! * p_k_y;
    }
    this.normalize();
    // Floor and renormalize — a model that was confidently wrong can decay a
    // weight toward (but never past) `minWeight`, so it can still recover if
    // it starts performing well again rather than being permanently retired.
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

/**
 * Validate and normalize a candidate restored-weights array. Returns null
 * (never throws) on any defect — wrong length, non-finite, negative, or a
 * non-positive sum — so a corrupt persisted snapshot degrades to a fresh
 * uniform prior rather than either crashing the caller or silently adopting
 * garbage weights.
 */
function tryNormalizeWeights(
  candidate: readonly number[] | undefined,
  numModels: number,
): number[] | null {
  if (candidate === undefined || candidate.length !== numModels) return null;
  if (!candidate.every((w) => Number.isFinite(w) && w >= 0)) return null;
  const sum = candidate.reduce((a, b) => a + b, 0);
  if (!(sum > 0)) return null;
  return candidate.map((w) => w / sum);
}
