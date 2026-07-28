/**
 * Proper scoring helpers for offline reliability — not public win-rate claims.
 */

function clamp01(p: number): number {
  if (!Number.isFinite(p)) return 0;
  return Math.min(1, Math.max(0, p));
}

export function brierScore(p: number, y: 0 | 1): number {
  const pp = clamp01(p);
  return (pp - y) ** 2;
}

export function meanBrier(rows: Array<{ p: number; y: 0 | 1 }>): number {
  if (!rows.length) return NaN;
  return rows.reduce((s, r) => s + brierScore(r.p, r.y), 0) / rows.length;
}

export function logLoss(p: number, y: 0 | 1, eps = 1e-15): number {
  const pp = Math.min(1 - eps, Math.max(eps, p));
  return y === 1 ? -Math.log(pp) : -Math.log(1 - pp);
}

export function meanLogLoss(
  rows: Array<{ p: number; y: 0 | 1 }>,
  eps = 1e-15,
): number {
  if (!rows.length) return NaN;
  return rows.reduce((s, r) => s + logLoss(r.p, r.y, eps), 0) / rows.length;
}

export function reliabilityDiagram(
  rows: Array<{ p: number; y: 0 | 1 }>,
  bins = 10,
): Array<{ bin: number; meanP: number; freq: number; n: number }> {
  const edges: Array<{ sumP: number; sumY: number; n: number }> = Array.from(
    { length: bins },
    () => ({ sumP: 0, sumY: 0, n: 0 }),
  );
  for (const r of rows) {
    const pp = clamp01(r.p);
    let i = Math.floor(pp * bins);
    if (i >= bins) i = bins - 1;
    edges[i].sumP += pp;
    edges[i].sumY += r.y;
    edges[i].n += 1;
  }
  return edges.map((e, bin) => ({
    bin,
    meanP: e.n ? e.sumP / e.n : NaN,
    freq: e.n ? e.sumY / e.n : NaN,
    n: e.n,
  }));
}
