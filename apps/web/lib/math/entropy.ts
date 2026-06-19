/**
 * Information-theory utilities — pure math, zero dependencies.
 *
 * Shannon entropy, KL divergence, mutual information, cross-entropy,
 * and Brier decomposition. Used for calibration analysis and model evaluation.
 *
 * All probability inputs are expected in [0,1]; functions handle edge cases
 * (zeros, ones, near-zero) without throwing.
 */

const LOG2 = Math.log(2);

/** Natural log with protection against log(0) = -Infinity. */
function safeLn(p: number): number {
  if (p <= 0) return 0; // convention: 0 * ln(0) = 0 in entropy
  return Math.log(p);
}

function safeLog2(p: number): number {
  return safeLn(p) / LOG2;
}

/**
 * Shannon entropy of a probability distribution (in bits).
 * H(P) = -sum(p_i * log2(p_i))
 * Max entropy for n outcomes = log2(n).
 *
 * @param probs Array of probabilities (need not sum to exactly 1, but should be ≥ 0).
 */
export function shannonEntropy(probs: readonly number[]): number {
  return -probs.reduce((acc, p) => acc + p * safeLog2(p), 0);
}

/**
 * Shannon entropy in nats (natural log base).
 */
export function shannonEntropyNats(probs: readonly number[]): number {
  return -probs.reduce((acc, p) => acc + p * safeLn(p), 0);
}

/**
 * Binary entropy function h(p) = -p*log2(p) - (1-p)*log2(1-p).
 * Returns 0 at p=0 or p=1, maximum 1 bit at p=0.5.
 */
export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -(p * safeLog2(p) + (1 - p) * safeLog2(1 - p));
}

/**
 * KL divergence (relative entropy) from P to Q (in bits).
 * KL(P||Q) = sum(p_i * log2(p_i / q_i))
 * Returns Infinity if Q has a zero where P is non-zero (undefined).
 * Returns 0 if P is empty.
 */
export function klDivergence(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) return Infinity;
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
 * Symmetric KL divergence: (KL(P||Q) + KL(Q||P)) / 2.
 * Also called Jensen-Shannon divergence when using the average.
 */
export function symmetricKl(p: readonly number[], q: readonly number[]): number {
  const kl1 = klDivergence(p, q);
  const kl2 = klDivergence(q, p);
  if (!isFinite(kl1) || !isFinite(kl2)) return Infinity;
  return (kl1 + kl2) / 2;
}

/**
 * Jensen-Shannon divergence (in bits). Always finite, bounded [0, 1].
 * JSD(P||Q) = (KL(P||M) + KL(Q||M)) / 2, where M = (P+Q)/2.
 */
export function jensenShannonDivergence(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) return NaN;
  const m = p.map((pi, i) => (pi + (q[i] ?? 0)) / 2);
  const kl1 = klDivergence(p, m);
  const kl2 = klDivergence(q, m);
  if (!isFinite(kl1) || !isFinite(kl2)) return NaN;
  return (kl1 + kl2) / 2;
}

/**
 * Cross-entropy H(P, Q) = -sum(p_i * log2(q_i)).
 * Equals H(P) + KL(P||Q).
 * Measures how many bits are needed to encode P using Q.
 */
export function crossEntropy(p: readonly number[], q: readonly number[]): number {
  if (p.length !== q.length) return Infinity;
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
 * Log loss (binary cross-entropy) for a single prediction.
 * logLoss(1, 0.8) = -log2(0.8) ≈ 0.322 bits
 * logLoss(0, 0.8) = -log2(0.2) ≈ 2.322 bits
 *
 * @param actual  Binary outcome: 1 = occurred, 0 = did not
 * @param predicted Predicted probability [0,1]
 */
export function logLoss(actual: 0 | 1, predicted: number): number {
  const p = Math.max(1e-15, Math.min(1 - 1e-15, predicted));
  return actual === 1 ? -safeLog2(p) : -safeLog2(1 - p);
}

/**
 * Mean log loss over an array of (actual, predicted) pairs.
 */
export function meanLogLoss(outcomes: ReadonlyArray<{ actual: 0 | 1; predicted: number }>): number | null {
  if (outcomes.length === 0) return null;
  const total = outcomes.reduce((acc, { actual, predicted }) => acc + logLoss(actual, predicted), 0);
  return total / outcomes.length;
}

/**
 * Brier score: mean squared error of probability forecasts.
 * brierScore = (1/n) * sum((p_i - o_i)^2)
 * Range [0, 1]; 0 = perfect, 0.25 = random, 1 = perfectly wrong.
 */
export function brierScore(outcomes: ReadonlyArray<{ actual: 0 | 1; predicted: number }>): number | null {
  if (outcomes.length === 0) return null;
  const sse = outcomes.reduce((acc, { actual, predicted }) => {
    const diff = predicted - actual;
    return acc + diff * diff;
  }, 0);
  return sse / outcomes.length;
}

/**
 * Brier decomposition: resolution, reliability, uncertainty.
 * Brier = Reliability - Resolution + Uncertainty
 * - Reliability (calibration): lower is better (0 = perfect)
 * - Resolution: higher is better (forecasts differ from mean)
 * - Uncertainty: base rate entropy; not under forecaster control
 *
 * Uses n equal-width bins (default 10).
 */
export interface BrierDecomposition {
  readonly brier: number;
  readonly reliability: number; // calibration error
  readonly resolution: number;  // skill above climatology
  readonly uncertainty: number; // base rate variability
  readonly bins: ReadonlyArray<{
    readonly lower: number;
    readonly upper: number;
    readonly n: number;
    readonly meanForecast: number;
    readonly meanOutcome: number;
  }>;
}

export function brierDecompose(
  outcomes: ReadonlyArray<{ actual: 0 | 1; predicted: number }>,
  nBins = 10,
): BrierDecomposition | null {
  if (outcomes.length === 0) return null;
  const n = outcomes.length;
  const climatology = outcomes.reduce((acc, { actual }) => acc + actual, 0) / n;

  interface Bin {
    forecasts: number[];
    actuals: number[];
    lower: number;
    upper: number;
  }

  const bins: Bin[] = Array.from({ length: nBins }, (_, i) => ({
    forecasts: [],
    actuals: [],
    lower: i / nBins,
    upper: (i + 1) / nBins,
  }));

  for (const { actual, predicted } of outcomes) {
    const idx = Math.min(nBins - 1, Math.floor(predicted * nBins));
    const bin = bins[idx]!;
    bin.forecasts.push(predicted);
    bin.actuals.push(actual);
  }

  let reliability = 0;
  let resolution = 0;

  const binSummary = bins.map((bin) => {
    const k = bin.forecasts.length;
    if (k === 0) return { lower: bin.lower, upper: bin.upper, n: 0, meanForecast: 0, meanOutcome: 0 };
    const meanForecast = bin.forecasts.reduce((a, b) => a + b, 0) / k;
    const meanOutcome = bin.actuals.reduce((a, b) => a + b, 0) / k;
    reliability += (k / n) * Math.pow(meanForecast - meanOutcome, 2);
    resolution += (k / n) * Math.pow(meanOutcome - climatology, 2);
    return { lower: bin.lower, upper: bin.upper, n: k, meanForecast, meanOutcome };
  });

  const uncertainty = climatology * (1 - climatology);
  const brier = reliability - resolution + uncertainty;

  return { brier, reliability, resolution, uncertainty, bins: binSummary };
}

/**
 * Mutual information I(X;Y) in bits.
 * Measures how much knowing X reduces uncertainty about Y.
 * jointProbs: 2D matrix of joint probabilities p(x_i, y_j).
 */
export function mutualInformation(jointProbs: readonly (readonly number[])[]): number {
  const rows = jointProbs.length;
  if (rows === 0) return 0;
  const cols = jointProbs[0]!.length;

  // Marginal probabilities
  const margX = jointProbs.map((row) => row.reduce((a, b) => a + b, 0));
  const margY = Array.from({ length: cols }, (_, j) =>
    jointProbs.reduce((acc, row) => acc + (row[j] ?? 0), 0),
  );

  let mi = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const pxy = jointProbs[i]![j] ?? 0;
      if (pxy <= 0) continue;
      const px = margX[i] ?? 0;
      const py = margY[j] ?? 0;
      if (px <= 0 || py <= 0) continue;
      mi += pxy * safeLog2(pxy / (px * py));
    }
  }
  return mi;
}

/**
 * Normalized entropy: H(P) / log2(n).
 * Returns values in [0,1] regardless of the number of outcomes.
 * Returns 0 for a single-outcome distribution.
 */
export function normalizedEntropy(probs: readonly number[]): number {
  if (probs.length <= 1) return 0;
  const maxH = safeLog2(probs.length);
  if (maxH === 0) return 0;
  return shannonEntropy(probs) / maxH;
}

/**
 * Perplexity: 2^H(P). Measures the effective number of equally-likely outcomes.
 * perplexity([0.5, 0.5]) = 2, perplexity([1, 0]) = 1
 */
export function perplexity(probs: readonly number[]): number {
  return Math.pow(2, shannonEntropy(probs));
}
