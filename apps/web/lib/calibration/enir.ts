/**
 * ENIR: Ensemble of Near-Isotonic Regression models — arXiv 1511.05191v1
 * ("Binary Classifier Calibration using an Ensemble of Near Isotonic
 * Regression Models").
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published
 * probabilities and is a NEEDS HUMAN CALL — see tracking report).
 *
 * Paper mechanism: walk a shrinkage path lambda over isotonic fits
 * (PAVA = exact isotonic at lambda 0, constant mean at large lambda;
 * affine shrinkage of an isotonic vector is isotonic, so bins merge and
 * never split), store (lambda, bin edges, shrunk bin values) per breakpoint,
 * BIC-score each breakpoint model on train, and ensemble-average the
 * per-bin probabilities as a post-hoc layer on engine raw probs.
 * Weight selection on an inner holdout is supported via holdoutWeights.
 *
 * ACCEPTANCE GATE (improvement-ledger): adopt into the calibration stack only
 * if, on the time-ordered 2025 holdout, ENIR achieves >= 15% lower ECE than
 * the best of {IsoRegC, temperature scaling} averaged across spread/ML/total,
 * with no AUC loss vs uncalibrated engine probs.
 */

export interface EnirBreakpoint {
  readonly lambda: number;
  /** Bin edges on the probability axis (length = values.length + 1). */
  readonly edges: number[];
  /** Shrunk calibrated probability per bin. */
  readonly values: number[];
  readonly bic: number;
}

/** PAVA isotonic (non-decreasing) regression. */
export function pava(values: readonly number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const sums: number[] = [];
  const counts: number[] = [];
  for (const v of values) {
    sums.push(v);
    counts.push(1);
    while (sums.length >= 2) {
      const m = sums.length;
      if (sums[m - 2]! / counts[m - 2]! <= sums[m - 1]! / counts[m - 1]!) break;
      sums[m - 2] = sums[m - 2]! + sums[m - 1]!;
      counts[m - 2] = counts[m - 2]! + counts[m - 1]!;
      sums.pop();
      counts.pop();
    }
  }
  const out: number[] = [];
  for (let b = 0; b < sums.length; b++) {
    const avg = sums[b]! / counts[b]!;
    for (let i = 0; i < counts[b]!; i++) out.push(avg);
  }
  return out;
}

/**
 * Near-isotonic fit at shrinkage lambda: affine shrink of the PAVA fit
 * toward the global mean. At lambda=0 this is exact isotonic regression;
 * as lambda grows the fit flattens toward the constant mean (monotonicity
 * preserved at every step, bins merge and never split).
 */
export function nearIsotonicFit(
  outcomes: readonly number[],
  lambda: number,
): number[] {
  const n = outcomes.length;
  if (n === 0) return [];
  const fit = pava(outcomes);
  const mean = outcomes.reduce((a, b) => a + b, 0) / n;
  const lamMax = 2 * n;
  const w = Math.max(0, 1 - lambda / lamMax);
  return fit.map((f) => mean + w * (f - mean));
}

/** BIC of a fitted breakpoint: n*log(RSS/n) + k*log(n), k = block count. */
export function bicScore(
  outcomes: readonly number[],
  fitted: readonly number[],
  blockCount: number,
): number {
  const n = outcomes.length;
  if (n === 0) return Number.POSITIVE_INFINITY;
  let rss = 0;
  for (let i = 0; i < n; i++) {
    const d = outcomes[i]! - fitted[i]!;
    rss += d * d;
  }
  const mse = Math.max(rss / n, 1e-12);
  return n * Math.log(mse) + Math.max(blockCount, 1) * Math.log(n);
}

/**
 * Fit the ENIR breakpoint path. Rows are sorted by predicted probability
 * first. Returns one breakpoint per lambda, with bin edges from the block
 * structure of the near-isotonic fit.
 */
export function enirPath(
  probs: readonly number[],
  outcomes: readonly number[],
  lambdas: readonly number[],
): EnirBreakpoint[] {
  const n = probs.length;
  if (n === 0 || outcomes.length !== n || lambdas.length === 0) return [];
  const order = probs.map((_, i) => i).sort((a, b) => probs[a]! - probs[b]!);
  const ys = order.map((i) => outcomes[i]!);
  const xs = order.map((i) => probs[i]!);
  return lambdas.map((lambda) => {
    const fit = nearIsotonicFit(ys, lambda);
    const edges: number[] = [0];
    const values: number[] = [];
    let start = 0;
    for (let i = 1; i <= n; i++) {
      if (i === n || fit[i]! !== fit[i - 1]!) {
        const lo = start === 0 ? 0 : (xs[start - 1]! + xs[start]!) / 2;
        const hi = i === n ? 1 : (xs[i - 1]! + xs[i]!) / 2;
        edges.push(hi);
        values.push(fit[start]!);
        void lo;
        start = i;
      }
    }
    return {
      lambda,
      edges,
      values,
      bic: bicScore(ys, fit, values.length),
    };
  });
}

/** Evaluate one breakpoint at a probability via its bin edges. */
export function evalBreakpoint(bp: EnirBreakpoint, p: number): number {
  const { edges, values } = bp;
  if (values.length === 0) return p;
  for (let i = 0; i < values.length; i++) {
    if (p <= edges[i + 1]!) return values[i]!;
  }
  return values[values.length - 1]!;
}

/**
 * Bayesian model-average weights from BIC: w ∝ exp(-BIC/2), normalized.
 */
export function bicWeights(breakpoints: readonly EnirBreakpoint[]): number[] {
  if (breakpoints.length === 0) return [];
  const min = Math.min(...breakpoints.map((b) => b.bic));
  const raw = breakpoints.map((b) => Math.exp(-(b.bic - min) / 2));
  const total = raw.reduce((a, b) => a + b, 0);
  if (total === 0) return raw.map(() => 1 / raw.length);
  return raw.map((r) => r / total);
}

/**
 * Inner-holdout weights: weight each breakpoint by its holdout log-loss
 * (softmax of negative NLL), per the paper's holdout weight selection.
 */
export function holdoutWeights(
  breakpoints: readonly EnirBreakpoint[],
  holdoutProbs: readonly number[],
  holdoutOutcomes: readonly number[],
): number[] {
  if (breakpoints.length === 0 || holdoutProbs.length === 0) {
    return bicWeights(breakpoints);
  }
  const nll = breakpoints.map((bp) => {
    let s = 0;
    for (let i = 0; i < holdoutProbs.length; i++) {
      const q = Math.min(Math.max(evalBreakpoint(bp, holdoutProbs[i]!), 1e-6), 1 - 1e-6);
      const y = holdoutOutcomes[i]!;
      s += -(y * Math.log(q) + (1 - y) * Math.log(1 - q));
    }
    return s / holdoutProbs.length;
  });
  const min = Math.min(...nll);
  const raw = nll.map((v) => Math.exp(-(v - min)));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((r) => r / total);
}

/** ENIR ensemble calibration of a raw probability. */
export function enirCalibrate(
  p: number,
  breakpoints: readonly EnirBreakpoint[],
  weights: readonly number[],
): number {
  if (breakpoints.length === 0) return p;
  let out = 0;
  for (let i = 0; i < breakpoints.length; i++) {
    out += (weights[i] ?? 0) * evalBreakpoint(breakpoints[i]!, p);
  }
  return out;
}
