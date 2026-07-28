import type { HistDecisionRecord } from "./types.js";

export function brierScore(p: number, y: 0 | 1): number {
  return (p - y) ** 2;
}

export function logLoss(p: number, y: 0 | 1): number {
  const eps = 1e-12;
  const pp = Math.min(1 - eps, Math.max(eps, p));
  return y === 1 ? -Math.log(pp) : -Math.log(1 - pp);
}

export interface SettledDecision {
  record: HistDecisionRecord;
  label: 0 | 1;
}

export function meanBrier(
  rows: readonly SettledDecision[],
  pLoOnly = false,
): number | null {
  const xs: number[] = [];
  for (const r of rows) {
    if (!r.record.interval) continue;
    const p = pLoOnly
      ? r.record.interval.lo
      : (r.record.interval.lo + r.record.interval.hi) / 2;
    xs.push(brierScore(p, r.label));
  }
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function empiricalIntervalCoverage(
  rows: readonly SettledDecision[],
): number | null {
  let n = 0;
  let hit = 0;
  for (const r of rows) {
    const iv = r.record.interval;
    if (!iv) continue;
    n += 1;
    const y = r.label;
    if (iv.lo > 0.5) {
      if (y === 1) hit += 1;
    } else if (iv.hi < 0.5) {
      if (y === 0) hit += 1;
    } else {
      hit += 1;
    }
  }
  return n ? hit / n : null;
}

export interface RiskCoveragePoint {
  coverage: number;
  fireErrorRate: number | null;
  nFire: number;
  nTotal: number;
}

export function riskCoverage(
  rows: readonly SettledDecision[],
): RiskCoveragePoint {
  const nTotal = rows.length;
  const fires = rows.filter((r) => r.record.kind === "FIRE");
  const nFire = fires.length;
  let err = 0;
  for (const f of fires) {
    if (f.label === 0) err += 1;
  }
  return {
    coverage: nTotal ? nFire / nTotal : 0,
    fireErrorRate: nFire ? err / nFire : null,
    nFire,
    nTotal,
  };
}

export function countByKind(
  records: readonly HistDecisionRecord[],
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    out[r.kind] = (out[r.kind] ?? 0) + 1;
  }
  return out;
}
