/**
 * Information theory utilities — pure, zero dependencies.
 *
 * Entropy, KL divergence, mutual information, cross-entropy, and
 * information gain for probability distributions. Useful for
 * calibration analysis and pick confidence scoring.
 */

const LOG2 = Math.log(2);

/** Safe log base 2: returns 0 for p <= 0 (convention: 0 * log2(0) = 0). */
function safeLog2(p: number): number {
  if (p <= 0) return 0;
  return Math.log(p) / LOG2;
}

/**
 * Normalize an array of non-negative numbers to sum to 1.
 * If all values are 0, returns a uniform distribution.
 */
export function normalize(probs: readonly number[]): number[] {
  const sum = probs.reduce((a, b) => a + b, 0);
  if (sum === 0) {
    const n = probs.length;
    return n === 0 ? [] : Array(n).fill(1 / n) as number[];
  }
  return probs.map((p) => p / sum);
}

/**
 * Maximum possible entropy for a distribution over n outcomes: log2(n).
 * Returns 0 for n <= 1.
 */
export function maxEntropy(n: number): number {
  if (n <= 1) return 0;
  return Math.log2(n);
}

/**
 * Shannon entropy of a probability distribution (in bits).
 * H(P) = -sum(p_i * log2(p_i))
 *
 * Ignores p <= 0 (they contribute 0).
 * Normalizes input so it sums to 1 if it doesn't already.
 * Returns 0 for empty or all-zero arrays.
 */
export function entropy(probs: readonly number[]): number {
  if (probs.length === 0) return 0;
  const normalized = normalize(probs);
  return -normalized.reduce((acc, p) => {
    if (p <= 0) return acc;
    return acc + p * safeLog2(p);
  }, 0);
}

/**
 * Binary entropy function: H(p) = -p*log2(p) - (1-p)*log2(1-p).
 * Returns 0 for p=0 or p=1; returns 1 for p=0.5.
 */
export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -(p * safeLog2(p) + (1 - p) * safeLog2(1 - p));
}

/**
 * KL divergence (relative entropy) from P to Q (in bits).
 * KL(P||Q) = sum(p_i * log2(p_i / q_i))
 *
 * Returns Infinity if q[i] = 0 where p[i] > 0.
 * Throws if lengths differ.
 */
export function klDivergence(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) {
    throw new Error(`klDivergence: arrays must be same length (got ${p.length} and ${q.length})`);
  }
  let kl = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi <= 0) continue;
    if (qi <= 0) return Infinity;
    kl += pi * safeLog2(pi / qi);
  }
  return kl;
}

/**
 * Jensen-Shannon divergence (in bits). Always finite, bounded [0, 1].
 * JSD(P||Q) = 0.5 * KL(P||M) + 0.5 * KL(Q||M), where M = 0.5*(P+Q).
 *
 * Returns 0 if P === Q.
 * Throws if lengths differ.
 */
export function jsDivergence(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) {
    throw new Error(`jsDivergence: arrays must be same length (got ${p.length} and ${q.length})`);
  }
  const m = p.map((pi, i) => (pi + (q[i] ?? 0)) / 2);
  return 0.5 * klDivergence(p, m) + 0.5 * klDivergence(q, m);
}

/**
 * Cross-entropy H(P, Q) = -sum(p_i * log2(q_i)).
 * p is the true distribution, q is the predicted distribution.
 *
 * Returns Infinity if q[i] = 0 where p[i] > 0.
 * Throws if lengths differ.
 */
export function crossEntropy(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) {
    throw new Error(`crossEntropy: arrays must be same length (got ${p.length} and ${q.length})`);
  }
  let ce = 0;
  for (let i = 0; i < p.length; i++) {
    const pi = p[i]!;
    const qi = q[i]!;
    if (pi <= 0) continue;
    if (qi <= 0) return Infinity;
    ce -= pi * safeLog2(qi);
  }
  return ce;
}

/**
 * Mutual information I(X;Y) = H(X) + H(Y) - H(X,Y) (in bits).
 * joint is a 2D probability matrix (rows = X values, cols = Y values).
 * Sums the joint matrix to obtain marginals.
 */
export function mutualInformation(joint: readonly (readonly number[])[]): number {
  if (joint.length === 0) return 0;
  const rows = joint.length;
  const cols = joint[0]!.length;

  // Flatten joint for H(X,Y)
  const flat: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      flat.push(joint[i]![j] ?? 0);
    }
  }

  const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
  const margY = Array.from({ length: cols }, (_, j) =>
    joint.reduce((acc, row) => acc + (row[j] ?? 0), 0),
  );

  return entropy(margX) + entropy(margY) - entropy(flat);
}

/**
 * Information gain from a split.
 * IG = parentEntropy - sum(weight_i * entropy_i)
 * Returns how much entropy is reduced by the split.
 */
export function informationGain(
  parentEntropy: number,
  children: readonly { entropy: number; weight: number }[],
): number {
  const weightedChildEntropy = children.reduce((acc, c) => acc + c.weight * c.entropy, 0);
  return parentEntropy - weightedChildEntropy;
}

/**
 * Normalized mutual information.
 * NMI = 2 * I(X;Y) / (H(X) + H(Y))
 * Returns value in [0, 1]; 0 if MI is 0 or entropies are 0.
 */
export function normalizedMutualInformation(joint: readonly (readonly number[])[]): number {
  if (joint.length === 0) return 0;
  const cols = joint[0]!.length;

  const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));
  const margY = Array.from({ length: cols }, (_, j) =>
    joint.reduce((acc, row) => acc + (row[j] ?? 0), 0),
  );

  const hx = entropy(margX);
  const hy = entropy(margY);
  const denom = hx + hy;
  if (denom === 0) return 0;

  const mi = mutualInformation(joint);
  if (mi === 0) return 0;

  return (2 * mi) / denom;
}

/**
 * Conditional entropy H(Y|X) = H(X,Y) - H(X).
 * joint is a 2D probability matrix (rows = X values, cols = Y values).
 */
export function conditionalEntropy(joint: readonly (readonly number[])[]): number {
  if (joint.length === 0) return 0;
  const rows = joint.length;
  const cols = joint[0]!.length;

  const flat: number[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      flat.push(joint[i]![j] ?? 0);
    }
  }

  const margX = joint.map((row) => row.reduce((a, b) => a + b, 0));

  return entropy(flat) - entropy(margX);
}

/**
 * Surprisal (information content) of an event with probability p.
 * -log2(p)
 *
 * Returns Infinity for p=0; returns 0 for p=1.
 */
export function surprisal(p: number): number {
  if (p <= 0) return Infinity;
  if (p >= 1) return 0;
  return -safeLog2(p);
}

/**
 * Perplexity: 2^(-mean(log2(p_i))) for a sequence of probabilities.
 * Measures average uncertainty per prediction.
 *
 * probs is a sequence of probabilities (not a distribution — they need not sum to 1).
 * Returns Infinity if any p === 0.
 */
export function perplexity(probs: readonly number[]): number {
  if (probs.length === 0) return 1;
  if (probs.some((p) => p <= 0)) return Infinity;
  const avgLogProb = probs.reduce((acc, p) => acc + safeLog2(p), 0) / probs.length;
  return Math.pow(2, -avgLogProb);
}

/**
 * Brier score: mean squared error between predicted probabilities and binary outcomes.
 * (1/n) * sum((p_i - o_i)^2)
 *
 * Returns 0 for perfect predictions, 0.25 for constant 0.5 predictions.
 * Throws if lengths differ.
 */
export function brier(predicted: readonly number[], outcomes: readonly (0 | 1)[]): number {
  if (predicted.length !== outcomes.length) {
    throw new Error(`brier: arrays must be same length (got ${predicted.length} and ${outcomes.length})`);
  }
  if (predicted.length === 0) return 0;
  const sse = predicted.reduce((acc, p, i) => {
    const diff = p - (outcomes[i] ?? 0);
    return acc + diff * diff;
  }, 0);
  return sse / predicted.length;
}

/**
 * Log loss: -(1/n) * sum(o*log(p) + (1-o)*log(1-p))
 * Clips p to [1e-15, 1-1e-15] to avoid log(0).
 *
 * Returns 0 for perfect predictions.
 * Throws if lengths differ.
 */
export function logLoss(predicted: readonly number[], outcomes: readonly (0 | 1)[]): number {
  if (predicted.length !== outcomes.length) {
    throw new Error(`logLoss: arrays must be same length (got ${predicted.length} and ${outcomes.length})`);
  }
  if (predicted.length === 0) return 0;
  const EPS = 1e-15;
  const sum = predicted.reduce((acc, p, i) => {
    const clipped = Math.max(EPS, Math.min(1 - EPS, p));
    const o = outcomes[i] ?? 0;
    return acc + (o * Math.log(clipped) + (1 - o) * Math.log(1 - clipped));
  }, 0);
  return -sum / predicted.length;
}

/**
 * Expected Calibration Error (ECE).
 * Buckets predictions into `bins` equal-width bins in [0,1].
 * For each bin: |mean_pred - mean_outcome| * (count / total).
 * Sum across all non-empty bins.
 *
 * Returns a value in [0, 1].
 * Throws if lengths differ.
 */
export function calibrationError(
  predicted: readonly number[],
  outcomes: readonly (0 | 1)[],
  bins = 10,
): number {
  if (predicted.length !== outcomes.length) {
    throw new Error(
      `calibrationError: arrays must be same length (got ${predicted.length} and ${outcomes.length})`,
    );
  }
  if (predicted.length === 0) return 0;

  const n = predicted.length;
  const binPreds: number[][] = Array.from({ length: bins }, () => []);
  const binOutcomes: number[][] = Array.from({ length: bins }, () => []);

  for (let i = 0; i < n; i++) {
    const p = predicted[i]!;
    const o = outcomes[i]!;
    const binIdx = Math.min(bins - 1, Math.floor(p * bins));
    binPreds[binIdx]!.push(p);
    binOutcomes[binIdx]!.push(o);
  }

  let ece = 0;
  for (let b = 0; b < bins; b++) {
    const count = binPreds[b]!.length;
    if (count === 0) continue;
    const meanPred = binPreds[b]!.reduce((a, v) => a + v, 0) / count;
    const meanOutcome = binOutcomes[b]!.reduce((a, v) => a + v, 0) / count;
    ece += Math.abs(meanPred - meanOutcome) * (count / n);
  }

  return ece;
}
