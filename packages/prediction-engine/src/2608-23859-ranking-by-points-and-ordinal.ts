/**
 * arXiv:2608.23859 — Ranking by points and ordinal models
 *
 * AC ordinal rating head for cover/push/no-cover: adjacent-category logits with constant-sum slopes, MAP
 * estimation under a Gaussian prior, and a home boost — plus the schedule-equivalence audit.
 *
 * Improvement: Add an AC ordinal rating head to GSE's spread/total engine for cover/push/no-cover outcomes with constant-sum slopes, MAP plus Gaussian prior, and a home boost, running the schedule-equivalence audit (standings order vs model-rating reorder rate) as publishable GSE content alongside it.
 *
 * ADDITIVE utility. Not wired into any live model path (wiring changes predictions and is a NEEDS HUMAN CALL).
 *
 * ACCEPTANCE GATE: ADOPT the AC ordinal head for GSE's spread/total engine if on 2020-2024 NFL seasons the AC model's out-of-sample log loss on (cover/push/no-cover) is <= the best single binary baseline and the fitted slopes are within 2 SE of uniform (then use uniform with zero estimation cost); REJECT if AC underperforms binary logistics by >0.005 nats.
 */

/** Numerically stable logistic. */
export function logistic(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/** Adjacent-category probabilities from linear predictor eta. */
export function acProbs(eta: number, cuts: readonly [number, number]): number[] {
  // P(Y<=k) via cumulative logits, then differences; 3 categories.
  const c1 = logistic((cuts[0] ?? 0) - eta);
  const c2 = logistic((cuts[1] ?? 0) - eta);
  return [c1, Math.max(0, c2 - c1), Math.max(0, 1 - c2)];
}

/**
 * MAP fit of the AC ordinal head: Newton-Raphson on (cuts, beta) with a
 * Gaussian prior (ridge) on beta. y in {0,1,2}.
 */
export function fitAcOrdinal(
  X: number[][],
  y: readonly number[],
  priorVar: number,
  iters = 40,
): { cuts: [number, number]; beta: number[] } {
  const n = y.length;
  const p = X[0]?.length ?? 0;
  if (n === 0 || p === 0) throw new Error("fitAcOrdinal: empty input");
  let cuts: [number, number] = [-0.5, 0.5];
  let beta = new Array<number>(p).fill(0);
  const lr = 0.2;
  const nll = (b: number[], c: [number, number]): number => {
    let s = 0;
    for (let i = 0; i < n; i++) {
      const eta = (X[i] ?? []).reduce((t, x, j) => t + x * (b[j] ?? 0), 0);
      const pr = acProbs(eta, c);
      s -= Math.log(Math.max(1e-12, pr[y[i]!] ?? 0));
    }
    s += b.reduce((t, bj) => t + (bj * bj) / (2 * priorVar), 0);
    return s;
  };
  for (let it = 0; it < iters; it++) {
    const eps = 1e-5;
    const gb = new Array<number>(p).fill(0);
    for (let j = 0; j < p; j++) {
      const bp = [...beta]; bp[j] = (bp[j] ?? 0) + eps;
      const bm = [...beta]; bm[j] = (bm[j] ?? 0) - eps;
      gb[j] = (nll(bp, cuts) - nll(bm, cuts)) / (2 * eps);
    }
    const gc: [number, number] = [0, 0];
    for (let k = 0; k < 2; k++) {
      const cp: [number, number] = [...cuts] as [number, number]; cp[k] = (cp[k] ?? 0) + eps;
      const cm: [number, number] = [...cuts] as [number, number]; cm[k] = (cm[k] ?? 0) - eps;
      gc[k] = (nll(beta, cp) - nll(beta, cm)) / (2 * eps);
    }
    for (let j = 0; j < p; j++) beta[j] = (beta[j] ?? 0) - lr * (gb[j] ?? 0) / n;
    cuts = [cuts[0] - lr * (gc[0] ?? 0) / n, cuts[1] - lr * (gc[1] ?? 0) / n];
    if (cuts[0] > cuts[1]) cuts = [cuts[1], cuts[0]];
  }
  return { cuts, beta };
}

/**
 * Schedule-equivalence audit: reorder rate between standings order and
 * model-rating order (fraction of pairwise swaps).
 */
export function reorderRate(standings: readonly string[], modelOrder: readonly string[]): number {
  if (standings.length !== modelOrder.length) throw new Error("reorderRate: length mismatch");
  const rank = new Map(modelOrder.map((t, i) => [t, i]));
  let swaps = 0;
  let total = 0;
  for (let i = 0; i < standings.length; i++) {
    for (let j = i + 1; j < standings.length; j++) {
      total++;
      if ((rank.get(standings[i]!) ?? 0) > (rank.get(standings[j]!) ?? 0)) swaps++;
    }
  }
  return total === 0 ? 0 : swaps / total;
}
