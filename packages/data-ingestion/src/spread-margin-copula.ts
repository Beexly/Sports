/**
 * Statistical models for short and long term forecasts of snow depth
 *
 * arXiv:1901.04695 · lane:weather · owner:Mimo
 *
 * Improvement (IMPROVEMENT-LEDGER.jsonl):
 * Build weather/snow_depth.py: fit the paper's zero-inflated gamma model (equations 1-9, variance
 * model 7) per cold-weather stadium using METAR/NOAA T/R/D climatology (beta_0 free per stadium),
 * Monte-Carlo tracking over 5-day HRRR/GEFS T/R forecasts to kickoff. Output: P(snow depth >
 * thresholds: 0, 2, 5, 10 cm) at kickoff + expected depth; feed into the totals engine as a snow-
 * game interaction feature alongside 1581's precip post-processor. This fills a genuine hole: no
 * existing engine component models snow depth on the field -- snow games (Buffalo, Green Bay,
 * Foxboro, Chicago, Baltimore) are exactly where public totals and props misprice, since the
 * market's weather adjustment is qualitative ('snow game'); a calibrated probabilistic snow-depth
 * model at kickoff, derived from forecast T/R through a physics-structured gamma model, gives GSE
 * quantitative snow-game edges no competitor publishes. The change-scaled variance is also a
 * general modeling trick worth stealing for any stateful variable (e.g., field-condition indices).
 * Improvement: test the two extensions the author left open -- (1) add wind as a covariate in the
 * melt/aging term (wind accelerates sublimation/packing -- relevant to Buffalo's lake-effect
 * regime); (2) fit a multi-stadium joint model (1587's GraphSAGE over the three stadiums) instead
 * of per-stadium fits, testing the author's spatio-temporal extension hypothesis directly.
 *
 * ACCEPTANCE GATE: ADOPT if the physics-structured model beats the 10:1-rule heuristic on Brier score at >0 cm by
 * >= 10% across the three test stadiums -- the paper's effect vs seasonal baseline is ~50% error
 * reduction, so 10% over a strong heuristic is a fair transfer bar. REJECT if it doesn't --
 * stadium microclimates may defeat a Norway-fitted structure, and GSE falls back to empirical
 * snow-depth climatology.
 *
 * Ingest role: schemas (spread/margin copula: empirical copula + tail-dependence diagnostics).
 * Live data: NO. Runs offline on nflverse aggregates / stored snapshots.
 * Pure module: no I/O, no network, no credentials. Fail-closed: malformed input returns null/[].
 */

export const ARXIV_ID = "1901.04695" as const;
export const LANE = "weather" as const;

/** Numeric acceptance gate, verbatim from the ledger (evaluated offline on backtest data). */
export const ACCEPTANCE_GATE = `ADOPT if the physics-structured model beats the 10:1-rule heuristic on Brier score at >0 cm by
 * >= 10% across the three test stadiums -- the paper's effect vs seasonal baseline is ~50% error
 * reduction, so 10% over a strong heuristic is a fair transfer bar. REJECT if it doesn't --
 * stadium microclimates may defeat a Norway-fitted structure, and GSE falls back to empirical
 * snow-depth climatology.`;

export const CONFIG = {
  enabled: false,
  tailQuantile: 0.05,
  logScoreGate: "beat independence",
} as const;

/** Type guard for finite numbers (rejects NaN/Infinity/non-numbers). */
function isFiniteNumber(x: unknown): x is number {
  return typeof x === "number" && Number.isFinite(x);
}

export interface SpreadMargin {
  readonly spread: number;
  readonly margin: number;
}

export function isSpreadMargin(x: unknown): x is SpreadMargin {
  if (typeof x !== "object" || x === null) return false;
  const o = x as Record<string, unknown>;
  return isFiniteNumber(o["spread"]) && isFiniteNumber(o["margin"]);
}

/** Ranks -> pseudo-observations in (0,1) (average ranks for ties). */
export function pseudoObs(values: readonly number[]): number[] | null {
  if (values.length === 0 || !values.every(isFiniteNumber)) return null;
  const n = values.length;
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(n);
  let r = 0;
  while (r < n) {
    let s = r;
    while (s + 1 < n && order[s + 1]!.v === order[r]!.v) s++;
    const avg = (r + s) / 2 + 1;
    for (let k = r; k <= s; k++) ranks[order[k]!.i] = avg;
    r = s + 1;
  }
  return ranks.map((rk) => rk / (n + 1));
}

/** Empirical copula C(u,v) on a grid. */
export function empiricalCopula(
  u: readonly number[],
  v: readonly number[],
  gridU: readonly number[],
  gridV: readonly number[],
): number[][] | null {
  if (u.length !== v.length || u.length === 0) return null;
  if (!u.every((x) => isFiniteNumber(x) && x > 0 && x < 1) || !v.every((x) => isFiniteNumber(x) && x > 0 && x < 1)) return null;
  const n = u.length;
  return gridU.map((gu) => gridV.map((gv) => {
    let c = 0;
    for (let i = 0; i < n; i++) if ((u[i] ?? 1) <= gu && (v[i] ?? 1) <= gv) c++;
    return c / n;
  }));
}

/** Tail dependence: lambda_L / lambda_U at quantile q. */
export function tailDependence(u: readonly number[], v: readonly number[], q = 0.05): { lower: number; upper: number } | null {
  if (u.length !== v.length || u.length === 0 || !isFiniteNumber(q) || q <= 0 || q >= 0.5) return null;
  const n = u.length;
  let ll = 0;
  let uu = 0;
  for (let i = 0; i < n; i++) {
    if ((u[i] ?? 1) <= q && (v[i] ?? 1) <= q) ll++;
    if ((u[i] ?? 1) >= 1 - q && (v[i] ?? 1) >= 1 - q) uu++;
  }
  return { lower: ll / (n * q), upper: uu / (n * q) };
}

/** Kendall's tau (concordance - discordance). */
export function kendallTau(u: readonly number[], v: readonly number[]): number | null {
  if (u.length !== v.length || u.length < 2) return null;
  let conc = 0;
  let disc = 0;
  for (let i = 0; i < u.length; i++) {
    for (let j = i + 1; j < u.length; j++) {
      const du = (u[i] ?? 0) - (u[j] ?? 0);
      const dv = (v[i] ?? 0) - (v[j] ?? 0);
      if (du === 0 || dv === 0) continue;
      if ((du > 0) === (dv > 0)) conc++;
      else disc++;
    }
  }
  if (conc + disc === 0) return null;
  return (conc - disc) / (conc + disc);
}
