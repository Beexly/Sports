
export interface DualLikelihoodCI {
  readonly point: number;
  readonly lower: number;
  readonly upper: number;
  readonly width: number;
}

function invert(A: number[][]): number[][] {
  const n = A.length;
  const m = A.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r]![col]!) > Math.abs(m[piv]![col]!)) piv = r;
    if (Math.abs(m[piv]![col]!) < 1e-12) throw new Error("dual-likelihood-ci: singular design");
    const tmp = m[col]!;
    m[col] = m[piv]!;
    m[piv] = tmp;
    const d = m[col]![col] ?? 1;
    for (let c = 0; c < 2 * n; c++) m[col]![c] = (m[col]![c] ?? 0) / d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = m[r]![col] ?? 0;
      for (let c = 0; c < 2 * n; c++) m[r]![c] = (m[r]![c] ?? 0) - f * (m[col]![c] ?? 0);
    }
  }
  return m.map((row) => row.slice(n));
}

/** OLS of y on Z (with intercept); returns coefficients and RSS. */
function ols(y: readonly number[], Z: readonly (readonly number[])[]): { beta: number[]; rss: number } {
  const n = y.length;
  const p = Z.length === 0 ? 0 : (Z[0]?.length ?? 0);
  const Za: number[][] = Z.map((row) => [1, ...row]);
  const pp = p + 1;
  const AtA: number[][] = Array.from({ length: pp }, () => new Array<number>(pp).fill(0));
  const Aty = new Array<number>(pp).fill(0);
  for (let r = 0; r < n; r++) {
    const row = Za[r] ?? [];
    const yv = y[r] ?? 0;
    for (let a = 0; a < pp; a++) {
      Aty[a] = (Aty[a] ?? 0) + (row[a] ?? 0) * yv;
      for (let b = 0; b < pp; b++) AtA[a]![b] = (AtA[a]![b] ?? 0) + (row[a] ?? 0) * (row[b] ?? 0);
    }
  }
  const beta = invert(AtA).map((row) => row.reduce((s, v, j) => s + v * (Aty[j] ?? 0), 0));
  let rss = 0;
  for (let r = 0; r < n; r++) {
    const row = Za[r] ?? [];
    const fit = row.reduce((s, v, j) => s + v * (beta[j] ?? 0), 0);
    rss += ((y[r] ?? 0) - fit) ** 2;
  }
  return { beta, rss };
}

/**
 * 95% dual-likelihood region for the total causal effect C(i -> j).
 * Via the paper's correspondence the dual-LR statistic equals the classical LR
 * statistic of the modified problem, so the region is
 *   { c : n * log(RSS(c) / RSS_full) <= chi^2_1(1 - alpha) },
 * where RSS(c) profiles out all other coefficients (Frisch-Waugh residualization).
 */
export function dualLikelihoodTotalEffectCI(
  X: ReadonlyArray<readonly number[]>,
  i: number,
  j: number,
  alpha = 0.05,
): DualLikelihoodCI {
  const n = X.length;
  const d = n === 0 ? 0 : (X[0]?.length ?? 0);
  if (n < 4 || d < 2) throw new Error("dual-likelihood-ci: need n>=4, d>=2");
  if (i < 0 || j < 0 || i >= d || j >= d || i === j) throw new Error("dual-likelihood-ci: bad (i,j)");
  const y = X.map((row) => row[j] ?? 0);
  const others = Array.from({ length: d }, (_, c) => c).filter((c) => c !== i && c !== j);
  const Z = X.map((row) => others.map((c) => row[c] ?? 0));
  // Residualize y and x_i on the others (Frisch-Waugh).
  const ry = ols(y, Z);
  const xi = X.map((row) => row[i] ?? 0);
  const rxi = ols(xi, Z);
  const yRes = y.map((yv, r) => {
    const row = Z[r] ?? [];
    return yv - row.reduce((s, v, c) => s + v * (ry.beta[c + 1] ?? 0), ry.beta[0] ?? 0);
  });
  const xRes = xi.map((xv, r) => {
    const row = Z[r] ?? [];
    return xv - row.reduce((s, v, c) => s + v * (rxi.beta[c + 1] ?? 0), rxi.beta[0] ?? 0);
  });
  const sxx = xRes.reduce((s, v) => s + v * v, 0);
  if (sxx < 1e-12) throw new Error("dual-likelihood-ci: treatment has no residual variation");
  const point = xRes.reduce((s, v, r) => s + v * (yRes[r] ?? 0), 0) / sxx;
  const rssFull = yRes.reduce((s, v, r) => s + (v - point * (xRes[r] ?? 0)) ** 2, 0);
  const chi2 = alpha === 0.05 ? 3.841458820694124 : chi2Quantile1(alpha);
  // RSS(c) = RSS_full + sxx * (c - point)^2  (single-regressor profile)
  const half = Math.sqrt((Math.exp(chi2 / n) - 1) * (rssFull / sxx));
  return { point, lower: point - half, upper: point + half, width: 2 * half };
}

/** chi^2_1 quantile via Wilson-Hilferty (used only for non-0.05 alpha). */
function chi2Quantile1(alpha: number): number {
  const z = normalQuantile(1 - alpha);
  const w = 1 - 2 / 9 + z * Math.sqrt(2 / 9);
  return w * w * w;
}

function normalQuantile(p: number): number {
  // Acklam's approximation
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const plow = 0.02425;
  const phigh = 1 - plow;
  let q: number;
  let x: number;
  if (p < plow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  } else if (p <= phigh) {
    q = p - 0.5;
    const r = q * q;
    x = (((((a[0]! * r + a[1]!) * r + a[2]!) * r + a[3]!) * r + a[4]!) * r + a[5]!) * q / (((((b[0]! * r + b[1]!) * r + b[2]!) * r + b[3]!) * r + b[4]!) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0]! * q + c[1]!) * q + c[2]!) * q + c[3]!) * q + c[4]!) * q + c[5]!) / ((((d[0]! * q + d[1]!) * q + d[2]!) * q + d[3]!) * q + 1);
  }
  return x;
}
