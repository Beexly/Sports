/**
 * Sample-size crossover analysis for symbolic regression (arXiv 2103.15147v3).
 *
 * The paper's protocol (replicated on sports data per the ledger) compares
 * symbolic regression (PySR) vs Lasso vs RF vs GB on ~20 team-season /
 * QB-season regression problems with leave-seasons-out splits. This module
 * implements the analysis layer: given per-method out-of-sample R^2 at
 * train sizes n in {32, 100, 250, 500, 1000}, compute each method's
 * win-rate vs n, locate the crossover n* where ensembles beat SR, and
 * encode the operating rule (SR for team-season-sized n, ensembles above).
 *
 * ACCEPTANCE GATE: ADOPT the 'SR-first for small-n' doctrine if PySR wins
 * the plurality of first places (>= 40% of experiments) AND beats Lasso's
 * weighted score on the sports replication; REJECT (keep ensembles as
 * default) if PySR finishes outside the top 2.
 *
 * Research-only module. Not wired into any live training path.
 */

export type Method = "sr" | "lasso" | "rf" | "gb";

export const METHODS: Method[] = ["sr", "lasso", "rf", "gb"];

export interface SizeResult {
  n: number;
  /** Out-of-sample R^2 per method at this train size. */
  r2: Record<Method, number>;
}

/**
 * Per-method win rate at each train size: fraction of sizes where the
 * method has the strictly best R^2 (ties split evenly).
 */
export function winRates(results: readonly SizeResult[]): Record<Method, number> {
  if (results.length === 0) throw new Error("winRates: no results");
  const wins: Record<Method, number> = { sr: 0, lasso: 0, rf: 0, gb: 0 };
  for (const r of results) {
    const best = Math.max(...METHODS.map((m) => r.r2[m]));
    const tied = METHODS.filter((m) => r.r2[m] === best);
    for (const m of tied) wins[m] += 1 / tied.length;
  }
  const n = results.length;
  return { sr: wins.sr / n, lasso: wins.lasso / n, rf: wins.rf / n, gb: wins.gb / n };
}

/**
 * Crossover n*: the smallest train size above which the best ensemble
 * method (rf/gb max) beats SR at every larger size. Returns null when SR
 * is never beaten or ensembles never take and hold the lead.
 */
export function crossoverN(results: readonly SizeResult[]): number | null {
  if (results.length === 0) throw new Error("crossoverN: no results");
  const sorted = [...results].sort((a, b) => a.n - b.n);
  const ensBest = (r: SizeResult): number => Math.max(r.r2.rf, r.r2.gb);
  for (let i = 0; i < sorted.length; i++) {
    const rest = sorted.slice(i);
    if (rest.length > 0 && rest.every((r) => ensBest(r) > r.r2.sr)) {
      return (sorted[i] as SizeResult).n;
    }
  }
  return null;
}

/**
 * Weighted score per method: mean R^2 across sizes weighted by 1/sqrt(n),
 * emphasizing small-n performance (the paper's small-data claim).
 */
export function weightedScore(results: readonly SizeResult[]): Record<Method, number> {
  if (results.length === 0) throw new Error("weightedScore: no results");
  const out: Record<Method, number> = { sr: 0, lasso: 0, rf: 0, gb: 0 };
  let wsum = 0;
  for (const r of results) {
    const w = 1 / Math.sqrt(Math.max(1, r.n));
    wsum += w;
    for (const m of METHODS) out[m] += w * r.r2[m];
  }
  for (const m of METHODS) out[m] /= wsum;
  return out;
}

export interface DoctrineVerdict {
  adoptSrFirst: boolean;
  srWinRate: number;
  srVsLasso: number;
  crossover: number | null;
  reason: string;
}

/**
 * Apply the paper's adoption gate to a replication result set.
 */
export function doctrineVerdict(results: readonly SizeResult[]): DoctrineVerdict {
  const wr = winRates(results);
  const ws = weightedScore(results);
  const crossover = crossoverN(results);
  const ranked = [...METHODS].sort((a, b) => wr[b] - wr[a]);
  const srRank = ranked.indexOf("sr") + 1;
  const adoptSrFirst = wr.sr >= 0.4 && ws.sr > ws.lasso;
  let reason: string;
  if (adoptSrFirst) {
    reason = `SR wins plurality (${(wr.sr * 100).toFixed(1)}% of sizes) and beats Lasso's weighted score; SR-first for small n.`;
  } else if (srRank > 2) {
    reason = `SR finishes #${srRank} on win rate: REJECT SR-first, keep ensembles as default.`;
  } else {
    reason = `SR is competitive (#${srRank}) but misses the adoption gate; hold for more evidence.`;
  }
  return { adoptSrFirst, srWinRate: wr.sr, srVsLasso: ws.sr - ws.lasso, crossover, reason };
}
