/**
 * TabSyn synthetic-season backbone: quantile transform + column tokenizer config
 *
 * Research port: arXiv:2310.09656
 * Normalized lane: synthetic_data | Doctrine: INFRA
 *
 * Recommended primary synthetic-season backbone: quantile-transform skewed numerics (pure rank-based transform), column tokenizer config (d=4 embeddings per column incl. the team column), and the column-density-error comparison helper used by the adoption gate.
 *
 * ACCEPTANCE GATE: ADOPT as the production synthetic-season backbone only if (a) its column-density error is <= 50% of TabDDPM's on the NFL table AND (b) real+synthetic GBDT log-loss beats real-only. Live-data gate -> GSE_TABSYN_ENABLED flag (default false).
 */

export interface TabSynConfig {
  /** embedding width per column in the tokenizer */
  tokenDim: 4;
  skewedNumericColumns: string[];
  categoricalColumns: string[];
  teamColumn: "team";
}

export const TABSYN_DEFAULT_CONFIG: TabSynConfig = {
  tokenDim: 4,
  skewedNumericColumns: ["points_for", "points_against", "elo_diff"],
  categoricalColumns: ["team", "opponent", "venue_type", "surface", "weather_bin", "rest_category"],
  teamColumn: "team",
};

/**
 * Rank-based quantile transform to a standard normal (pure, deterministic).
 * Maps each value to Phi^{-1}((rank - 0.5) / n).
 */
export function quantileTransform(values: number[]): number[] {
  const n = values.length;
  if (n === 0) return [];
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const out = new Array<number>(n);
  for (let r = 0; r < n; r++) {
    const o = order[r];
    if (o === undefined) continue;
    const p = (r + 0.5) / n;
    out[o.i] = inverseNormalCdf(p);
  }
  return out;
}

/** Acklam's approximation of the standard normal quantile function. */
export function inverseNormalCdf(p: number): number {
  const pc = Math.min(1 - 1e-12, Math.max(1e-12, p));
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239] as const;
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1] as const;
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783] as const;
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416] as const;
  const plow = 0.02425, phigh = 1 - plow;
  let q: number, r: number;
  if (pc < plow) {
    q = Math.sqrt(-2 * Math.log(pc));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (pc > phigh) {
    q = Math.sqrt(-2 * Math.log(1 - pc));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  q = pc - 0.5;
  r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Column-density error: mean absolute CDF gap on a numeric column (0 = identical). */
export function columnDensityError(real: number[], synthetic: number[]): number {
  if (real.length === 0 || synthetic.length === 0) return 1;
  const rs = [...real].sort((a, b) => a - b);
  const ecdf = (xs: number[], x: number): number => xs.filter((v) => v <= x).length / xs.length;
  const grid = [...new Set([...rs, ...synthetic])].sort((a, b) => a - b);
  return grid.reduce((acc, x) => acc + Math.abs(ecdf(rs, x) - ecdf(synthetic, x)), 0) / grid.length;
}

/** Gate helper: TabSyn error must be <= 50% of TabDDPM's. */
export function tabsynGatePasses(tabsynError: number, tabddpmError: number): boolean {
  return tabddpmError > 0 && tabsynError <= 0.5 * tabddpmError;
}

/** Live-data gate: density + log-loss comparisons must clear on the NFL table first. */
export const GSE_TABSYN_ENABLED = false;

