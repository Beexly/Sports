// ============================================================
// k-periodic universal portfolio allocation (DECIDE, additive)
// wiring-wave2 — NOT wired into any publish path.
// ============================================================

/**
 * DISABLED BY DEFAULT. Additive utility only: activation requires the gate
 * below to pass on real walk-forward data, plus a human call.
 */
export const ENABLED = false;

/**
 * arXiv: 2507.05994v1 — "Beating the Best Constant Rebalancing Portfolio in Long-Term Investment: A Generalization of the Kelly Criterion and Universal Learning Algorithm for Markets with Serial Dependence"
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: when returns have serial dependence (e.g. day-of-week or
 * situational structure), a single constant-rebalanced (Kelly-style)
 * allocation is beaten by a k-periodic universal portfolio: the history is
 * partitioned into k buckets, each bucket learns its own allocation with
 * the k-PUP (k-periodic universal portfolio) update tuned to that bucket's
 * return profile, and the time-t allocation is the bucket's learned
 * portfolio for t mod k.
 *
 * IMPROVEMENT (from ledger): GSE allocates bankroll across concurrent picks with periodic Kelly-style allocation: partition bet history into k=7 day-of-week or situational buckets, each learning its own allocation via the k-PUP update tuned to that bucket's return profile.
 *
 * ACCEPTANCE GATE: ADAPT if on walk-forward (k chosen on 2023, evaluated 2024-2025) the k-PUP bankroll multiple exceeds flat fractional-Kelly by >=10% with max drawdown no worse than 1.2x the baseline's.
 */

/** Bucket index for period t under k-periodicity. */
export function bucketIndex(t: number, k: number): number {
  return ((t % k) + k) % k;
}

/**
 * k-PUP update: exponentiated-gradient (universal-portfolio style) step on
 * the simplex for one bucket. weights, priceRelatives > 0.
 */
export function pupUpdate(
  weights: number[],
  priceRelatives: number[],
  eta: number,
): number[] {
  const n = weights.length;
  const updated = weights.map((w, i) => w * Math.exp(eta * Math.log(Math.max(priceRelatives[i]!, 1e-12))));
  const sum = updated.reduce((a, b) => a + b, 0);
  return updated.map((w) => w / Math.max(sum, 1e-300));
}

/** Bankroll multiple: product of per-period portfolio gross returns. */
export function bankrollMultiple(weights: number[], priceRelatives: number[]): number {
  let dot = 0;
  for (let i = 0; i < weights.length; i++) dot += weights[i]! * priceRelatives[i]!;
  return Math.max(dot, 1e-12);
}

/** Max drawdown of a bankroll-multiple path. */
export function maxDrawdown(multiples: number[]): number {
  let peak = 1;
  let wealth = 1;
  let mdd = 0;
  for (const m of multiples) {
    wealth *= m;
    if (wealth > peak) peak = wealth;
    mdd = Math.max(mdd, 1 - wealth / peak);
  }
  return mdd;
}

export interface PupRun {
  /** Per-bucket learned allocations (k × nAssets). */
  bucketWeights: number[][];
  /** Realized per-period bankroll multiples. */
  multiples: number[];
  terminalWealth: number;
  maxDrawdown: number;
}

/**
 * Walk-forward k-PUP: each bucket keeps its own allocation, updated only on
 * its own periods with the exponentiated-gradient step.
 */
export function runKPup(
  priceRelativesByPeriod: number[][],
  k: number,
  eta: number,
): PupRun {
  const nAssets = priceRelativesByPeriod[0]!.length;
  const bucketWeights: number[][] = Array.from({ length: k }, () =>
    Array.from({ length: nAssets }, () => 1 / nAssets),
  );
  const multiples: number[] = [];
  priceRelativesByPeriod.forEach((rels, t) => {
    const b = bucketIndex(t, k);
    const w = bucketWeights[b]!;
    multiples.push(bankrollMultiple(w, rels));
    bucketWeights[b] = pupUpdate(w, rels, eta);
  });
  const terminalWealth = multiples.reduce((a, m) => a * m, 1);
  return { bucketWeights, multiples, terminalWealth, maxDrawdown: maxDrawdown(multiples) };
}

/**
 * Acceptance-gate helper: k-PUP terminal wealth ≥ 10% above flat
 * fractional-Kelly baseline with max drawdown ≤ 1.2× the baseline's.
 */
export function pupGatePasses(
  pupWealth: number,
  pupMdd: number,
  baselineWealth: number,
  baselineMdd: number,
): boolean {
  return pupWealth >= 1.1 * baselineWealth && pupMdd <= 1.2 * baselineMdd + 1e-12;
}
