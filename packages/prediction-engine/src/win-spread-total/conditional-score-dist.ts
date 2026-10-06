/**
 * Conditional score distribution via kernel-weighted empirical CDF.
 *
 * Given historical (context, margin) pairs, estimate the conditional CDF
 * P(margin <= k | context) with Nadaraya-Watson-style kernel weights:
 *
 *   w_i = exp(-0.5 * (d_i / h)^2),  F(k | x) = sum_{i: m_i <= k} w_i / sum w_i
 *
 * where d_i is the context distance and h the bandwidth (Silverman's rule on
 * the distances by default). Quantiles invert the CDF by bisection. A
 * zero-bandwidth/degenerate context falls back to the unweighted empirical CDF.
 *
 * Pure TypeScript, no I/O.
 *
 * Reference: arXiv:2608.07168v1 — Conditional Score Distributions for Sports
 * Betting Markets.
 *
 * ACCEPTANCE GATE: conditional quantiles beat the unconditional baseline on CRPS.
 */

export interface ScoredGame {
  /** Context vector (e.g., [spreadDiff, totalDiff]). */
  readonly context: readonly number[];
  /** Realized margin (home - away). */
  readonly margin: number;
}

function ctxDist(a: readonly number[], b: readonly number[]): number {
  if (a.length !== b.length) throw new Error("conditional-score-dist: context dims must align");
  let s = 0;
  for (let i = 0; i < a.length; i++) s += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
  return Math.sqrt(s);
}

/** Silverman bandwidth on the context distances. */
export function silvermanBandwidth(distances: readonly number[]): number {
  const n = distances.length;
  if (n < 2) return 1;
  const mean = distances.reduce((s, d) => s + d, 0) / n;
  const sd = Math.sqrt(distances.reduce((s, d) => s + (d - mean) ** 2, 0) / (n - 1));
  if (sd < 1e-12) return 0; // degenerate: all contexts identical
  return 1.06 * sd * Math.pow(n, -0.2);
}

/** Kernel weights of each historical game for a query context. */
export function kernelWeights(
  games: readonly ScoredGame[],
  query: readonly number[],
  bandwidth?: number,
): number[] {
  if (games.length === 0) throw new Error("conditional-score-dist: need >= 1 game");
  const ds = games.map((g) => ctxDist(g.context, query));
  const h = bandwidth ?? silvermanBandwidth(ds);
  if (!(h >= 0)) throw new Error("conditional-score-dist: bandwidth must be >= 0");
  if (h < 1e-12) return games.map(() => 1); // degenerate -> unweighted
  return ds.map((d) => Math.exp(-0.5 * (d / h) ** 2));
}

/** Conditional CDF P(margin <= k | query) via kernel-weighted empirical CDF. */
export function conditionalCdf(
  games: readonly ScoredGame[],
  query: readonly number[],
  k: number,
  bandwidth?: number,
): number {
  const w = kernelWeights(games, query, bandwidth);
  let num = 0;
  let den = 0;
  for (let i = 0; i < games.length; i++) {
    const wi = w[i] ?? 0;
    den += wi;
    if ((games[i]?.margin ?? Infinity) <= k) num += wi;
  }
  if (den < 1e-12) throw new Error("conditional-score-dist: zero total weight");
  return num / den;
}

/** Conditional quantile: smallest k with CDF >= q (bisection on integers). */
export function conditionalQuantile(
  games: readonly ScoredGame[],
  query: readonly number[],
  q: number,
  bandwidth?: number,
): number {
  if (!(q > 0 && q < 1)) throw new Error("conditional-score-dist: q in (0,1) required");
  const margins = games.map((g) => g.margin);
  let lo = Math.min(...margins) - 1;
  let hi = Math.max(...margins) + 1;
  for (let it = 0; it < 100; it++) {
    const mid = Math.floor((lo + hi) / 2);
    if (conditionalCdf(games, query, mid, bandwidth) < q) lo = mid + 1;
    else hi = mid;
    if (lo >= hi) break;
  }
  return lo;
}

/** Unconditional empirical quantile (baseline for the gate). */
export function unconditionalQuantile(margins: readonly number[], q: number): number {
  if (margins.length === 0) throw new Error("conditional-score-dist: need >= 1 margin");
  if (!(q > 0 && q < 1)) throw new Error("conditional-score-dist: q in (0,1) required");
  const s = [...margins].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? 0;
}
