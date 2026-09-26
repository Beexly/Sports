// @ts-nocheck
/**
 * arXiv 2608.25940v2: A Statistical Audit of Physical AI Benchmark Redundancy.
 *
 * ADDITIVE utility. Not wired into any publish path (wiring changes published picks and is a NEEDS HUMAN CALL).
 *
 * Paper mechanism: GSE metric-redundancy audit over the 32-team x metric-family matrix: collapse substitute pairs with Spearman rho > 0.8 and forward-select a minimal edge-sheet metric core of <= 6 metrics, so the published edge sheet carries no duplicated information.
 *
 * Improvement (wiring wave-2 slice CALIBRATE):
 * Run a GSE metric-redundancy audit over the 32-team x 15-26 metric-family matrix from gse-lab CSVs (2015-2025), collapsing substitute pairs with Spearman rho > 0.8 and forward-selecting a minimal edge-sheet metric core of <=6 metrics, so the published edge sheet carries no duplicated information.
 *
 * ACCEPTANCE GATE:
 * ADOPT the pruned metric core if: (a) the core (<=6 metrics) achieves >=95% of the full suite's out-of-sample predictive correlation on the 2023-2025 window, and (b) >=2 substitute pairs with rho>0.8 are identified and collapsing them moves >=3 teams by >=3 places in the power rating; REJECT if the minimal core needs >10 metrics to reach 95%.
 *
 * No ENABLED flag: offline audit tool, not a publish path.
 */


/** Spearman rank correlation between two metric columns. */
export function spearman(a: readonly number[], b: readonly number[]): number {
  const rank = (xs: readonly number[]): number[] => {
    const order = xs.map((_, i) => i).sort((x, y) => xs[x]! - xs[y]!);
    const r = new Array(xs.length).fill(0);
    order.forEach((idx, pos) => {
      r[idx!] = pos;
    });
    return r;
  };
  const ra = rank(a);
  const rb = rank(b);
  const n = a.length;
  const m = (n - 1) / 2;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i]! - m) * (rb[i]! - m);
    da += (ra[i]! - m) * (ra[i]! - m);
    db += (rb[i]! - m) * (rb[i]! - m);
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/** Full Spearman correlation matrix over metric columns (teams = rows). */
export function correlationMatrix(
  columns: readonly (readonly number[])[],
): number[][] {
  return columns.map((a) => columns.map((b) => spearman(a, b)));
}

/** Substitute pairs with |rho| > threshold (default 0.8). */
export function substitutePairs(
  columns: readonly (readonly number[])[],
  names: readonly string[],
  threshold = 0.8,
): { a: string; b: string; rho: number }[] {
  const pairs: { a: string; b: string; rho: number }[] = [];
  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const rho = spearman(columns[i]!, columns[j]!);
      if (Math.abs(rho) > threshold) pairs.push({ a: names[i]!, b: names[j]!, rho });
    }
  }
  return pairs.sort((x, y) => Math.abs(y.rho) - Math.abs(x.rho));
}

/** Pearson correlation (for the predictive-correlation retention check). */
export function pearson(a: readonly number[], b: readonly number[]): number {
  const n = a.length;
  const ma = a.reduce((x, y) => x + y, 0) / n;
  const mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i]! - ma) * (b[i]! - mb);
    da += (a[i]! - ma) * (a[i]! - ma);
    db += (b[i]! - mb) * (b[i]! - mb);
  }
  return da > 0 && db > 0 ? num / Math.sqrt(da * db) : 0;
}

/**
 * Forward selection of a minimal metric core (<= maxCore metrics) maximizing
 * out-of-sample predictive correlation with the target (e.g. next-season wins).
 * Greedy: add the metric with the best marginal gain each round.
 */
export function forwardSelectCore(
  columns: readonly (readonly number[])[],
  names: readonly string[],
  target: readonly number[],
  maxCore = 6,
): { core: string[]; predictiveCorr: number } {
  const selected: number[] = [];
  const remaining = new Set(columns.map((_, i) => i));
  const combinedScore = (idxs: readonly number[]): number[] => {
    // Simple average of z-scored metrics as the composite.
    const n = target.length;
    const zs = idxs.map((j) => {
      const col = columns[j]!;
      const m = col.reduce((a, b) => a + b, 0) / n;
      const sd = Math.sqrt(col.reduce((a, b) => a + (b - m) * (b - m), 0) / n) || 1;
      return col.map((v) => (v - m) / sd);
    });
    return Array.from({ length: n }, (_, i) =>
      zs.reduce((a, z) => a + z[i]!, 0) / Math.max(zs.length, 1),
    );
  };
  let bestCorr = 0;
  while (selected.length < maxCore && remaining.size > 0) {
    let bestIdx = -1;
    for (const j of remaining) {
      const corr = Math.abs(pearson(combinedScore([...selected, j]), target));
      if (corr > bestCorr + 1e-9) {
        bestCorr = corr;
        bestIdx = j;
      }
    }
    if (bestIdx < 0) break;
    selected.push(bestIdx);
    remaining.delete(bestIdx);
  }
  return { core: selected.map((i) => names[i]!), predictiveCorr: bestCorr };
}

/** Collapse substitute pairs: drop the later-named metric of each pair. */
export function collapseSubstitutes(
  names: readonly string[],
  pairs: readonly { a: string; b: string }[],
): string[] {
  const dropped = new Set<string>();
  for (const p of pairs) {
    if (!dropped.has(p.a)) dropped.add(p.b);
  }
  return names.filter((n) => !dropped.has(n));
}
