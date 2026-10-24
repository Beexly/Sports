/**
 * Shared deterministic math for the Open Source Football (OSF) Stream 12
 * modules. No random number generators, no hidden constants: every
 * published equation is implemented literally and every unpublished
 * constant is a required or explicitly-defaulted argument.
 *
 * Sources: nflverse/open-source-football `_posts/*` (Baldwin, Moffatt,
 * Gordeev, Singer, Brookner, and the guest posts cited per module).
 */

export function clamp(value: number, low: number, high: number): number {
  if (!Number.isFinite(value)) throw new Error("clamp requires a finite value");
  return Math.min(high, Math.max(low, value));
}

export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) throw new Error("mean requires at least one value");
  if (values.some((v) => !Number.isFinite(v))) throw new Error("mean requires finite values");
  let total = 0;
  for (const v of values) total += v;
  return total / values.length;
}

export function weightedMean(values: readonly number[], weights: readonly number[]): number {
  if (values.length === 0 || values.length !== weights.length) {
    throw new Error("weightedMean requires equally-sized non-empty arrays");
  }
  let num = 0;
  let den = 0;
  for (let i = 0; i < values.length; i += 1) {
    const w = weights[i]!;
    if (!Number.isFinite(values[i]!) || !Number.isFinite(w) || w < 0) {
      throw new Error("weightedMean requires finite values and non-negative weights");
    }
    num += values[i]! * w;
    den += w;
  }
  if (den === 0) throw new Error("weightedMean requires a positive total weight");
  return num / den;
}

/** Sample variance (n - 1 denominator). Returns 0 for a single observation. */
export function variance(values: readonly number[]): number {
  if (values.length === 0) throw new Error("variance requires at least one value");
  if (values.length === 1) return 0;
  const m = mean(values);
  let ss = 0;
  for (const v of values) ss += (v - m) ** 2;
  return ss / (values.length - 1);
}

export function sd(values: readonly number[]): number {
  return Math.sqrt(variance(values));
}

export function covariance(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length || a.length < 2) {
    throw new Error("covariance requires equally-sized arrays of length >= 2");
  }
  const ma = mean(a);
  const mb = mean(b);
  let ss = 0;
  for (let i = 0; i < a.length; i += 1) ss += (a[i]! - ma) * (b[i]! - mb);
  return ss / (a.length - 1);
}

export function correlation(a: readonly number[], b: readonly number[]): number {
  const va = variance(a);
  const vb = variance(b);
  if (va === 0 || vb === 0) return 0;
  return covariance(a, b) / Math.sqrt(va * vb);
}

export function sigmoid(z: number): number {
  if (!Number.isFinite(z)) throw new Error("sigmoid requires a finite logit");
  if (z >= 0) {
    const e = Math.exp(-z);
    return 1 / (1 + e);
  }
  const e = Math.exp(z);
  return e / (1 + e);
}

export function logit(p: number): number {
  if (!Number.isFinite(p) || p <= 0 || p >= 1) {
    throw new Error("logit requires a probability strictly between 0 and 1");
  }
  return Math.log(p / (1 - p));
}

/** Standard normal CDF via Abramowitz-Stegun 7.1.26 (absolute error < 1.5e-7). */
export function normalCdf(z: number): number {
  if (!Number.isFinite(z)) throw new Error("normalCdf requires a finite value");
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poly =
    0.254829592 * t -
    0.284496736 * t ** 2 +
    1.421413741 * t ** 3 -
    1.453152027 * t ** 4 +
    1.061405429 * t ** 5;
  const erf = 1 - poly * Math.exp(-x * x);
  return z >= 0 ? 0.5 * (1 + erf) : 0.5 * (1 - erf);
}

/**
 * Exact shifted Gini from Post #4. x'_i = x_i - min(x) + epsilon, then
 * G = sum_i sum_j |x'_i - x'_j| / (2 n^2 mean(x')). The shift makes the
 * index defined for negative EPA observations without changing the
 * relative dispersion ordering.
 */
export function shiftedGini(values: readonly number[], epsilon = 1e-9): number {
  if (values.length === 0) throw new Error("shiftedGini requires at least one value");
  if (values.some((v) => !Number.isFinite(v))) throw new Error("shiftedGini requires finite values");
  if (!Number.isFinite(epsilon) || epsilon <= 0) throw new Error("epsilon must be positive");
  const min = Math.min(...values);
  const shifted = values.map((v) => v - min + epsilon);
  const m = mean(shifted);
  let pairSum = 0;
  for (let i = 0; i < shifted.length; i += 1) {
    for (let j = 0; j < shifted.length; j += 1) {
      pairSum += Math.abs(shifted[i]! - shifted[j]!);
    }
  }
  return pairSum / (2 * shifted.length ** 2 * m);
}

/** Exponentially weighted moving average, newest observation last. */
export function ewmaSeries(values: readonly number[], alpha: number): number[] {
  if (values.length === 0) throw new Error("ewmaSeries requires at least one value");
  if (!(alpha > 0 && alpha <= 1)) throw new Error("alpha must be in (0, 1]");
  const out: number[] = [values[0]!];
  for (let i = 1; i < values.length; i += 1) {
    out.push(alpha * values[i]! + (1 - alpha) * out[i - 1]!);
  }
  return out;
}

export function rollingMean(values: readonly number[], window: number): number[] {
  if (values.length === 0) throw new Error("rollingMean requires at least one value");
  if (!Number.isInteger(window) || window < 1) throw new Error("window must be a positive integer");
  const out: number[] = [];
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - window + 1);
    out.push(mean(values.slice(start, i + 1)));
  }
  return out;
}

export function quantile(values: readonly number[], q: number): number {
  if (values.length === 0) throw new Error("quantile requires at least one value");
  if (!(q >= 0 && q <= 1)) throw new Error("q must be in [0, 1]");
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

export function dot(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error("dot requires equally-sized vectors");
  let total = 0;
  for (let i = 0; i < a.length; i += 1) total += a[i]! * b[i]!;
  return total;
}

export function matVec(matrix: readonly (readonly number[])[], vector: readonly number[]): number[] {
  if (matrix.length !== vector.length) throw new Error("matVec dimension mismatch");
  return matrix.map((row) => dot(row, vector));
}

/** Gaussian elimination with partial pivoting. Solves A x = b. */
export function solveLinearSystem(A: readonly (readonly number[])[], b: readonly number[]): number[] {
  const n = A.length;
  if (n === 0 || b.length !== n || A.some((row) => row.length !== n)) {
    throw new Error("solveLinearSystem requires a square non-empty matrix");
  }
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < n; row += 1) {
      if (Math.abs(M[row]![col]!) > Math.abs(M[pivot]![col]!)) pivot = row;
    }
    if (Math.abs(M[pivot]![col]!) < 1e-12) throw new Error("matrix is singular");
    if (pivot !== col) {
      const tmp = M[pivot]!;
      M[pivot] = M[col]!;
      M[col] = tmp;
    }
    const pivotValue = M[col]![col]!;
    for (let row = col + 1; row < n; row += 1) {
      const factor = M[row]![col]! / pivotValue;
      for (let k = col; k <= n; k += 1) M[row]![k] = M[row]![k]! - factor * M[col]![k]!;
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = M[row]![n]!;
    for (let col = row + 1; col < n; col += 1) sum -= M[row]![col]! * x[col]!;
    x[row] = sum / M[row]![row]!;
  }
  return x;
}

export function invertMatrix(A: readonly (readonly number[])[]): number[][] {
  const n = A.length;
  if (n === 0 || A.some((row) => row.length !== n)) throw new Error("invertMatrix requires a square matrix");
  const columns: number[][] = [];
  for (let col = 0; col < n; col += 1) {
    const unit = new Array<number>(n).fill(0);
    unit[col] = 1;
    columns.push(solveLinearSystem(A, unit));
  }
  return Array.from({ length: n }, (_, row) => columns.map((column) => column[row]!));
}

/** VIF_j = 1 / (1 - R_j^2), read from the diagonal of the inverted correlation matrix. */
export function varianceInflationFactors(columns: readonly (readonly number[])[]): number[] {
  const k = columns.length;
  if (k === 0) throw new Error("varianceInflationFactors requires at least one column");
  const n = columns[0]!.length;
  if (columns.some((c) => c.length !== n) || n < 2) {
    throw new Error("varianceInflationFactors requires equally-sized columns of length >= 2");
  }
  const corr: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  for (let i = 0; i < k; i += 1) {
    for (let j = 0; j < k; j += 1) {
      corr[i]![j] = i === j ? 1 : correlation(columns[i]!, columns[j]!);
    }
  }
  const inv = invertMatrix(corr);
  return inv.map((row, i) => row[i]!);
}

/**
 * Equal-correlation redundancy shrinkage. Under the conservative
 * assumption that m member signals share average absolute correlation
 * rho, VIF = 1 + (m - 1) * rho and the shrinkage weight is 1 / sqrt(VIF).
 * rho defaults to 0.5, the midpoint used when member correlations are
 * not estimated. Documented rather than hidden.
 */
export function equalCorrelationShrinkFactor(memberCount: number, rho = 0.5): number {
  if (!Number.isInteger(memberCount) || memberCount < 1) {
    throw new Error("memberCount must be a positive integer");
  }
  if (!(rho >= 0 && rho < 1)) throw new Error("rho must be in [0, 1)");
  return 1 / Math.sqrt(1 + (memberCount - 1) * rho);
}

export function gaussianKernel2d(
  x: number,
  y: number,
  meanX: number,
  meanY: number,
  bandwidthX: number,
  bandwidthY: number,
  rho = 0,
): number {
  if (bandwidthX <= 0 || bandwidthY <= 0) throw new Error("bandwidths must be positive");
  const dx = (x - meanX) / bandwidthX;
  const dy = (y - meanY) / bandwidthY;
  const oneMinus = 1 - rho * rho;
  const exponent = -(dx * dx - 2 * rho * dx * dy + dy * dy) / (2 * oneMinus);
  return Math.exp(exponent) / (2 * Math.PI * bandwidthX * bandwidthY * Math.sqrt(oneMinus));
}

/** Silverman bandwidth for a univariate sample. */
export function silvermanBandwidth(values: readonly number[]): number {
  if (values.length < 2) return 1;
  const s = sd(values);
  const iqr = quantile(values, 0.75) - quantile(values, 0.25);
  const spread = Math.min(s, iqr / 1.349 || s);
  return Math.max(1e-6, 0.9 * spread * values.length ** (-0.2));
}
