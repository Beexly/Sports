/**
 * Uncertainty and nulls for the paired candidate-vs-market comparison.
 *
 * Two independent corrections, both motivated by papers rather than taste.
 *
 * ── 1. CLUSTER (game-level) bootstrap ─────────────────────────────────────
 * Ported from arXiv:2604.01491, "Opponent-Adjusted Evaluation of NFL Pass
 * Blocking and Pass Rushing Performance" (Pipping-Gamón et al., UPenn). That
 * paper's central methodological point is that its interactions are clustered:
 * 153,138 interactions come from 33,283 plays in only 266 games, and it draws
 * its uncertainty from END-TO-END GAME resampling rather than row resampling.
 * Row resampling treats 30,000 rows from 266 games as 30,000 independent
 * observations and understates the interval.
 *
 * This repo's `pairedBootstrap` resamples rows. For picks that is defensible
 * only if rows are independent; rows from the same game are not. The cluster
 * bootstrap below resamples whole clusters with replacement, which is the
 * honest version — and it is strictly wider, so anything that survives it
 * survives the naive one.
 *
 * The paper also insists on reporting a comparison whose interval covers zero
 * as "directional rather than decisive" instead of as a win. `decide()`
 * encodes exactly that rule, and returns the verdict as data.
 *
 * ── 2. RELABELLING null ───────────────────────────────────────────────────
 * Ported from arXiv:2603.03613, "Empirical Evaluation of No Free Lunch
 * Violations in Permutation-Based Optimization" (Sroka), whose closing note is
 * that its result "applies to ... statistical procedures based on relabeling,
 * resampling, and permutation tests": a measured improvement can be an artifact
 * of how the benchmark was constructed or the order things were evaluated in,
 * not a property of the candidate.
 *
 * The factor foundry is exactly such a procedure — it searches many factors,
 * keeps the winners, and reports their p-values. A factor can look decisive
 * simply by being the luckiest of many. `relabelingNull` runs the SAME
 * decision statistic on label-permuted copies of the same data; if the real
 * pairing is not distinguishable from the null, the "win" was search noise.
 *
 * No dependencies. Deterministic under a fixed seed. Hand-computed pins live in
 * `__tests__/integrity-pins.test.ts`.
 */

import { mulberry32 } from "./stats";

export type PairedLosses = {
  readonly candidateLoss: readonly number[];
  readonly marketLoss: readonly number[];
  /** Stable cluster id per row (game id, or any grouping). Rows sharing an id move together. */
  readonly clusterId: readonly (string | number)[];
};

export type ClusterBootstrapResult = {
  /** Mean of candidate minus market over the full sample. */
  readonly delta: number;
  /** Fraction of resamples where mean(candidate) < mean(market). */
  readonly pBetter: number;
  /** 2.5 / 97.5 percentiles of the resampled delta — the honest interval. */
  readonly ciLow: number;
  readonly ciHigh: number;
  readonly resamples: number;
  readonly seed: number;
  /** Rows in the sample. */
  readonly n: number;
  /** Distinct clusters. Fewer clusters than rows means a wider interval. */
  readonly clusters: number;
  /** NaN when the sample has no usable rows. */
  readonly meanClusterSize: number;
};

function quantile(sorted: readonly number[], q: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

/**
 * Cluster (game-level) bootstrap of Δloss = candidate - market.
 *
 * Whole clusters are drawn with replacement, so every row of a drawn game
 * enters (or does not) together and the within-game correlation survives. Same
 * paired index for both arms on every resample — comparing the two arms on
 * different rows would destroy the pairing that gives the comparison its power.
 *
 * Mismatched lengths return n = 0 and a NaN delta rather than a silent 0,
 * matching `pairedBootstrap`: a wrong-shaped input must never look like a
 * result.
 */
export function clusterBootstrap(
  input: PairedLosses,
  options?: { readonly resamples?: number; readonly seed?: number; readonly alpha?: number },
): ClusterBootstrapResult {
  const a = input.candidateLoss;
  const b = input.marketLoss;
  const c = input.clusterId;
  const resamples = Math.max(1, Math.floor(options?.resamples ?? 1000));
  const seed = options?.seed ?? 20260915;
  const alpha = options?.alpha ?? 0.05;

  const empty = {
    pBetter: 0.5,
    delta: NaN,
    ciLow: NaN,
    ciHigh: NaN,
    resamples,
    seed,
    n: 0,
    clusters: 0,
    meanClusterSize: NaN,
  } satisfies ClusterBootstrapResult;
  if (a.length === 0 || a.length !== b.length || a.length !== c.length) return empty;

  // Group row indices by cluster, preserving first-seen order for determinism.
  const order: (string | number)[] = [];
  const members = new Map<string | number, number[]>();
  for (let i = 0; i < a.length; i++) {
    const id = c[i]!;
    if (!members.has(id)) {
      members.set(id, []);
      order.push(id);
    }
    members.get(id)!.push(i);
  }
  const k = order.length;
  const n = a.length;
  let fullSum = 0;
  for (let i = 0; i < n; i++) fullSum += a[i]! - b[i]!;
  const full = fullSum / n;

  const rand = mulberry32(seed);
  const deltas: number[] = [];
  let better = 0;
  for (let r = 0; r < resamples; r++) {
    let sa = 0;
    let sb = 0;
    let count = 0;
    for (let cIdx = 0; cIdx < k; cIdx++) {
      const id = order[Math.floor(rand() * k)]!;
      const idx = members.get(id)!;
      for (const i of idx) {
        sa += a[i]!;
        sb += b[i]!;
        count++;
      }
    }
    const ma = sa / count;
    const mb = sb / count;
    deltas.push(ma - mb);
    if (ma < mb) better += 1;
  }
  deltas.sort((x, y) => x - y);
  return {
    delta: full,
    pBetter: better / resamples,
    ciLow: quantile(deltas, alpha / 2),
    ciHigh: quantile(deltas, 1 - alpha / 2),
    resamples,
    seed,
    n,
    clusters: k,
    meanClusterSize: n / k,
  };
}

/**
 * How to read a comparison — the paper's own reporting rule.
 *
 * "directional" is the honest word for a point estimate on the right side of
 * zero whose interval still covers it (arXiv:2604.01491 §4: the
 * severity-versus-matchup comparison "remains directionally positive but less
 * certain", and its interval "overlaps zero, so that comparison should be
 * interpreted as directional rather than decisive"). Claiming a win there is
 * the failure mode this repo cares about most, so it gets a name.
 */
export type Decision = {
  readonly verdict: "decisive-better" | "decisive-worse" | "directional-better" | "directional-worse" | "indistinguishable";
  readonly ciExcludesZero: boolean;
  readonly pBetter: number;
  readonly delta: number;
  readonly ciLow: number;
  readonly ciHigh: number;
  /** n below this is not reportable at all, whatever the interval says. */
  readonly tooFewClusters: boolean;
};

export function decide(
  r: ClusterBootstrapResult,
  options?: { readonly minClusters?: number; readonly tol?: number },
): Decision {
  const minClusters = options?.minClusters ?? 5;
  const tol = options?.tol ?? 0;
  if (r.n === 0) {
    return { verdict: "indistinguishable", ciExcludesZero: false, pBetter: r.pBetter, delta: r.delta, ciLow: r.ciLow, ciHigh: r.ciHigh, tooFewClusters: true };
  }
  const tooFew = r.clusters < minClusters;
  const excludesZero = r.ciLow > tol ? true : r.ciHigh < -tol ? true : false;
  const pointBetter = r.delta < -tol;
  let verdict: Decision["verdict"];
  if (tooFew) verdict = "indistinguishable";
  else if (!excludesZero) verdict = pointBetter ? "directional-better" : r.delta > tol ? "directional-worse" : "indistinguishable";
  else verdict = pointBetter ? "decisive-better" : "decisive-worse";
  return { verdict, ciExcludesZero: excludesZero, pBetter: r.pBetter, delta: r.delta, ciLow: r.ciLow, ciHigh: r.ciHigh, tooFewClusters: tooFew };
}

export type RelabelingNull = {
  /**
   * Observed row-wise hit rate: the fraction of rows where the candidate's loss
   * is strictly below the market's. This is the statistic that actually depends
   * on WHICH row each loss came from, which is what makes it permutable.
   */
  readonly observedWinRate: number;
  /** Row-wise hit rate under each relabeled arrangement. */
  readonly nullWinRates: readonly number[];
  /**
   * (1 + #{null >= observed}) / (R + 1). SMALL means relabeling reproduces the
   * observed result, i.e. the specific row pairing bought nothing and the
   * "win" is an artifact of how the arms were arranged.
   */
  readonly pValue: number;
  /** The single best relabeling, for an honest worst-case footnote. */
  readonly bestNullWinRate: number;
  /**
   * True when the observed hit rate is at least as good as (1 - alpha) of the
   * relabeled arrangements — the claim survives destroying the pairing.
   * This is the artifact check the paper's closing note asks for, and it is the
   * verdict a factor gate should gate on: a p-value alone cannot distinguish
   * "robustly better" from "robustly nothing", because a level-separated edge
   * makes every arrangement win.
   */
  readonly survivesRelabeling: boolean;
  readonly alpha: number;
  readonly resamples: number;
  readonly seed: number;
  readonly n: number;
};

/** Row-wise hit rate: fraction of rows where candidateLoss < marketLoss. */
export function pairedWinRate(
  candidateLoss: readonly number[],
  marketLoss: readonly number[],
): number {
  const n = Math.min(candidateLoss.length, marketLoss.length);
  if (n === 0) return NaN;
  let better = 0;
  for (let i = 0; i < n; i++) if (candidateLoss[i]! < marketLoss[i]!) better += 1;
  return better / n;
}

/**
 * Relabeling (permutation) null for the row-wise hit rate.
 *
 * The statistic is a comparison of two loss vectors that share a row index.
 * Shuffling the MARKET arm across rows preserves both arms' value
 * distributions and every row count, and destroys only the pairing — exactly
 * the thing a row-wise hit rate measures. Note the deliberate choice of
 * statistic: a mean difference is invariant under any permutation of one arm
 * (mean(a) - mean(b) does not care which row a value sits on), so it cannot be
 * permutation-tested at all. The hit rate can, and it is the statistic the
 * scorecard already reports a Wilson band for.
 *
 * The result is an artifact check, not a significance test. A candidate that is
 * uniformly better than the market wins under EVERY relabeling, so its p-value
 * is ~1 while `survivesRelabeling` is true — the pairing was not what produced
 * the edge. A candidate whose win rate is a lucky arrangement has a LOW
 * p-value, because relabeling does much better, and `survivesRelabeling` is
 * false. Both readings have to be reported together or the number lies.
 */
export function relabelingNull(
  input: PairedLosses,
  options?: { readonly resamples?: number; readonly seed?: number; readonly alpha?: number },
): RelabelingNull {
  const a = input.candidateLoss;
  const b = input.marketLoss;
  const resamples = Math.max(1, Math.floor(options?.resamples ?? 1000));
  const alpha = options?.alpha ?? 0.05;
  const seed = options?.seed ?? 20260915;
  const n = a.length;
  const fail = {
    observedWinRate: NaN,
    nullWinRates: [],
    pValue: NaN,
    bestNullWinRate: NaN,
    survivesRelabeling: false,
    alpha,
    resamples,
    seed,
    n: 0,
  } satisfies RelabelingNull;
  if (n === 0 || a.length !== b.length || a.length !== input.clusterId.length) return fail;

  const observed = pairedWinRate(a, b);
  const shuffled = b.slice();
  const rand = mulberry32(seed);
  const nulls: number[] = [];
  for (let r = 0; r < resamples; r++) {
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      const t = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = t;
    }
    nulls.push(pairedWinRate(a, shuffled));
  }
  const atLeastAsGood = nulls.filter((v) => v >= observed).length;
  let best = 0;
  for (const v of nulls) if (v > best) best = v;
  const worse = nulls.filter((v) => v < observed).length;
  return {
    observedWinRate: observed,
    nullWinRates: nulls,
    pValue: (1 + atLeastAsGood) / (resamples + 1),
    bestNullWinRate: best,
    survivesRelabeling: worse / resamples <= alpha,
    alpha,
    resamples,
    seed,
    n,
  };
}
