/**
 * Historical metrics — proper scores + risk-coverage.
 * Coverage helpers must not invent honesty (no auto-hit on straddling intervals).
 */

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

export type DirectionalBucket = "pred1" | "pred0" | "straddle" | "invalid";

/**
 * Directional classification at 0.5 — straddles are EXCLUDED from accuracy,
 * not counted as hits (fabricated coverage is forbidden).
 */
export function directionalBucket(lo: number, hi: number): DirectionalBucket {
  if (!(Number.isFinite(lo) && Number.isFinite(hi)) || lo > hi) return "invalid";
  if (lo > 0.5) return "pred1";
  if (hi < 0.5) return "pred0";
  return "straddle";
}

export interface DirectionalAccuracy {
  /** Accuracy among non-straddle, valid intervals only */
  accuracy: number | null;
  nScored: number;
  nStraddle: number;
  nInvalid: number;
  nTotal: number;
}

export function directionalAccuracyAt50(
  rows: readonly SettledDecision[],
): DirectionalAccuracy {
  let correct = 0;
  let nScored = 0;
  let nStraddle = 0;
  let nInvalid = 0;
  for (const r of rows) {
    const iv = r.record.interval;
    if (!iv) continue;
    const b = directionalBucket(iv.lo, iv.hi);
    if (b === "straddle") {
      nStraddle += 1;
      continue;
    }
    if (b === "invalid") {
      nInvalid += 1;
      continue;
    }
    nScored += 1;
    if (b === "pred1" && r.label === 1) correct += 1;
    if (b === "pred0" && r.label === 0) correct += 1;
  }
  return {
    accuracy: nScored ? correct / nScored : null,
    nScored,
    nStraddle,
    nInvalid,
    nTotal: rows.length,
  };
}

/** @deprecated Removed — use directionalAccuracyAt50 (straddles excluded). */
export function empiricalIntervalCoverage(
  _rows: readonly SettledDecision[],
): null {
  return null;
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
