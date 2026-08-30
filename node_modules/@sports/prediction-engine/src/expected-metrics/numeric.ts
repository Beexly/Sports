/**
 * Numeric primitives for the expected-metrics engine — pure, deterministic,
 * zero-dependency.
 *
 * Computing our OWN expected-value metrics (expected completion probability,
 * expected rush yards, expected YAC) from public play-by-play requires a small,
 * self-contained linear-algebra + statistics kernel: feature standardization, a
 * dense linear-system solver (for the ridge-regression normal equations), a
 * numerically-stable sigmoid, and the correlation statistics that validate our
 * metrics against Next Gen Stats ground truth.
 *
 * Nothing here fetches, caches, or mutates shared state. Every function is a
 * deterministic map from inputs to outputs, matching the prediction-engine house
 * contract (pure math, zero deps, sibling unit tests, round-trippable).
 */

/** Mean/standard-deviation per feature column, learned from a training matrix. */
export interface FeatureScaler {
  readonly means: readonly number[];
  readonly stds: readonly number[];
}

/** Arithmetic mean. Returns 0 for an empty input (documented, not thrown). */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) return 0;
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/** Sample variance (n − 1 denominator). Returns 0 for fewer than 2 points. */
export function variance(xs: readonly number[], precomputedMean?: number): number {
  if (xs.length < 2) return 0;
  const m = precomputedMean ?? mean(xs);
  let acc = 0;
  for (const x of xs) acc += (x - m) ** 2;
  return acc / (xs.length - 1);
}

/** Sample standard deviation. */
export function stddev(xs: readonly number[], precomputedMean?: number): number {
  return Math.sqrt(variance(xs, precomputedMean));
}

/**
 * Learn a per-column {mean, std} scaler from a design matrix (rows of equal
 * length). A column with zero variance gets std = 1 so scaling is a no-op (its
 * standardized value becomes 0 for every row), never a divide-by-zero.
 */
export function fitScaler(rows: ReadonlyArray<readonly number[]>): FeatureScaler {
  if (rows.length === 0) return { means: [], stds: [] };
  const width = rows[0]?.length ?? 0;
  const means: number[] = new Array(width).fill(0);
  const stds: number[] = new Array(width).fill(1);
  for (let c = 0; c < width; c++) {
    const col: number[] = [];
    for (const row of rows) col.push(row[c] ?? 0);
    const m = mean(col);
    const s = stddev(col, m);
    means[c] = m;
    stds[c] = s > 1e-12 ? s : 1;
  }
  return { means, stds };
}

/** Standardize one raw feature row with a fitted scaler: (x − mean) / std. */
export function applyScaler(scaler: FeatureScaler, row: readonly number[]): number[] {
  const out: number[] = [];
  for (let c = 0; c < row.length; c++) {
    const m = scaler.means[c] ?? 0;
    const s = scaler.stds[c] ?? 1;
    out.push(((row[c] ?? 0) - m) / s);
  }
  return out;
}

/**
 * Solve the dense linear system A·x = b by Gaussian elimination with partial
 * pivoting. `a` is an n×n matrix (row-major), `b` a length-n vector. Returns the
 * solution vector, or null if the system is singular (a zero pivot survives
 * pivoting). Mutates copies only.
 */
export function solveLinearSystem(
  a: ReadonlyArray<readonly number[]>,
  b: readonly number[],
): number[] | null {
  const n = b.length;
  if (n === 0) return [];
  if (a.length !== n) return null;
  // Work on mutable copies (augmented matrix).
  const m: number[][] = a.map((row, i) => [...row, b[i] ?? 0]);

  for (let col = 0; col < n; col++) {
    // Partial pivot: largest-magnitude entry in this column at/below the diagonal.
    let pivotRow = col;
    let pivotMag = Math.abs(m[col]?.[col] ?? 0);
    for (let r = col + 1; r < n; r++) {
      const mag = Math.abs(m[r]?.[col] ?? 0);
      if (mag > pivotMag) {
        pivotMag = mag;
        pivotRow = r;
      }
    }
    if (pivotMag < 1e-12) return null; // singular
    if (pivotRow !== col) {
      const tmp = m[col]!;
      m[col] = m[pivotRow]!;
      m[pivotRow] = tmp;
    }
    const pivot = m[col]!;
    const pivotVal = pivot[col] ?? 0;
    // Eliminate below.
    for (let r = col + 1; r < n; r++) {
      const target = m[r]!;
      const factor = (target[col] ?? 0) / pivotVal;
      if (factor === 0) continue;
      for (let c = col; c <= n; c++) {
        target[c] = (target[c] ?? 0) - factor * (pivot[c] ?? 0);
      }
    }
  }

  // Back-substitution.
  const x: number[] = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    const r = m[row]!;
    let acc = r[n] ?? 0;
    for (let c = row + 1; c < n; c++) acc -= (r[c] ?? 0) * (x[c] ?? 0);
    const diag = r[row] ?? 0;
    if (Math.abs(diag) < 1e-12) return null;
    x[row] = acc / diag;
  }
  return x;
}

/** Numerically-stable logistic sigmoid σ(z) = 1 / (1 + e^−z). */
export function sigmoid(z: number): number {
  if (z >= 0) return 1 / (1 + Math.exp(-z));
  const e = Math.exp(z);
  return e / (1 + e);
}

/**
 * Pearson product-moment correlation between two equal-length series. Returns 0
 * when either series has zero variance or fewer than 2 paired points (no linear
 * relationship is estimable — reported honestly as 0, never NaN).
 */
export function pearson(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const mx = mean(xs.slice(0, n));
  const my = mean(ys.slice(0, n));
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - mx;
    const dy = (ys[i] ?? 0) - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  const denom = Math.sqrt(sxx * syy);
  if (denom < 1e-12) return 0;
  return sxy / denom;
}

/**
 * Fractional ranks (1-based) with average-rank tie handling — the standard
 * transform underlying Spearman correlation.
 */
export function rankAverage(xs: readonly number[]): number[] {
  const indexed = xs.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);
  const ranks: number[] = new Array(xs.length).fill(0);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    while (j + 1 < indexed.length && (indexed[j + 1]?.value ?? 0) === (indexed[i]?.value ?? 0)) j++;
    // Ranks i..j are tied; assign their average (1-based).
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) {
      const idx = indexed[k]?.index ?? 0;
      ranks[idx] = avgRank;
    }
    i = j + 1;
  }
  return ranks;
}

/** Spearman rank correlation: Pearson correlation of average ranks. */
export function spearman(xs: readonly number[], ys: readonly number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  return pearson(rankAverage(xs.slice(0, n)), rankAverage(ys.slice(0, n)));
}

/** Root-mean-square error between predictions and actuals. */
export function rmse(pred: readonly number[], actual: readonly number[]): number {
  const n = Math.min(pred.length, actual.length);
  if (n === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += ((pred[i] ?? 0) - (actual[i] ?? 0)) ** 2;
  return Math.sqrt(acc / n);
}

/** Mean absolute error between predictions and actuals. */
export function mae(pred: readonly number[], actual: readonly number[]): number {
  const n = Math.min(pred.length, actual.length);
  if (n === 0) return 0;
  let acc = 0;
  for (let i = 0; i < n; i++) acc += Math.abs((pred[i] ?? 0) - (actual[i] ?? 0));
  return acc / n;
}

/** Round to a fixed number of decimals (deterministic, avoids FP noise in output). */
export function round(value: number, decimals = 4): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
